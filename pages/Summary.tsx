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
    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
  >
    <div className={`p-3 rounded-full ${color} text-white mb-2 group-hover:scale-110 transition-transform`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-xs font-semibold text-slate-600">{label}</span>
  </button>
);

const KPICard = ({ title, value, subValue, icon: Icon, colorClass, trend, restricted }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden h-full">
    <div className={`absolute top-0 right-0 p-4 opacity-10 ${colorClass}`}>
        <Icon className="w-24 h-24" />
    </div>
    <div className="flex justify-between items-start z-10">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
            {restricted ? '****' : value}
        </h3>
      </div>
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-white`}>
         <div className={`p-2 rounded-lg ${colorClass.replace('bg-', 'bg-opacity-20 bg-')} ${colorClass.replace('bg-', 'text-')}`}>
            {restricted ? <Lock className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
         </div>
      </div>
    </div>
    <div className="mt-4 flex items-center text-xs font-medium z-10">
        {!restricted && trend && (
            <span className={`${trend > 0 ? 'text-emerald-600' : 'text-red-600'} flex items-center bg-slate-50 px-2 py-1 rounded-full`}>
                {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {Math.abs(trend)}%
            </span>
        )}
        <span className="text-slate-400 ml-2">{subValue}</span>
    </div>
  </div>
);

const ActivityItem = ({ type, title, amount, date, status }: any) => {
    const isPositive = type === 'payment' || type === 'invoice';
    return (
        <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${type === 'payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {type === 'payment' ? <DollarSign className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-800">{title}</p>
                    <p className="text-xs text-slate-500">{date}</p>
                </div>
            </div>
            <div className="text-right">
                <p className={`text-sm font-bold ${isPositive ? 'text-slate-800' : 'text-slate-800'}`}>
                    {amount}
                </p>
                <p className={`text-[10px] uppercase font-semibold ${status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
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

    // 1. Cash on Hand (Sum of Bank Balances)
    const cashOnHand = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

    // 2. Receivables (Unpaid Invoices)
    const receivables = invoices
        .filter(inv => inv.status !== 'Paid' && inv.status !== 'Draft' && inv.status !== 'Cancelled')
        .reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid || 0)), 0);

    // 3. Total Revenue (Paid this period - simplified to all time for demo)
    const revenue = invoices
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

    // 4. Monthly Breakdown for Chart
    const chartMap = new Map();
    // Seed last 6 months
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
    
    // 5. Pipeline Stats
    const pipeline = [
        { name: 'Draft', value: quotes.filter(q => q.status === 'Draft').length, color: '#94a3b8' },
        { name: 'Sent', value: quotes.filter(q => q.status === 'Sent').length, color: '#3b82f6' },
        { name: 'Accepted', value: quotes.filter(q => q.status === 'Accepted').length, color: '#10b981' },
    ].filter(i => i.value > 0);

    // 6. Recent Activity (Mix of Invoices and Purchases)
    const recent = [...invoices]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    // 7. Low Stock
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

  // Quick Action Handlers
  const handleQuickCreate = (type: EntityType) => {
    navigate(`/${type}`);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executive Overview</h1>
          <p className="text-slate-500">Financial health and operational metrics</p>
        </div>
        <div className="flex items-center bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            {['This Month', 'Last Month', 'This Year'].map(range => (
                <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        timeRange === range 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    {range}
                </button>
            ))}
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
         <div className="hidden lg:flex flex-col justify-center items-start px-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">System Status</p>
            <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700">All Systems Operational</span>
            </div>
         </div>
      </div>

      {/* KPI CARDS (RESTRICTED TO ADMIN) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Cash on Hand" 
          value={currencyFormatter.format(metrics.cashOnHand)} 
          subValue={isAdmin ? "Across all accounts" : "Hidden"}
          icon={Wallet}
          colorClass="bg-emerald-600"
          trend={2.5}
          restricted={!isAdmin}
        />
        <KPICard 
          title="Outstanding Receivables" 
          value={currencyFormatter.format(metrics.receivables)} 
          subValue={isAdmin ? "Unpaid invoices" : "Hidden"}
          icon={Clock}
          colorClass="bg-amber-500"
          trend={-1.2}
          restricted={!isAdmin}
        />
        <KPICard 
          title="Total Revenue (YTD)" 
          value={currencyFormatter.format(metrics.revenue)} 
          subValue={isAdmin ? "Collected income" : "Hidden"}
          icon={TrendingUp}
          colorClass="bg-indigo-600"
          trend={12.8}
          restricted={!isAdmin}
        />
      </div>

      {/* MAIN CHART AREA & ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[400px]">
        {/* FINANCIAL CHART (RESTRICTED TO ADMIN) */}
        {isAdmin ? (
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 text-lg">Cash Flow Analysis</h3>
                    <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>Income</div>
                        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-rose-400 mr-2"></div>Expenses</div>
                    </div>
                </div>
                <div className="flex-1 min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={metrics.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                            <Bar dataKey="expense" barSize={12} fill="#fb7185" radius={[4, 4, 0, 0]} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        ) : (
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Financial Analytics Restricted</h3>
                <p className="text-slate-500 max-w-xs mt-2">
                    Detailed profit, loss, and revenue analytics are only visible to Administrator accounts.
                </p>
            </div>
        )}

        {/* RECENT ACTIVITY */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 text-lg">Recent Activity</h3>
                <Link to="/sales-invoices" className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold flex items-center">
                    View All <ChevronRight className="w-3 h-3 ml-1" />
                </Link>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                {metrics.recent.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Clock className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No recent transactions</p>
                    </div>
                ) : (
                    metrics.recent.map((item: GenericEntity) => (
                        <ActivityItem 
                            key={item.id}
                            type="invoice" // Simplified for demo
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* PIPELINE CHART */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg mb-2">Sales Pipeline</h3>
              <p className="text-slate-400 text-xs mb-6">Quote distribution by status</p>
              
              <div className="h-[200px] flex items-center justify-center relative">
                  {metrics.pipeline.length === 0 ? (
                      <p className="text-slate-400 text-sm">No quotes found</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={metrics.pipeline}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {metrics.pipeline.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                  )}
                  {/* Center Text */}
                  {metrics.pipeline.length > 0 && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-slate-700">
                            {metrics.pipeline.reduce((a, b) => a + b.value, 0)}
                        </span>
                     </div>
                  )}
              </div>
          </div>

          {/* INVENTORY ALERTS */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
              <div className="flex items-center mb-6">
                  <div className="p-2 bg-amber-100 rounded-lg mr-3 text-amber-600">
                      <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-800 text-lg">Low Stock Alerts</h3>
                      <p className="text-slate-500 text-xs">Items below reorder point (10 units)</p>
                  </div>
              </div>

              {metrics.lowStock.length === 0 ? (
                  <div className="flex items-center justify-center h-[150px] bg-emerald-50 rounded-xl border border-emerald-100 border-dashed">
                      <div className="text-center">
                          <Package className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                          <p className="text-emerald-700 font-medium text-sm">Inventory levels are healthy</p>
                      </div>
                  </div>
              ) : (
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                              <tr>
                                  <th className="px-4 py-3">Item Name</th>
                                  <th className="px-4 py-3">SKU</th>
                                  <th className="px-4 py-3 text-center">Stock</th>
                                  <th className="px-4 py-3 text-right">Status</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {metrics.lowStock.map((item: any) => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                                      <td className="px-4 py-3 text-slate-500">{item.code}</td>
                                      <td className="px-4 py-3 text-center font-bold text-red-600">{item.stock}</td>
                                      <td className="px-4 py-3 text-right">
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                              Restock
                                          </span>
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