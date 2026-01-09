
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { EntityType, EntityState, GenericEntity } from '../types';
import { getSupabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
  data: EntityState;
  loading: boolean;
  dbNeedsSetup: boolean;
  addEntity: (type: EntityType, entity: Omit<GenericEntity, 'id'>) => Promise<void>;
  updateEntity: (type: EntityType, id: string, entity: Partial<GenericEntity>) => Promise<void>;
  deleteEntity: (type: EntityType, id: string) => Promise<void>;
  getEntity: (type: EntityType, id: string) => GenericEntity | undefined;
  importData: (newData: EntityState) => Promise<void>;
  receivePayment: (invoiceId: string, amount: number, bankAccountId: string, date: string, reference: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_STATE: EntityState = Object.values(EntityType).reduce((acc, type) => {
  acc[type as EntityType] = [];
  return acc;
}, {} as EntityState);

const LOCAL_STORAGE_KEY = 'zill_crm_local_data';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isDemoMode } = useAuth();
  const [data, setData] = useState<EntityState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [dbNeedsSetup, setDbNeedsSetup] = useState(false);
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
        console.error('Failed to parse local data', e);
        setData(INITIAL_STATE);
        return INITIAL_STATE;
      }
    } else {
      setData(INITIAL_STATE);
      return INITIAL_STATE;
    }
  }, []);

  const saveLocalData = (newState: EntityState) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
  };

  const fetchData = useCallback(async () => {
    if (!isAuthenticated && !localStorage.getItem('zill_mock_user')) {
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
      try {
        const { data: dbData, error } = await supabase
          .from('crm_entities')
          .select('*');

        if (error) {
          if (error.message.includes("Could not find the table") || error.code === 'PGRST116' || error.message.includes("404")) {
            console.warn('Database table missing or cache error. Using local storage.');
            setDbNeedsSetup(true);
            loadLocalData();
          } else {
            console.warn('Supabase fetch issue:', error.message);
            loadLocalData();
          }
        } else {
          setDbNeedsSetup(false);
          const groupedData = { ...INITIAL_STATE };
          // Cast dbData to any[] to avoid "unknown" type issues when processing rows
          (dbData as any[])?.forEach((row) => {
            const type = row.type as EntityType;
            if (groupedData[type]) {
              groupedData[type].push({ ...row.content, id: row.id });
            }
          });
          
          setData(groupedData);

          // Automatic Sync Logic: If cloud is empty but local has data, sync it once
          // FIX: Explicitly cast dbData to any[] to ensure the .length property is accessible on narrowed array types.
          if (Array.isArray(dbData) && (dbData as any[]).length === 0 && !autoSyncDone.current) {
            const localData = loadLocalData();
            const hasData = Object.values(localData).some(arr => arr.length > 0);
            if (hasData) {
              console.log('Detected local data with empty cloud. Triggering automatic sync...');
              importData(localData).catch(err => console.error("Auto-sync failed", err));
            }
          }
          autoSyncDone.current = true;
        }
      } catch (e) {
        console.error('Unexpected error fetching data:', e);
        loadLocalData();
      }
    } else {
      loadLocalData();
    }
    setLoading(false);
  }, [isAuthenticated, supabase, isDemoMode, loadLocalData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isDemoMode || !supabase || !isAuthenticated || dbNeedsSetup) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_entities',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, isDemoMode, isAuthenticated, fetchData, dbNeedsSetup]);

  const addEntity = async (type: EntityType, entity: Omit<GenericEntity, 'id'>) => {
    const id = (entity as any).id || Math.random().toString(36).substr(2, 9);
    const newEntity = { ...entity, id };

    // Optimistic UI Update
    const oldState = data;
    const newState = { ...data, [type]: [...data[type], newEntity] };
    setData(newState);
    saveLocalData(newState);

    if (isDemoMode || !supabase || dbNeedsSetup) return;

    if (!user?.id) throw new Error("User session expired. Please log in again.");

    const content = { ...entity };
    delete (content as any).id;

    const { error } = await supabase
      .from('crm_entities')
      .insert([{ id, type, content, user_id: user.id }]);

    if (error) {
      if (error.message.includes("Could not find the table")) {
        setDbNeedsSetup(true);
      } else {
        setData(oldState); // Rollback on non-setup error
        throw new Error(error.message);
      }
    }
  };

  const updateEntity = async (type: EntityType, id: string, entity: Partial<GenericEntity>) => {
    const currentItems = data[type];
    const target = currentItems.find(i => i.id === id);
    if (!target) return;

    const updatedEntity = { ...target, ...entity };
    
    // Optimistic UI Update
    const oldState = data;
    const updatedItems = currentItems.map(item => item.id === id ? updatedEntity : item);
    const newState = { ...data, [type]: updatedItems };
    setData(newState);
    saveLocalData(newState);

    if (isDemoMode || !supabase || dbNeedsSetup) return;
    
    const content = { ...updatedEntity };
    delete content.id;

    const { error } = await supabase
      .from('crm_entities')
      .update({ content })
      .eq('id', id);

    if (error) {
      setData(oldState); // Rollback
      throw new Error(error.message);
    }
  };

  const deleteEntity = async (type: EntityType, id: string) => {
    const oldState = data;
    const newState = { ...data, [type]: data[type].filter(i => i.id !== id) };
    setData(newState);
    saveLocalData(newState);

    if (isDemoMode || !supabase || dbNeedsSetup) return;

    const { error } = await supabase
      .from('crm_entities')
      .delete()
      .eq('id', id);

    if (error) {
      setData(oldState); // Rollback
      throw new Error(error.message);
    }
  };

  const receivePayment = async (invoiceId: string, amount: number, bankAccountId: string, date: string, reference: string) => {
    const invoice = data[EntityType.SALES_INVOICES].find(i => i.id === invoiceId);
    const bank = data[EntityType.BANK_CASH].find(i => i.id === bankAccountId);
    if (!invoice) return;

    const newAmountPaid = Number(invoice.amountPaid || 0) + amount;
    const newStatus = newAmountPaid >= invoice.amount ? 'Paid' : 'Unpaid';

    await updateEntity(EntityType.SALES_INVOICES, invoiceId, {
      amountPaid: newAmountPaid,
      status: newStatus
    });

    await addEntity(EntityType.SALES_ORDERS, {
      customer: invoice.customer,
      phone: invoice.phone,
      date,
      amount,
      status: 'Confirmed',
      items: invoice.items,
      description: `Payment via ${reference}. Linked to Inv ${invoiceId}.`
    });

    if (bank) {
      await updateEntity(EntityType.BANK_CASH, bankAccountId, {
        balance: Number(bank.balance || 0) + amount
      });
    }
  };

  const getEntity = (type: EntityType, id: string) => {
    return data[type]?.find((item) => item.id === id);
  };

  const importData = async (newData: EntityState) => {
    setData(newData);
    saveLocalData(newData);

    if (isDemoMode || !supabase || dbNeedsSetup) return;

    try {
      // Clear cloud and push new
      await supabase.from('crm_entities').delete().neq('id', 'dummy_to_allow_mass_delete'); 
      
      for (const [type, items] of Object.entries(newData)) {
        if (items.length > 0) {
          const rows = items.map(item => ({
            id: item.id || Math.random().toString(36).substr(2, 9),
            type,
            content: { ...item },
            user_id: user?.id
          }));
          rows.forEach(r => delete r.content.id);
          const { error } = await supabase.from('crm_entities').insert(rows);
          if (error) throw error;
        }
      }
    } catch (e: any) {
      console.error('Cloud import failed:', e.message);
      // We don't rollback local state here because the user likely wants their data locally regardless
    }
  };

  return (
    <DataContext.Provider value={{ data, loading, dbNeedsSetup, addEntity, updateEntity, deleteEntity, getEntity, importData, receivePayment }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
