
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ChevronRight, LogIn, LayoutDashboard, Database, 
  FileText, ShoppingCart, Truck, Receipt, FileDown, Wallet, 
  Sparkles, Settings, FileCheck 
} from 'lucide-react';

const Section: React.FC<{ icon: React.ElementType, title: string, children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
    <div className="flex items-center mb-4">
      <div className="p-3 bg-indigo-50 rounded-xl mr-4">
        <Icon className="w-6 h-6 text-indigo-600" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{title}</h2>
    </div>
    <div className="prose prose-sm prose-slate max-w-none text-slate-600 space-y-3 leading-relaxed">
      {children}
    </div>
  </div>
);

export const HowToUse: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">User Guide</h1>
          <p className="text-slate-500 text-sm">Welcome to your Zill Tech Engineering CRM!</p>
        </div>
      </div>
      
      <Section icon={LogIn} title="1. Getting Started: Logging In">
        <p>Your journey begins at the login screen. There are a few ways to access the system:</p>
        <ul>
          <li><strong>Cloud Account:</strong> If you've created a cloud account, use your email and password to sign in. This syncs your data across devices.</li>
          <li><strong>Super Admin:</strong> Use <code>superadmin / admin2025</code> for initial setup or recovery. This account has full permissions to manage the database connection.</li>
          <li><strong>Demo Access:</strong> For a quick, offline preview, use <code>admin / 1234</code>. Note that data entered in demo mode is not saved to the cloud.</li>
        </ul>
      </Section>

      <Section icon={LayoutDashboard} title="2. The Dashboard & Navigation">
        <p>After logging in, you'll land on the <strong>Executive Overview</strong> (Summary page). This is your command center, showing key financial metrics like cash on hand, outstanding invoices (receivables), and total revenue.</p>
        <p>Use the <strong>sidebar on the left</strong> to navigate between different modules of the CRM, such as Customers, Sales Quotes, and Inventory.</p>
      </Section>

      <Section icon={Database} title="3. Managing Your Data">
        <p>Most pages follow a simple and consistent layout for managing records:</p>
        <ul>
          <li><strong>Search Bar:</strong> Quickly filter the list by typing a customer name, document number, or other key info.</li>
          <li><strong>New Entry Button:</strong> Click this to open a form and create a new record (e.g., a new customer or a new sales quote).</li>
          <li><strong>Actions Column:</strong> On the far right of each row, you'll find icons to perform actions:
            <ul>
              <li><strong className="inline-flex items-center"><FileDown className="w-3 h-3 mr-1" /> Download:</strong> Generate a professional PDF of the document.</li>
              <li><strong className="inline-flex items-center"><Wallet className="w-3 h-3 mr-1" /> Receive Payment:</strong> (On Invoices) Mark an invoice as paid.</li>
              <li><strong className="inline-flex items-center">... and more:</strong> View details, edit, or delete records.</li>
            </ul>
          </li>
        </ul>
      </Section>

      <Section icon={ChevronRight} title="4. The Sales Workflow: From Quote to Cash">
        <p>This CRM is built around a smart workflow to save you time. You can convert documents from one stage to the next with a single click, carrying all the data forward automatically.</p>
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 my-4 text-center text-xs font-bold text-slate-500">
            <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg"><FileText className="w-6 h-6 text-slate-500 mb-1" /><span>Sales Quote</span></div>
            <ChevronRight className="w-5 h-5 shrink-0" />
            <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg"><ShoppingCart className="w-6 h-6 text-slate-500 mb-1" /><span>Sales Order</span></div>
            <ChevronRight className="w-5 h-5 shrink-0" />
            <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg">
              <Receipt className="w-6 h-6 text-slate-500 mb-1" />
              <Truck className="w-6 h-6 text-slate-500" />
              <span>Invoice / Delivery Note</span>
            </div>
        </div>
        <ol>
          <li><strong>Create a Sales Quote:</strong> Start by creating a quote for a customer.</li>
          <li><strong>Convert to Order:</strong> Once the customer accepts, find the quote in the list and click the "Convert to Order" icon (<FileCheck className="inline w-3 h-3" />). A new Sales Order is automatically created.</li>
          <li><strong>Generate Invoice/Delivery:</strong> From the confirmed Sales Order, you can generate the final Invoice or a Delivery Note with another click.</li>
        </ol>
      </Section>
      
      <Section icon={Sparkles} title="5. Your AI Assistant">
        <p>Need a quick summary or insight? Use the AI Assistant! Click the sparkling icon at the bottom-right of your screen.</p>
        <p>The assistant has access to the data on your current page. You can ask questions like:</p>
        <ul>
          <li>"Who is our top customer on this list?"</li>
          <li>"What is the total value of unpaid invoices?"</li>
          <li>"Summarize the items in quote QTN-1001."</li>
        </ul>
      </Section>

      <Section icon={Settings} title="6. For Admins: Settings & Data Sync">
        <p>The <strong>Settings</strong> page is for administrators to manage the system's connection to the cloud database.</p>
        <ul>
          <li><strong>Cloud Sync:</strong> If you primarily work offline, you can use the "Push Sync to Cloud" button to upload all your local data.</li>
          <li><strong>Data Recovery:</strong> If your cloud data ever appears empty but you have records on your device, use "Force Data Recovery" to restore from your local cache.</li>
          <li><strong>Migration Script:</strong> The SQL script provided is for initial database setup on Supabase. It ensures all users in your team can access and share data in real-time.</li>
        </ul>
      </Section>
    </div>
  );
};
