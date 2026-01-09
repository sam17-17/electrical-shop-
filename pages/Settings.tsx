import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  Download, Upload, Trash2, Database, Save, ArrowLeft, 
  Terminal, Copy, Check, Cloud, CloudOff, Info, AlertTriangle, ChevronRight,
  Share2, ArrowUpCircle, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
  const { data, importData } = useData();
  const { isDemoMode } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const sqlSchema = `-- 1. Create the Shared Entities Table
CREATE TABLE IF NOT EXISTS public.crm_entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.crm_entities ENABLE ROW LEVEL SECURITY;

-- 3. Create SHARED ORGANIZATION POLICY
-- This allows any logged-in user in your team to see and edit all records.
DROP POLICY IF EXISTS "Shared team access" ON public.crm_entities;
CREATE POLICY "Shared team access" 
ON public.crm_entities 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. ENABLE REALTIME
-- Execute this to allow the app to broadcast changes instantly to all PCs
ALTER PUBLICATION supabase_realtime ADD TABLE crm_entities;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zill_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm('This will overwrite all current data. Are you sure?')) {
            importData(json);
            alert('Data imported successfully!');
        }
      } catch (error) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearData = () => {
      if(window.confirm('Are you sure you want to wipe all local data? This cannot be undone.')) {
          const emptyState: any = {};
          Object.keys(data).forEach(key => emptyState[key] = []);
          importData(emptyState);
      }
  };

  const handleSyncToCloud = async () => {
    if (isDemoMode) {
      alert("You must be logged in with a Cloud Account (not Demo Admin) to sync to cloud. Please Sign Up and Log In first.");
      return;
    }
    
    setIsMigrating(true);
    try {
      await importData(data);
      alert("Success! Your data has been pushed to the cloud. Other team members can now see these records instantly.");
    } catch (e) {
      alert("Sync failed. Ensure your database is properly configured in the helper section.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <button 
            onClick={() => navigate('/')}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
            title="Back to Dashboard"
        >
            <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Live Team Sync</h1>
            <p className="text-slate-500">Collaborate with your team across multiple devices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Data Management */}
        <div className="lg:col-span-1 space-y-6">
            {/* Storage Status */}
            <div className={`p-6 rounded-xl border shadow-sm ${isDemoMode ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center mb-4">
                    <div className={`p-2 rounded-lg mr-3 ${isDemoMode ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                        {isDemoMode ? <CloudOff className={`w-6 h-6 text-amber-600`} /> : <Cloud className={`w-6 h-6 text-emerald-600`} />}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            {isDemoMode ? 'Offline Mode' : 'Cloud Sharing Active'}
                        </h2>
                        <p className={`text-xs ${isDemoMode ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {isDemoMode ? 'Personal data only' : 'Shared team database'}
                        </p>
                    </div>
                </div>
                
                {!isDemoMode && (
                    <div className="space-y-4">
                        <div className="flex items-center text-xs text-emerald-700 font-bold">
                            <Zap className="w-3 h-3 mr-2 animate-pulse" />
                            REAL-TIME BROADCAST ENABLED
                        </div>
                        <button 
                          onClick={handleSyncToCloud}
                          disabled={isMigrating}
                          className="w-full flex items-center justify-center py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                          <ArrowUpCircle className="w-4 h-4 mr-2" />
                          {isMigrating ? 'Syncing...' : 'Sync Local to Shared Pool'}
                        </button>
                    </div>
                )}

                {isDemoMode && (
                   <div className="bg-white/50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800 flex items-start">
                        <Info className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                        <p>Sign up for a Cloud Account to start sharing data with other PCs.</p>
                    </div>
                )}
            </div>

            {/* Persistence Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center text-sm uppercase tracking-wider">
                    <Database className="w-4 h-4 mr-2 text-slate-400" />
                    Offline Backup
                </h3>

                <div className="space-y-3">
                    <button 
                        onClick={handleExport}
                        className="w-full flex items-center justify-between px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-sm"
                    >
                        <span className="flex items-center"><Download className="w-4 h-4 mr-2" /> Export JSON</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                    </button>
                    
                    <div className="relative">
                        <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />
                        <button 
                            onClick={handleImportTrigger}
                            className="w-full flex items-center justify-between px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-sm"
                        >
                            <span className="flex items-center"><Upload className="w-4 h-4 mr-2" /> Import JSON</span>
                            <ChevronRight className="w-3 h-3 text-slate-300" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: SQL Helper */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-indigo-50 rounded-lg mr-3">
                            <Share2 className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Team Sharing Setup</h2>
                            <p className="text-sm text-slate-500">Run this to allow shared access and real-time sync</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${isDemoMode ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {isDemoMode ? 'OFFLINE' : 'LIVE SYNC'}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-900 rounded-xl p-6 font-mono text-xs overflow-x-auto border border-slate-800 relative group">
                        <button 
                            onClick={handleCopySql}
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <pre className="text-indigo-300 leading-relaxed">
                            {sqlSchema}
                        </pre>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                            <h4 className="text-emerald-800 font-bold text-xs uppercase mb-2">Step 1: Permissions</h4>
                            <p className="text-emerald-700 text-xs leading-relaxed">
                                The SQL above allows every member of your team (authenticated users) to see the shared data.
                            </p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                            <h4 className="text-indigo-800 font-bold text-xs uppercase mb-2">Step 2: Realtime</h4>
                            <p className="text-indigo-700 text-xs leading-relaxed">
                                The <code>ALTER PUBLICATION</code> command activates instant broadcasting across all connected PCs.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h4 className="font-bold text-slate-800 text-sm mb-2">Manual Realtime Check:</h4>
                        <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                            <li>Go to <strong>Database</strong> &gt; <strong>Publications</strong> in Supabase.</li>
                            <li>Edit <strong>supabase_realtime</strong>.</li>
                            <li>Ensure <strong>crm_entities</strong> is checked in the "Tables" list.</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};