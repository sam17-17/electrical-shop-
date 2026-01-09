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
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.substring(1) as EntityType;
  
  const [viewingItem, setViewingItem] = useState<GenericEntity | null>(null);
  const [paymentItem, setPaymentItem] = useState<GenericEntity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const handleDownloadPDF = (item: GenericEntity) => {
    const doc = new jsPDF();
    const currencyFormatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' });

    doc.setTextColor(15, 23, 42); 
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("GEOSAM", 14, 20);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); 
    doc.text("T E C H N O L O G Y", 14.5, 25);

    doc.setFillColor(249, 115, 22); 
    doc.circle(58, 14, 2.5, 'F'); 

    doc.setDrawColor(13, 148, 136); 
    doc.setLineWidth(1);
    doc.line(42, 12, 54, 12); 

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); 
    doc.text("P.O. Box 12345 - 00100, Nairobi, Kenya", 14, 32);
    doc.text("+254 700 000 000 | info@geosamtechnology.co.ke", 14, 37);

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

    doc.setTextColor(13, 148, 136); 
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
    doc.text(`Ref #: ${item.id}`, 196, 26, { align: 'right' });
    doc.text(`Date: ${item.date ? new Date(item.date).toLocaleDateString() : new Date().toLocaleDateString()}`, 196, 31, { align: 'right' });
    
    if (item.status) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(item.status === 'Paid' ? 'green' : item.status === 'Overdue' ? 'red' : 'gray');
        doc.text(`Status: ${item.status.toUpperCase()}`, 196, 37, { align: 'right' });
    }

    let startY = 60;
    if (isTransactionDoc) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text("BILL TO:", 14, 55);
        doc.setFontSize(11);
        doc.text(item.customer || item.supplier || "Walk-in Customer", 14, 61);
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
            line.description,
            line.quantity.toString(),
            currencyFormatter.format(line.unitPrice),
            currencyFormatter.format(line.total)
        ]);

        if (currentPath === EntityType.DELIVERY_NOTES) {
            tableHead = [['#', 'Item / Description', 'Quantity']];
            tableBody = item.items.map((line: LineItem, index: number) => [
                (index + 1).toString(),
                line.description,
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
            const subTotal = item.items.reduce((sum: number, i: LineItem) => sum + i.total, 0);
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
            .map(col => [col.label, col.type === 'currency' ? currencyFormatter.format(item[col.key] || 0) : item[col.key]]);
        autoTable(doc, { startY, head: [['Field', 'Details']], body: infoRows, theme: 'striped' });
        startY = (doc as any).lastAutoTable.finalY + 15;
    }

    if (item.description) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("NOTES / TERMS:", 14, startY);
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(item.description, 180), 14, startY + 6);
    }

    const pageHeight = doc.internal.pageSize.height || 297;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 15, 196, pageHeight - 15);
    doc.setFontSize(8);
    doc.text("Thank you for your business!", 14, pageHeight - 10);
    doc.text("Geosam Technology Systems", 196, pageHeight - 10, { align: 'right' });
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
    if (currentPath !== EntityType.SYSTEM_USERS || selectedIds.size === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-3 bg-indigo-50 border border-indigo-100 p-3 rounded-xl animate-fade-in mb-4 shadow-sm">
        <div className="flex items-center text-indigo-700 text-xs font-bold uppercase tracking-wider mr-4">
          <Shield className="w-4 h-4 mr-2" />
          {selectedIds.size} Users Selected
        </div>

        <div className="h-6 w-px bg-indigo-200 mx-2 hidden sm:block"></div>

        <div className="relative group">
          <button className="flex items-center px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
            Assign Role <ChevronDown className="w-3 h-3 ml-2" />
          </button>
          <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-20 overflow-hidden">
            {['Admin', 'Manager', 'Sales Agent', 'Accountant', 'Viewer'].map(role => (
              <button 
                key={role}
                onClick={() => handleBulkUpdate({ role })}
                className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 text-slate-700 transition-colors border-b border-slate-50 last:border-0"
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => handleBulkUpdate({ status: 'Active' })}
            className="flex items-center px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5 mr-2" /> Activate
          </button>
          <button 
            onClick={() => handleBulkUpdate({ status: 'Suspended' })}
            className="flex items-center px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-600 hover:text-white transition-all shadow-sm"
          >
            <ToggleLeft className="w-3.5 h-3.5 mr-2" /> Deactivate
          </button>
        </div>

        <button 
          onClick={() => setSelectedIds(new Set())}
          className="ml-auto text-xs font-medium text-indigo-400 hover:text-indigo-600"
        >
          Deselect All
        </button>
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
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value] || 'bg-slate-100'}`}>{value}</span>;
    }
    return value;
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {isBulkActionLoading && (
        <div className="fixed inset-0 z-50 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
           <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center border border-indigo-100">
             <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
             <p className="text-indigo-900 font-bold">Applying shared updates...</p>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-slate-500 text-sm">Manage your {title.toLowerCase()} records</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center hover:bg-slate-50 transition-colors"><Filter className="w-4 h-4 mr-2" />Filter</button>
          <button onClick={onAdd} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center shadow-md hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4 mr-2" />New Entry</button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div>
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-xl sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder={`Search in ${title.toLowerCase()}...`} />
      </div>

      {renderBulkActions()}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 w-10">
                   <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                      {selectedIds.size === filteredData.length && filteredData.length > 0 ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                   </button>
                </th>
                {columns.map((col) => col.type !== 'items' && <th key={col.key} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{col.label}</th>)}
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr><td colSpan={columns.length + 2} className="px-6 py-12 text-center text-slate-500">No records found.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.has(item.id) ? 'bg-indigo-50/40' : ''}`}>
                    <td className="px-6 py-4">
                       <button onClick={() => toggleSelectOne(item.id)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                          {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                       </button>
                    </td>
                    {columns.map((col) => col.type !== 'items' && <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                        {renderCell(item[col.key], col.type, col.key)}
                    </td>)}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewingItem(item)} className="p-1.5 text-slate-500 hover:text-blue-600 rounded transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                        {currentPath === EntityType.SALES_INVOICES && item.status !== 'Paid' && <button onClick={() => setPaymentItem(item)} className="p-1.5 text-slate-500 hover:text-emerald-600 rounded transition-colors" title="Payment"><Wallet className="w-4 h-4" /></button>}
                        <button onClick={() => handleDownloadPDF(item)} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded transition-colors" title="Download PDF"><FileDown className="w-4 h-4" /></button>
                        <button onClick={() => onEdit(item.id)} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-500 hover:text-red-600 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!viewingItem} onClose={() => setViewingItem(null)} title="Record Details">
        {viewingItem && <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">System Reference</p><p className="text-lg font-bold text-slate-800">{viewingItem.id}</p></div>
            <button onClick={() => handleDownloadPDF(viewingItem)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors">Generate PDF</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {columns.filter(c => c.type !== 'items' && c.key !== 'id').map(c => (
              <div key={c.key} className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">{c.label}</p>
                <p className="text-sm font-medium text-slate-700">
                  {/* For viewing PINs, we show them as requested for admin view */}
                  {renderCell(viewingItem[c.key], c.type, c.key === 'pin' ? 'visible-pin' : c.key)}
                </p>
              </div>
            ))}
          </div>
          {viewingItem.items && viewingItem.items.length > 0 && <div>
            <h4 className="text-sm font-bold text-slate-800 mb-2 px-1">Line Items</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-slate-500">Item Description</th><th className="px-3 py-2 text-center text-slate-500">Qty</th><th className="px-3 py-2 text-right text-slate-500">Price</th><th className="px-3 py-2 text-right text-slate-500">Total</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{viewingItem.items.map((i: any, idx: number) => <tr key={idx} className="bg-white"><td className="px-3 py-2 text-slate-700">{i.description}</td><td className="px-3 py-2 text-center text-slate-600">{i.quantity}</td><td className="px-3 py-2 text-right text-slate-600">{renderCell(i.unitPrice, 'currency', 'price')}</td><td className="px-3 py-2 text-right font-semibold text-slate-800">{renderCell(i.total, 'currency', 'total')}</td></tr>)}</tbody>
              </table>
            </div>
          </div>}
        </div>}
      </Modal>

      <PaymentModal isOpen={!!paymentItem} onClose={() => setPaymentItem(null)} invoice={paymentItem} />
    </div>
  );
};
