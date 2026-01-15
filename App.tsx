
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation, Navigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, Users, FileText, ShoppingCart, Truck, 
  Briefcase, Receipt, Layers, Folder, UserCheck, BookOpen, 
  PieChart, Settings as SettingsIcon, Menu, X, ChevronRight,
  ClipboardList, StickyNote, LogOut, Database, Cloud, CloudOff, ShieldCheck,
  AlertTriangle, ArrowRight, RefreshCw, Zap
} from 'lucide-react';
import { EntityType, NavItem, DataColumn } from './types';
import { Summary } from './pages/Summary';
import { EntityList } from './pages/EntityList';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { AiAssistant } from './components/AiAssistant';
import { DataProvider, useData } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Modal } from './components/Modal';
import { EntityForm } from './components/EntityForm';

// --- CONFIGURATION ---
const CATEGORY_OPTIONS = ['Electronics', 'Services', 'Accessories', 'Software', 'Hardware'];

const SALES_COLUMNS_BASE: DataColumn[] = [
  { key: 'id', label: 'Reference #', type: 'readonly' }, 
  { key: 'customer', label: 'Customer', type: 'select', sourceType: EntityType.CUSTOMERS, required: true },
  { key: 'phone', label: 'Client Phone', type: 'phone', required: false },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'items', label: 'Line Items', type: 'items', required: true }, 
  { key: 'amount', label: 'Grand Total', type: 'currency', required: true }, 
  { key: 'status', label: 'Status', type: 'status', options: ['Draft', 'Sent', 'Approved', 'Rejected'], required: true },
];

const PURCHASE_COLUMNS_BASE: DataColumn[] = [
  { key: 'id', label: 'Reference #', type: 'readonly' }, 
  { key: 'supplier', label: 'Supplier', type: 'select', sourceType: EntityType.SUPPLIERS, required: true },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'items', label: 'Line Items', type: 'items', required: true }, 
  { key: 'amount', label: 'Grand Total', type: 'currency', required: true }, 
  { key: 'status', label: 'Status', type: 'status', options: ['Draft', 'Sent', 'Received'], required: true },
];

const COLUMNS: Record<string, DataColumn[]> = {
  [EntityType.BANK_CASH]: [
    { key: 'name', label: 'Account Name', type: 'text', required: true },
    { key: 'bank', label: 'Bank Name', type: 'text', required: true },
    { key: 'number', label: 'Account Number', type: 'text', required: true },
    { key: 'balance', label: 'Current Balance', type: 'currency', required: true },
  ],
  [EntityType.CUSTOMERS]: [
    { key: 'name', label: 'Company Name', type: 'text', required: true },
    { key: 'contact', label: 'Contact Person', type: 'text', required: true },
    { key: 'email', label: 'Email Address', type: 'email', required: true },
    { key: 'phone', label: 'Phone Number', type: 'phone' },
  ],
  [EntityType.SALES_QUOTES]: SALES_QUOTES_COLS(),
  [EntityType.SALES_ORDERS]: SALES_ORDERS_COLS(),
  [EntityType.SALES_INVOICES]: SALES_INVOICES_COLS(),
  [EntityType.DELIVERY_NOTES]: [
    { key: 'id', label: 'DN #', type: 'readonly' },
    { key: 'customer', label: 'Customer', type: 'select', sourceType: EntityType.CUSTOMERS, required: true },
    { key: 'phone', label: 'Contact Phone', type: 'phone' },
    { key: 'date', label: 'Delivery Date', type: 'date', required: true },
    { key: 'items', label: 'Items Delivered', type: 'items', required: true },
    { key: 'status', label: 'Status', type: 'status', options: ['Draft', 'Dispatched', 'Delivered', 'Returned'], required: true },
  ],
  [EntityType.INVENTORY]: [
    { key: 'code', label: 'SKU / Code', type: 'text', required: true },
    { key: 'name', label: 'Item Name', type: 'text', required: true },
    { key: 'stock', label: 'Quantity on Hand', type: 'number', required: true },
    { key: 'price', label: 'Unit Price', type: 'currency', required: true },
    { key: 'category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS, required: true },
  ],
  [EntityType.SUPPLIERS]: [
    { key: 'name', label: 'Supplier Name', type: 'text', required: true },
    { key: 'contact', label: 'Contact Person', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone', type: 'phone' },
  ],
  [EntityType.PURCHASE_QUOTES]: PURCHASE_COLUMNS_BASE.map(c => c.key === 'status' ? { ...c, options: ['Draft', 'Sent', 'Rejected'] } : c),
  [EntityType.PURCHASE_ORDERS]: PURCHASE_COLUMNS_BASE.map(c => c.key === 'status' ? { ...c, options: ['Draft', 'Sent', 'Approved'] } : c),
  [EntityType.PURCHASE_INVOICES]: [
    { key: 'supplier', label: 'Supplier', type: 'select', sourceType: EntityType.SUPPLIERS, required: true },
    { key: 'date', label: 'Invoice Date', type: 'date', required: true },
    { key: 'items', label: 'Items Purchased', type: 'items', required: false },
    { key: 'amount', label: 'Total Amount', type: 'currency', required: true },
    { key: 'status', label: 'Status', type: 'status', options: ['Draft', 'Received', 'Paid', 'Unpaid'], required: true },
  ],
  [EntityType.EMPLOYEES]: [
    { key: 'name', label: 'Full Name', type: 'text', required: true },
    { key: 'role', label: 'Job Title', type: 'text', required: true },
    { key: 'email', label: 'Work Email', type: 'email', required: true },
    { key: 'phone', label: 'Telephone Number', type: 'phone', required: true },
    { key: 'status', label: 'Status', type: 'status', options: ['Active', 'On Leave', 'Terminated'], required: true },
  ],
  [EntityType.SYSTEM_USERS]: [
    { key: 'name', label: 'User Name', type: 'text', required: true },
    { key: 'email', label: 'Email Address', type: 'email', required: true },
    { key: 'pin', label: 'Security PIN', type: 'password', required: true },
    { key: 'role', label: 'Assigned Role', type: 'select', options: ['Admin', 'Manager', 'Sales Agent', 'Accountant', 'Viewer'], required: true },
    { key: 'status', label: 'Account Status', type: 'status', options: ['Active', 'Suspended', 'Inactive'], required: true },
  ],
};

function SALES_QUOTES_COLS() { return SALES_COLUMNS_BASE.map(c => c.key === 'status' ? { ...c, options: ['Draft', 'Sent', 'Accepted', 'Rejected'] } : c); }
function SALES_ORDERS_COLS() { return SALES_COLUMNS_BASE.map(c => c.key === 'status' ? { ...c, options: ['Pending', 'Confirmed', 'Shipped', 'Cancelled'] } : c).map(c => c.key === 'date' ? { ...c, label: 'Receipt Date' } : c); }
function SALES_INVOICES_COLS() { 
  const cols = [...SALES_COLUMNS_BASE];
  // Insert amountPaid before status
  const statusIdx = cols.findIndex(c => c.key === 'status');
  cols.splice(statusIdx, 0, { key: 'amountPaid', label: 'Paid', type: 'currency' });
  return cols.map(c => c.key === 'status' ? { ...c, options: ['Draft', 'Sent', 'Paid', 'Unpaid', 'Overdue'] } : c); 
}

const DEFAULT_COLUMNS: DataColumn[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'status', options: ['Draft', 'Active', 'Archived'] },
  { key: 'description', label: 'Description', type: 'textarea' },
];

const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES: 'Sales Agent',
  ACCOUNTANT: 'Accountant',
  VIEWER: 'Viewer'
};

const ALL_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.ACCOUNTANT, ROLES.VIEWER];
const OPS_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES];
const FINANCE_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT];

const NAV_ITEMS: NavItem[] = [
  { id: EntityType.SUMMARY, label: 'Summary', icon: LayoutDashboard, allowedRoles: ALL_ROLES },
  { id: EntityType.BANK_CASH, label: 'Bank & Cash Accounts', icon: Wallet, allowedRoles: FINANCE_ROLES },
  { id: EntityType.CUSTOMERS, label: 'Customers', icon: Users, group: 'Sales', allowedRoles: OPS_ROLES },
  { id: EntityType.SALES_QUOTES, label: 'Sales Quotes', icon: FileText, group: 'Sales', allowedRoles: OPS_ROLES },
  { id: EntityType.SALES_ORDERS, label: 'Sales Orders', icon: ShoppingCart, group: 'Sales', allowedRoles: OPS_ROLES },
  { id: EntityType.SALES_INVOICES, label: 'Sales', icon: Receipt, group: 'Sales', allowedRoles: [...OPS_ROLES, ROLES.ACCOUNTANT] },
  { id: EntityType.DELIVERY_NOTES, label: 'Delivery Notes', icon: Truck, group: 'Sales', allowedRoles: OPS_ROLES },
  { id: EntityType.SUPPLIERS, label: 'Suppliers', icon: Briefcase, group: 'Purchases', allowedRoles: FINANCE_ROLES },
  { id: EntityType.PURCHASE_QUOTES, label: 'Purchase Quotes', icon: ClipboardList, group: 'Purchases', allowedRoles: FINANCE_ROLES },
  { id: EntityType.PURCHASE_ORDERS, label: 'Purchase Orders', icon: StickyNote, group: 'Purchases', allowedRoles: FINANCE_ROLES },
  { id: EntityType.PURCHASE_INVOICES, label: 'Purchase Invoices', icon: Receipt, group: 'Purchases', allowedRoles: FINANCE_ROLES },
  { id: EntityType.INVENTORY, label: 'Inventory Items', icon: Layers, allowedRoles: [...OPS_ROLES, ROLES.ACCOUNTANT] },
  { id: EntityType.PROJECTS, label: 'Projects', icon: Folder, allowedRoles: OPS_ROLES },
  { id: EntityType.EMPLOYEES, label: 'Employees', icon: UserCheck, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER] },
  { id: EntityType.JOURNAL, label: 'Journal Entries', icon: BookOpen, allowedRoles: [ROLES.ADMIN, ROLES.ACCOUNTANT] },
  { id: EntityType.REPORTS, label: 'Reports', icon: PieChart, allowedRoles: [...FINANCE_ROLES, ROLES.VIEWER] },
  { id: EntityType.SYSTEM_USERS, label: 'System Users', icon: ShieldCheck, group: 'Administration', allowedRoles: [ROLES.ADMIN] },
  { id: EntityType.SETTINGS, label: 'Settings', icon: SettingsIcon, allowedRoles: [ROLES.ADMIN] },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const location = useLocation();
  const { data, lastSync } = useData();
  const { user, logout, isDemoMode } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const userRole = user?.user_metadata?.role || user?.role;
  const filteredNavItems = NAV_ITEMS.filter(item => !item.allowedRoles || item.allowedRoles.includes(userRole));

  const groupedNav = filteredNavItems.reduce((acc, item) => {
    const key = item.group || 'Main';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const contextString = JSON.stringify(data[location.pathname.substring(1) as EntityType] || [], null, 2);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <aside className={`${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'} bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col fixed lg:relative z-30 h-full border-r border-slate-800 shadow-xl overflow-hidden`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className={`font-bold text-white text-xl flex items-center space-x-2 ${!sidebarOpen && 'lg:hidden'}`}>
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
               <span className="text-white">Z</span>
             </div>
             <span className="truncate">Zill Tech</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {Object.entries(groupedNav).map(([group, items]) => (
            <div key={group} className="mb-6">
              {sidebarOpen && group !== 'Main' && <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 truncate">{group}</h3>}
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <NavLink to={`/${item.id === EntityType.SUMMARY ? '' : item.id}`} onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)} className={({ isActive }) => `flex items-center px-4 py-2.5 transition-all relative group ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'} ${!sidebarOpen ? 'justify-center' : ''}`}>
                      <item.icon className={`w-5 h-5 shrink-0 ${sidebarOpen ? 'mr-3' : ''}`} />
                      {sidebarOpen && <span className="text-sm font-medium truncate">{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-800 shrink-0 p-2">
           <div className="flex items-center justify-between">
              <div className={`flex-1 flex items-center p-2 rounded-lg cursor-default min-w-0 ${!sidebarOpen ? 'justify-center' : ''}`}>
                <img src={`https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=6366f1&color=fff`} className="w-8 h-8 rounded-full bg-slate-700 shrink-0" alt="" />
                {sidebarOpen && (
                  <div className="ml-3 text-left min-w-0 overflow-hidden">
                    <p className="text-sm font-semibold text-slate-300 truncate">{user?.username}</p>
                    <p className="text-[10px] text-slate-500 uppercase truncate">{userRole}</p>
                  </div>
                )}
              </div>
              {sidebarOpen && <button onClick={logout} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>}
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm z-10">
          <div className="flex items-center min-w-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 mr-2 sm:mr-4">
              <Menu className="w-5 h-5" />
            </button>
             <div className="flex items-center text-sm text-slate-500 overflow-hidden">
              <span className="hidden sm:inline">Zill Tech Solution</span>
              <ChevronRight className="w-4 h-4 mx-2 hidden sm:inline" />
              <span className="font-semibold text-slate-800 capitalize truncate">{location.pathname === '/' ? 'Summary' : location.pathname.substring(1).replace('-', ' ')}</span>
             </div>
          </div>
          <div className="flex items-center space-x-3">
             {!isDemoMode && (
               <div className="hidden md:flex items-center px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full animate-pulse">
                  <Zap className="w-3 h-3 text-indigo-600 mr-2" />
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter">
                    Last Synced: {lastSync ? lastSync.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Syncing...'}
                  </span>
               </div>
             )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth flex flex-col min-w-0">
          {children}
        </main>
      </div>
      <AiAssistant currentPageData={contextString} />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { data, addEntity, updateEntity, deleteEntity, getEntity, loading: dataLoading } = useData();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<EntityType | null>(null);

  if (authLoading || dataLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
      <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-slate-600 font-black mt-6 tracking-widest text-xs uppercase">Initialising Sync Engine</p>
    </div>
  );

  if (!isAuthenticated) return <Login />;

  const userRole = user?.user_metadata?.role || user?.role;

  const handleFormSubmit = async (formData: any) => {
    if (!activeType) return;
    try {
        if (editingId) await updateEntity(activeType, editingId, formData);
        else await addEntity(activeType, formData);
        setModalOpen(false);
    } catch (e: any) { alert(`Operation failed: ${e.message}`); }
  };

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Summary />} />
          <Route path="/settings" element={userRole === ROLES.ADMIN ? <Settings /> : <Navigate to="/" replace />} />
          {NAV_ITEMS.filter(item => item.id !== EntityType.SUMMARY && item.id !== EntityType.SETTINGS).map((item) => (
            <Route key={item.id} path={`/${item.id}`} element={
              (!item.allowedRoles || item.allowedRoles.includes(userRole)) ? (
                <EntityList title={item.label} columns={COLUMNS[item.id] || DEFAULT_COLUMNS} data={data[item.id] || []} 
                  onAdd={() => { setActiveType(item.id); setEditingId(null); setModalOpen(true); }}
                  onEdit={(id) => { setActiveType(item.id); setEditingId(id); setModalOpen(true); }}
                  onDelete={(id) => { if(window.confirm('Delete this item?')) deleteEntity(item.id, id); }}
                />
              ) : <Navigate to="/" replace />
            } />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? `Update ${activeType}` : `Create ${activeType}`}>
          <EntityForm columns={activeType ? (COLUMNS[activeType] || DEFAULT_COLUMNS) : []} initialData={(activeType && editingId) ? getEntity(activeType, editingId) : undefined} 
            onSubmit={handleFormSubmit} onCancel={() => setModalOpen(false)} entityType={activeType || undefined} />
        </Modal>
      </Layout>
    </Router>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <DataProvider>
      <AppContent />
    </DataProvider>
  </AuthProvider>
);

export default App;