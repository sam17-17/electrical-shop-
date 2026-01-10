import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  Download, Upload, Trash2, Database, Save, ArrowLeft, 
  Terminal, Copy, Check, Cloud, CloudOff, Info, AlertTriangle, ChevronRight,
  Share2, ArrowUpCircle, Zap, RefreshCw, Radio, LifeBuoy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
  const { data, importData, lastSync, restoreFromLocal } = useData();
  const { isDemoMode } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const sqlSchema = `-- 1. CREATE CORE TABLE (If not exists)
CREATE TABLE IF NOT EXISTS public.crm_entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RESOLVE FOREIGN KEY CONFLICTS & CONVERT TYPES
-- If your 'user_id' has a foreign key to auth.users (UUID), 
-- PostgreSQL won't let you change it to TEXT without dropping the constraint first.
DO $$
BEGIN
    -- Drop the constraint if it exists to allow type conversion
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'crm_entities_user_id_fkey' 
        AND table_name = 'crm_entities'
    ) THEN
        ALTER TABLE public.crm_entities DROP CONSTRAINT crm_entities_user_id_fkey;
    END IF;
END $$;

-- 3. FORCE CONVERT COLUMNS TO TEXT
-- This allows compatibility with legacy IDs and human-readable references.
ALTER TABLE public.crm_entities ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.crm_entities ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 4. SHARED TEAM ACCESS (RLS)
ALTER TABLE public.crm_entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared team access" ON public.crm_entities;
CREATE POLICY "Shared team access" ON public.crm_entities FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. REALTIME ENABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_entities') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_entities;
    END IF;
END $$;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncToCloud = async () => {
    if (isDemoMode) return alert("Demo accounts cannot sync.");
    setIsMigrating(true);
    try {
      await importData(data, true);
      alert("Cloud Sync Successful.");
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleForceRecovery = async () => {
    if (window.confirm("This will push your currently visible data to the cloud, overwriting the cloud state with your local cache. Proceed?")) {
        setIsMigrating(true);
        try {
            await restoreFromLocal();
            alert("Recovery Successful: Cloud table repopulated.");
        } catch(e: any) {
            alert("Recovery failed: " + e.message);
        } finally {
            setIsMigrating(false);
        }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Upgrades</h1>
            <p className="text-slate-500 text-sm">Manage global synchronization and database schema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <div className={`p-6 rounded-2xl border shadow-sm ${isDemoMode ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'}`}>
                <div className="flex items-center mb-6">
                    <div className={`p-3 rounded-xl mr-3 ${isDemoMode ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                        <Radio className={`w-6 h-6 ${isDemoMode ? 'text-amber-600' : 'text-indigo-600'} animate-pulse`} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Cloud Link</h2>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDemoMode ? 'text-amber-700' : 'text-indigo-700'}`}>
                          {isDemoMode ? 'Offline Mode' : 'Connected to Cloud Pool'}
                        </p>
                    </div>
                </div>

                {!isDemoMode && (
                    <div className="space-y-4">
                      <button 
                        onClick={handleSyncToCloud} 
                        disabled={isMigrating} 
                        className="w-full flex items-center justify-center py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                      >
                        {isMigrating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />} 
                        Push Sync to Cloud
                      </button>

                      <button 
                        onClick={handleForceRecovery}
                        disabled={isMigrating}
                        className="w-full flex items-center justify-center py-3 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all active:scale-[0.98]"
                      >
                         <LifeBuoy className="w-4 h-4 mr-2" /> Force Data Recovery
                      </button>

                      <p className="text-[10px] text-slate-500 leading-relaxed italic text-center">
                        Use "Force Data Recovery" if your cloud table is empty but your local records are present.
                      </p>
                    </div>
                )}
            </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <div className="p-3 bg-indigo-50 rounded-xl mr-3"><Share2 className="w-6 h-6 text-indigo-600" /></div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Database Migration Script</h2>
                            <p className="text-sm text-slate-500">Run this in Supabase SQL Editor to enforce shared team RLS</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900 rounded-2xl p-6 font-mono text-[11px] overflow-x-auto border border-slate-800 relative">
                    <button onClick={handleCopySql} className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-2">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span className="text-[10px] font-bold">{copied ? 'Copied' : 'Copy SQL'}</span>
                    </button>
                    <pre className="text-indigo-200 whitespace-pre-wrap leading-relaxed">{sqlSchema}</pre>
                </div>
                <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start">
                    <Info className="w-5 h-5 text-indigo-600 mr-3 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold text-indigo-800">Why this script?</p>
                        <p className="text-[11px] text-indigo-700 mt-1">
                            This script converts column types to support both standard UUIDs and custom human-readable IDs. It also handles dropping foreign key constraints that might otherwise block the upgrade.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};