import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { EntityType, EntityState, GenericEntity } from '../types';
import { getSupabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
  data: EntityState;
  loading: boolean;
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
  
  const supabase = getSupabase();

  // Helper to load from local storage
  const loadLocalData = useCallback(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all keys from EntityType exist
        const merged = { ...INITIAL_STATE, ...parsed };
        setData(merged);
      } catch (e) {
        console.error('Failed to parse local data', e);
        setData(INITIAL_STATE);
      }
    } else {
      setData(INITIAL_STATE);
    }
  }, []);

  // Helper to save to local storage
  const saveLocalData = (newState: EntityState) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
  };

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setData(INITIAL_STATE);
      setLoading(false);
      return;
    }

    setLoading(true);

    // If in Demo Mode, always use Local Storage
    if (isDemoMode) {
      loadLocalData();
      setLoading(false);
      return;
    }

    // Try Supabase if available
    if (supabase) {
      try {
        const { data: dbData, error } = await supabase
          .from('crm_entities')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          // If table doesn't exist, fall back to local storage instead of erroring out
          console.warn('Supabase fetch issue (likely missing table). Falling back to local storage:', error.message);
          loadLocalData();
        } else {
          const groupedData = { ...INITIAL_STATE };
          dbData?.forEach((row) => {
            const type = row.type as EntityType;
            if (groupedData[type]) {
              groupedData[type].push({ ...row.content, id: row.id });
            }
          });
          setData(groupedData);
        }
      } catch (e) {
        console.error('Unexpected error fetching data:', e);
        loadLocalData();
      }
    } else {
      loadLocalData();
    }
    setLoading(false);
  }, [isAuthenticated, user, supabase, isDemoMode, loadLocalData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addEntity = async (type: EntityType, entity: Omit<GenericEntity, 'id'>) => {
    const id = (entity as any).id || Math.random().toString(36).substr(2, 9);
    const newEntity = { ...entity, id };

    if (isDemoMode || !supabase) {
      const newState = { ...data, [type]: [...data[type], newEntity] };
      setData(newState);
      saveLocalData(newState);
      return;
    }

    const content = { ...entity };
    delete (content as any).id;

    const { error } = await supabase
      .from('crm_entities')
      .insert([{ id, type, content, user_id: user.id }]);

    if (error) {
      console.error('Error adding entity:', error);
      // Fail over to local state for UX continuity
      const newState = { ...data, [type]: [...data[type], newEntity] };
      setData(newState);
      throw error;
    }
    await fetchData();
  };

  const updateEntity = async (type: EntityType, id: string, entity: Partial<GenericEntity>) => {
    const currentItems = data[type];
    const updatedItems = currentItems.map(item => item.id === id ? { ...item, ...entity } : item);
    const newState = { ...data, [type]: updatedItems };

    if (isDemoMode || !supabase) {
      setData(newState);
      saveLocalData(newState);
      return;
    }
    
    const target = updatedItems.find(i => i.id === id);
    if (!target) return;

    const content = { ...target };
    delete content.id;

    const { error } = await supabase
      .from('crm_entities')
      .update({ content })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating entity:', error);
      setData(newState); // Optimistic local update
      throw error;
    }
    await fetchData();
  };

  const deleteEntity = async (type: EntityType, id: string) => {
    const newState = { ...data, [type]: data[type].filter(i => i.id !== id) };

    if (isDemoMode || !supabase) {
      setData(newState);
      saveLocalData(newState);
      return;
    }

    const { error } = await supabase
      .from('crm_entities')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting entity:', error);
      setData(newState); // Optimistic local delete
      throw error;
    }
    await fetchData();
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

    const receiptId = `RCP-${Date.now()}`;
    await addEntity(EntityType.SALES_ORDERS, {
      id: receiptId,
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
    if (isDemoMode || !supabase) {
      setData(newData);
      saveLocalData(newData);
      return;
    }

    try {
      await supabase.from('crm_entities').delete().eq('user_id', user.id);
      
      for (const [type, items] of Object.entries(newData)) {
        if (items.length > 0) {
          const rows = items.map(item => ({
            id: item.id || Math.random().toString(36).substr(2, 9),
            type,
            content: { ...item },
            user_id: user.id
          }));
          rows.forEach(r => delete r.content.id);
          await supabase.from('crm_entities').insert(rows);
        }
      }
    } catch (e) {
      console.error('Failed to import to cloud, saving locally', e);
      setData(newData);
      saveLocalData(newData);
    }
    await fetchData();
  };

  return (
    <DataContext.Provider value={{ data, loading, addEntity, updateEntity, deleteEntity, getEntity, importData, receivePayment }}>
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