import React, { createContext, useContext, useState, useEffect } from 'react';
import { EntityType, EntityState, GenericEntity } from '../types';

interface DataContextType {
  data: EntityState;
  addEntity: (type: EntityType, entity: Omit<GenericEntity, 'id'>) => void;
  updateEntity: (type: EntityType, id: string, entity: Partial<GenericEntity>) => void;
  deleteEntity: (type: EntityType, id: string) => void;
  getEntity: (type: EntityType, id: string) => GenericEntity | undefined;
  importData: (newData: EntityState) => void;
  receivePayment: (invoiceId: string, amount: number, bankAccountId: string, date: string, reference: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Seed Data
// CRITICAL: This initial data contains the default admin credentials.
// Do not remove this default user, or access will be lost on a fresh load.
const INITIAL_DATA: EntityState = {
  [EntityType.SUMMARY]: [],
  [EntityType.BANK_CASH]: [],
  [EntityType.CUSTOMERS]: [],
  [EntityType.SALES_QUOTES]: [],
  [EntityType.SALES_ORDERS]: [],
  [EntityType.SALES_INVOICES]: [],
  [EntityType.DELIVERY_NOTES]: [],
  [EntityType.SUPPLIERS]: [],
  [EntityType.PURCHASE_QUOTES]: [],
  [EntityType.PURCHASE_ORDERS]: [],
  [EntityType.PURCHASE_INVOICES]: [],
  [EntityType.INVENTORY]: [],
  [EntityType.PROJECTS]: [],
  [EntityType.EMPLOYEES]: [],
  [EntityType.JOURNAL]: [],
  [EntityType.REPORTS]: [],
  [EntityType.SETTINGS]: [],
  // Initialize with a default admin so the user isn't locked out
  [EntityType.SYSTEM_USERS]: [
    {
      id: 'default-admin',
      name: 'admin',
      email: 'admin@zill.com',
      role: 'Admin',
      pin: '1234',
      status: 'Active'
    }
  ],
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Try to load from local storage, else use initial data
  const [data, setData] = useState<EntityState>(() => {
    try {
      const saved = localStorage.getItem('zill_crm_db_clean');
      // If we have saved data, parse it.
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure SYSTEM_USERS exists in the saved data (backward compatibility)
        if (!parsed[EntityType.SYSTEM_USERS] || parsed[EntityType.SYSTEM_USERS].length === 0) {
            parsed[EntityType.SYSTEM_USERS] = INITIAL_DATA[EntityType.SYSTEM_USERS];
        }
        return parsed;
      }
      return INITIAL_DATA;
    } catch (e) {
      return INITIAL_DATA;
    }
  });

  // Save to local storage whenever data changes
  useEffect(() => {
    localStorage.setItem('zill_crm_db_clean', JSON.stringify(data));
  }, [data]);

  // Helper to check and create customer
  const checkAndCreateCustomer = (currentState: EntityState, entity: any) => {
      if (!entity.customer) return currentState;

      const customers = currentState[EntityType.CUSTOMERS] || [];
      const exists = customers.find(c => c.name.toLowerCase() === entity.customer.toLowerCase());
      
      if (!exists) {
          const newCustomer = {
              id: generateId(),
              name: entity.customer,
              phone: entity.phone || '', // Capture phone from invoice if available
              email: '', // Optional or allow user to fill later
              contact: 'Main Contact'
          };
          return {
              ...currentState,
              [EntityType.CUSTOMERS]: [...customers, newCustomer]
          };
      }
      return currentState;
  };

  const addEntity = (type: EntityType, entity: Omit<GenericEntity, 'id'>) => {
    // If ID provided in entity (e.g. custom invoice number), use it, else generate one
    const id = entity.id || generateId();
    const newEntity = { ...entity, id };

    setData((prev) => {
      let nextState = {
          ...prev,
          [type]: [...(prev[type] || []), newEntity],
      };

      // AUTO-CREATE CUSTOMER LOGIC
      if ([EntityType.SALES_INVOICES, EntityType.SALES_QUOTES, EntityType.SALES_ORDERS].includes(type)) {
          nextState = checkAndCreateCustomer(nextState, newEntity);
      }

      return nextState;
    });
  };

  const updateEntity = (type: EntityType, id: string, entity: Partial<GenericEntity>) => {
    setData((prev) => {
      const list = prev[type] || [];
      const oldItem = list.find((item) => item.id === id);
      
      if (!oldItem) return prev; // Should not happen

      const newItem = { ...oldItem, ...entity };
      
      // Update the list with the new item
      const updatedList = list.map((item) => (item.id === id ? newItem : item));
      
      let nextState = {
        ...prev,
        [type]: updatedList,
      };

      // AUTO-CREATE CUSTOMER LOGIC ON UPDATE
      if ([EntityType.SALES_INVOICES, EntityType.SALES_QUOTES, EntityType.SALES_ORDERS].includes(type)) {
          nextState = checkAndCreateCustomer(nextState, newItem);
      }

      // --- AUTO-GENERATE RECEIPT LOGIC (MANUAL EDIT) ---
      // If we are updating a Sales Invoice, and the status changes to 'Paid'
      // and it wasn't 'Paid' before, create a Receipt (SALES_ORDERS).
      if (type === EntityType.SALES_INVOICES && newItem.status === 'Paid' && oldItem.status !== 'Paid') {
        
        // Generate a Receipt Number
        const existingReceipts = nextState[EntityType.SALES_ORDERS] || [];
        const receiptId = `RCP-${existingReceipts.length + 2001}`;

        const receipt: GenericEntity = {
          id: receiptId,
          customer: newItem.customer,
          phone: newItem.phone, // Carry over phone
          date: new Date().toISOString().split('T')[0], // Today's date
          amount: newItem.amount,
          status: 'Confirmed',
          items: newItem.items, // Copy line items for the receipt
          description: `Auto-generated receipt for Invoice #${newItem.id || 'N/A'}.`,
        };

        // Add to SALES_ORDERS (which is mapped to Receipts in the UI)
        nextState = {
          ...nextState,
          [EntityType.SALES_ORDERS]: [...(nextState[EntityType.SALES_ORDERS] || []), receipt]
        };
      }
      // -----------------------------------

      return nextState;
    });
  };

  const receivePayment = (invoiceId: string, amount: number, bankAccountId: string, date: string, reference: string) => {
      setData((prev) => {
          // 1. Find the Invoice
          const invoices = prev[EntityType.SALES_INVOICES] || [];
          const targetInvoice = invoices.find(inv => inv.id === invoiceId);
          if (!targetInvoice) return prev;

          // 2. Calculate new totals
          const currentPaid = targetInvoice.amountPaid || 0;
          const newTotalPaid = Number(currentPaid) + Number(amount);
          
          // Determine Status: Only 'Paid' if fully paid, otherwise 'Pending' (acting as Partial)
          // We check with a small epsilon for floating point safety, or just >=
          const newStatus = newTotalPaid >= targetInvoice.amount ? 'Paid' : 'Pending';

          const updatedInvoice: GenericEntity = { 
              ...targetInvoice, 
              status: newStatus,
              amountPaid: newTotalPaid 
          };
          
          const updatedInvoices = invoices.map(inv => inv.id === invoiceId ? updatedInvoice : inv);

          // 3. Create Receipt (Sales Order)
          const existingReceipts = prev[EntityType.SALES_ORDERS] || [];
          const receiptId = `RCP-${existingReceipts.length + 3001}`;
          
          const isPartial = newStatus !== 'Paid';
          
          const newReceipt: GenericEntity = {
              id: receiptId,
              customer: updatedInvoice.customer,
              phone: updatedInvoice.phone,
              date: date,
              amount: amount, // The amount received NOW, not the total invoice amount
              status: 'Confirmed',
              items: updatedInvoice.items, // We keep items for reference, but amount matches payment
              description: `${isPartial ? 'Partial ' : ''}Payment Received via ${reference}. Linked to Invoice ${invoiceId}. Balance Remaining: ${Math.max(0, updatedInvoice.amount - newTotalPaid)}`,
          };
          const updatedReceipts = [...existingReceipts, newReceipt];

          // 4. Update Bank/Cash Balance
          const bankAccounts = prev[EntityType.BANK_CASH] || [];
          const targetAccount = bankAccounts.find(acc => acc.id === bankAccountId);
          let updatedBankAccounts = bankAccounts;

          if (targetAccount) {
              const newBalance = Number(targetAccount.balance || 0) + Number(amount);
              const updatedAccount = { ...targetAccount, balance: newBalance };
              updatedBankAccounts = bankAccounts.map(acc => acc.id === bankAccountId ? updatedAccount : acc);
          }

          return {
              ...prev,
              [EntityType.SALES_INVOICES]: updatedInvoices,
              [EntityType.SALES_ORDERS]: updatedReceipts,
              [EntityType.BANK_CASH]: updatedBankAccounts,
          };
      });
  };

  const deleteEntity = (type: EntityType, id: string) => {
    // PROTECT DEFAULT ADMIN credentials from being deleted
    if (type === EntityType.SYSTEM_USERS && id === 'default-admin') {
      alert("System Safeguard: Cannot delete the default administrator account.");
      return;
    }

    setData((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => item.id !== id),
    }));
  };

  const getEntity = (type: EntityType, id: string) => {
    return data[type]?.find((item) => item.id === id);
  };

  const importData = (newData: EntityState) => {
    setData(newData);
  };

  return (
    <DataContext.Provider value={{ data, addEntity, updateEntity, deleteEntity, getEntity, importData, receivePayment }}>
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