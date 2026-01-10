import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend, ComposedChart, Line 
} from 'recharts';
import { 
  DollarSign, TrendingUp, Users, Package, ArrowUpRight, ArrowDownRight, 
  PlusCircle, FileText, ShoppingBag, AlertTriangle, Clock, ChevronRight,
  Wallet, Receipt, Lock
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { EntityType, GenericEntity } from '../types';

// --- COMPONENTS ---

const QuickActionBtn = ({ icon: Icon, label, onClick, color }: any) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group min-w-[100px]"
  >
    <div className={`p-3 rounded-full ${color} text-white mb-2 group-hover:scale-110 transition-transform shadow-sm`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight truncate w-full text-center">
      {label}
    </span>
  </button>
);

const KPICard = ({ title, value, subValue, icon: Icon, colorClass, trend, restricted }: any) => (
  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden h-full min-h-[140px]">
    <div className={`absolute -top-4 -right-4 p-4 opacity-5 ${colorClass}`}>
        <Icon className="w-24 h-24" />
    </div>
    <div className="flex justify-between items-start z-10">
      <div>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            {restricted ? '••••' : value}
        </h3>
      </div>
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-white shrink-0`}>
         <div className={`p-2 rounded-lg ${colorClass.replace('bg-', 'bg-opacity-20 bg-')} ${colorClass.replace('bg-', 'text-')}`}>
            {restricted ? <Lock className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
         </div>
      </div>
    </div>
    <div className="mt-4 flex items-center text-[10px] font-bold z-10">
        {!restricted && trend && (
            <span className={`${trend > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'} flex items-center px-2 py-0.5 rounded-full mr-2`}>
                {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {Math.abs(trend)}%
            </span>
        )}
        <span className="text-slate-400 uppercase tracking-tighter truncate">{subValue}</span>
    </div>
  </div>
);

const ActivityItem = ({ type, title, amount, date, status }: any) => {
    const isPositive = type === 'payment' || type === 'invoice';
    return (
        <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
            <div className="flex items-center space-x-3 min-w-0">
                <div className={`p-2 rounded-full shrink-0 ${type === 'payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {type === 'payment' ? <DollarSign className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
                    <p className="text-[10px] text-slate-500">{date}</p>
                </div>
            </div>
            <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold text-slate-800 whitespace-nowrap">
                    {amount}
                </p>
                <p className={`text-[10px] uppercase font-extrabold tracking-tighter ${status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {status}
                </p>
            </div>
        </div>
    )
}

// --- MAIN SUMMARY PAGE ---

export const Summary: React.FC = () => {
  const { data } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('This Month');

  const isAdmin = (user?.user_metadata?.role || user?.role) === 'Admin';

  // --- DATA CALCULATIONS ---
  const metrics = useMemo(() => {
    const invoices = data[EntityType.SALES_INVOICES] || [];
    const expenses = data[EntityType.PURCHASE_INVOICES] || [];
    const accounts = data[EntityType.BANK_CASH] || [];
    const quotes = data[EntityType.SALES_QUOTES] || [];
    const inventory = data[EntityType.INVENTORY] || [];

    const cashOnHand = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    const receivables = invoices
        .filter(inv => inv.status !== 'Paid' && inv.status !== 'Draft' && inv.status !== 'Cancelled')
        .reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid || 0)), 0);
    const revenue = invoices
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

    const chartMap = new Map();
    for(let i=5; i>=0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('default', { month: 'short' });
        chartMap.set(key, { name: key, income: 0, expense: 0 });
    }

    invoices.forEach(inv => {
        if(inv.status === 'Paid') {
            const date = new Date(inv.date);
            const key = date.toLocaleString('default', { month: 'short' });
            if(chartMap.has(key)) {
                const entry = chartMap.get(key);
                entry.income += Number(inv.amount);
            }
        }
    });

    expenses.forEach(exp => {
        if(exp.status === 'Paid') {
            const date = new Date(exp.date);
            const key = date.toLocaleString('default', { month: 'short' });
            if(chartMap.has(key)) {
                const entry = chartMap.get(key);
                entry.expense += Number(exp.amount);
            }
        }
    });
    
    const pipeline = [
        { name: 'Draft', value: quotes.filter(q => q.status === 'Draft').length, color: '#94a3b8' },
        { name: 'Sent', value: quotes.filter(q => q.status === 'Sent').length, color: '#3b82f6' },
        { name: 'Accepted', value: quotes.filter(q => q.status === 'Accepted').length, color: '#10b981' },
    ].filter(i => i.value > 0);

    const recent = [...invoices]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    const lowStock = inventory.filter(item => Number(item.stock) < 10);

    return {
        cashOnHand,
        receivables,
        revenue,
        chartData: Array.from(chartMap.values()),
        pipeline,
        recent,
        lowStock
    };
  }, [data]);

  const currencyFormatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' });

  const handleQuickCreate = (type: EntityType) => {
    navigate(`/${type}`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-10 max-w-[1600px] mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Executive Overview</h1>
          <p className="text-slate-500 text-sm">Real-time financial and operational health metrics</p>
        </div>
        <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-sm self-start sm:self-auto overflow-x-auto no-scrollbar">
            {['This Month', 'Last Month', 'This Year'].map(range => (
                <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                        timeRange === range 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    {range}
                </button>
            ))}
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
         <QuickActionBtn 
            icon={FileText} 
            label="New Invoice" 
            color="bg-indigo-500" 
            onClick={() => handleQuickCreate(EntityType.SALES_INVOICES)} 
         />
         <QuickActionBtn 
            icon={ShoppingBag} 
            label="New Quote" 
            color="bg-blue-500" 
            onClick={() => handleQuickCreate(EntityType.SALES_QUOTES)} 
         />
         <QuickActionBtn 
            icon={Users} 
            label="Add Customer" 
            color="bg-emerald-500" 
            onClick={() => handleQuickCreate(EntityType.CUSTOMERS)} 
         />
         <QuickActionBtn 
            icon={Package} 
            label="Add Product" 
            color="bg-amber-500" 
            onClick={() => handleQuickCreate(EntityType.INVENTORY)} 
         />
         <div className="hidden lg:flex flex-col justify-center items-start px-6 bg-white/50 border border-slate-100 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Network Status</p>
            <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                <span className="text-xs font-bold text-slate-700">Real-time Sync Active</span>
            </div>
         </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <KPICard 
          title="Cash on Hand" 
          value={currencyFormatter.format(metrics.cashOnHand)} 
          subValue={isAdmin ? "Total liquid assets" : "Access Restricted"}
          icon={Wallet}
          colorClass="bg-emerald-600"
          trend={2.5}
          restricted={!isAdmin}
        />
        <KPICard 
          title="Accounts Receivable" 
          value={currencyFormatter.format(metrics.receivables)} 
          subValue={isAdmin ? "Unpaid invoice pool" : "Access Restricted"}
          icon={Clock}
          colorClass="bg-amber-500"
          trend={-1.2}
          restricted={!isAdmin}
        />
        <KPICard 
          title="Net Revenue (YTD)" 
          value={currencyFormatter.format(metrics.revenue)} 
          subValue={isAdmin ? "Total collected funds" : "Access Restricted"}
          icon={TrendingUp}
          colorClass="bg-indigo-600"
          trend={12.8}
          restricted={!isAdmin}
        />
      </div>

      {/* MAIN CHART AREA & ACTIVITY FEED */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* FINANCIAL CHART */}
        <div className="xl:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[350px] sm:min-h-[400px]">
            {isAdmin ? (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                        <div>
                            <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Financial Performance</h3>
                            <p className="text-xs text-slate-400">Monthly income vs expenditure flow</p>
                        </div>
                        <div className="flex items-center space-x-4 text-[10px] font-bold uppercase tracking-wider">
                            <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-2"></div>Income</div>
                            <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-rose-400 mr-2"></div>Expense</div>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                <Bar dataKey="expense" barSize={14} fill="#fb7185" radius={[4, 4, 0, 0]} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
                        <Lock className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Protected Financial View</h3>
                    <p className="text-slate-500 max-w-xs mt-2 text-sm">
                        Trend analysis and detailed cash flow reporting are restricted to system administrators.
                    </p>
                </div>
            )}
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden h-[400px]">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Recent Activity</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Transaction Audit</p>
                </div>
                <Link to="/sales-invoices" className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                {metrics.recent.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 italic">
                        <Clock className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">No recent transactions recorded</p>
                    </div>
                ) : (
                    metrics.recent.map((item: GenericEntity) => (
                        <ActivityItem 
                            key={item.id}
                            type="invoice"
                            title={item.customer}
                            amount={currencyFormatter.format(item.amount)}
                            date={new Date(item.date).toLocaleDateString()}
                            status={item.status}
                        />
                    ))
                )}
            </div>
        </div>
      </div>

      {/* BOTTOM METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* PIPELINE CHART */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-lg tracking-tight mb-1">Sales Pipeline</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6">Quote Lifecycle Distribution</p>
              
              <div className="h-[220px] flex items-center justify-center relative">
                  {metrics.pipeline.length === 0 ? (
                      <div className="text-slate-300 text-sm flex flex-col items-center">
                        <FileText className="w-8 h-8 mb-2 opacity-20" />
                        <p>No active quotes in pipeline</p>
                      </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={metrics.pipeline}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                {metrics.pipeline.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                        </PieChart>
                    </ResponsiveContainer>
                  )}
                  {metrics.pipeline.length > 0 && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-9">
                        <div className="text-center">
                            <span className="text-3xl font-black text-slate-800 leading-none block">
                                {metrics.pipeline.reduce((a, b) => a + b.value, 0)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">TOTAL</span>
                        </div>
                     </div>
                  )}
              </div>
          </div>

          {/* INVENTORY ALERTS */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div className="flex items-center">
                      <div className="p-2.5 bg-amber-100 rounded-xl mr-3 text-amber-600 shadow-sm shadow-amber-100">
                          <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Critical Stock Warnings</h3>
                          <p className="text-slate-500 text-xs">Items requiring immediate reordering (&lt;10 units)</p>
                      </div>
                  </div>
                  <Link to="/inventory" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                    Manage Stock
                  </Link>
              </div>

              {metrics.lowStock.length === 0 ? (
                  <div className="flex items-center justify-center h-[160px] bg-emerald-50 rounded-2xl border border-emerald-100 border-dashed">
                      <div className="text-center p-4">
                          <Package className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                          <p className="text-emerald-800 font-bold text-sm tracking-tight">All inventory levels optimal</p>
                          <p className="text-emerald-600 text-xs mt-1">No low stock items detected currently</p>
                      </div>
                  </div>
              ) : (
                  <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-100">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                              <tr>
                                  <th className="px-4 py-3">Product Description</th>
                                  <th className="px-4 py-3">Reference SKU</th>
                                  <th className="px-4 py-3 text-center">Qty</th>
                                  <th className="px-4 py-3 text-right">Action</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {metrics.lowStock.map((item: any) => (
                                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                      <td className="px-4 py-3 font-bold text-slate-700">{item.name}</td>
                                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.code}</td>
                                      <td className="px-4 py-3 text-center">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-red-100 text-red-700">
                                              {item.stock}
                                          </span>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                          <button className="text-[10px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 transition-colors">
                                              Restock
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};