import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  Download, Upload, Trash2, Database, Save, ArrowLeft, 
  Terminal, Copy, Check, Cloud, CloudOff, Info, AlertTriangle, ChevronRight,
  Share2, ArrowUpCircle, Zap, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
  const { data, importData } = useData();
  const { isDemoMode } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const sqlSchema = `-- STEP 1: CREATE THE TABLE
CREATE TABLE IF NOT EXISTS public.crm_entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- STEP 2: ENABLE ROW LEVEL SECURITY
ALTER TABLE public.crm_entities ENABLE ROW LEVEL SECURITY;

-- STEP 3: CREATE ACCESS POLICY
-- This allows all team members to view and edit shared data.
DROP POLICY IF EXISTS "Shared team access" ON public.crm_entities;
CREATE POLICY "Shared team access" 
ON public.crm_entities 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- STEP 4: ENABLE REALTIME BROADCASTING
-- Note: You might need to check the "Realtime" box in Supabase Dashboard -> Database -> Publications
ALTER PUBLICATION supabase_realtime ADD TABLE crm_entities;

-- TROUBLESHOOTING "Schema Cache" Error:
-- If you still get a "Table not found" error after running this:
-- 1. Go to Supabase Dashboard -> API Settings.
-- 2. Look for "PostgREST" or "API" section.
-- 3. Find and click the "Reload Schema" button.
-- 4. If that fails, wait 60 seconds for the cache to expire automatically.`;

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

  const handleSyncToCloud = async () => {
    if (isDemoMode) {
      alert("You must be logged in with a Cloud Account (not Demo Admin) to sync to cloud. Please Sign Up and Log In first.");
      return;
    }
    
    setIsMigrating(true);
    try {
      await importData(data);
      alert("Success! Your data has been pushed to the cloud. Other team members can now see these records instantly.");
    } catch (e: any) {
      alert(`Sync failed: ${e.message}. Ensure your database table exists.`);
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
            <p className="text-slate-500">Collaborate with your team in real-time</p>
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
                            {isDemoMode ? 'Local Only' : 'Cloud Sync Active'}
                        </h2>
                        <p className={`text-xs ${isDemoMode ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {isDemoMode ? 'Data saved to browser cache' : 'Data synced with team pool'}
                        </p>
                    </div>
                </div>
                
                {!isDemoMode && (
                    <div className="space-y-4">
                        <div className="flex items-center text-xs text-emerald-700 font-bold bg-white/40 p-2 rounded-lg">
                            <Zap className="w-3 h-3 mr-2 animate-pulse" />
                            REAL-TIME BROADCASTING ON
                        </div>
                        <button 
                          onClick={handleSyncToCloud}
                          disabled={isMigrating}
                          className="w-full flex items-center justify-center py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                          {isMigrating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
                          {isMigrating ? 'Syncing...' : 'Force Cloud Update'}
                        </button>
                    </div>
                )}

                {isDemoMode && (
                   <div className="bg-white/50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800 flex items-start">
                        <Info className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                        <p>Sign up for a Cloud Account to enable automatic team synchronization.</p>
                    </div>
                )}
            </div>

            {/* Persistence Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center text-sm uppercase tracking-wider">
                    <Database className="w-4 h-4 mr-2 text-slate-400" />
                    Data Operations
                </h3>

                <div className="space-y-3">
                    <button 
                        onClick={handleExport}
                        className="w-full flex items-center justify-between px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-sm"
                    >
                        <span className="flex items-center"><Download className="w-4 h-4 mr-2 text-indigo-500" /> Export Backup</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                    </button>
                    
                    <div className="relative">
                        <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />
                        <button 
                            onClick={handleImportTrigger}
                            className="w-full flex items-center justify-between px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-sm"
                        >
                            <span className="flex items-center"><Upload className="w-4 h-4 mr-2 text-indigo-500" /> Restore from File</span>
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
                            <h2 className="text-lg font-semibold text-slate-800">Supabase SQL Editor Setup</h2>
                            <p className="text-sm text-slate-500">Run this script in your Supabase SQL editor to fix cache errors</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${isDemoMode ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {isDemoMode ? 'OFFLINE' : 'TEAM SYNC READY'}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-900 rounded-xl p-6 font-mono text-[11px] overflow-x-auto border border-slate-800 relative group">
                        <button 
                            onClick={handleCopySql}
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            <span className="text-[10px]">{copied ? 'Copied!' : 'Copy Script'}</span>
                        </button>
                        <pre className="text-indigo-200 leading-relaxed whitespace-pre-wrap">
                            {sqlSchema}
                        </pre>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                            <h4 className="text-emerald-800 font-bold text-xs uppercase mb-2">Policy: Shared Access</h4>
                            <p className="text-emerald-700 text-[11px] leading-relaxed">
                                The SQL policy ensures every authenticated user in your team can view and edit the same records automatically.
                            </p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                            <h4 className="text-amber-800 font-bold text-xs uppercase mb-2">Fix: Cache Error</h4>
                            <p className="text-amber-700 text-[11px] leading-relaxed">
                                If you see "Table not found", click <strong>Reload Schema</strong> in Supabase API settings or wait a few seconds.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};