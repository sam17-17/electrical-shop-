import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText, Calculator } from 'lucide-react';
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
  
  // Calculate what has already been paid and what is left
  const totalAmount = invoice?.amount || 0;
  const previouslyPaid = invoice?.amountPaid || 0;
  const outstandingBalance = totalAmount - previouslyPaid;

  // Load Bank/Cash Accounts
  const accounts = data[EntityType.BANK_CASH] || [];

  useEffect(() => {
    if (invoice) {
      // Default the input to the outstanding balance, not the full total (unless nothing paid yet)
      setAmount(invoice.amount - (invoice.amountPaid || 0));
      setReference(`PAY-${Date.now().toString().substr(-6)}`);
      
      // Default to first bank account if available
      if (accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
    }
  }, [invoice, accounts]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      alert("Please select a valid Bank/Cash account to deposit funds into.");
      return;
    }
    
    if (amount <= 0) {
        alert("Payment amount must be greater than zero.");
        return;
    }

    if (amount > outstandingBalance) {
        if(!window.confirm(`You are entering a payment (KES ${amount}) higher than the outstanding balance (KES ${outstandingBalance}). Continue?`)) {
            return;
        }
    }
    
    receivePayment(invoice.id, amount, accountId, date, reference);
    onClose();
  };

  const currencyFormatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' });
  const remainingAfterPayment = outstandingBalance - amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Receive Payment</h3>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Invoice Summary */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <div>
                    <p className="text-xs text-slate-500 uppercase">Ref #</p>
                    <p className="font-semibold text-slate-700">{invoice.id}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase">Invoice Total</p>
                    <p className="font-bold text-slate-700">{currencyFormatter.format(totalAmount)}</p>
                </div>
            </div>
            <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-500">Previously Paid:</span>
                 <span className="text-slate-700">{currencyFormatter.format(previouslyPaid)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-medium">
                 <span className="text-slate-500">Outstanding Balance:</span>
                 <span className="text-red-600">{currencyFormatter.format(outstandingBalance)}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Payment Amount Received</label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-slate-400 font-bold">KES</span>
                 <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-slate-900"
                    min="0"
                    step="0.01"
                    required
                 />
              </div>
              {/* Dynamic Balance Calculation */}
              <div className="mt-2 flex items-center text-xs">
                  <Calculator className="w-3 h-3 mr-1 text-slate-400" />
                  <span className="text-slate-500 mr-1">Balance after this payment:</span>
                  <span className={`font-bold ${remainingAfterPayment > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {currencyFormatter.format(remainingAfterPayment > 0 ? remainingAfterPayment : 0)}
                  </span>
                  {remainingAfterPayment <= 0 && <span className="ml-2 text-emerald-600 font-bold">(Fully Paid)</span>}
                  {remainingAfterPayment > 0 && <span className="ml-2 text-amber-600">(Deficit)</span>}
              </div>
            </div>

            {/* Deposit To Account */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Deposit To (Account)</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <select
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                >
                  <option value="" disabled>Select Account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.bank})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Payment Date</label>
                <div className="relative">
                    <div className="absolute left-3 top-2.5 text-slate-400">
                    <Calendar className="w-4 h-4" />
                    </div>
                    <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                </div>
                </div>

                {/* Reference */}
                <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Reference / Cheque #</label>
                <div className="relative">
                    <div className="absolute left-3 top-2.5 text-slate-400">
                    <FileText className="w-4 h-4" />
                    </div>
                    <input
                    type="text"
                    required
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    placeholder="e.g. TRX-123"
                    />
                </div>
                </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm shadow-emerald-200 transition-all flex justify-center items-center"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            {remainingAfterPayment > 0 ? 'Record Partial Payment' : 'Confirm Full Payment'}
          </button>
        </form>
      </div>
    </div>
  );
};