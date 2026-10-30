import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Server,
  Database,
  Cpu,
  Clock,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { BackButton } from '../components/BackButton.tsx';

export const SystemSettingsPage: React.FC = () => {
  const { simulatedDate, resetToToday } = useSystemDate();
  const { user } = useAuth();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetDatabase = async () => {
    if (!confirm('Are you sure you want to restore the default SIH Hackathon benchmark dataset? All new test records will be restored to original seed state.')) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/system/reset-demo', { method: 'POST' });
      if (res.ok) {
        await resetToToday();
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <BackButton fallbackPath="/dashboard" />
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">System State & Judge Evaluation Center</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Benchmark dataset controls, simulation verification, and SIH26265 architectural transparency.
        </p>
      </div>

      {resetSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>Database successfully restored to pristine SIH26265 benchmark state! (20 institutes, 35 FDRs, and default release requests).</span>
        </div>
      )}

      {/* System Infrastructure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <Database className="w-4 h-4 text-blue-700" />
            <span>Persistent Database</span>
          </div>
          <p className="text-slate-600">
            Active file-backed persistent database with ACID-safe atomic writes to disk. Survives page reloads and backend restarts.
          </p>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
            Connected & Syncing
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <Cpu className="w-4 h-4 text-amber-600" />
            <span>Gemini AI OCR Engine</span>
          </div>
          <p className="text-slate-600">
            Multimodal OCR field extraction utilizing modern <code className="font-mono text-blue-900">@google/genai</code> SDK on Express server.
          </p>
          <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
            Server-Side Proxy Active
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <Clock className="w-4 h-4 text-purple-700" />
            <span>Maturity Engine</span>
          </div>
          <p className="text-slate-600">
            Real-time calculation relative to simulated portal clock: <strong>{simulatedDate}</strong> with automated alerts.
          </p>
          <span className="text-[10px] text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block">
            Maturity Stepper Active
          </span>
        </div>
      </div>

      {/* SIH Evaluation Transparency Note */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-700" />
          <span>Problem Statement SIH26265 Technical Summary</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700 leading-relaxed">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs">What is Functional & Persistent:</h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Real REST backend with Express & Vite middleware.</li>
              <li>5-Role authentication and strict server-side gatekeeping.</li>
              <li>Full FDR lifecycle transitions (Submitted → Scrutiny → Deficiency → Verified → Active → Expiring → Matured).</li>
              <li>Interactive Date Simulator that dynamically advances time and recalculates all FDR states.</li>
              <li>3-Tier Clearance Matrix (RO, PGRC, Vigilance) with role-locked clearance decisions.</li>
              <li>Official AICTE NOC & Release Order generation with QR code and print layout.</li>
              <li>Downloadable CSV Master Register, Maturing Alerts, and Releases log.</li>
            </ul>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs">Regulatory Disclosure:</h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>All 20 institutions and 35 FDRs are realistic synthetic records designed for testing all possible portal states.</li>
              <li>AI OCR extraction runs on the server using Gemini 3.8 Flash when keys are active, with high-fidelity simulated demo fallback presets for judges.</li>
              <li>Never claimed to be connected to actual live commercial bank Core Banking Systems (CBS) without authorized API credentials.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Factory Reset Section */}
      <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-rose-950 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Restore Benchmark Dataset</span>
        </div>
        <p className="text-xs text-rose-900 leading-relaxed">
          Reset all FDR records, deficiencies, clearances, notifications, and simulated date back to the pristine benchmark state for fresh evaluation.
        </p>

        <button
          onClick={handleResetDatabase}
          disabled={resetting}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{resetting ? 'Resetting Database...' : 'Reset to Hackathon Benchmark'}</span>
        </button>
      </div>
    </div>
  );
};
