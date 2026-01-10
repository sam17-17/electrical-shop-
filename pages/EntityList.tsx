import React, { useState, useMemo } from 'react';
import { DataColumn, GenericEntity, LineItem, EntityType } from '../types';
import { 
  Edit2, Trash2, Plus, Filter, Download, FileDown, Eye, X, Wallet, Search, 
  ArrowLeft, CheckSquare, Square, ChevronDown, UserCheck, Shield, ToggleLeft, 
  Loader2, MoreHorizontal
} from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { PaymentModal } from '../components/PaymentModal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

interface EntityListProps {
  title: string;
  columns: DataColumn[];
  data: GenericEntity[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const EntityList: React.FC<EntityListProps> = ({ 
  title, 
  columns, 
  data, 
  onAdd, 
  onEdit, 
  onDelete 
}) => {
  const { updateEntity } = useData();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.substring(1) as EntityType;
  
  const userRole = user?.user_metadata?.role || user?.role;
  const isReadOnly = userRole === 'Viewer';

  const [viewingItem, setViewingItem] = useState<GenericEntity | null>(null);
  const [paymentItem, setPaymentItem] = useState<GenericEntity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const handleDownloadPDF = (item: GenericEntity) => {
    const doc = new jsPDF();
    const currencyFormatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' });

    doc.setTextColor(15, 23, 42); 
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("ZILL CRM", 14, 20);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); 
    doc.text("E N T E R P R I S E", 14.5, 25);

    doc.setFillColor(79, 70, 229); 
    doc.circle(58, 14, 2.5, 'F'); 

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); 
    doc.text("Cloud Powered Relationship Management", 14, 32);

    doc.setDrawColor(226, 232, 240); 
    doc.setLineWidth(0.5);
    doc.line(14, 45, 196, 45);

    const isTransactionDoc = [
        EntityType.SALES_INVOICES, 
        EntityType.SALES_QUOTES, 
        EntityType.SALES_ORDERS, 
        EntityType.DELIVERY_NOTES,
        EntityType.PURCHASE_ORDERS
    ].includes(currentPath);

    doc.setTextColor(79, 70, 229); 
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    
    let docTitle = title.toUpperCase().slice(0, -1);
    if (title === 'Receipts') docTitle = 'PAYMENT RECEIPT';
    if (title === 'Delivery Notes') docTitle = 'DELIVERY NOTE';
    if (!isTransactionDoc) docTitle = `${docTitle} RECORD`;

    doc.text(docTitle, 196, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`Ref #: ${item.id || 'N/A'}`, 196, 26, { align: 'right' });
    const itemDate = item.date ? new Date(item.date).toLocaleDateString() : new Date().toLocaleDateString();
    doc.text(`Date: ${itemDate}`, 196, 31, { align: 'right' });
    
    if (item.status) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Status: ${item.status.toUpperCase()}`, 196, 37, { align: 'right' });
    }

    let startY = 60;
    if (isTransactionDoc) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text("PARTY DETAILS:", 14, 55);
        doc.setFontSize(11);
        doc.text(item.customer || item.supplier || "N/A", 14, 61);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (item.phone) doc.text(`Tel: ${item.phone}`, 14, 66);
        if (item.email) doc.text(`Email: ${item.email}`, 14, 71);
        startY = 80;
    }

    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
        let tableHead = [['#', 'Item / Description', 'Qty', 'Unit Price', 'Total']];
        let tableBody = item.items.map((line: LineItem, index: number) => [
            (index + 1).toString(),
            line.description || 'No Description',
            line.quantity.toString(),
            currencyFormatter.format(line.unitPrice || 0),
            currencyFormatter.format(line.total || 0)
        ]);

        if (currentPath === EntityType.DELIVERY_NOTES) {
            tableHead = [['#', 'Item / Description', 'Quantity']];
            tableBody = item.items.map((line: LineItem, index: number) => [
                (index + 1).toString(),
                line.description || 'No Description',
                line.quantity.toString()
            ]);
        }

        autoTable(doc, {
            startY: startY,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255 },
            styles: { fontSize: 9, cellPadding: 4 },
        });

        if (currentPath !== EntityType.DELIVERY_NOTES) {
            const finalY = (doc as any).lastAutoTable.finalY + 5;
            const subTotal = item.items.reduce((sum: number, i: LineItem) => sum + (i.total || 0), 0);
            const vat = subTotal * 0.18;
            const grandTotal = subTotal + vat;

            doc.setFillColor(241, 245, 249);
            doc.rect(130, finalY, 66, 24, 'F');
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text("Subtotal:", 135, finalY + 7);
            doc.text(currencyFormatter.format(subTotal), 190, finalY + 7, { align: 'right' });
            doc.text("VAT (18%):", 135, finalY + 14);
            doc.text(currencyFormatter.format(vat), 190, finalY + 14, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text("Total:", 135, finalY + 21);
            doc.text(currencyFormatter.format(grandTotal), 190, finalY + 21, { align: 'right' });
            startY = finalY + 35;
        } else {
             startY = (doc as any).lastAutoTable.finalY + 20;
        }
    } else {
        const infoRows = columns
            .filter(col => col.key !== 'items' && col.type !== 'readonly')
            .map(col => [col.label, col.type === 'currency' ? currencyFormatter.format(item[col.key] || 0) : item[col.key] || 'N/A']);
        autoTable(doc, { startY, head: [['Field', 'Details']], body: infoRows, theme: 'striped' });
        startY = (doc as any).lastAutoTable.finalY + 15;
    }

    const pageHeight = doc.internal.pageSize.height || 297;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 15, 196, pageHeight - 15);
    doc.setFontSize(8);
    doc.text("ZILL CRM - Future Ready Business", 14, pageHeight - 10);
    doc.save(`${docTitle.replace(/\s+/g, '_')}_${item.id}.pdf`);
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (item.name?.toString().toLowerCase().includes(term) || 
                item.customer?.toString().toLowerCase().includes(term) || 
                item.id?.toString().toLowerCase().includes(term) ||
                item.email?.toString().toLowerCase().includes(term));
      });
  }, [data, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(item => item.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkUpdate = async (patch: Partial<GenericEntity>) => {
    if (isReadOnly) return;
    setIsBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id => updateEntity(currentPath, id, patch));
      await Promise.all(promises);
      setSelectedIds(new Set());
    } catch (e: any) {
      alert(`Bulk update failed: ${e.message || 'Unknown error'}`);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const renderBulkActions = () => {
    if (currentPath !== EntityType.SYSTEM_USERS || selectedIds.size === 0 || isReadOnly) return null;

    return (
      <div className="flex flex-wrap items-center gap-3 bg-indigo-50 border border-indigo-100 p-3 rounded-xl animate-fade-in mb-4 shadow-sm">
        <div className="flex items-center text-indigo-700 text-[10px] font-black uppercase tracking-widest mr-4">
          <Shield className="w-4 h-4 mr-2" />
          {selectedIds.size} SELECTED
        </div>
        <div className="h-6 w-px bg-indigo-200 mx-2 hidden sm:block"></div>
        <div className="relative group">
          <button className="flex items-center px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
            Assign Role <ChevronDown className="w-3 h-3 ml-2" />
          </button>
          <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-20 overflow-hidden">
            {['Admin', 'Manager', 'Sales Agent', 'Accountant', 'Viewer'].map(role => (
              <button key={role} onClick={() => handleBulkUpdate({ role })} className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-indigo-50 text-slate-700 transition-colors border-b border-slate-50 last:border-0">{role}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleBulkUpdate({ status: 'Active' })} className="flex items-center px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><UserCheck className="w-3.5 h-3.5 mr-2" /> Activate</button>
          <button onClick={() => handleBulkUpdate({ status: 'Suspended' })} className="flex items-center px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white transition-all shadow-sm"><ToggleLeft className="w-3.5 h-3.5 mr-2" /> Deactivate</button>
        </div>
        <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-[10px] font-black text-indigo-400 hover:text-indigo-600 uppercase">Clear</button>
      </div>
    );
  };

  const renderCell = (value: any, type: DataColumn['type'], colKey: string) => {
    if (value === null || value === undefined) return '-';
    if (colKey === 'pin') return '••••';
    if (type === 'currency') return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value));
    if (type === 'date') return new Date(value).toLocaleDateString();
    if (type === 'status') {
      const statusColors: Record<string, string> = { 
          'Paid': 'bg-green-100 text-green-700', 
          'Active': 'bg-emerald-100 text-emerald-700',
          'Unpaid': 'bg-red-100 text-red-700', 
          'Suspended': 'bg-red-100 text-red-700',
          'Inactive': 'bg-slate-100 text-slate-700',
          'Sent': 'bg-blue-100 text-blue-700' 
      };
      return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${statusColors[value] || 'bg-slate-100 text-slate-600'}`}>{value}</span>;
    }
    return value;
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in relative min-w-0">
      {isBulkActionLoading && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
           <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-indigo-100 text-center mx-4">
             <div className="relative mb-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-400" />
                </div>
             </div>
             <p className="text-slate-900 font-extrabold tracking-tight">Synchronizing Bulk Updates</p>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={() => navigate('/')} 
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate tracking-tight">{title}</h1>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest leading-none mt-1">
              Data Management Repository
            </p>
          </div>
        </div>
        {!isReadOnly && (
          <div className="flex gap-2 sm:gap-3 w-full md:w-auto shrink-0">
            <button className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-slate-50 transition-all">
              <Filter className="w-4 h-4 mr-2" />Filter
            </button>
            <button 
              onClick={onAdd} 
              className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />New Entry
            </button>
          </div>
        )}
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-500">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500" />
        </div>
        <input 
            type="text" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="block w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-400" 
            placeholder={`Search across ${data.length} records in ${title.toLowerCase()}...`} 
        />
      </div>

      {renderBulkActions()}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 w-14">
                   {!isReadOnly && (
                     <button onClick={toggleSelectAll} className="text-slate-300 hover:text-indigo-600 transition-colors p-1">
                        {selectedIds.size === filteredData.length && filteredData.length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                     </button>
                   )}
                </th>
                {columns.map((col) => col.type !== 'items' && (
                    <th key={col.key} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {col.label}
                    </th>
                ))}
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right sticky right-0 bg-slate-50/50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length === 0 ? (
                <tr>
                    <td colSpan={columns.length + 2} className="px-6 py-20 text-center text-slate-400 italic">No records found matching your search.</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.has(item.id) ? 'bg-indigo-50/40' : ''}`}>
                    <td className="px-6 py-4">
                       {!isReadOnly && (
                         <button onClick={() => toggleSelectOne(item.id)} className="text-slate-300 hover:text-indigo-600 transition-colors p-1">
                            {selectedIds.has(item.id) ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                         </button>
                       )}
                    </td>
                    {columns.map((col) => col.type !== 'items' && (
                        <td key={col.key} className="px-6 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
                            {renderCell(item[col.key], col.type, col.key)}
                        </td>
                    ))}
                    <td className="px-6 py-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50/50 transition-colors">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <button onClick={() => setViewingItem(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Eye className="w-4.5 h-4.5" /></button>
                        {!isReadOnly && (
                          <>
                            {currentPath === EntityType.SALES_INVOICES && item.status !== 'Paid' && <button onClick={() => setPaymentItem(item)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Wallet className="w-4.5 h-4.5" /></button>}
                            <button onClick={() => handleDownloadPDF(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><FileDown className="w-4.5 h-4.5" /></button>
                            <button onClick={() => onEdit(item.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 className="w-4.5 h-4.5" /></button>
                            <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!viewingItem} onClose={() => setViewingItem(null)} title="Detailed Record Analytics">
        {viewingItem && <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-5 rounded-2xl border border-slate-200 gap-4">
            <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Audit Reference</p>
                <p className="text-xl font-black text-slate-800 tracking-tight">{viewingItem.id}</p>
            </div>
            {!isReadOnly && (
              <button 
                  onClick={() => handleDownloadPDF(viewingItem)} 
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-700 transition-all"
              >
                  Generate Document
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {columns.filter(c => c.type !== 'items' && c.key !== 'id').map(c => (
              <div key={c.key} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:border-indigo-200 transition-colors">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5 group-hover:text-indigo-400 transition-colors">{c.label}</p>
                <p className="text-sm font-bold text-slate-800">
                  {renderCell(viewingItem[c.key], c.type, c.key === 'pin' ? 'visible-pin' : c.key)}
                </p>
              </div>
            ))}
          </div>
        </div>}
      </Modal>

      <PaymentModal isOpen={!!paymentItem} onClose={() => setPaymentItem(null)} invoice={paymentItem} />
    </div>
  );
};