import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, Users, FileText, ShoppingCart, Truck, 
  Briefcase, Receipt, Layers, Folder, UserCheck, BookOpen, 
  PieChart, Settings as SettingsIcon, Menu, X, ChevronRight,
  ClipboardList, StickyNote, LogOut
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
const STATUS_OPTIONS = ['Draft', 'Sent', 'Pending', 'Paid', 'Unpaid', 'Confirmed', 'Cancelled'];
const CATEGORY_OPTIONS = ['Electronics', 'Services', 'Accessories', 'Software', 'Hardware'];

// Base Columns for Sales Documents
const SALES_COLUMNS_BASE: DataColumn[] = [
  { key: 'id', label: 'Reference #', type: 'readonly' }, 
  { key: 'customer', label: 'Customer', type: 'select', sourceType: EntityType.CUSTOMERS, required: true },
  { key: 'phone', label: 'Client Phone', type: 'phone', required: false },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'items', label: 'Line Items', type: 'items', required: true }, 
  { key: 'amount', label: 'Grand Total', type: 'currency', required: true }, 
  { key: 'status', label: 'Status', type: 'status', options: ['Draft', 'Sent', 'Approved', 'Rejected'], required: true },
];

// Base Columns for Purchase Documents
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
    ...SALES_COLUMNS_BASE.map(c => c.key === 'status' ? { ...c, options: ['Draft', 'Sent', 'Accepted', 'Rejected'] } : c)
  ],
  [EntityType.SALES_ORDERS]: [ // Receipts
    ...SALES_COLUMNS_BASE.map(c => c.key === 'status' ? { ...c, options: ['Pending', 'Confirmed', 'Shipped', 'Cancelled'] } : c).map(c => c.key === 'date' ? { ...c, label: 'Receipt Date' } : c)
  ],
  [EntityType.SALES_INVOICES]: [
    ...SALES_COLUMNS_BASE.map(c => c.key === 'status' ? { ...c, options: ['Draft', 'Sent', 'Paid', 'Unpaid', 'Overdue'] } : c)
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
    { key: 'role', label: 'Assigned Role', type: 'select', options: ['Admin', 'Manager', 'Sales Agent', 'Accountant', 'Viewer'], required: true },
    { key: 'pin', label: 'Login PIN', type: 'text', required: true },
    { key: 'status', label: 'Account Status', type: 'status', options: ['Active', 'Suspended', 'Inactive'], required: true },
  ],
};

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
  { id: EntityType.SETTINGS, label: 'Settings', icon: SettingsIcon },
];

// --- MAIN LAYOUT ---
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { data } = useData();
  const { user, logout } = useAuth();
  
  const isAdmin = user?.role === 'Admin';

  // Group nav items
  const groupedNav = NAV_ITEMS.reduce((acc, item) => {
    const key = item.group || 'Main';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // Determine current page data for AI
  const currentPath = location.pathname.substring(1) || EntityType.SUMMARY;
  const currentPathKey = currentPath as EntityType;
  const currentData = data[currentPathKey] || [];
  
  // Format data as a string for context
  const contextString = JSON.stringify(currentData.slice(0, 20), null, 2); // Limit context size

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {!sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        />
      )}

      {/* Sidebar */}
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
          {/* Collapsed Logo */}
          {!sidebarOpen && (
            <div className="hidden lg:flex w-full justify-center">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
               <span className="text-white font-bold">Z</span>
             </div>
            </div>
          )}
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
                      
                      {/* Tooltip for collapsed state */}
                      {!sidebarOpen && (
                        <div className="absolute left-full ml-2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        
        {/* User Profile Snippet - Linked to User Management with Logout */}
        <div className="border-t border-slate-800">
           <div className="flex items-center justify-between p-2">
             {isAdmin ? (
               <NavLink 
                  to="/system-users"
                  className={({ isActive }) => `
                    flex-1 flex items-center p-2 rounded-lg transition-colors hover:bg-slate-800 group
                    ${isActive ? 'bg-slate-800' : ''}
                    ${!sidebarOpen ? 'justify-center' : ''}
                  `}
                >
                  <img 
                    src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=4f46e5&color=fff`} 
                    alt="User" 
                    className="w-8 h-8 rounded-full bg-slate-700" 
                  />
                  {sidebarOpen && (
                    <div className="ml-3 text-left overflow-hidden">
                      <p className="text-sm font-medium text-white truncate group-hover:text-indigo-400 transition-colors">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.role || 'User'}</p>
                    </div>
                  )}
                  {!sidebarOpen && (
                        <div className="absolute left-full ml-2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                          User Management
                        </div>
                   )}
                </NavLink>
             ) : (
                <div className={`flex-1 flex items-center p-2 rounded-lg cursor-default ${!sidebarOpen ? 'justify-center' : ''}`}>
                  <img 
                    src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=64748b&color=fff`} 
                    alt="User" 
                    className="w-8 h-8 rounded-full bg-slate-700" 
                  />
                  {sidebarOpen && (
                    <div className="ml-3 text-left overflow-hidden">
                      <p className="text-sm font-medium text-slate-300 truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.role || 'User'}</p>
                    </div>
                  )}
                </div>
             )}

              {/* Logout Button */}
              <button 
                onClick={logout}
                className={`p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors group relative ${!sidebarOpen ? 'hidden group-hover:block absolute left-16 bottom-4 bg-slate-900 shadow-xl border border-slate-700' : ''}`}
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                 {!sidebarOpen && (
                        <div className="absolute left-full ml-2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                          Logout
                        </div>
                 )}
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 mr-4 focus:outline-none"
            >
              <Menu className="w-5 h-5" />
            </button>
             {/* Breadcrumbish */}
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

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {children}
        </main>
      </div>

      {/* AI Assistant */}
      <AiAssistant currentPageData={contextString} />
    </div>
  );
};

// --- APP COMPONENT ---
const AppContent: React.FC = () => {
  const { data, addEntity, updateEntity, deleteEntity, getEntity } = useData();
  const { isAuthenticated, user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<EntityType | null>(null);

  if (!isAuthenticated) {
    return <Login />;
  }

  const isAdmin = user?.role === 'Admin';

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

  const handleFormSubmit = (formData: any) => {
    if (!activeType) return;

    if (editingId) {
      updateEntity(activeType, editingId, formData);
    } else {
      addEntity(activeType, formData);
    }
    setModalOpen(false);
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
          {isAdmin && (
            <Route 
              path="/system-users" 
              element={
                <EntityList 
                  title="User Management"
                  columns={COLUMNS[EntityType.SYSTEM_USERS]}
                  data={data[EntityType.SYSTEM_USERS] || []}
                  onAdd={() => handleAdd(EntityType.SYSTEM_USERS)}
                  onEdit={(id) => handleEdit(EntityType.SYSTEM_USERS, id)}
                  onDelete={(id) => handleDelete(EntityType.SYSTEM_USERS, id)}
                />
              } 
            />
          )}
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
          {/* Catch all for invalid routes (or restricted routes) redirect to summary */}
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
            entityType={activeType || undefined} // Pass entityType to help with auto-ID generation
          />
        </Modal>
      </Layout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </DataProvider>
  );
};

export default App;