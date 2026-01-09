import React, { useState } from 'react';
import { DataColumn, GenericEntity, LineItem, EntityType } from '../types';
import { Edit2, Trash2, Plus, Filter, Download, FileDown, Eye, X, Wallet, Search, ArrowLeft } from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { PaymentModal } from '../components/PaymentModal';

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
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.substring(1) as EntityType;
  const [viewingItem, setViewingItem] = useState<GenericEntity | null>(null);
  const [paymentItem, setPaymentItem] = useState<GenericEntity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDownloadPDF = (item: GenericEntity) => {
    const doc = new jsPDF();
    const currencyFormatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' });

    // ==========================================
    // COMPANY HEADER SECTION (GEOSAM BRANDING)
    // ==========================================
    
    // 1. Draw Simulated Logo (Geosam Technology)
    // "GEOSAM" Text (Dark Teal/Blue)
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("GEOSAM", 14, 20);

    // "TECHNOLOGY" Text (Subtext)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    // Spaced out text simulation
    doc.text("T E C H N O L O G Y", 14.5, 25);

    // Graphical Accent (Orange Dot) - Matches the logo style provided
    doc.setFillColor(249, 115, 22); // Orange 500
    doc.circle(58, 14, 2.5, 'F'); 

    // Graphical Accent (Teal Arc/Line)
    doc.setDrawColor(13, 148, 136); // Teal 600
    doc.setLineWidth(1);
    doc.line(42, 12, 54, 12); 

    // 2. Company Contact Details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    
    doc.text("P.O. Box 12345 - 00100, Nairobi, Kenya", 14, 32);
    doc.text("+254 700 000 000 | info@geosamtechnology.co.ke", 14, 37);

    // Divider Line
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(14, 45, 196, 45);

    // ==========================================
    // DOCUMENT METADATA SECTION
    // ==========================================

    const isTransactionDoc = [
        EntityType.SALES_INVOICES, 
        EntityType.SALES_QUOTES, 
        EntityType.SALES_ORDERS, 
        EntityType.DELIVERY_NOTES,
        EntityType.PURCHASE_ORDERS
    ].includes(currentPath);

    // Document Title (Top Right)
    doc.setTextColor(13, 148, 136); // Teal 600 Brand Color
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    
    let docTitle = title.toUpperCase().slice(0, -1); // Remove plural 's'
    if (title === 'Receipts') docTitle = 'PAYMENT RECEIPT';
    if (title === 'Delivery Notes') docTitle = 'DELIVERY NOTE';
    if (!isTransactionDoc) docTitle = `${docTitle} RECORD`;

    doc.text(docTitle, 196, 20, { align: 'right' });

    // Document Details (Reference, Date, Status)
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

    // Client / Recipient Details (Left Side, below divider)
    let startY = 60;
    
    if (isTransactionDoc) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text("BILL TO:", 14, 55);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59); // Darker
        doc.text(item.customer || item.supplier || "Walk-in Customer", 14, 61);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        if (item.phone) doc.text(`Tel: ${item.phone}`, 14, 66);
        if (item.email) doc.text(`Email: ${item.email}`, 14, 71);
        
        startY = 80;
    }

    // ==========================================
    // DATA TABLE SECTION
    // ==========================================

    // Check if we have complex line items
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
        // Define table columns based on Document Type
        let tableHead = [['#', 'Item / Description', 'Qty', 'Unit Price', 'Total']];
        let tableBody = item.items.map((line: LineItem, index: number) => [
            (index + 1).toString(),
            line.description,
            line.quantity.toString(),
            currencyFormatter.format(line.unitPrice),
            currencyFormatter.format(line.total)
        ]);

        // Specific logic for Delivery Notes (Hide Prices)
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
            headStyles: { 
                fillColor: [15, 23, 42], // Slate 900
                textColor: 255, 
                fontStyle: 'bold',
                halign: 'left'
            },
            styles: { 
                fontSize: 9, 
                cellPadding: 4,
                textColor: [51, 65, 85],
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            columnStyles: { 
                0: { cellWidth: 10, halign: 'center' }, // Index
                1: { cellWidth: 'auto' }, // Description
                2: { cellWidth: 20, halign: 'center' }, // Qty
                3: { cellWidth: 30, halign: 'right' }, // Price
                4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' } // Total
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            }
        });

        // Grand Total Section (Skip for Delivery Notes)
        if (currentPath !== EntityType.DELIVERY_NOTES) {
            const finalY = (doc as any).lastAutoTable.finalY + 5;
            
            // Recalculate totals to ensure accuracy
            const subTotal = item.items.reduce((sum: number, i: LineItem) => sum + i.total, 0);
            const vat = subTotal * 0.18;
            const grandTotal = subTotal + vat;

            // Draw a total box
            doc.setFillColor(241, 245, 249); // Slate 100
            doc.rect(130, finalY, 66, 24, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text("Subtotal:", 135, finalY + 7);
            doc.text(currencyFormatter.format(subTotal), 190, finalY + 7, { align: 'right' });

            doc.text("VAT (18%):", 135, finalY + 14);
            doc.text(currencyFormatter.format(vat), 190, finalY + 14, { align: 'right' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.text("Total:", 135, finalY + 21);
            doc.text(currencyFormatter.format(grandTotal), 190, finalY + 21, { align: 'right' });

            startY = finalY + 35;
        } else {
             startY = (doc as any).lastAutoTable.finalY + 20;
        }

    } else {
        // Fallback for simple entities
        const infoRows = columns
        .filter(col => col.key !== 'description' && col.key !== 'status' && col.key !== 'date' && col.key !== 'items' && col.type !== 'readonly')
        .map(col => {
            let value = item[col.key];
            if (col.type === 'currency') value = currencyFormatter.format(Number(value || 0));
            return [col.label, value];
        });

        autoTable(doc, {
            startY: startY,
            head: [['Field', 'Details']],
            body: infoRows,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] },
        });
        startY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Notes Section
    if (item.description) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text("NOTES / TERMS:", 14, startY);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      
      const splitText = doc.splitTextToSize(item.description, 180);
      doc.text(splitText, 14, startY + 6);
    }

    // ==========================================
    // FOOTER SECTION
    // ==========================================
    const pageHeight = doc.internal.pageSize.height || 297;
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 15, 196, pageHeight - 15);
    
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFontSize(8);
    doc.text("Thank you for your business!", 14, pageHeight - 10);
    doc.text("Geosam Technology Systems", 196, pageHeight - 10, { align: 'right' });

    // Save
    doc.save(`${docTitle.replace(/\s+/g, '_')}_${item.id}.pdf`);
  };

  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    const nameMatch = item.name && item.name.toString().toLowerCase().includes(term);
    const customerMatch = item.customer && item.customer.toString().toLowerCase().includes(term);
    const idMatch = item.id && item.id.toString().toLowerCase().includes(term);
    
    return nameMatch || customerMatch || idMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-slate-500">Manage your {title.toLowerCase()} data</p>
          </div>
        </div>
        <div className="flex gap-3">
           <button className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
           <button className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium">
            <Download className="w-4 h-4 mr-2" />
            Export List
          </button>
          <button 
            onClick={onAdd}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm transition-all"
          placeholder="Search by Name, Customer, or ID..."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col) => {
                  if (col.type === 'items') return null