import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { EntityType, EntityState, GenericEntity } from '../types';
import { getSupabase } from '../services/supabase';
import { useAuth } from './AuthContext';

// Current Application Version - increment this to force global refreshes
const APP_VERSION = '2.1.0';

interface DataContextType {
  data: EntityState;
  loading: boolean;
  dbNeedsSetup: boolean;
  lastSync: Date | null;
  addEntity: (type: EntityType, entity: Omit<GenericEntity, 'id'>) => Promise<void>;
  updateEntity: (type: EntityType, id: string, entity: Partial<GenericEntity>) => Promise<void>;
  deleteEntity: (type: EntityType, id: string) => Promise<void>;
  getEntity: (type: EntityType, id: string) => GenericEntity | undefined;
  importData: (newData: EntityState, isUpgrade?: boolean) => Promise<void>;
  receivePayment: (invoiceId: string, amount: number, bankAccountId: string, date: string, reference: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_STATE: EntityState = Object.values(EntityType).reduce((acc, type) => {
  acc[type as EntityType] = [];
  return acc;
}, {} as EntityState);

const LOCAL_STORAGE_KEY = 'zill_crm_local_data';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isDemoMode } = useAuth();
  const [data, setData] = useState<EntityState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [dbNeedsSetup, setDbNeedsSetup] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const isFetching = useRef(false);
  const autoSyncDone = useRef(false);
  const supabase = getSupabase();

  const loadLocalData = useCallback(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...INITIAL_STATE, ...parsed };
        setData(merged);
        return merged;
      } catch (e) {
        setData(INITIAL_STATE);
        return INITIAL_STATE;
      }
    }
    setData(INITIAL_STATE);
    return INITIAL_STATE;
  }, []);

  const saveLocalData = (newState: EntityState) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
  };

  const fetchData = useCallback(async (force = false) => {
    if (isFetching.current && !force) return;
    
    if (!isAuthenticated && !localStorage.getItem('zill_active_user')) {
      setData(INITIAL_STATE);
      setLoading(false);
      return;
    }

    if (isDemoMode) {
      loadLocalData();
      setLoading(false);
      return;
    }

    if (supabase) {
      isFetching.current = true;
      try {
        const { data: dbData, error } = await supabase
          .from('crm_entities')
          .select('*');

        if (error) {
          if (error.message.includes("Could not find the table") || error.code === 'PGRST116') {
            setDbNeedsSetup(true);
            loadLocalData();
          } else {
            loadLocalData();
          }
        } else {
          setDbNeedsSetup(false);
          const groupedData = { ...INITIAL_STATE };
          (dbData as any[])?.forEach((row) => {
            const type = row.type as EntityType;
            if (groupedData[type]) {
              groupedData[type].push({ ...row.content, id: row.id });
            }
          });
          
          setData(groupedData);
          saveLocalData(groupedData);
          setLastSync(new Date());

          if (Array.isArray(dbData) && dbData.length === 0 && !autoSyncDone.current) {
            const localData = loadLocalData();
            if (Object.values(localData).some((arr: any) => arr.length > 0)) {
              await importData(localData);
            }
          }
          autoSyncDone.current = true;
        }
      } catch (e) {
        loadLocalData();
      } finally {
        isFetching.current = false;
      }
    } else {
      loadLocalData();
    }
    setLoading(false);
  }, [isAuthenticated, supabase, isDemoMode, loadLocalData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // GLOBAL BROADCAST LISTENER
  useEffect(() => {
    if (isDemoMode || !supabase || !isAuthenticated) return;

    const channel = supabase.channel('global-sync-channel');

    channel
      .on('broadcast', { event: 'app-upgrade' }, (payload) => {
        console.log('Global Sync: App Upgrade Signal Received', payload);
        fetchData(true); // Force refresh all users
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_entities' }, () => {
        fetchData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, isDemoMode, isAuthenticated, fetchData]);

  const addEntity = async (type: EntityType, entity: Omit<GenericEntity, 'id'>) => {
    const id = (entity as any).id || generateUUID();
    const newEntity = { ...entity, id };

    const oldState = data;
    const newState = { ...data, [type]: [...data[type], newEntity] };
    setData(newState);
    saveLocalData(newState);

    if (isDemoMode || !supabase || dbNeedsSetup) return;
    if (!user?.id) throw new Error("Session invalid.");

    const content = { ...entity };
    delete (content as any).id;

    const { error } = await supabase
      .from('crm_entities')
      .upsert([{ id, type, content, user_id: user.id }], { onConflict: 'id' });

    if (error) {
      setData(oldState);
      if (error.message.includes("invalid input syntax for type uuid")) {
        throw new Error("Database Error: 'id' column mismatch. Go to Settings and run the SQL fix.");
      }
      throw new Error(error.message);
    }
  };

  const updateEntity = async (type: EntityType, id: string, entity: Partial<GenericEntity>) => {
    const currentItems = data[type];
    const target = currentItems.find(i => i.id === id);
    if (!target) return;

    const updatedEntity = { ...target, ...entity };
    const oldState = data;
    const newState = { ...data, [type]: currentItems.map(item => item.id === id ? updatedEntity : item) };
    setData(newState);
    saveLocalData(newState);

    if (isDemoMode || !supabase || dbNeedsSetup) return;
    
    const content = { ...updatedEntity };
    delete content.id;

    const { error } = await supabase
      .from('crm_entities')
      .upsert({ id, type, content, user_id: user?.id }, { onConflict: 'id' });

    if (error) {
      setData(oldState); 
      throw new Error(error.message);
    }
  };

  const deleteEntity = async (type: EntityType, id: string) => {
    const oldState = data;
    const newState = { ...data, [type]: data[type].filter(i => i.id !== id) };
    setData(newState);
    saveLocalData(newState);

    if (isDemoMode || !supabase || dbNeedsSetup) return;

    const { error } = await supabase.from('crm_entities').delete().eq('id', id);
    if (error) {
      setData(oldState); 
      throw new Error(error.message);
    }
  };

  const importData = async (newData: EntityState, isUpgrade = false) => {
    setData(newData);
    saveLocalData(newData);

    if (isDemoMode || !supabase || dbNeedsSetup) return;

    try {
      const allRows: any[] = [];
      for (const [type, items] of Object.entries(newData)) {
        items.forEach(item => {
          const content = { ...item };
          const rowId = content.id || generateUUID();
          delete content.id;
          allRows.push({ id: rowId, type, content, user_id: user?.id });
        });
      }

      if (allRows.length > 0) {
        await supabase.from('crm_entities').delete().neq('type', 'system-users');
        const chunkSize = 50;
        for (let i = 0; i < allRows.length; i += chunkSize) {
          const { error } = await supabase.from('crm_entities').insert(allRows.slice(i, i + chunkSize));
          if (error) throw error;
        }

        // Send Global Upgrade Signal
        if (isUpgrade) {
          await supabase.channel('global-sync-channel').send({
            type: 'broadcast',
            event: 'app-upgrade',
            payload: { version: APP_VERSION, sender: user?.id, timestamp: Date.now() }
          });
        }
      }
    } catch (e: any) {
      throw e;
    }
  };

  const receivePayment = async (invoiceId: string, amount: number, bankAccountId: string, date: string, reference: string) => {
    const invoice = data[EntityType.SALES_INVOICES].find(i => i.id === invoiceId);
    const bank = data[EntityType.BANK_CASH].find(i => i.id === bankAccountId);
    if (!invoice) return;

    const newAmountPaid = Number(invoice.amountPaid || 0) + amount;
    const newStatus = newAmountPaid >= invoice.amount ? 'Paid' : 'Unpaid';

    await updateEntity(EntityType.SALES_INVOICES, invoiceId, { amountPaid: newAmountPaid, status: newStatus });
    await addEntity(EntityType.SALES_ORDERS, {
      customer: invoice.customer, phone: invoice.phone, date, amount, status: 'Confirmed', items: invoice.items,
      description: `Payment via ${reference}. Linked to Inv ${invoiceId}.`
    });

    if (bank) {
      await updateEntity(EntityType.BANK_CASH, bankAccountId, { balance: Number(bank.balance || 0) + amount });
    }
  };

  const getEntity = (type: EntityType, id: string) => data[type]?.find((item) => item.id === id);

  return (
    <DataContext.Provider value={{ data, loading, dbNeedsSetup, lastSync, addEntity, updateEntity, deleteEntity, getEntity, importData, receivePayment }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};