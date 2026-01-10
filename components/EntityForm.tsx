import React, { useState, useEffect, useMemo } from 'react';
import { DataColumn, GenericEntity, LineItem, EntityType } from '../types';
import { Plus, Trash2, RefreshCw, Key } from 'lucide-react';
import { useData } from '../context/DataContext';

interface EntityFormProps {
  columns: DataColumn[];
  initialData?: GenericEntity;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  entityType?: EntityType;
}

// Helper to generate a valid UUID v4
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const EntityForm: React.FC<EntityFormProps> = ({ columns, initialData, onSubmit, onCancel, entityType }) => {
  const [formData, setFormData] = useState<any>({});
  const { data } = useData();

  const inventoryItems = useMemo(() => data[EntityType.INVENTORY] || [], [data]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      const defaults: any = {};
      
      // We always generate a UUID for the database primary key
      defaults['id'] = generateUUID();

      // For human-readable IDs, we populate the 'reference' or 'id' property in content
      // Note: If the column in DB is UUID, 'INV-1001' as ID will fail. 
      // We prefer using UUIDs for 'id' and a custom field for the label.
      if (entityType) {
         if ([EntityType.SALES_INVOICES, EntityType.SALES_QUOTES, EntityType.SALES_ORDERS, EntityType.DELIVERY_NOTES, EntityType.PURCHASE_ORDERS, EntityType.PURCHASE_QUOTES].includes(entityType)) {
             const prefixMap: Record<string, string> = {
                 [EntityType.SALES_INVOICES]: 'INV-',
                 [EntityType.SALES_QUOTES]: 'QTN-',
                 [EntityType.SALES_ORDERS]: 'RCP-',
                 [EntityType.DELIVERY_NOTES]: 'DN-',
                 [EntityType.PURCHASE_ORDERS]: 'PO-',
                 [EntityType.PURCHASE_QUOTES]: 'PQ-',
                 [EntityType.PURCHASE_INVOICES]: 'PINV-'
             };
             const prefix = prefixMap[entityType] || 'DOC-';
             const existing = data[entityType] || [];
             const count = existing.length + 1001;
             
             // We'll store the human readable ID in a separate field called 'docRef' 
             // so the primary 'id' can remain a safe UUID.
             defaults['docRef'] = `${prefix}${count}`;
         }
      }

      columns.forEach(col => {
        if (col.key === 'id') return; // Skip primary key, handled above
        
        if (col.type === 'status' && col.options && col.options.length > 0) {
          defaults[col.key] = col.options[0];
        } else if (col.type === 'date') {
            defaults[col.key] = new Date().toISOString().split('T')[0];
        } else if (col.type === 'items') {
            defaults[col.key] = [];
        } else if (col.type === 'currency' && col.key === 'amount') {
            defaults[col.key] = 0;
        } else {
            defaults[col.key] = '';
        }
      });
      setFormData(prev => ({...defaults, ...prev}));
    }
  }, [initialData, columns, entityType]);

  const handleChange = (key: string, value: any, column?: DataColumn) => {
    setFormData((prev: any) => {
        const newData = { ...prev, [key]: value };

        if (column?.sourceType) {
            const sourceList = data[column.sourceType] || [];
            const match = sourceList.find((item: any) => item.name === value);
            
            if (match) {
                columns.forEach(targetCol => {
                    if (targetCol.key !== key && targetCol.key !== 'id' && targetCol.type !== 'items') {
                         if (match[targetCol.key] !== undefined && match[targetCol.key] !== null) {
                             newData[targetCol.key] = match[targetCol.key];
                         }
                    }
                });
            }
        }
        
        return newData;
    });
  };

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    handleChange('pin', pin);
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: generateUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    const currentItems = formData.items || [];
    const updatedItems = [...currentItems, newItem];
    setFormData({ ...formData, items: updatedItems });
    updateGrandTotal(updatedItems);
  };

  const handleRemoveItem = (itemId: string) => {
    const currentItems = formData.items || [];
    const updatedItems = currentItems.filter((i: LineItem) => i.id !== itemId);
    setFormData({ ...formData, items: updatedItems });
    updateGrandTotal(updatedItems);
  };

  const handleItemChange = (itemId: string, field: keyof LineItem, value: any) => {
    const currentItems = formData.items || [];
    const updatedItems = currentItems.map((item: LineItem) => {
      if (item.id === itemId) {
        let updatedItem = { ...item, [field]: value };
        
        if (field === 'description') {
           const inventoryMatch = inventoryItems.find(inv => inv.name === value || inv.code === value);
           if (inventoryMatch) {
               updatedItem.unitPrice = Number(inventoryMatch.price);
           }
        }

        if (field === 'quantity' || field === 'unitPrice' || field === 'description') {
            updatedItem.total = Number(updatedItem.quantity) * Number(updatedItem.unitPrice);
        }
        return updatedItem;
      }
      return item;
    });
    setFormData({ ...formData, items: updatedItems });
    updateGrandTotal(updatedItems);
  };

  const updateGrandTotal = (items: LineItem[]) => {
      const subTotal = items.reduce((sum, item) => sum + item.total, 0);
      const vat = subTotal * 0.18; 
      const total = subTotal + vat;
      setFormData((prev: any) => ({ ...prev, amount: total }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {columns.map((col) => {
        if (col.type === 'readonly') {
             // If we have a custom human-readable ID, show that instead of the raw UUID
             const displayValue = (col.key === 'id' && formData['docRef']) ? formData['docRef'] : (formData[col.key] || '');
             return (
                <div key={col.key} className="flex flex-col space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">{col.label}</label>
                    <input 
                        type="text" 
                        value={displayValue} 
                        disabled 
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 text-sm"
                    />
                </div>
             );
        }

        if (col.type === 'items') {
            return (
                <div key={col.key} className="space-y-2 border-t border-b border-slate-100 py-4 my-2">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-slate-700">{col.label}</label>
                        <button type="button" onClick={handleAddItem} className="text-indigo-600 hover:text-indigo-700 text-xs font-medium flex items-center">
                            <Plus className="w-3 h-3 mr-1" /> Add Item
                        </button>
                    </div>
                    
                    <datalist id="inventory-list">
                        {inventoryItems.map(item => (
                            <option key={item.id} value={item.name}>
                                {item.code} - KES {item.price}
                            </option>
                        ))}
                    </datalist>
                    
                    <div className="bg-slate-50 rounded-lg p-2 space-y-2">
                        {(formData.items || []).length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-2">No items added yet.</p>
                        )}
                        {(formData.items || []).map((item: LineItem) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-5">
                                    <label className="text-[10px] text-slate-500 block mb-1">Description / Product</label>
                                    <input 
                                        list="inventory-list"
                                        type="text" 
                                        placeholder="Search or type item..."
                                        value={item.description}
                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm"
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] text-slate-500 block mb-1">Qty</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm text-right"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] text-slate-500 block mb-1">Price</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm text-right"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] text-slate-500 block mb-1">Total</label>
                                    <div className="w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm text-right text-slate-600">
                                        {item.total.toFixed(2)}
                                    </div>
                                </div>
                                <div className="col-span-1 flex justify-center pb-1">
                                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (col.key === 'amount' && columns.some(c => c.type === 'items')) {
            const subTotal = (formData.items || []).reduce((sum: number, item: LineItem) => sum + item.total, 0);
            const vat = subTotal * 0.18;
            const calculatedTotal = subTotal + vat;

            return (
                <div key={col.key} className="flex flex-col items-end border-t pt-2 space-y-1">
                     <div className="text-right text-sm text-slate-500">
                        <span className="mr-4">Subtotal:</span>
                        <span className="font-medium">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(subTotal)}
                        </span>
                     </div>
                     <div className="text-right text-sm text-slate-500">
                        <span className="mr-4">VAT (18%):</span>
                        <span className="font-medium">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(vat)}
                        </span>
                     </div>
                     <div className="text-right">
                        <span className="text-sm text-slate-700 font-bold mr-4">Grand Total:</span>
                        <span className="text-xl font-bold text-slate-800">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(calculatedTotal)}
                        </span>
                     </div>
                </div>
            );
        }

        if (col.key === 'id') return null;

        return (
          <div key={col.key} className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              {col.label} {col.required && <span className="text-red-500">*</span>}
            </label>
            
            {col.type === 'select' && (
              <div className="relative">
                 <input
                    type="text"
                    list={`list-${col.key}`}
                    required={col.required}
                    value={formData[col.key] || ''}
                    onChange={(e) => handleChange(col.key, e.target.value, col)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                    placeholder={`Select or type ${col.label}...`}
                    autoComplete="off"
                 />
                 <datalist id={`list-${col.key}`}>
                    {col.sourceType && (data[col.sourceType] || []).map((entity: any) => (
                        <option key={entity.id} value={entity.name} />
                    ))}
                    
                    {(!col.sourceType && col.options) && col.options.map((opt: string) => (
                        <option key={opt} value={opt} />
                    ))}
                 </datalist>
              </div>
            )}
            
            {col.type === 'status' && (
               <select
                required={col.required}
                value={formData[col.key] || ''}
                onChange={(e) => handleChange(col.key, e.target.value, col)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
              >
                <option value="" disabled>Select {col.label}</option>
                {col.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {col.type === 'textarea' && (
              <textarea
                required={col.required}
                value={formData[col.key] || ''}
                onChange={(e) => handleChange(col.key, e.target.value, col)}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
              />
            )}

            {col.type === 'password' && (
              <div className="relative group/pin">
                <input
                  type="password"
                  required={col.required}
                  value={formData[col.key] || ''}
                  onChange={(e) => handleChange(col.key, e.target.value, col)}
                  className="w-full pl-10 pr-12 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                  placeholder="Enter 4-digit PIN"
                />
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={generatePin}
                  className="absolute right-2 top-1.5 p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Generate Random PIN"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {(col.type !== 'select' && col.type !== 'status' && col.type !== 'textarea' && col.type !== 'password') && (
              <input
                type={col.type === 'currency' ? 'number' : col.type}
                step={col.type === 'currency' ? '0.01' : undefined}
                required={col.required}
                value={formData[col.key] || ''}
                onChange={(e) => handleChange(col.key, e.target.value, col)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
              />
            )}
          </div>
        );
      })}

      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          {initialData ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};