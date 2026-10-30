import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { CANONICAL_INSTITUTIONS } from '../../components/OnboardingModal.tsx';
import { UserRole } from '../../types/index.ts';

export const DemoPage: React.FC = () => {
  const navigate = useNavigate();
  const { enterDemoMode } = useAuth();

  const [belonging, setBelonging] = useState<'INSTITUTION' | 'AICTE'>('INSTITUTION');
  const [designation, setDesignation] = useState<string>('Principal');
  const [selectedInstId, setSelectedInstId] = useState<string>('inst-01');
  const [aicteRole, setAicteRole] = useState<UserRole>('REGIONAL_OFFICER');
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  const INSTITUTION_DESIGNATIONS = [
    'Director',
    'Principal',
    'Chairman',
    'Registrar',
    'Admission Officer',
    'Compliance Officer',
    'Accounts/Finance Officer',
    'Trustee/Secretary',
    'Authorized Signatory',
  ];

  const AICTE_ROLES: { role: UserRole; title: string; desc: string }[] = [
    {
      role: 'REGIONAL_OFFICER',
      title: 'Regional Officer / Maker (RO)',
      desc: 'Performs document scrutiny, raises deficiencies, and conducts first-tier clearance.',
    },
    {
      role: 'ADMINISTRATOR',
      title: 'Central Bureau Head / Checker / System Admin',
      desc: 'Full administrative governance, final NOC issuance, approval of access requests.',
    },
    {
      role: 'PGRC_OFFICER',
      title: 'Public Grievance Redressal Reviewer (PGRC)',
      desc: 'Conducts student dispute inquiry and grants Tier-2 clearance.',
    },
    {
      role: 'VIGILANCE_OFFICER',
      title: 'Chief Vigilance Officer Reviewer (CVO)',
      desc: 'Statutory integrity audit, court case checks, and Tier-3 clearance.',
    },
  ];

  const filteredInstitutions = CANONICAL_INSTITUTIONS.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.code.includes(searchQuery)
  );

  const handleLaunchCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (belonging === 'INSTITUTION') {
        // Map inst-01 to user-inst-01 for standard demo
        await enterDemoMode('INSTITUTION', 'user-inst-01');
      } else {
        await enterDemoMode(aicteRole);
      }
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLaunch = async (role: UserRole, userId?: string) => {
    setLoading(true);
    try {
      await enterDemoMode(role, userId);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07162b] via-[#0a1e38] to-[#0f2d52] flex flex-col justify-between p-4 sm:p-6 text-slate-100">
      {/* Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <Link to="/" className="flex items-center gap-3 text-left group hover:opacity-95 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-blue-950 shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">AICTE FDR360</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                SIH26265
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Security Deposit & FDR Lifecycle Portal</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/login" className="text-xs text-slate-300 hover:text-white font-semibold transition px-3 py-1.5">
            Real Sign In
          </Link>
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-white font-semibold transition"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto my-6">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Smart India Hackathon • Interactive Evaluator Sandbox</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              Try Demo Mode (Simulated Data)
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 max-w-2xl leading-relaxed">
              Experience all portal roles with preloaded benchmark FDRs, 3-tier clearance workflows, and fast-forward date simulation. Demo mode is fully isolated and does not alter real Firestore records.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Quick Pick Personas */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                1-Click Evaluator Presets
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLaunch('INSTITUTION', 'user-inst-01')}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition group shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                      <GraduationCap className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      College
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 line-clamp-1">
                    Principal @ MAIT
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">Dr. Rajiv K. Sharma</p>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLaunch('REGIONAL_OFFICER')}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition group shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                      <Briefcase className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      Tier 1 RO
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-900 line-clamp-1">
                    Regional Officer
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">Northern Region (Scrutiny)</p>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLaunch('VIGILANCE_OFFICER')}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 text-left transition group shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                      Tier 3 CVO
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-900 line-clamp-1">
                    Vigilance Officer
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">Integrity Clearances</p>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLaunch('ADMINISTRATOR')}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition group shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center text-xs font-bold">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                      Admin
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-900 line-clamp-1">
                    AICTE Administrator
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">Central Bureau & Sanction</p>
                </button>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 absolute">
                Or Configure Custom Demo Persona
              </span>
            </div>

            {/* Step-by-Step Custom Selection */}
            <form onSubmit={handleLaunchCustom} className="space-y-5 text-xs">
              {/* Question 1: Where do you belong? */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  1. Where do you belong?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBelonging('INSTITUTION')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                      belonging === 'INSTITUTION'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <GraduationCap className={`w-5 h-5 ${belonging === 'INSTITUTION' ? 'text-blue-700' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold">Institution (College / University)</div>
                      <div className="text-[10px] text-slate-500">Manage security deposits & FDRs</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBelonging('AICTE')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                      belonging === 'AICTE'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <ShieldCheck className={`w-5 h-5 ${belonging === 'AICTE' ? 'text-blue-700' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold">AICTE Bureau / Officer</div>
                      <div className="text-[10px] text-slate-500">Scrutiny, clearances & administration</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Question 2: Designation & Institution */}
              {belonging === 'INSTITUTION' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        2. Choose Official Designation
                      </label>
                      <select
                        value={designation}
                        onChange={e => setDesignation(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                      >
                        {INSTITUTION_DESIGNATIONS.map(d => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Filter 21 Canonical Benchmark Institutes
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search college name or AICTE code..."
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Select Institution
                    </label>
                    <select
                      value={selectedInstId}
                      onChange={e => setSelectedInstId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                    >
                      {filteredInstitutions.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.code}) — {inst.categoryLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-800 mb-2">
                    2. Choose AICTE Role & Clearance Jurisdiction
                  </label>
                  <div className="space-y-2">
                    {AICTE_ROLES.map(r => (
                      <label
                        key={r.role}
                        className={`block p-3 rounded-xl border cursor-pointer transition ${
                          aicteRole === r.role
                            ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="aicteRole"
                            checked={aicteRole === r.role}
                            onChange={() => setAicteRole(r.role)}
                            className="mt-0.5 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{r.title}</div>
                            <div className="text-[11px] text-slate-500">{r.desc}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Data will be clearly labelled <strong>DEMO DATA - NOT REAL</strong>.
                </span>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md flex items-center gap-2 transition"
                >
                  <span>{loading ? 'Initializing Sandbox...' : 'Enter Demo Sandbox'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-2 text-[11px] text-slate-400">
        AICTE FDR360 • Smart India Hackathon 2024 (SIH26265) • Statutory Compliance Prototype
      </footer>
    </div>
  );
};
