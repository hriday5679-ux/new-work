import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Info,
  Save,
  RefreshCw,
  BookOpen,
  IndianRupee,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { StatutoryPolicy } from '../server/db.ts';
import { BackButton } from '../components/BackButton.tsx';

export const PolicyConfigPage: React.FC = () => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<StatutoryPolicy | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Editable fields
  const [engineeringUG, setEngineeringUG] = useState<number>(3500000);
  const [engineeringPG, setEngineeringPG] = useState<number>(1500000);
  const [management, setManagement] = useState<number>(1500000);
  const [pharmacy, setPharmacy] = useState<number>(2500000);
  const [architecture, setArchitecture] = useState<number>(1500000);
  const [polytechnic, setPolytechnic] = useState<number>(1500000);
  const [lockInYears, setLockInYears] = useState<number>(10);
  const [lienMandate, setLienMandate] = useState<string>('');

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system/policy');
      if (res.ok) {
        const data = await res.json();
        setPolicy(data);
        if (data.minimumDeposits) {
          setEngineeringUG(data.minimumDeposits.engineeringUG || 3500000);
          setEngineeringPG(data.minimumDeposits.engineeringPG || 1500000);
          setManagement(data.minimumDeposits.management || 1500000);
          setPharmacy(data.minimumDeposits.pharmacy || 2500000);
          setArchitecture(data.minimumDeposits.architecture || 1500000);
          setPolytechnic(data.minimumDeposits.polytechnic || 1500000);
        }
        setLockInYears(data.mandatoryLockInYears || 10);
        setLienMandate(data.statutoryLienMandate || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/system/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minimumDeposits: {
            engineeringUG,
            engineeringPG,
            management,
            pharmacy,
            architecture,
            polytechnic,
          },
          mandatoryLockInYears: lockInYears,
          statutoryLienMandate: lienMandate,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPolicy(updated);
        setSuccessMsg('Statutory regulatory policy updated successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to update policy.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
        <p className="text-xs">Loading statutory policy configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="mb-2">
        <BackButton fallbackPath="/dashboard" />
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900">AICTE Security Deposit Policy & Regulatory Matrix</h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-900">
            {policy?.version || 'APH-2024-2027'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Configurable statutory parameters governing security deposit norms, lock-in tenures, and multi-tier liquidation guidelines.
        </p>
      </div>

      {/* Benchmark Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-0.5">Policy Benchmark Notice:</strong>
          {policy?.policyStatusNotice ||
            'Configurable benchmark rules. Amounts and mandatory conditions are aligned with standard AICTE Approval Process Handbook (APH) regulations.'}
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Table of Minimum Deposits */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-sm text-slate-900">1. Mandatory Security Deposit Amounts by Discipline</h3>
            <span className="text-[10px] text-slate-400 font-mono">Indian Rupees (₹)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Engineering & Technology (Undergraduate)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  value={engineeringUG}
                  disabled={user?.role !== 'ADMINISTRATOR'}
                  onChange={e => setEngineeringUG(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400">Standard APH benchmark: ₹35,00,000 (35 Lakhs)</span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Engineering & Technology (Postgraduate / New)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  value={engineeringPG}
                  disabled={user?.role !== 'ADMINISTRATOR'}
                  onChange={e => setEngineeringPG(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400">Standard APH benchmark: ₹15,00,000 (15 Lakhs)</span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Management (MBA / PGDM Programmes)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  value={management}
                  disabled={user?.role !== 'ADMINISTRATOR'}
                  onChange={e => setManagement(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400">Standard APH benchmark: ₹15,00,000 (15 Lakhs)</span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Pharmacy (B.Pharm / M.Pharm)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  value={pharmacy}
                  disabled={user?.role !== 'ADMINISTRATOR'}
                  onChange={e => setPharmacy(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400">Standard APH benchmark: ₹25,00,000 (25 Lakhs)</span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Architecture & Town Planning</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  value={architecture}
                  disabled={user?.role !== 'ADMINISTRATOR'}
                  onChange={e => setArchitecture(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400">Standard APH benchmark: ₹15,00,000 (15 Lakhs)</span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Polytechnic / Diploma Institutions</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  value={polytechnic}
                  disabled={user?.role !== 'ADMINISTRATOR'}
                  onChange={e => setPolytechnic(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400">Standard APH benchmark: ₹15,00,000 (15 Lakhs)</span>
            </div>
          </div>
        </div>

        {/* Tenure and Joint Lien Mandate */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            2. Statutory Lock-In Tenure & Joint Mandate Policy
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Mandatory Statutory Lock-in Tenure (Years) *</label>
              <input
                type="number"
                min="1"
                max="25"
                value={lockInYears}
                disabled={user?.role !== 'ADMINISTRATOR'}
                onChange={e => setLockInYears(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900"
              />
              <span className="text-[10px] text-slate-400">Standard tenure: 10 Years from the date of establishment.</span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Operating Joint Lien Mandate Formulation</label>
              <input
                type="text"
                value={lienMandate}
                disabled={user?.role !== 'ADMINISTRATOR'}
                onChange={e => setLienMandate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 mt-2">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              Mandatory Release Documentation Checklist
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
              {policy?.requiredDocuments?.map((doc, idx) => (
                <li key={idx}>{doc}</li>
              ))}
            </ul>
          </div>

          {user?.role === 'ADMINISTRATOR' ? (
            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Updating Regulatory Rules...' : 'Save Regulatory Matrix'}</span>
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic">
              * Policy parameters can only be altered by users with Central Administrator permissions.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
