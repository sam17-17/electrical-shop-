import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { EntityType, EntityState, GenericEntity } from '../types';
import { getSupabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const APP_VERSION = '2.6.0';

interface DataContextType {
  data: EntityState;
  loading: boolean;
  dbNeedsSetup: boolean;
  isRecovering: boolean;
  lastSync: Date | null;
  addEntity: (type: EntityType, entity: Omit<GenericEntity, 'id'>) => Promise<void>;
  updateEntity: (type: EntityType, id: string, entity: Partial<GenericEntity>) => Promise<void>;
  deleteEntity: (type: EntityType, id: string) => Promise<void>;
  getEntity: (type: EntityType, id: string) => GenericEntity | undefined;
  importData: (newData: EntityState, isUpgrade?: boolean) => Promise<void>;
  receivePayment: (invoiceId: string, amount: number, bankAccountId: string, date: string, reference: string) => Promise<void>;
  restoreFromLocal: () => Promise<void>;
  convertEntity: (sourceType: EntityType, targetType: EntityType, sourceId: string) => Promise<void>;
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
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const isFetching = useRef(false);
  const autoSyncDone = useRef(false);
  const supabase = getSupabase();

  const loadLocalData = useCallback(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_STATE, ...parsed };
      } catch (e) {
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  }, []);

  const saveLocalData = (newState: EntityState) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
  };

  const fetchData = useCallback(async (force = false) => {
    if (isFetching.current && !force) return;
    
    const local = loadLocalData();

    if (!isAuthenticated && !localStorage.getItem('zill_active_user')) {
      setData(INITIAL_STATE);
      setLoading(false);
      return;
    }

    if (isDemoMode) {
      setData(local);
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
          }
          setData(local);
        } else {
          setDbNeedsSetup(false);
          
          if (Array.isArray(dbData) && (dbData as any[]).length === 0) {
            const hasLocalData = Object.values(local).some((arr: any) => arr.length > 0);
            if (hasLocalData && !autoSyncDone.current) {
               setIsRecovering(true);
               setData(local);
            } else {
               setData(INITIAL_STATE);
            }
          } else {
            setIsRecovering(false);
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
          }
          autoSyncDone.current = true;
        }
      } catch (e) {
        setData(local);
      } finally {
        isFetching.current = false;
      }
    } else {
      setData(local);
    }
    setLoading(false);
  }, [isAuthenticated, supabase, isDemoMode, loadLocalData]);

  const handleRealtimeChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setData(prev => {
      const type = (newRecord?.type || oldRecord?.type) as EntityType;
      if (!type || !prev[type]) return prev;

      let newList = [...prev[type]];
      
      if (eventType === 'INSERT') {
        if (newList.some(item => item.id === newRecord.id)) return prev;
        newList.push({ ...newRecord.content, id: newRecord.id });
      } else if (eventType === 'UPDATE') {
        newList = newList.map(item => item.id === newRecord.id ? { ...newRecord.content, id: newRecord.id } : item);
      } else if (eventType === 'DELETE') {
        newList = newList.filter(item => item.id !== oldRecord.id);
      }

      const newState = { ...prev, [type]: newList };
      saveLocalData(newState);
      setLastSync(new Date());
      return newState;
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isDemoMode || !supabase || !isAuthenticated) return;
    const channel = supabase.channel('global-sync-pool')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_entities' }, handleRealtimeChange)
      .on('broadcast', { event: 'app-upgrade' }, () => fetchData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, isDemoMode, isAuthenticated, handleRealtimeChange, fetchData]);

  const addEntity = async (type: EntityType, entity: Omit<GenericEntity, 'id'>) => {
    const id = (entity as any).id || generateUUID();
    if (data[type].some(item => item.id === id)) return;

    if (type === EntityType.CUSTOMERS || type === EntityType.SUPPLIERS) {
      const newName = (entity as any).name?.toString().toLowerCase().trim();
      if (data[type].some(item => item.name?.toString().toLowerCase().trim() === newName)) {
        throw new Error(`A ${type.slice(0, -1)} with this name already exists.`);
      }
    }

    const newEntity = { ...entity, id };
    const oldState = data;
    const newState = { ...data, [type]: [...data[type], newEntity] };
    
    setData(newState);
    saveLocalData(newState);
    if (isDemoMode || !supabase || dbNeedsSetup) return;
    const { error } = await supabase.from('crm_entities').upsert([{ id, type, content: { ...entity }, user_id: user?.id }], { onConflict: 'id' });
    if (error) { setData(oldState); throw new Error(error.message); }
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
    const { error } = await supabase.from('crm_entities').upsert({ id, type, content: { ...updatedEntity }, user_id: user?.id }, { onConflict: 'id' });
    if (error) { setData(oldState); throw new Error(error.message); }
  };

  const deleteEntity = async (type: EntityType, id: string) => {
    const oldState = data;
    const newState = { ...data, [type]: data[type].filter(i => i.id !== id) };
    setData(newState);
    saveLocalData(newState);
    if (isDemoMode || !supabase || dbNeedsSetup) return;
    const { error } = await supabase.from('crm_entities').delete().eq('id', id);
    if (error) { setData(oldState); throw new Error(error.message); }
  };

  /**
   * LINKING ENGINE:
   * Maps fields from source document to target document automatically.
   */
  const convertEntity = async (sourceType: EntityType, targetType: EntityType, sourceId: string) => {
    const source = data[sourceType].find(i => i.id === sourceId);
    if (!source) throw new Error("Source document not found");

    const prefixMap: Record<string, string> = {
        [EntityType.SALES_ORDERS]: 'RCP-',
        [EntityType.DELIVERY_NOTES]: 'DN-',
        [EntityType.SALES_INVOICES]: 'INV-'
    };

    const nextId = generateUUID();
    const prefix = prefixMap[targetType] || 'DOC-';
    const existing = data[targetType] || [];
    const docRef = `${prefix}${existing.length + 1001}`;

    const common = {
        customer: source.customer,
        phone: source.phone,
        items: source.items || [],
        amount: source.amount || 0,
        date: new Date().toISOString().split('T')[0],
        docRef: docRef,
        sourceRef: `Converted from ${source.docRef || source.id}`
    };

    let specific = {};
    if (targetType === EntityType.SALES_ORDERS) specific = { status: 'Confirmed' };
    if (targetType === EntityType.DELIVERY_NOTES) specific = { status: 'Dispatched' };
    if (targetType === EntityType.SALES_INVOICES) specific = { status: 'Unpaid', amountPaid: 0 };

    await addEntity(targetType, { ...common, ...specific });
    
    // Optional: Mark source as converted/accepted
    if (sourceType === EntityType.SALES_QUOTES) {
        await updateEntity(sourceType, sourceId, { status: 'Accepted' });
    }
  };

  const importData = async (newData: EntityState, isUpgrade = false) => {
    setData(newData);
    saveLocalData(newData);
    if (isDemoMode || !supabase || dbNeedsSetup) return;
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
      const chunkSize = 50;
      for (let i = 0; i < allRows.length; i += chunkSize) {
        await supabase.from('crm_entities').upsert(allRows.slice(i, i + chunkSize), { onConflict: 'id' });
      }
    }
    setIsRecovering(false);
  };

  const restoreFromLocal = async () => {
    const local = loadLocalData();
    await importData(local, true);
    setIsRecovering(false);
  };

  const receivePayment = async (invoiceId: string, amount: number, bankAccountId: string, date: string, reference: string) => {
    const invoice = data[EntityType.SALES_INVOICES].find(i => i.id === invoiceId);
    const bank = data[EntityType.BANK_CASH].find(i => i.id === bankAccountId);
    if (!invoice) return;
    const newAmountPaid = Number(invoice.amountPaid || 0) + amount;
    const newStatus = newAmountPaid >= invoice.amount ? 'Paid' : 'Unpaid';
    await updateEntity(EntityType.SALES_INVOICES, invoiceId, { amountPaid: newAmountPaid, status: newStatus });
    if (bank) await updateEntity(EntityType.BANK_CASH, bankAccountId, { balance: Number(bank.balance || 0) + amount });
  };

  const getEntity = (type: EntityType, id: string) => data[type]?.find((item) => item.id === id);

  return (
    <DataContext.Provider value={{ data, loading, dbNeedsSetup, isRecovering, lastSync, addEntity, updateEntity, deleteEntity, getEntity, importData, receivePayment, restoreFromLocal, convertEntity }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
