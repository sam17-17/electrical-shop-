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
  
  const isFetching = useRef(false);
  const autoSyncDone = useRef(false);
  const supabase = getSupabase();

  // Load data from local storage as a fallback or for Demo mode
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
    }
    setData(INITIAL_STATE);
    return INITIAL_STATE;
  }, []);

  const saveLocalData = (newState: EntityState) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
  };

  const fetchData = useCallback(async (force = false) => {
    // Prevent overlapping fetches which cause duplication in UI state
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
            console.warn('Supabase fetch issue:', error.message);
            loadLocalData();
          }
        } else {
          setDbNeedsSetup(false);
          const groupedData = { ...INITIAL_STATE };
          (dbData as any[])?.forEach((row) => {
            const type = row.type as EntityType;
            if (groupedData[type]) {
              // Ensure we don't duplicate if for some reason the DB has same IDs
              const exists = groupedData[type].some(item => item.id === row.id);
              if (!exists) {
                groupedData[type].push({ ...row.content, id: row.id });
              }
            }
          });
          
          setData(groupedData);
          saveLocalData(groupedData);

          // Auto-sync local to cloud if cloud is empty on first load
          if (Array.isArray(dbData) && dbData.length === 0 && !autoSyncDone.current) {
            const localData = loadLocalData();
            const hasLocalContent = Object.values(localData).some((arr: any) => arr.length > 0);
            if (hasLocalContent) {
              await importData(localData);
            }
          }
          autoSyncDone.current = true;
        }
      } catch (e) {
        console.error('Unexpected error fetching data:', e);
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

  // Realtime subscription with a small debounce to handle bulk updates
  useEffect(() => {
    if (isDemoMode || !supabase || !isAuthenticated || dbNeedsSetup) return;

    let timeoutId: any;
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_entities' },
        () => {
          // Debounce fetch to prevent storm of requests during bulk operations
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fetchData(true), 200);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [supabase, isDemoMode, isAuthenticated, fetchData, dbNeedsSetup]);

  const addEntity = async (type: EntityType, entity: Omit<GenericEntity, 'id'>) => {
    const id = (entity as any).id || Math.random().toString(36).substr(2, 9);
    const newEntity = { ...entity, id };

    // Optimistic local update
    const oldState = data;
    const newState = { ...data, [type]: [...data[type], newEntity] };
    setData(newState);
    saveLocalData(newState);

    if (isDemoMode || !supabase || dbNeedsSetup) return;

    if (!user?.id) throw new Error("Session invalid. Re-authenticate.");

    const content = { ...entity };
    delete (content as any).id;

    // Use upsert to prevent duplication if a race condition occurs
    const { error } = await supabase
      .from('crm_entities')
      .upsert([{ id, type, content, user_id: user.id }], { onConflict: 'id' });

    if (error) {
      if (error.message.includes("Could not find the table")) {
        setDbNeedsSetup(true);
      } else {
        setData(oldState); 
        throw new Error(error.message);
      }
    }
  };

  const updateEntity = async (type: EntityType, id: string, entity: Partial<GenericEntity>) => {
    const currentItems = data[type];
    const target = currentItems.find(i => i.id === id);
    if (!target) return;

    const updatedEntity = { ...target, ...entity };
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

    const { error } = await supabase
      .from('crm_entities')
      .delete()
      .eq('id', id);

    if (error) {
      setData(oldState); 
      throw new Error(error.message);
    }
  };

  const receivePayment = async (invoiceId: string, amount: number, bankAccountId: string, date: string, reference: string) => {
    const invoice = data[EntityType.SALES_INVOICES].find(i => i.id === invoiceId);
    const bank = data[EntityType.BANK_CASH].find(i => i.id === bankAccountId);
    if (!invoice) return;

    const newAmountPaid = Number(invoice.amountPaid || 0) + amount;
    const newStatus = newAmountPaid >= invoice.amount ? 'Paid' : 'Unpaid';

    // Atomic updates across entities
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
    // Replace local state immediately
    setData(newData);
    saveLocalData(newData);

    if (isDemoMode || !supabase || dbNeedsSetup) return;

    try {
      // 1. Prepare all rows for a single bulk upsert (more reliable than a loop)
      const allRows: any[] = [];
      for (const [type, items] of Object.entries(newData)) {
        items.forEach(item => {
          const content = { ...item };
          const rowId = content.id || Math.random().toString(36).substr(2, 9);
          delete content.id;
          allRows.push({
            id: rowId,
            type,
            content,
            user_id: user?.id
          });
        });
      }

      if (allRows.length > 0) {
        // Use a single bulk delete and insert or just a massive upsert
        // For import, we delete old non-system data first to ensure clean state
        await supabase.from('crm_entities').delete().neq('type', 'system-users');
        
        // Chunk inserts if extremely large
        const chunkSize = 50;
        for (let i = 0; i < allRows.length; i += chunkSize) {
          const chunk = allRows.slice(i, i + chunkSize);
          const { error } = await supabase.from('crm_entities').insert(chunk);
          if (error) throw error;
        }
      }
    } catch (e: any) {
      console.error('Cloud mass-sync failed:', e.message);
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