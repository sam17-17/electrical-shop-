import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation, Navigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, Users, FileText, ShoppingCart, Truck, 
  Briefcase, Receipt, Layers, Folder, UserCheck, BookOpen, 
  PieChart, Settings as SettingsIcon, Menu, X, ChevronRight,
  ClipboardList, StickyNote, LogOut, Database, Cloud, CloudOff, ShieldCheck,
  AlertTriangle, ArrowRight
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
function SALES_INVOICES_COLS() { return SALES_COLUMNS_BASE.map(c => c.key === 'status' ? { ...c, options: ['Draft', 'Sent', 'Paid', 'Unpaid', 'Overdue'] } : c); }

const DEFAULT_COLUMNS: DataColumn[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'status', options: ['Draft', 'Active', 'Archived'] },
  { key: 'description', label: 'Description', type: 'textarea' },
];

const NAV_ITEMS: NavItem[] = [
  { id: EntityType.SUMMARY, label: 'Summary', icon: LayoutDashboard },
  { id: EntityType.BANK_CASH, label: 'Bank & Cash Accounts', icon: Wallet },
  { id: EntityType.CUSTOMERS, label: 'Customers', icon: Users, group: 'Sales' },
  { id: EntityType.SALES_QUOTES, label: 'Sales Quotes', icon: FileText, group: 'Sales' },
  { id: EntityType.SALES_ORDERS, label: 'Sales Orders', icon: ShoppingCart, group: 'Sales' },
  { id: EntityType.SALES_INVOICES, label: 'Sales', icon: Receipt, group: 'Sales' },
  { id: EntityType.DELIVERY_NOTES, label: 'Delivery Notes', icon: Truck, group: 'Sales' },
  { id: EntityType.SUPPLIERS, label: 'Suppliers', icon: Briefcase, group: 'Purchases' },
  { id: EntityType.PURCHASE_QUOTES, label: 'Purchase Quotes', icon: ClipboardList, group: 'Purchases' },
  { id: EntityType.PURCHASE_ORDERS, label: 'Purchase Orders', icon: StickyNote, group: 'Purchases' },
  { id: EntityType.PURCHASE_INVOICES, label: 'Purchase Invoices', icon: Receipt, group: 'Purchases' },
  { id: EntityType.INVENTORY, label: 'Inventory Items', icon: Layers },
  { id: EntityType.PROJECTS, label: 'Projects', icon: Folder },
  { id: EntityType.EMPLOYEES, label: 'Employees', icon: UserCheck },
  { id: EntityType.JOURNAL, label: 'Journal Entries', icon: BookOpen },
  { id: EntityType.REPORTS, label: 'Reports', icon: PieChart },
  { id: EntityType.SYSTEM_USERS, label: 'System Users', icon: ShieldCheck, group: 'Administration', requiredRole: 'Admin' },
  { id: EntityType.SETTINGS, label: 'Settings', icon: SettingsIcon },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const location = useLocation();
  const { data, dbNeedsSetup } = useData();
  const { user, logout, isDemoMode } = useAuth();

  // Automatic Sidebar Resizing Logic
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const userRole = user?.user_metadata?.role || user?.role;

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.requiredRole && item.requiredRole !== userRole) return false;
    return true;
  });

  const groupedNav = filteredNavItems.reduce((acc, item) => {
    const key = item.group || 'Main';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const currentPath = location.pathname.substring(1) || EntityType.SUMMARY;
  const currentPathKey = currentPath as EntityType;
  const currentData = data[currentPathKey] || [];
  const contextString = JSON.stringify(currentData.slice(0, 20), null, 2);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 lg:hidden transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <aside 
        className={`${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'
        } bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col fixed lg:relative z-30 h-full border-r border-slate-800 shadow-xl overflow-hidden`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className={`font-bold text-white text-xl flex items-center space-x-2 ${!sidebarOpen && 'lg:hidden'}`}>
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
               <span className="text-white">Z</span>
             </div>
             <span className="truncate">ZILL</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {Object.entries(groupedNav).map(([group, items]) => (
            <div key={group} className="mb-6">
              {sidebarOpen && group !== 'Main' && (
                <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 truncate">
                  {group}
                </h3>
              )}
              <ul>
                {items.map((item) => {
                  const count = data[item.id]?.length || 0;
                  return (
                    <li key={item.id}>
                      <NavLink
                        to={`/${item.id === EntityType.SUMMARY ? '' : item.id}`}
                        onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                        className={({ isActive }) => `flex items-center px-4 py-2.5 transition-all relative group ${
                          isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'
                        } ${!sidebarOpen ? 'justify-center' : ''}`}
                      >
                        <item.icon className={`w-5 h-5 shrink-0 ${sidebarOpen ? 'mr-3' : ''}`} />
                        {sidebarOpen && <span className="text-sm font-medium truncate">{item.label}</span>}
                        {sidebarOpen && count > 0 && (
                          <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-bold">
                            {count}
                          </span>
                        )}
                        {!sidebarOpen && (
                          <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                            {item.label}
                          </div>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        
        <div className="border-t border-slate-800 shrink-0">
           {sidebarOpen && (
             <div className={`px-4 py-2 text-[10px] flex items-center justify-between ${isDemoMode ? 'text-amber-400 bg-amber-500/5' : 'text-emerald-400 bg-emerald-500/5'}`}>
                <div className="flex items-center truncate">
                  {(isDemoMode || dbNeedsSetup) ? <CloudOff className="w-3 h-3 mr-1.5" /> : <Cloud className="w-3 h-3 mr-1.5" />}
                  <span className="truncate">{(isDemoMode || dbNeedsSetup) ? 'STORAGE: LOCAL' : 'STORAGE: CLOUD SYNC'}</span>
                </div>
                {!isDemoMode && !dbNeedsSetup && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>}
             </div>
           )}
           <div className="flex items-center justify-between p-2">
              <div className={`flex-1 flex items-center p-2 rounded-lg cursor-default min-w-0 ${!sidebarOpen ? 'justify-center' : ''}`}>
                <img 
                  src={`https://ui-avatars.com/api/?name=${user?.email || 'User'}&background=64748b&color=fff`} 
                  alt="User" 
                  className="w-8 h-8 rounded-full bg-slate-700 shrink-0 shadow-inner" 
                />
                {sidebarOpen && (
                  <div className="ml-3 text-left min-w-0 overflow-hidden">
                    <p className="text-sm font-semibold text-slate-300 truncate">
                      {user?.username || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter truncate">
                      {(isDemoMode || dbNeedsSetup) ? 'Local Admin' : 'Cloud Session'}
                    </p>
                  </div>
                )}
              </div>
              {sidebarOpen && (
                <button 
                  onClick={logout} 
                  className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors shrink-0" 
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center min-w-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 mr-2 sm:mr-4 focus:outline-none transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
             <div className="flex items-center text-sm text-slate-500 overflow-hidden">
              <span className="hidden sm:inline">ZILL</span>
              <ChevronRight className="w-4 h-4 mx-1 sm:mx-2 shrink-0 hidden sm:inline" />
              <span className="font-semibold text-slate-800 capitalize truncate">
                {location.pathname === '/' ? 'Summary' : location.pathname.substring(1).replace('-', ' ')}
              </span>
             </div>
          </div>
          <div className="flex items-center space-x-4 shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Organization</p>
              <p className="text-sm font-semibold text-slate-700 truncate">Enterprise Dynamics</p>
            </div>
            {!sidebarOpen && (
               <button 
                 onClick={logout} 
                 className="lg:hidden p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" 
                 title="Logout"
               >
                 <LogOut className="w-5 h-5" />
               </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-0 scroll-smooth flex flex-col min-w-0">
          {dbNeedsSetup && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shrink-0">
               <div className="flex items-center text-amber-800 text-sm font-medium">
                  <AlertTriangle className="w-5 h-5 mr-3 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-bold">Database Needs Setup</p>
                    <p className="text-xs opacity-80">Sync features disabled. Setup the cloud table to enable collaboration.</p>
                  </div>
               </div>
               <Link 
                 to="/settings" 
                 className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm whitespace-nowrap"
               >
                 Setup Database <ArrowRight className="w-3 h-3 ml-2" />
               </Link>
            </div>
          )}
          <div className="flex-1 p-4 sm:p-6 min-w-0">{children}</div>
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

  if (authLoading || dataLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-sm"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Database className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        <p className="text-slate-600 font-bold mt-6 tracking-tight">ZILL CRM</p>
        <p className="text-slate-400 text-sm mt-1 animate-pulse">Initializing intelligent cloud environment...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;

  const handleAdd = (type: EntityType) => {
    setActiveType(type);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleEdit = (type: EntityType, id: string) => {
    setActiveType(type);
    setEditingId(id);
    setModalOpen(true);
  };

  const handleDelete = (type: EntityType, id: string) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      deleteEntity(type, id);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (!activeType) return;
    try {
        if (editingId) await updateEntity(activeType, editingId, formData);
        else await addEntity(activeType, formData);
        setModalOpen(false);
    } catch (e: any) {
        alert(`Operation failed: ${e.message}`);
    }
  };

  const currentColumns = activeType ? (COLUMNS[activeType] || DEFAULT_COLUMNS) : [];
  const currentInitialData = (activeType && editingId) ? getEntity(activeType, editingId) : undefined;
  const modalTitle = editingId ? `Update ${activeType?.replace('-', ' ')}` : `Create ${activeType?.replace('-', ' ')}`;

  const userRole = user?.user_metadata?.role || user?.role;

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Summary />} />
          <Route path="/settings" element={<Settings />} />
          {NAV_ITEMS.filter(item => item.id !== EntityType.SUMMARY && item.id !== EntityType.SETTINGS).map((item) => {
            const hasAccess = !item.requiredRole || userRole === item.requiredRole;
            return (
              <Route 
                key={item.id} 
                path={`/${item.id}`} 
                element={
                  hasAccess ? (
                    <EntityList 
                      title={item.label}
                      columns={COLUMNS[item.id] || DEFAULT_COLUMNS}
                      data={data[item.id] || []}
                      onAdd={() => handleAdd(item.id)}
                      onEdit={(id) => handleEdit(item.id, id)}
                      onDelete={(id) => handleDelete(item.id, id)}
                    />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
            );
          })}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>
          <EntityForm 
            columns={currentColumns} 
            initialData={currentInitialData} 
            onSubmit={handleFormSubmit} 
            onCancel={() => setModalOpen(false)} 
            entityType={activeType || undefined} 
          />
        </Modal>
      </Layout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;