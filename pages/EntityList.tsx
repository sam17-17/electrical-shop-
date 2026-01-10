import React, { useState, useMemo } from 'react';
import { DataColumn, GenericEntity, LineItem, EntityType } from '../types';
import { 
  Edit2, Trash2, Plus, Filter, Download, FileDown, Eye, X, Wallet, Search, 
  ArrowLeft, CheckSquare, Square, ChevronDown, UserCheck, Shield, ToggleLeft, 
  Loader2, ArrowRightLeft, FileCheck, Truck, Receipt
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
  const { updateEntity, convertEntity } = useData();
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
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = async (id: string, targetType: EntityType) => {
    if (isReadOnly) return;
    setIsConverting(true);
    try {
        await convertEntity(currentPath, targetType, id);
        navigate(`/${targetType}`);
    } catch (e: any) {
        alert("Conversion failed: " + e.message);
    } finally {
        setIsConverting(false);
    }
  };

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

    const isTransactionDoc = [EntityType.SALES_INVOICES, EntityType.SALES_QUOTES, EntityType.SALES_ORDERS, EntityType.DELIVERY_NOTES, EntityType.PURCHASE_ORDERS].includes(currentPath);
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
    doc.text(`Ref #: ${item.docRef || item.id || 'N/A'}`, 196, 26, { align: 'right' });
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
        let tableHead = [['#', 'Description', 'Qty', 'Unit Price', 'Total']];
        let tableBody = item.items.map((line: LineItem, index: number) => [
            (index + 1).toString(), line.description || 'No Description', line.quantity.toString(),
            currencyFormatter.format(line.unitPrice || 0), currencyFormatter.format(line.total || 0)
        ]);
        if (currentPath === EntityType.DELIVERY_NOTES) {
            tableHead = [['#', 'Description', 'Quantity']];
            tableBody = item.items.map((line: LineItem, index: number) => [
                (index + 1).toString(), line.description || 'No Description', line.quantity.toString()
            ]);
        }
        autoTable(doc, { startY, head: tableHead, body: tableBody, theme: 'grid', headStyles: { fillColor: [15, 23, 42], textColor: 255 }, styles: { fontSize: 9, cellPadding: 4 } });
        if (currentPath !== EntityType.DELIVERY_NOTES) {
            const finalY = (doc as any).lastAutoTable.finalY + 5;
            const subTotal = item.items.reduce((sum: number, i: LineItem) => sum + (i.total || 0), 0);
            const grandTotal = subTotal + (subTotal * 0.18);
            doc.setFillColor(241, 245, 249);
            doc.rect(130, finalY, 66, 24, 'F');
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text("Subtotal:", 135, finalY + 7);
            doc.text(currencyFormatter.format(subTotal), 190, finalY + 7, { align: 'right' });
            doc.text("VAT (18%):", 135, finalY + 14);
            doc.text(currencyFormatter.format(subTotal * 0.18), 190, finalY + 14, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text("Total:", 135, finalY + 21);
            doc.text(currencyFormatter.format(grandTotal), 190, finalY + 21, { align: 'right' });
        }
    }
    doc.save(`${docTitle}_${item.docRef || item.id}.pdf`);
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (item.name?.toString().toLowerCase().includes(term) || 
                item.customer?.toString().toLowerCase().includes(term) || 
                item.docRef?.toString().toLowerCase().includes(term) ||
                item.id?.toString().toLowerCase().includes(term));
      });
  }, [data, searchTerm]);

  const renderCell = (value: any, type: DataColumn['type'], colKey: string) => {
    if (value === null || value === undefined) return '-';
    if (colKey === 'pin') return '••••';
    if (type === 'currency') return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value));
    if (type === 'date') return new Date(value).toLocaleDateString();
    if (type === 'status') {
      const statusColors: Record<string, string> = { 
          'Paid': 'bg-green-100 text-green-700', 'Active': 'bg-emerald-100 text-emerald-700',
          'Unpaid': 'bg-red-100 text-red-700', 'Sent': 'bg-blue-100 text-blue-700',
          'Accepted': 'bg-emerald-100 text-emerald-700', 'Confirmed': 'bg-indigo-100 text-indigo-700'
      };
      return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${statusColors[value] || 'bg-slate-100 text-slate-600'}`}>{value}</span>;
    }
    return value;
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in relative min-w-0 pb-10">
      {(isBulkActionLoading || isConverting) && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
           <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-indigo-100 text-center mx-4 animate-scale-in">
             <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
             <p className="text-slate-900 font-extrabold tracking-tight">Processing Workflow Action...</p>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => navigate('/')} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all shrink-0"><ArrowLeft className="w-5 h-5" /></button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate tracking-tight">{title}</h1>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">Sales & Operations Pipeline</p>
          </div>
        </div>
        {!isReadOnly && (
          <button onClick={onAdd} className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4 mr-2" />New Entry</button>
        )}
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Search className="h-5 w-5" /></div>
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm" placeholder={`Filter ${data.length} items...`} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {columns.map((col) => col.type !== 'items' && <th key={col.key} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{col.label}</th>)}
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right sticky right-0 bg-slate-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                  {columns.map((col) => col.type !== 'items' && <td key={col.key} className="px-6 py-4 text-sm font-semibold text-slate-700">{renderCell(item[col.key], col.type, col.key)}</td>)}
                  <td className="px-6 py-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50/50 transition-all">
                    <div className="flex justify-end gap-1.5">
                      {/* Workflow Actions */}
                      {!isReadOnly && currentPath === EntityType.SALES_QUOTES && (
                          <button onClick={() => handleConvert(item.id, EntityType.SALES_ORDERS)} title="Convert to Order" className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><FileCheck className="w-4.5 h-4.5" /></button>
                      )}
                      {!isReadOnly && currentPath === EntityType.SALES_ORDERS && (
                          <>
                            <button onClick={() => handleConvert(item.id, EntityType.DELIVERY_NOTES)} title="Generate Delivery Note" className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"><Truck className="w-4.5 h-4.5" /></button>
                            <button onClick={() => handleConvert(item.id, EntityType.SALES_INVOICES)} title="Generate Invoice" className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Receipt className="w-4.5 h-4.5" /></button>
                          </>
                      )}
                      
                      <button onClick={() => setViewingItem(item)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><Eye className="w-4.5 h-4.5" /></button>
                      {!isReadOnly && (
                        <>
                          <button onClick={() => handleDownloadPDF(item)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><FileDown className="w-4.5 h-4.5" /></button>
                          <button onClick={() => onEdit(item.id)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 className="w-4.5 h-4.5" /></button>
                          <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4.5 h-4.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!viewingItem} onClose={() => setViewingItem(null)} title="Audit Trail & Logistics">
        {viewingItem && <div className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <p className="text-[10px] text-indigo-400 font-black uppercase mb-1">Traceability Ref</p>
                <p className="text-lg font-black text-indigo-900">{viewingItem.docRef || viewingItem.id}</p>
                {viewingItem.sourceRef && (
                    <p className="text-xs text-indigo-600 mt-2 flex items-center"><ArrowRightLeft className="w-3 h-3 mr-2" /> {viewingItem.sourceRef}</p>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                {columns.filter(c => c.type !== 'items' && c.key !== 'id').map(c => (
                    <div key={c.key} className="p-4 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] text-slate-400 font-black uppercase mb-1">{c.label}</p>
                        <p className="text-sm font-bold text-slate-800">{renderCell(viewingItem[c.key], c.type, c.key)}</p>
                    </div>
                ))}
            </div>
        </div>}
      </Modal>

      <PaymentModal isOpen={!!paymentItem} onClose={() => setPaymentItem(null)} invoice={paymentItem} />
    </div>
  );
};
