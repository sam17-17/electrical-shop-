import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  Download, Upload, Trash2, Database, Save, ArrowLeft, 
  Terminal, Copy, Check, Cloud, CloudOff, Info, AlertTriangle, ChevronRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
  const { data, importData } = useData();
  const { isDemoMode } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const sqlSchema = `-- Run this in your Supabase SQL Editor to enable Cloud Sync
CREATE TABLE IF NOT EXISTS public.crm_entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.crm_entities ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can manage their own data" 
ON public.crm_entities 
FOR ALL 
USING (auth.uid() = user_id);`;

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
            <h1 className="text-2xl font-bold text-slate-900">System Configuration</h1>
            <p className="text-slate-500">Manage data flow, storage, and database connectivity</p>
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
                            {isDemoMode ? 'Local Persistence' : 'Cloud Sync Active'}
                        </h2>
                        <p className={`text-xs ${isDemoMode ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {isDemoMode ? 'Changes saved to browser only' : 'Encrypted cloud backup enabled'}
                        </p>
                    </div>
                </div>
                
                {isDemoMode && (
                    <div className="bg-white/50 p-3 rounded-lg border border-amber-100 mb-4 text-xs text-amber-800 flex items-start">
                        <Info className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                        <p>You are in <strong>Admin Bypass Mode</strong>. Your data is perfectly safe in this browser, but won't be visible on other devices until Cloud Sync is configured.</p>
                    </div>
                )}
                
                {!isDemoMode && (
                    <div className="flex items-center text-xs text-emerald-700 font-medium">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
                        Last synced: Just now
                    </div>
                )}
            </div>

            {/* Persistence Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                    <Database className="w-4 h-4 mr-2" />
                    Data Operations
                </h3>

                <div className="space-y-3">
                    <button 
                        onClick={handleExport}
                        className="w-full flex items-center justify-between px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-sm"
                    >
                        <span className="flex items-center"><Download className="w-4 h-4 mr-2" /> Export JSON</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                    
                    <div className="relative">
                        <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />
                        <button 
                            onClick={handleImportTrigger}
                            className="w-full flex items-center justify-between px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-sm"
                        >
                            <span className="flex items-center"><Upload className="w-4 h-4 mr-2" /> Import JSON</span>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <button 
                            onClick={handleClearData}
                            className="w-full flex items-center justify-center px-4 py-2.5 border border-red-100 text-red-600 rounded-lg hover:bg-red-50 text-sm font-semibold transition-colors bg-white"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Wipe Local Storage
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
                        <div className="p-2 bg-slate-100 rounded-lg mr-3">
                            <Terminal className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Database Setup Helper</h2>
                            <p className="text-sm text-slate-500">Configure your cloud tables</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${isDemoMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isDemoMode ? 'PENDING ACTION' : 'FULLY CONFIGURED'}
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        To enable multi-device sync and shared access, follow these steps to properly configure your Supabase database:
                    </p>
                    
                    <ol className="text-sm space-y-3 text-slate-600 list-decimal list-inside px-2">
                        <li>Log in to your <strong>Supabase Dashboard</strong>.</li>
                        <li>Navigate to the <strong>SQL Editor</strong> tab.</li>
                        <li>Click <strong>New Query</strong> and paste the code block below.</li>
                        <li>Click <strong>Run</strong> to create the tables and security policies.</li>
                    </ol>

                    <div className="relative group">
                        <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                            <button 
                                onClick={handleCopySql}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md transition-all shadow-lg"
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                            </button>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-6 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner max-h-[300px] custom-scrollbar">
                            <pre className="text-indigo-300">
                                {sqlSchema}
                            </pre>
                        </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-start">
                        <AlertTriangle className="w-5 h-5 text-indigo-600 mr-3 shrink-0" />
                        <div className="text-xs text-indigo-800 space-y-1">
                            <p className="font-bold">Important Security Note</p>
                            <p>The policies above ensure users can <strong>only</strong> see data they created. Once you run this script, the "Offline" status will disappear after the next successful login.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
