import React, { useRef } from 'react';
import { useData } from '../context/DataContext';
import { Download, Upload, Trash2, Database, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
  const { data, importData } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
        // Basic validation could go here
        if (window.confirm('This will overwrite all current data. Are you sure?')) {
            importData(json);
            alert('Data imported successfully!');
        }
      } catch (error) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleClearData = () => {
      if(window.confirm('Are you sure you want to wipe all local data? This cannot be undone.')) {
          // Send empty state, preserving structure
          const emptyState: any = {};
          Object.keys(data).forEach(key => emptyState[key] = []);
          importData(emptyState);
      }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button 
            onClick={() => navigate('/')}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
            title="Back to Dashboard"
        >
            <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500">Manage your application data and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Persistence Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                    <Database className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Data Storage & Backup</h2>
                    <p className="text-sm text-slate-500">Manage your local data</p>
                </div>
            </div>
            
            <p className="text-slate-600 text-sm mb-6">
                Your CRM data is automatically stored in your <strong>Browser Storage</strong>. 
                Use the options below to create a backup file or restore from a previous backup.
            </p>

            <div className="space-y-3">
                <button 
                    onClick={handleExport}
                    className="w-full flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-sm"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data (Backup to File)
                </button>
                
                <div className="relative">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImportFile}
                        accept=".json"
                        className="hidden"
                    />
                    <button 
                        onClick={handleImportTrigger}
                        className="w-full flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-sm"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Import Data (Restore from File)
                    </button>
                </div>

                 <button 
                    onClick={handleClearData}
                    className="w-full flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors mt-4 bg-white"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset System Data
                </button>
            </div>
        </div>

        {/* App Info Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <div className="flex items-center mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                    <Save className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Auto-Save Active</h2>
                    <p className="text-sm text-slate-500">Browser Local Storage</p>
                </div>
            </div>
            <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 mb-4">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">System is saving changes automatically</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
                All changes you make are instantly saved to this browser's Local Storage. 
                You can safely refresh the page or close the browser without losing data.
                <br/><br/>
                <strong>Note:</strong> Clearing your browser cache will remove this data unless you have exported a backup.
            </p>
        </div>
      </div>
    </div>
  );
};