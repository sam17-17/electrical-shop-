import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { EntityType } from '../types';
// FIX: Add missing 'Receipt' icon import from 'lucide-react'.
import { ArrowLeft, Wallet, Clock, Package, Landmark, FileStack, TrendingUp, TrendingDown, Scale, Receipt } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' });

const BalanceSheetRow: React.FC<{ label: string, value: number, icon: React.ElementType, isSubtle?: boolean }> = ({ label, value, icon: Icon, isSubtle }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
        <div className="flex items-center">
            <Icon className={`w-4 h-4 mr-3 ${isSubtle ? 'text-slate-400' : 'text-indigo-500'}`} />
            <p className={`text-sm ${isSubtle ? 'text-slate-500' : 'font-semibold text-slate-700'}`}>{label}</p>
        </div>
        <p className={`text-sm font-semibold ${isSubtle ? 'text-slate-600' : 'text-slate-800'}`}>{currencyFormatter.format(value)}</p>
    </div>
);

const SectionCard: React.FC<{ title: string, total: number, icon: React.ElementType, children: React.ReactNode }> = ({ title, total, icon: Icon, children }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-2">
            <div className="flex items-center">
                <Icon className="w-5 h-5 mr-3 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
            </div>
            <p className="text-lg font-extrabold text-slate-800 tracking-tight">{currencyFormatter.format(total)}</p>
        </div>
        <div className="space-y-1">
            {children}
        </div>
    </div>
);

export const BalanceSheet: React.FC = () => {
    const navigate = useNavigate();
    const { data } = useData();

    const financials = useMemo(() => {
        const cashOnHand = (data[EntityType.BANK_CASH] || []).reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
        const accountsReceivable = (data[EntityType.SALES_INVOICES] || [])
            .filter(inv => inv.status !== 'Paid')
            .reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid || 0)), 0);
        const inventoryValue = (data[EntityType.INVENTORY] || [])
            .filter(item => item.itemType === 'Product')
            .reduce((sum, item) => sum + (Number(item.stock) * Number(item.price)), 0);
        
        const totalCurrentAssets = cashOnHand + accountsReceivable + inventoryValue;
        const totalAssets = totalCurrentAssets; // No fixed assets module yet

        const accountsPayablePurchases = (data[EntityType.PURCHASE_INVOICES] || [])
            .filter(inv => inv.status !== 'Paid')
            .reduce((sum, inv) => sum + Number(inv.amount), 0);
        const accountsPayableExpenses = (data[EntityType.EXPENSES] || [])
            .filter(exp => exp.status !== 'Paid')
            .reduce((sum, exp) => sum + Number(exp.amount), 0);
        const accountsPayable = accountsPayablePurchases + accountsPayableExpenses;
        
        const totalCurrentLiabilities = accountsPayable;
        const totalLiabilities = totalCurrentLiabilities; // No long-term liabilities

        const equity = totalAssets - totalLiabilities;
        const totalLiabilitiesAndEquity = totalLiabilities + equity;

        return {
            cashOnHand, accountsReceivable, inventoryValue, totalCurrentAssets, totalAssets,
            accountsPayable, totalCurrentLiabilities, totalLiabilities, equity, totalLiabilitiesAndEquity
        };
    }, [data]);

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Balance Sheet</h1>
                    <p className="text-slate-500 text-sm">A snapshot of your company's financial health as of {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* ASSETS */}
                <div className="space-y-6">
                    <SectionCard title="Current Assets" total={financials.totalCurrentAssets} icon={TrendingUp}>
                        <BalanceSheetRow label="Cash on Hand" value={financials.cashOnHand} icon={Wallet} />
                        <BalanceSheetRow label="Accounts Receivable" value={financials.accountsReceivable} icon={Clock} />
                        <BalanceSheetRow label="Inventory Value" value={financials.inventoryValue} icon={Package} />
                    </SectionCard>
                    <div className="bg-white p-5 rounded-2xl shadow-md border-2 border-indigo-500 flex justify-between items-center">
                        <h2 className="text-lg font-extrabold text-indigo-800 tracking-tight">Total Assets</h2>
                        <p className="text-2xl font-black text-indigo-900 tracking-tight">{currencyFormatter.format(financials.totalAssets)}</p>
                    </div>
                </div>

                {/* LIABILITIES & EQUITY */}
                <div className="space-y-6">
                    <SectionCard title="Current Liabilities" total={financials.totalCurrentLiabilities} icon={TrendingDown}>
                        <BalanceSheetRow label="Accounts Payable" value={financials.accountsPayable} icon={Receipt} />
                    </SectionCard>
                    <SectionCard title="Equity" total={financials.equity} icon={Landmark}>
                        <BalanceSheetRow label="Owner's Equity" value={financials.equity} icon={FileStack} isSubtle />
                    </SectionCard>
                    <div className={`p-5 rounded-2xl shadow-md border-2 flex justify-between items-center ${Math.abs(financials.totalAssets - financials.totalLiabilitiesAndEquity) < 0.01 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                        <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Total Liabilities & Equity</h2>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">{currencyFormatter.format(financials.totalLiabilitiesAndEquity)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};