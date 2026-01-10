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

  const sqlSchema = `-- STEP 1: CREATE THE CORE TABLE
-- user_id is TEXT to allow both Supabase UUIDs and Virtual User IDs.
CREATE TABLE IF NOT EXISTS public.crm_entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- OPTIONAL: If you already created the table with UUID user_id, run this to fix the error:
-- ALTER TABLE public.crm_entities ALTER COLUMN user_id TYPE TEXT;

-- STEP 2: ENABLE ROW LEVEL SECURITY
ALTER TABLE public.crm_entities ENABLE ROW LEVEL SECURITY;

-- STEP 3: CREATE ACCESS POLICIES
DROP POLICY IF EXISTS "Shared team access" ON public.crm_entities;
CREATE POLICY "Shared team access" ON public.crm_entities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow Public lookup for Virtual Login
DROP POLICY IF EXISTS "Enable virtual login lookup" ON public.crm_entities;
CREATE POLICY "Enable virtual login lookup" ON public.crm_entities FOR SELECT TO anon USING (type = 'system-users');

-- STEP 4: ENABLE REALTIME
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

  const handleSyncToCloud = async () => {
    if (isDemoMode) {
      alert("Please log in with a Cloud Account (not Demo) to sync.");
      return;
    }
    setIsMigrating(true);
    try {
      await importData(data);
      alert("Data pushed to cloud pool.");
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Cloud Configuration</h1>
            <p className="text-slate-500">Manage database security and team sync</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <div className={`p-6 rounded-xl border shadow-sm ${isDemoMode ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center mb-4">
                    <div className={`p-2 rounded-lg mr-3 ${isDemoMode ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                        {isDemoMode ? <CloudOff className={`w-6 h-6 text-amber-600`} /> : <Cloud className={`w-6 h-6 text-emerald-600`} />}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">{isDemoMode ? 'Local Only' : 'Cloud Active'}</h2>
                        <p className={`text-xs ${isDemoMode ? 'text-amber-700' : 'text-emerald-700'}`}>{isDemoMode ? 'Bypassing cloud lookups' : 'Syncing via Supabase'}</p>
                    </div>
                </div>
                {!isDemoMode && (
                    <button onClick={handleSyncToCloud} disabled={isMigrating} className="w-full flex items-center justify-center py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all">
                      {isMigrating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />} Push Local to Cloud
                    </button>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center text-sm uppercase tracking-wider">
                    <Database className="w-4 h-4 mr-2 text-slate-400" /> Maintenance
                </h3>
                <div className="space-y-3">
                    <button onClick={handleExport} className="w-full flex items-center justify-between px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 bg-white">
                        <span className="flex items-center"><Download className="w-4 h-4 mr-2 text-indigo-500" /> Export JSON</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />
                    <button onClick={handleImportTrigger} className="w-full flex items-center justify-between px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 bg-white">
                        <span className="flex items-center"><Upload className="w-4 h-4 mr-2 text-indigo-500" /> Restore JSON</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                    </button>
                </div>
            </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-indigo-50 rounded-lg mr-3"><Share2 className="w-6 h-6 text-indigo-600" /></div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Supabase SQL Schema</h2>
                            <p className="text-sm text-slate-500">Execute this to enable cloud authentication</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900 rounded-xl p-6 font-mono text-[11px] overflow-x-auto border border-slate-800 relative">
                    <button onClick={handleCopySql} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span className="text-[10px]">{copied ? 'Copied!' : 'Copy Script'}</span>
                    </button>
                    <pre className="text-indigo-200 whitespace-pre-wrap">{sqlSchema}</pre>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};