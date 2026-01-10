
import React, { useState, useEffect } from 'react';
// Added missing ChevronDown import from lucide-react
import { X, DollarSign, Calendar, CreditCard, FileText, Calculator, ChevronDown } from 'lucide-react';
import { useData } from '../context/DataContext';
import { EntityType, GenericEntity } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: GenericEntity | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, invoice }) => {
  const { data, receivePayment } = useData();
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [reference, setReference] = useState('');
  
  const totalAmount = invoice?.amount || 0;
  const previouslyPaid = invoice?.amountPaid || 0;
  const outstandingBalance = totalAmount - previouslyPaid;

  const accounts = data[EntityType.BANK_CASH] || [];

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.amount - (invoice.amountPaid || 0));
      setReference(`PAY-${Date.now().toString().substr(-6)}`);
      
      if (accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
    }
  }, [invoice, accounts]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      alert("Please select a target Bank/Cash account.");
      return;
    }
    
    if (amount <= 0) {
        alert("Amount must be a positive value.");
        return;
    }

    if (amount > outstandingBalance) {
        if(!window.confirm(`Overpayment detected. Record receipt of KES ${amount}?`)) {
            return;
        }
    }
    
    receivePayment(invoice.id, amount, accountId, date, reference);
    onClose();
  };

  const currencyFormatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' });
  const remainingAfterPayment = outstandingBalance - amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden animate-fade-in-up flex flex-col border border-slate-200">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/50 rounded-lg">
                <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight">Post Payment Receipt</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-500 rounded-lg transition-colors">
            <X className="w-5 h-5 text-emerald-100" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Invoice Summary */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Source Doc</p>
                    <p className="font-extrabold text-slate-700 tracking-tight">{invoice.id}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Total Bill</p>
                    <p className="font-black text-slate-900">{currencyFormatter.format(totalAmount)}</p>
                </div>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold">
                 <span className="text-slate-500">Already Received:</span>
                 <span className="text-slate-800">{currencyFormatter.format(previouslyPaid)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold">
                 <span className="text-slate-500">Unpaid Balance:</span>
                 <span className="text-red-600">{currencyFormatter.format(outstandingBalance)}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block px-1">Receipt Amount (KES)</label>
              <div className="relative group">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs transition-colors group-focus-within:text-emerald-500">KES</span>
                 <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-14 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-black text-slate-900 text-lg transition-all"
                    min="0"
                    step="0.01"
                    required
                 />
              </div>
              <div className="mt-2 flex items-center text-[10px] font-bold px-1">
                  <Calculator className="w-3 h-3 mr-1.5 text-slate-400" />
                  <span className="text-slate-400 mr-1 uppercase tracking-tighter">Projected Post-Transaction Balance:</span>
                  <span className={`font-black ${remainingAfterPayment > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {currencyFormatter.format(remainingAfterPayment > 0 ? remainingAfterPayment : 0)}
                  </span>
                  {remainingAfterPayment <= 0 && <span className="ml-2 text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded uppercase text-[8px] font-black">Settled</span>}
              </div>
            </div>

            {/* Deposit To Account */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block px-1">Destination Portfolio</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                  <CreditCard className="w-4 h-4" />
                </div>
                <select
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-bold transition-all appearance-none"
                >
                  <option value="" disabled>Select Target Account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} - {acc.bank}</option>
                  ))}
                </select>
                {/* Fixed ChevronDown missing import and usage on line 151 */}
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block px-1">Posting Date</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                    <Calendar className="w-4 h-4" />
                    </div>
                    <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-bold transition-all"
                    />
                </div>
                </div>

                {/* Reference */}
                <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block px-1">Receipt ID / Ref</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                    <FileText className="w-4 h-4" />
                    </div>
                    <input
                    type="text"
                    required
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-bold transition-all"
                    placeholder="Ref ID"
                    />
                </div>
                </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-100 transition-all flex justify-center items-center hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-widest text-xs"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            {remainingAfterPayment > 0 ? 'Record Part-Settlement' : 'Finalize Settlement'}
          </button>
        </form>
      </div>
    </div>
  );
};
