import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation, Navigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, Users, FileText, ShoppingCart, Truck, 
  Briefcase, Receipt, Layers, Folder, UserCheck, BookOpen, 
  PieChart, Settings as SettingsIcon, Menu, X, ChevronRight,
  ClipboardList, StickyNote, LogOut, Loader2, Database, Cloud, CloudOff, ShieldCheck,
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
  [EntityType.SALES_QUOTES]: [
    ...SALES_QUOTES_COLS()
  ],
  [EntityType.SALES_ORDERS]: [ 
    ...SALES_ORDERS_COLS()
  ],
  [EntityType.SALES_INVOICES]: [
    ...SALES_INVOICES_COLS()
  ],
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
  [EntityType.PURCHASE_QUOTES]: [
    ...PURCHASE_COLUMNS_BASE.map(c => c.key === 'status' ? { ...c, options: ['Draft', 'Sent', 'Rejected'] } : c)
  ],
  [EntityType.PURCHASE_ORDERS]: [
    ...PURCHASE_COLUMNS_BASE.map(c => c.key === 'status' ? { ...c, options: ['Draft', 'Sent', 'Approved'] } : c)
  ],
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
  { id: EntityType.BANK_CASH, label: 'Bank & Cash', icon: Wallet },
  { id: EntityType.CUSTOMERS, label: 'Customers', icon: Users, group: 'Sales' },
  { id: EntityType.SALES_QUOTES, label: 'Quotations', icon: FileText, group: 'Sales' },
  { id: EntityType.SALES_ORDERS, label: 'Receipts', icon: ShoppingCart, group: 'Sales' },
  { id: EntityType.SALES_INVOICES, label: 'Sales Invoices', icon: Receipt, group: 'Sales' },
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { data, dbNeedsSetup } = useData();
  const { user, logout, isDemoMode } = useAuth();
  
  const userRole = user?.user_metadata?.role || user?.role;

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.requiredRole && item.requiredRole !== userRole) {
      return false;
    }
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {!sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        />
      )}

      <aside 
        className={`${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'} 
        bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col fixed lg:relative z-30 h-full border-r border-slate-800 shadow-xl`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className={`font-bold text-white text-xl flex items-center space-x-2 ${!sidebarOpen && 'lg:hidden'}`}>
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
               <span className="text-white">Z</span>
             </div>
             <span>ZILL</span>
          </div>
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1 hover:bg-slate-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {Object.entries(groupedNav).map(([group, items]) => (
            <div key={group} className="mb-6">
              {sidebarOpen && group !== 'Main' && (
                <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {group}
                </h3>
              )}
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <NavLink
                      to={`/${item.id === EntityType.SUMMARY ? '' : item.id}`}
                      className={({ isActive }) => `
                        flex items-center px-4 py-2.5 transition-colors relative group
                        ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'}
                        ${!sidebarOpen ? 'justify-center' : ''}
                      `}
                    >
                      <item.icon className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : ''}`} />
                      {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        
        <div className="border-t border-slate-800">
           {/* Connection Status Sub-Footer */}
           {sidebarOpen && (
             <div className={`px-4 py-2 text-[10px] flex items-center justify-between ${isDemoMode ? 'text-amber-400 bg-amber-500/5' : 'text-emerald-400 bg-emerald-500/5'}`}>
                <div className="flex items-center">
                  {(isDemoMode || dbNeedsSetup) ? <CloudOff className="w-3 h-3 mr-1.5" /> : <Cloud className="w-3 h-3 mr-1.5" />}
                  <span>{(isDemoMode || dbNeedsSetup) ? 'STORAGE: LOCAL' : 'STORAGE: CLOUD SYNC'}</span>
                </div>
                {!isDemoMode && !dbNeedsSetup && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
             </div>
           )}

           <div className="flex items-center justify-between p-2">
              <div className={`flex-1 flex items-center p-2 rounded-lg cursor-default ${!sidebarOpen ? 'justify-center' : ''}`}>
                <img 
                  src={`https://ui-avatars.com/api/?name=${user?.email || 'User'}&background=64748b&color=fff`} 
                  alt="User" 
                  className="w-8 h-8 rounded-full bg-slate-700" 
                />
                {sidebarOpen && (
                  <div className="ml-3 text-left overflow-hidden">
                    <p className="text-sm font-medium text-slate-300 truncate">{user?.username || user?.email?.split('@')[0] || 'User'}</p>
                    <p className="text-xs text-slate-500 truncate">{(isDemoMode || dbNeedsSetup) ? 'Local Admin' : 'Cloud Session'}</p>
                  </div>
                )}
              </div>

              <button 
                onClick={logout}
                className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 mr-4 focus:outline-none"
            >
              <Menu className="w-5 h-5" />
            </button>
             <div className="hidden md:flex items-center text-sm text-slate-500">
              <span>ZILL</span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="font-semibold text-slate-800 capitalize">
                {location.pathname === '/' ? 'Summary' : location.pathname.substring(1).replace('-', ' ')}
              </span>
             </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Organization</p>
              <p className="text-sm font-semibold text-slate-700">Geosam Investments CRM</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-0 scroll-smooth flex flex-col">
          {dbNeedsSetup && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shrink-0">
               <div className="flex items-center text-amber-800 text-sm font-medium">
                  <AlertTriangle className="w-5 h-5 mr-3 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-bold">Database Table Missing</p>
                    <p className="opacity-80">Cloud features are disabled. Please run the SQL setup script to enable team sync.</p>
                  </div>
               </div>
               <Link to="/settings" className="flex items-center px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm whitespace-nowrap">
                  View SQL Script <ArrowRight className="w-3 h-3 ml-2" />
               </Link>
            </div>
          )}
          <div className="flex-1 p-6">
            {children}
          </div>
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
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Database className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        <p className="text-slate-600 font-bold mt-6">ZILL CRM</p>
        <p className="text-slate-400 text-sm mt-1 animate-pulse">Initializing data vaults...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

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
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteEntity(type, id);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (!activeType) return;
    try {
        if (editingId) {
          await updateEntity(activeType, editingId, formData);
        } else {
          await addEntity(activeType, formData);
        }
        setModalOpen(false);
    } catch (e: any) {
        alert(`Operation failed: ${e.message}`);
    }
  };

  const currentColumns = activeType ? (COLUMNS[activeType] || DEFAULT_COLUMNS) : [];
  const currentInitialData = (activeType && editingId) ? getEntity(activeType, editingId) : undefined;
  const modalTitle = editingId ? `Edit ${activeType?.replace('-', ' ')}` : `New ${activeType?.replace('-', ' ')}`;

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Summary />} />
          <Route path="/settings" element={<Settings />} />
          {NAV_ITEMS.filter(item => item.id !== EntityType.SUMMARY && item.id !== EntityType.SETTINGS).map((item) => (
            <Route 
              key={item.id} 
              path={`/${item.id}`} 
              element={
                <EntityList 
                  title={item.label}
                  columns={COLUMNS[item.id] || DEFAULT_COLUMNS}
                  data={data[item.id] || []}
                  onAdd={() => handleAdd(item.id)}
                  onEdit={(id) => handleEdit(item.id, id)}
                  onDelete={(id) => handleDelete(item.id, id)}
                />
              } 
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Modal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)}
          title={modalTitle}
        >
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