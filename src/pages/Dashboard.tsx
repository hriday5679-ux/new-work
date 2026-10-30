import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileSpreadsheet,
  IndianRupee,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileCheck2,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Search,
  Calendar,
  Sparkles,
  ArrowRight,
  Download,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  X,
  GraduationCap,
  Scale,
  Award,
  UserCheck,
  FolderArchive,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { DashboardMetrics, FDRRecord, ReleaseRequest } from '../types/index.ts';

import { CANONICAL_INSTITUTIONS } from '../components/OnboardingModal.tsx';

import { useNavigate } from 'react-router-dom';
import { canViewFinancialDetails } from '../utils/rbac.ts';
import { getRoleDisplayName } from '../types/index.ts';
import { DemoCasesPanel } from '../components/DemoCasesPanel.tsx';

interface DashboardProps {
  onNavigate?: (tab: string, filterParams?: any) => void;
  onOpenSimulator?: () => void;
  onSelectFDR?: (fdrId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenSimulator,
  onSelectFDR,
}) => {
  const navigate = useNavigate();
  const { user, switchPersona, isDemoMode } = useAuth();
  const { simulatedDate, isDateSimulated, refreshTrigger } = useSystemDate();

  const handleNav = (tab: string, params?: any) => {
    if (onNavigate) {
      onNavigate(tab, params);
    } else {
      if (tab === 'fdrs') navigate('/fdrs');
      else if (tab === 'create-fdr') navigate('/fdrs/new');
      else if (tab === 'institutions') navigate('/institutions');
      else if (tab === 'vault') navigate('/documents');
      else if (tab === 'releases') navigate('/release');
      else if (tab === 'clearances') navigate('/clearances');
      else if (tab === 'access-requests') navigate('/admin/users');
      else if (tab === 'calendar') navigate('/maturity');
      else if (tab === 'policy') navigate('/policy');
      else if (tab === 'audit') navigate('/audit-log');
      else if (tab === 'reports') navigate('/reports');
      else if (tab === 'profile') navigate('/profile');
      else navigate('/dashboard');
    }
  };

  const handleSelectFdrItem = (fdrId: string) => {
    if (onSelectFDR) {
      onSelectFDR(fdrId);
    } else {
      navigate(`/fdr/${fdrId}`);
    }
  };

  const canSeeFinance = canViewFinancialDetails(user);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [urgentFDRs, setUrgentFDRs] = useState<FDRRecord[]>([]);
  const [pendingReleases, setPendingReleases] = useState<ReleaseRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstFilter, setSelectedInstFilter] = useState<string>('ALL');
  const [showGuide, setShowGuide] = useState<boolean>(() => {
    return localStorage.getItem('aicte_hide_guide') !== 'true';
  });

  const toggleGuide = () => {
    setShowGuide(prev => {
      const next = !prev;
      localStorage.setItem('aicte_hide_guide', next ? 'false' : 'true');
      return next;
    });
  };

  const isPendingInstitution = !isDemoMode && user?.role === 'INSTITUTION' && user?.accountStatus === 'PENDING';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Pending institutions cannot read existing deposits
      if (isPendingInstitution) {
        setMetrics({
          totalInstitutions: 1,
          totalAffiliatedColleges: 1,
          totalPrivateUniversities: 0,
          totalFDRs: 0,
          totalDepositValue: 0,
          activeFDRs: 0,
          expiringIn7Days: 0,
          expiringIn30Days: 0,
          expiringIn90Days: 0,
          maturedFDRs: 0,
          pendingVerification: 0,
          deficienciesCount: 0,
          pendingReleaseRequests: 0,
          pendingClearances: { ro: 0, pgrc: 0, vigilance: 0 },
          releasedFDRs: 0,
        });
        setUrgentFDRs([]);
        setPendingReleases([]);
        setLoading(false);
        return;
      }

      const targetInst = (user?.role === 'INSTITUTION')
        ? user.institutionId
        : (selectedInstFilter !== 'ALL' ? selectedInstFilter : undefined);

      const statsUrl = targetInst ? `/api/stats/dashboard?institutionId=${targetInst}` : '/api/stats/dashboard';
      const fdrsUrl = targetInst
        ? `/api/fdrs?maturityWindow=30&institutionId=${targetInst}`
        : '/api/fdrs?maturityWindow=30';
      const relUrl = targetInst ? `/api/releases?institutionId=${targetInst}` : '/api/releases';

      const [statsRes, fdrsRes, relRes] = await Promise.all([
        fetch(statsUrl),
        fetch(fdrsUrl),
        fetch(relUrl),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setMetrics(statsData);
      }

      if (fdrsRes.ok) {
        const fdrData = await fdrsRes.json();
        setUrgentFDRs(fdrData.fdrs || []);
      }

      if (relRes.ok) {
        const relData = await relRes.json();
        const pending = (relData.releases || []).filter((r: ReleaseRequest) =>
          ['SUBMITTED', 'UNDER_SCRUTINY', 'CLEARANCE_PENDING'].includes(r.status)
        );
        setPendingReleases(pending);
      }
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger, simulatedDate, selectedInstFilter, user?.institutionId]);

  const formatCurrencyCr = (amount: number) => {
    const cr = amount / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Demo Mode Badge or Live Production Status and Quick Guide toggle */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border px-4 py-2.5 rounded-xl text-xs ${
        isDemoMode
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-blue-900/5 border-blue-900/20'
      }`}>
        <div className="flex items-center gap-2 text-slate-900 font-medium">
          {isDemoMode ? (
            <>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-slate-950 tracking-wider uppercase">
                DEMO MODE
              </span>
              <span>
                Simulated evaluation dataset with <strong>21 real institutions</strong> (12 GGSIPU-affiliated colleges & 9 private universities).
              </span>
            </>
          ) : (
            <>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white tracking-wider uppercase">
                OFFICIAL PORTAL
              </span>
              <span>
                Logged in as <strong className="text-blue-950">{user?.name}</strong> • Organization: <strong className="text-blue-950">{user?.institutionName || user?.designation || 'AICTE Official'}</strong> ({user?.role})
              </span>
            </>
          )}
        </div>
        <button
          onClick={toggleGuide}
          className="flex items-center gap-1.5 font-bold text-blue-900 hover:text-blue-700 bg-white px-2.5 py-1 rounded-md border border-slate-300 shadow-2xs transition"
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-700" />
          <span>{showGuide ? 'Hide Evaluation Guide' : 'Open Evaluation Guide'}</span>
        </button>
      </div>

      {/* Getting Started & Judge Quick-Guide Panel */}
      {showGuide && (
        <div className="bg-white rounded-xl border-2 border-blue-800/30 p-5 shadow-sm space-y-4 relative animate-in fade-in">
          <button
            onClick={toggleGuide}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md"
            title="Dismiss Guide"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-900" />
              <h3 className="text-base font-extrabold text-slate-900">
                AICTE FDR360 — Evaluator & Judge Walkthrough Guide
              </h3>
            </div>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              This portal automates the statutory <strong>Fixed Deposit Receipt (FDR)</strong> lifecycle for AICTE-approved institutions under the Approval Process Handbook (APH). It enforces joint-lien mandates, tracks 10-year lock-in maturities, and governs multi-tier statutory clearances before deposit liquidation.
            </p>
          </div>

          {/* Key Acronyms / Glossary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] pt-1">
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <strong className="text-blue-950 block">FDR</strong>
              <span className="text-slate-500">Fixed Deposit Receipt (Joint Security Deposit)</span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <strong className="text-blue-950 block">NOC</strong>
              <span className="text-slate-500">No Objection Certificate (Sanction Order)</span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <strong className="text-blue-950 block">RO</strong>
              <span className="text-slate-500">Regional Officer (Regional Scrutiny Desk)</span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <strong className="text-blue-950 block">PGRC</strong>
              <span className="text-slate-500">Public Grievance Redressal Cell</span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <strong className="text-blue-950 block">CVO / Vigilance</strong>
              <span className="text-slate-500">Chief Vigilance Officer Clearance</span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <strong className="text-blue-950 block">UTR</strong>
              <span className="text-slate-500">Unique Bank Transaction Reference</span>
            </div>
          </div>

          {/* Quick Role Personas to Test Workflows - Demo Mode Only */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {isDemoMode ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>Test as Role (Demo Mode):</span>
                </span>
                <button
                  onClick={() => switchPersona('INSTITUTION')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition border ${
                    user?.role === 'INSTITUTION'
                      ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                >
                  1. College (MAIT)
                </button>
                <button
                  onClick={() => switchPersona('REGIONAL_OFFICER')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition border ${
                    user?.role === 'REGIONAL_OFFICER'
                      ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                >
                  2. Regional Officer (RO)
                </button>
                <button
                  onClick={() => switchPersona('PGRC_OFFICER')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition border ${
                    user?.role === 'PGRC_OFFICER'
                      ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                >
                  3. PGRC Reviewer
                </button>
                <button
                  onClick={() => switchPersona('VIGILANCE_OFFICER')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition border ${
                    user?.role === 'VIGILANCE_OFFICER'
                      ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                >
                  4. Vigilance Officer
                </button>
                <button
                  onClick={() => switchPersona('ADMINISTRATOR')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition border ${
                    user?.role === 'ADMINISTRATOR'
                      ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                >
                  5. Administrator (NOC Issuer)
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>
                  Official role active: <strong>{user?.designation || user?.role}</strong> • Scoped to {user?.institutionName || 'AICTE Headquarters'}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNav('institutions')}
                className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1"
              >
                <span>Browse 21 Real Institutes</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome & Role Announcement Banner */}
      <div className="bg-gradient-to-r from-[#0d2345] via-[#112d59] to-[#0f3d6c] rounded-xl text-white p-6 shadow-md border border-blue-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400 via-blue-200 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-blue-950 uppercase tracking-wider">
                SIH26265 Production Grade Portal
              </span>
              <span className="text-xs text-blue-200 font-mono">Clock: {simulatedDate}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              AICTE FDR360 — Intelligent Security Deposit Lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-2xl">
              Welcome, <strong className="text-white">{user?.name}</strong> ({user?.designation}). Active persona: <span className="underline decoration-amber-400 font-bold">{user?.role}</span>.
              Real database state with automated maturity tracking and 3-tier statutory clearance workflow.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenSimulator}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-blue-950 rounded-lg text-xs font-bold transition shadow-sm hover:scale-[1.02]"
            >
              <Clock className="w-4 h-4" />
              <span>Simulate Date Jump</span>
            </button>
            <button
              onClick={() => handleNav('create-fdr')}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI OCR New FDR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notice Banner: DEMO DATA — NOT REAL (Only in Demo Mode) */}
      {isDemoMode && (
        <div className="bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-xl text-xs text-slate-700 flex items-start sm:items-center gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
          <p>
            <strong className="text-slate-900">DEMO DATA — NOT REAL:</strong> Fictional FDR transactions, deposit sums, documents, and clearance records are simulated benchmark data attached strictly to the 12 demo institutions.
          </p>
        </div>
      )}

      {/* Quick-Access Demo Cases Panel for Officers */}
      <DemoCasesPanel />

      {/* Pending Institution Warning Alert */}
      {isPendingInstitution && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-xs text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-950 uppercase tracking-wide">
              Institution Verification Pending
            </h4>
            <p className="leading-relaxed">
              Your institution user account ({user?.name || user?.email}) is currently awaiting AICTE administrative approval. You may register new FDR drafts and view statutory guidelines; historical deposit records will unlock once officially verified.
            </p>
          </div>
        </div>
      )}

      {/* AICTE Officer Institution Scope Filter Bar */}
      {user?.role !== 'INSTITUTION' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-900" />
            <span className="text-xs font-bold text-slate-800">Filter By Institution Scope:</span>
          </div>
          <select
            value={selectedInstFilter}
            onChange={e => setSelectedInstFilter(e.target.value)}
            className="w-full sm:w-80 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Institutions (All 21 AICTE Benchmark Institutes)</option>
            <optgroup label="GGSIPU Affiliated Colleges (12 Institutes)">
              {CANONICAL_INSTITUTIONS.filter(i => i.category === 'GGSIPU_AFFILIATED').map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.code})
                </option>
              ))}
            </optgroup>
            <optgroup label="State Private Universities (9 Institutes)">
              {CANONICAL_INSTITUTIONS.filter(i => i.category === 'PRIVATE_UNIVERSITY').map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.code})
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      )}

      {/* Urgent Maturity Alert Banner if any FDRs are expiring within 30 days */}
      {metrics && metrics.expiringIn30Days > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Statutory Maturity Alert: {metrics.expiringIn30Days} FDR(s) Expiring Within 30 Days
              </h4>
              <p className="text-xs text-amber-900 mt-0.5">
                Immediate action required for renewal or security deposit release submission under AICTE APH regulations.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNav('fdrs', { maturityWindow: '30' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-lg text-xs font-bold transition shrink-0"
          >
            <span>View Expiring FDRs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Deposit Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Deposit Value</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-800">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
            {metrics ? formatCurrencyCr(metrics.totalDepositValue) : '...'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Across {metrics?.totalInstitutions || 21} registered institutes</span>
          </div>
        </div>

        {/* Metric 2: Institutions Directory Breakdown */}
        <div
          onClick={() => handleNav('institutions')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-blue-900">
              Real Institutions
            </span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-800">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
            {metrics?.totalInstitutions || 21}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-600 font-medium">
            <span className="text-indigo-800 font-bold">{metrics?.totalAffiliatedColleges || 12} GGSIPU</span>
            <span>•</span>
            <span className="text-purple-800 font-bold">{metrics?.totalPrivateUniversities || 9} Private Univ</span>
          </div>
        </div>

        {/* Metric 3: Expiring & Matured */}
        <div
          onClick={() => handleNav('calendar')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-amber-900">
              Maturity Radar
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-600">
              {metrics?.expiringIn90Days || 0}
            </span>
            <span className="text-xs text-slate-500">expiring in 90d</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-rose-700 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{metrics?.maturedFDRs || 0} Already Matured</span>
          </div>
        </div>

        {/* Metric 4: Multi-Tier Clearances Pending */}
        <div
          onClick={() => handleNav('clearances')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-purple-900">
              Pending Clearances
            </span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-950">
            {metrics?.pendingReleaseRequests || 0}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-purple-700 font-medium">
            <span>RO: {metrics?.pendingClearances.ro || 0}</span>
            <span>•</span>
            <span>PGRC: {metrics?.pendingClearances.pgrc || 0}</span>
            <span>•</span>
            <span>Vig: {metrics?.pendingClearances.vigilance || 0}</span>
          </div>
        </div>
      </div>

      {/* Two-Column Working Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Urgent Expiring FDRs & Scrutiny Backlog */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Urgent Expiring FDRs Radar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Urgent Maturity Radar (Expiring ≤ 30 Days)
                </h3>
              </div>
              <button
                onClick={() => handleNav('calendar')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <span>Full Calendar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {urgentFDRs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p>Zero statutory deposits expiring in the next 30 days under current date {simulatedDate}.</p>
                  <button
                    onClick={onOpenSimulator}
                    className="mt-2 text-blue-700 font-semibold hover:underline"
                  >
                    Simulate time jump to fast-forward maturities →
                  </button>
                </div>
              ) : (
                urgentFDRs.slice(0, 5).map(fdr => (
                  <div
                    key={fdr.id}
                    onClick={() => handleSelectFdrItem(fdr.id)}
                    className="p-3.5 hover:bg-slate-50/80 cursor-pointer transition flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-900">
                          {fdr.fdrNumber}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            fdr.isCriticalExpiring
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {fdr.daysToMaturity !== undefined && fdr.daysToMaturity <= 0
                            ? 'Matured'
                            : `Expires in ${fdr.daysToMaturity} Days`}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {fdr.category === 'PRIVATE_UNIVERSITY' ? 'Private Univ' : 'GGSIPU'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800">{fdr.institutionName}</p>
                      <p className="text-[11px] text-slate-500">
                        {fdr.bankName} • Maturity: <span className="font-mono">{fdr.maturityDate}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-sm text-slate-900 block">
                        ₹{(fdr.principalAmount / 100000).toFixed(1)} Lakhs
                      </span>
                      <span className="text-[10px] text-blue-700 font-semibold hover:underline flex items-center justify-end gap-0.5">
                        <span>Scrutiny 360</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card: Pending Security Deposit Release Applications */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Release Workflow & Clearance Backlog
                </h3>
              </div>
              <button
                onClick={() => handleNav('releases')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <span>Clearance Matrix</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {pendingReleases.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p>All release requests processed. No statutory clearance items pending.</p>
                </div>
              ) : (
                pendingReleases.slice(0, 4).map(rel => (
                  <div
                    key={rel.id}
                    onClick={() => handleNav('releases', { selectId: rel.id })}
                    className="p-3.5 hover:bg-slate-50/80 cursor-pointer transition flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-900">
                          {rel.id}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800">
                          {rel.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rel.reason}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800">{rel.institutionName}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className={rel.clearances.regionalOfficer.status === 'APPROVED' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                          RO: {rel.clearances.regionalOfficer.status}
                        </span>
                        <span>•</span>
                        <span className={rel.clearances.pgrc.status === 'APPROVED' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                          PGRC: {rel.clearances.pgrc.status}
                        </span>
                        <span>•</span>
                        <span className={rel.clearances.vigilance.status === 'APPROVED' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                          Vigilance: {rel.clearances.vigilance.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-sm text-slate-900 block">
                        ₹{(rel.principalAmount / 100000).toFixed(1)}L
                      </span>
                      <span className="text-[10px] text-purple-700 font-semibold hover:underline">
                        Review Clearances →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Statutory Actions & Reports */}
        <div className="space-y-6">
          {/* Action Card: AI OCR Document Verification */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-xl text-white p-5 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2 text-amber-300">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-sm font-bold">AI OCR Extraction Desk</h3>
            </div>
            <p className="text-xs text-blue-100/90 leading-relaxed">
              Scan bank FDR receipts. Automatically extracts receipt number, issuing bank, joint-lien terms, and maturity dates for officer scrutiny.
            </p>
            <button
              onClick={() => handleNav('create-fdr')}
              className="w-full flex items-center justify-center gap-2 py-2 bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold rounded-lg text-xs transition shadow-xs"
            >
              <span>Scan & Extract FDR</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Statutory Quick Links
            </h3>
            <div className="space-y-1.5">
              <button
                onClick={() => handleNav('institutions')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-900 text-xs font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>Real Institutions Directory (21)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('calendar')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-900 text-xs font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>10-Year Maturity Calendar</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('clearances')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-900 text-xs font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>3-Tier Clearance Matrix</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('reports')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-900 text-xs font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-700" />
                  <span>Statutory CSV Reports & Audits</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('vault')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-900 text-xs font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  <FolderArchive className="w-4 h-4 text-emerald-700" />
                  <span>Encrypted Document Vault</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleNav('policy')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-900 text-xs font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-700" />
                  <span>Statutory Policy Matrix</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
