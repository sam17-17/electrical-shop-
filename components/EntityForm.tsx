
import React, { useState, useEffect, useMemo } from 'react';
import { DataColumn, GenericEntity, LineItem, EntityType } from '../types';
import { Plus, Trash2, RefreshCw, Key, Loader2, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

interface EntityFormProps {
  columns: DataColumn[];
  initialData?: GenericEntity;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  entityType?: EntityType;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data } = useData();

  const inventoryItems = useMemo(() => data[EntityType.INVENTORY] || [], [data]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      const defaults: any = {};
      defaults['id'] = generateUUID();

      if (entityType) {
         if ([EntityType.SALES_INVOICES, EntityType.SALES_QUOTES, EntityType.SALES_ORDERS, EntityType.DELIVERY_NOTES, EntityType.PURCHASE_ORDERS, EntityType.PURCHASE_QUOTES, EntityType.PURCHASE_INVOICES].includes(entityType)) {
             const prefixMap: Record<string, string> = {
                 [EntityType.SALES_INVOICES]: 'INV-',
                 [EntityType.SALES_QUOTES]: 'QTN-',
                 [EntityType.SALES_ORDERS]: 'ORD-',
                 [EntityType.DELIVERY_NOTES]: 'DEL-',
                 [EntityType.PURCHASE_ORDERS]: 'PO-',
                 [EntityType.PURCHASE_QUOTES]: 'PQ-',
                 [EntityType.PURCHASE_INVOICES]: 'PINV-'
             };
             const prefix = prefixMap[entityType] || 'DOC-';
             const existing = data[entityType] || [];
             
             // Smart count based on max existing ref
             let maxNum = 1000;
             existing.forEach(e => {
                 const ref = String(e.docRef || '');
                 const numPart = parseInt(ref.split('-')[1]);
                 if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
             });
             
             defaults['docRef'] = `${prefix}${maxNum + 1}`;
         }
      }

      columns.forEach(col => {
        if (col.key === 'id') return;
        if ((col.key === 'status' || col.key === 'itemType') && col.options && col.options.length > 0) {
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
  }, [initialData, columns, entityType, data]);

  const handleChange = (key: string, value: any, column?: DataColumn) => {
    setError(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    
    const cleanData = { ...formData };
    Object.keys(cleanData).forEach(key => {
      if (typeof cleanData[key] === 'string') {
        cleanData[key] = cleanData[key].trim();
      }
    });

    try {
        await onSubmit(cleanData);
    } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
        setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start text-xs font-bold animate-fade-in mb-2">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
            <span>{error}</span>
        </div>
      )}

      {columns.map((col) => {
        // HIDE STOCK QTY FOR SERVICES
        if (col.key === 'stock' && formData.itemType === 'Service') {
          return null;
        }

        if (col.type === 'readonly') {
             const displayValue = (col.key === 'id' && formData['docRef']) ? formData['docRef'] : (formData[col.key] || '');
             return (
                <div key={col.key} className="flex flex-col space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">{col.label}</label>
                    <input 
                        type="text" 
                        value={displayValue} 
                        disabled 
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 text-sm font-bold"
                    />
                </div>
             );
        }

        if (col.type === 'items') {
            return (
                <div key={col.key} className="space-y-2 border-t border-slate-200 pt-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-slate-800">{col.label}</label>
                        <button type="button" onClick={handleAddItem} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center hover:bg-indigo-100 transition-colors">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add Item
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {(formData.items || []).map((item: LineItem, index: number) => (
                            <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-12 sm:col-span-5">
                                        <label className="text-[10px] font-bold text-slate-500">Item / Service</label>
                                        <input
                                            type="text"
                                            list="inventory-items"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                            className="block w-full text-xs p-2 border border-slate-300 rounded-md mt-1"
                                            placeholder="Type or select..."
                                        />
                                    </div>
                                    <div className="col-span-4 sm:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500">Qty</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="block w-full text-xs p-2 border border-slate-300 rounded-md mt-1"
                                        />
                                    </div>
                                    <div className="col-span-8 sm:col-span-3">
                                        <label className="text-[10px] font-bold text-slate-500">Unit Price</label>
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="block w-full text-xs p-2 border border-slate-300 rounded-md mt-1"
                                        />
                                    </div>
                                    <div className="col-span-12 sm:col-span-2 flex items-end justify-between">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500">Total</label>
                                            <p className="text-xs font-bold mt-1.5">{new Intl.NumberFormat('en-KE', { currency: 'KES' }).format(item.total)}</p>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 text-right flex justify-end">
                       <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total (inc VAT)</p>
                           <p className="text-2xl font-black text-slate-800 tracking-tight">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(formData.amount || 0)}</p>
                       </div>
                    </div>

                    <datalist id="inventory-items">
                        {inventoryItems.map((item) => (
                            <option key={item.id} value={item.name}>{item.code}</option>
                        ))}
                    </datalist>
                </div>
            );
        }

        let inputElement;
        switch (col.type) {
          case 'select':
            const options = col.sourceType ? (data[col.sourceType] || []).map((item: any) => item.name) : col.options;
            return (
              <div key={col.key}>
                <label className="text-sm font-medium text-slate-700">{col.label}</label>
                <select
                  required={col.required}
                  value={formData[col.key] || ''}
                  onChange={(e) => handleChange(col.key, e.target.value, col)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="" disabled>{`Select ${col.label}`}</option>
                  {options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            );
          case 'textarea':
            return (
              <div key={col.key}>
                <label className="text-sm font-medium text-slate-700">{col.label}</label>
                <textarea
                  required={col.required}
                  value={formData[col.key] || ''}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            );
          default:
            return (
              <div key={col.key}>
                <label className="text-sm font-medium text-slate-700">{col.label}</label>
                <input
                  type={col.type === 'currency' || col.type === 'number' ? 'number' : col.type}
                  required={col.required}
                  value={formData[col.key] || ''}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  step={col.type === 'currency' ? '0.01' : 'any'}
                />
              </div>
            );
        }
      })}

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 text-sm font-bold bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-indigo-200"
        >
          {isSubmitting && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
          {isSubmitting ? 'Saving...' : (initialData ? 'Update Record' : 'Save Record')}
        </button>
      </div>
    </form>
  );
};
