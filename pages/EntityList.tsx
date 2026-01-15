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
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = async (id: string, targetType: EntityType) => {
    if (isReadOnly) return;
    setIsConverting(true);
    try {
        await convertEntity(currentPath, targetType, id);
        navigate(`/${targetType}`);
    } catch (e: any) {
        alert("Workflow Error: " + e.message);
    } finally {
        setIsConverting(false);
    }
  };

  const handleDownloadPDF = (item: GenericEntity) => {
    const doc = new jsPDF();
    const currencyFormatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' });
    
    // --- BRANDING & COLORS ---
    const primaryColor = [79, 70, 229]; // Indigo-600
    const secondaryColor = [15, 23, 42]; // Slate-900
    const accentColor = [100, 116, 139]; // Slate-400

    // --- HEADER: COMPANY INFO ---
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("Zill Tech Solution", 14, 20);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("OPERATIONAL INTELLIGENCE SYSTEMS", 14, 25);

    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(9);
    doc.text("Plot 45, Industrial Avenue", 14, 35);
    doc.text("Nairobi, Kenya - P.O Box 40100", 14, 40);
    doc.text("Tel: +254 700 000 000 | Email: accounts@zilltech.com", 14, 45);

    // --- HEADER: DOCUMENT TYPE ---
    let docTitle = title.toUpperCase().slice(0, -1);
    if (currentPath === EntityType.SALES_ORDERS) docTitle = 'SALES ORDER';
    if (currentPath === EntityType.DELIVERY_NOTES) docTitle = 'DELIVERY NOTE';
    if (currentPath === EntityType.SALES_INVOICES) docTitle = 'TAX INVOICE';
    if (currentPath === EntityType.SALES_QUOTES) docTitle = 'FORMAL QUOTATION';

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(docTitle, 196, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`${docTitle} #: ${item.docRef || item.id || 'N/A'}`, 196, 28, { align: 'right' });
    const itemDate = item.date ? new Date(item.date).toLocaleDateString() : new Date().toLocaleDateString();
    doc.text(`Date: ${itemDate}`, 196, 33, { align: 'right' });
    
    if (item.status) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`Status: ${item.status.toUpperCase()}`, 196, 40, { align: 'right' });
    }

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 52, 196, 52);

    // --- BILL TO / CUSTOMER INFO ---
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("BILL TO / RECIPIENT:", 14, 62);
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(item.customer || item.supplier || "Walk-in Customer", 14, 68);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (item.phone) doc.text(`Contact: ${item.phone}`, 14, 73);
    if (item.email) doc.text(`Email: ${item.email}`, 14, 78);

    // --- LINE ITEMS TABLE ---
    let tableHead = [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']];
    let tableBody = (item.items || []).map((line: LineItem, index: number) => [
        (index + 1).toString(), line.description || 'No Description', line.quantity.toString(),
        currencyFormatter.format(line.unitPrice || 0), currencyFormatter.format(line.total || 0)
    ]);

    // Stripping prices for Delivery Notes
    if (currentPath === EntityType.DELIVERY_NOTES) {
        tableHead = [['#', 'Item Description', 'Quantity', 'Remarks']];
        tableBody = (item.items || []).map((line: LineItem, index: number) => [
            (index + 1).toString(), line.description || 'No Description', line.quantity.toString(), ''
        ]);
    }

    autoTable(doc, { 
        startY: 88, 
        head: tableHead, 
        body: tableBody, 
        theme: 'grid', 
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59] },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' }
        }
    });

    // --- SUMMARY & TOTALS ---
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    if (currentPath !== EntityType.DELIVERY_NOTES) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }
        
        const subTotal = (item.items || []).reduce((sum: number, i: LineItem) => sum + (i.total || 0), 0);
        const vat = subTotal * 0.18;
        const grandTotal = subTotal + vat;

        doc.setFillColor(248, 250, 252);
        doc.rect(130, finalY, 66, 32, 'F');
        
        doc.setFontSize(9);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text("Subtotal:", 135, finalY + 8);
        doc.text(currencyFormatter.format(subTotal), 191, finalY + 8, { align: 'right' });
        
        doc.text("VAT (18%):", 135, finalY + 16);
        doc.text(currencyFormatter.format(vat), 191, finalY + 16, { align: 'right' });
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("GRAND TOTAL:", 135, finalY + 26);
        doc.text(currencyFormatter.format(grandTotal), 191, finalY + 26, { align: 'right' });
    }

    // --- FOOTER: SIGNATURES & TERMS ---
    const footerY = 265;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 255, 196, 255);

    if (currentPath === EntityType.DELIVERY_NOTES || currentPath === EntityType.SALES_ORDERS) {
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text("AUTHORIZED SIGNATORY", 14, footerY);
        doc.text("RECEIVED BY (STAMP & SIGN)", 110, footerY);
        
        doc.setLineWidth(0.2);
        doc.line(14, footerY + 10, 80, footerY + 10); // Sig line 1
        doc.line(110, footerY + 10, 180, footerY + 10); // Sig line 2
    } else if (currentPath === EntityType.SALES_INVOICES) {
        doc.setFontSize(8);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text("BANK PAYMENT DETAILS:", 14, footerY - 5);
        doc.setFont('helvetica', 'normal');
        doc.text("Bank Name: ZILL TECH BANK PLC", 14, footerY);
        doc.text("Account Name: Zill Tech Solution LTD", 14, footerY + 4);
        doc.text("Account #: 00010002000304", 14, footerY + 8);
        doc.text("SWIFT/IBAN: ZTSKEXXX", 14, footerY + 12);
    }

    doc.setFontSize(7);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("This is a computer generated document. Valid without physical signature.", 105, 285, { align: 'center' });

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
          'Accepted': 'bg-emerald-100 text-emerald-700', 'Confirmed': 'bg-indigo-100 text-indigo-700',
          'Dispatched': 'bg-amber-100 text-amber-700'
      };
      return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${statusColors[value] || 'bg-slate-100 text-slate-600'}`}>{value}</span>;
    }
    return value;
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in relative min-w-0 pb-10">
      {isConverting && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
           <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-indigo-100 text-center mx-4 animate-scale-in">
             <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
             <p className="text-slate-900 font-extrabold tracking-tight">Syncing Workflow Sequence...</p>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => navigate('/')} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all shrink-0"><ArrowLeft className="w-5 h-5" /></button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate tracking-tight">{title}</h1>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">Operational Flow Pipeline</p>
          </div>
        </div>
        {!isReadOnly && (
          <button onClick={onAdd} className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4 mr-2" />New Entry</button>
        )}
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Search className="h-5 w-5" /></div>
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm" placeholder={`Filter ${data.length} records...`} />
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
                      {/* Smart Workflow Visibility */}
                      {!isReadOnly && currentPath === EntityType.SALES_QUOTES && (item.status === 'Sent' || item.status === 'Accepted') && (
                          <button onClick={() => handleConvert(item.id, EntityType.SALES_ORDERS)} title="Convert to Order" className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><FileCheck className="w-4.5 h-4.5" /></button>
                      )}
                      {!isReadOnly && currentPath === EntityType.SALES_ORDERS && (item.status === 'Confirmed') && (
                          <>
                            <button onClick={() => handleConvert(item.id, EntityType.DELIVERY_NOTES)} title="Generate Note" className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"><Truck className="w-4.5 h-4.5" /></button>
                            <button onClick={() => handleConvert(item.id, EntityType.SALES_INVOICES)} title="Generate Invoice" className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Receipt className="w-4.5 h-4.5" /></button>
                          </>
                      )}
                      
                      {/* Payment Trigger */}
                      {!isReadOnly && currentPath === EntityType.SALES_INVOICES && item.status !== 'Paid' && (
                          <button onClick={() => setPaymentItem(item)} title="Receive Payment" className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"><Wallet className="w-4.5 h-4.5" /></button>
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

      <Modal isOpen={!!viewingItem} onClose={() => setViewingItem(null)} title="Record Audit & Data Chain">
        {viewingItem && <div className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <p className="text-[10px] text-indigo-400 font-black uppercase mb-1">System Reference</p>
                <p className="text-lg font-black text-indigo-900">{viewingItem.docRef || viewingItem.id}</p>
                {viewingItem.sourceRef && (
                    <p className="text-xs text-indigo-600 mt-2 flex items-center font-bold italic"><ArrowRightLeft className="w-3 h-3 mr-2" /> {viewingItem.sourceRef}</p>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                {columns.filter(c => c.type !== 'items' && c.key !== 'id').map(c => (
                    <div key={c.key} className="p-4 border border-slate-100 rounded-2xl bg-white">
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