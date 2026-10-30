import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  PlusCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Building2,
  Calendar,
  IndianRupee,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  GraduationCap,
  Building,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { FDRRecord, FDRLifecycleStatus, InstitutionCategory } from '../types/index.ts';
import { CANONICAL_INSTITUTIONS } from '../components/OnboardingModal.tsx';
import { BackButton } from '../components/BackButton.tsx';
import { DemoCasesPanel } from '../components/DemoCasesPanel.tsx';
import { useNavigate } from 'react-router-dom';

interface FDRListProps {
  onSelectFDR?: (id: string) => void;
  onNavigateCreate?: () => void;
  initialFilter?: { maturityWindow?: string; status?: string };
}

export const FDRList: React.FC<FDRListProps> = ({ onSelectFDR, onNavigateCreate, initialFilter }) => {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();
  const { simulatedDate, refreshTrigger } = useSystemDate();
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter?.status || 'ALL');
  const [bankFilter, setBankFilter] = useState('ALL');
  const [maturityFilter, setMaturityFilter] = useState(initialFilter?.maturityWindow || 'ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'GGSIPU_AFFILIATED' | 'PRIVATE_UNIVERSITY'>('ALL');
  const [instFilter, setInstFilter] = useState<string>('ALL');

  const isPendingInstitution = !isDemoMode && user?.role === 'INSTITUTION' && user?.accountStatus === 'PENDING';

  const fetchFDRs = async () => {
    try {
      setLoading(true);
      if (isPendingInstitution) {
        setFdrs([]);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (bankFilter !== 'ALL') params.append('bank', bankFilter);
      if (maturityFilter !== 'ALL') params.append('maturityWindow', maturityFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (instFilter !== 'ALL') params.append('institutionId', instFilter);

      const res = await fetch(`/api/fdrs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFdrs(data.fdrs || []);
      }
    } catch (e) {
      console.error('Error fetching FDRs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFDRs();
  }, [search, statusFilter, bankFilter, maturityFilter, categoryFilter, instFilter, refreshTrigger, simulatedDate]);

  const uniqueBanks = Array.from(new Set(fdrs.map(f => f.bankName)));

  const getStatusBadge = (status: FDRLifecycleStatus, urgent = false) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">ACTIVE</span>;
      case 'EXPIRING':
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            urgent
              ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}>
            EXPIRING {urgent ? '(!)' : ''}
          </span>
        );
      case 'MATURED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">MATURED</span>;
      case 'UNDER_SCRUTINY':
      case 'DOCUMENT_CHECK':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">SCRUTINY</span>;
      case 'DEFICIENCY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">DEFICIENCY</span>;
      case 'RESUBMITTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">RESUBMITTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">{status}</span>;
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/reports/csv/master-fdr`;
  };

  const totalAmount = fdrs.reduce((acc, f) => acc + f.principalAmount, 0);

  const handleFdrClick = (id: string) => {
    if (onSelectFDR) {
      onSelectFDR(id);
    } else {
      navigate(`/fdr/${id}`);
    }
  };

  const handleCreateClick = () => {
    if (onNavigateCreate) {
      onNavigateCreate();
    } else {
      navigate('/fdrs/new');
    }
  };

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <BackButton fallbackPath="/dashboard" />
      </div>

      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              {user?.role === 'INSTITUTION' ? 'Institution Security Deposits & FDRs' : 'Master FDR Security Deposit Register'}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900">
              {fdrs.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of AICTE joint-lien bank fixed deposits across real GGSIPU colleges and Private Universities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['ADMINISTRATOR', 'REGIONAL_OFFICER'].includes(user?.role || '') && (
            <button
              onClick={async () => {
                if (!confirm('Clean any temporary TEST-FDR-* artifacts from acceptance test runs?')) return;
                const res = await fetch('/api/fdrs/clean-tests', { method: 'POST' });
                if (res.ok) {
                  fetchFDRs();
                }
              }}
              className="flex items-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition shadow-2xs"
              title="Remove automated test deposits"
            >
              <span>Clean Test Artifacts</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {['INSTITUTION', 'REGIONAL_OFFICER', 'ADMINISTRATOR'].includes(user?.role || '') && (
            <button
              onClick={handleCreateClick}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register FDR (AI OCR)</span>
            </button>
          )}
        </div>
      </div>

      {/* Demo Notice Banner */}
      <div className="bg-slate-100 border border-slate-300 px-4 py-2 rounded-lg text-[11px] text-slate-600 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>DEMO DATA — NOT REAL:</strong> All FDR certificates and transactions are synthetic test simulations linked strictly to the 12 demo institutions.
          </span>
        </div>
        <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
          Reference Clock: {simulatedDate}
        </span>
      </div>

      {/* Quick-Access Demo Cases Panel */}
      <DemoCasesPanel />

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
        <div>
          <span className="text-slate-500 block text-[11px]">Filtered Principal Total</span>
          <span className="font-bold text-slate-900 font-mono text-sm">
            ₹{(totalAmount / 10000000).toFixed(2)} Cr
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Expiring ≤ 30 Days</span>
          <span className="font-bold text-rose-600 font-mono text-sm">
            {fdrs.filter(f => f.isUrgentExpiring).length} FDRs
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Expiring ≤ 90 Days</span>
          <span className="font-bold text-amber-600 font-mono text-sm">
            {fdrs.filter(f => f.isExpiringSoon).length} FDRs
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Matured Deposits</span>
          <span className="font-bold text-purple-700 font-mono text-sm">
            {fdrs.filter(f => f.isMatured || f.lifecycleStatus === 'MATURED').length} FDRs
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
            categoryFilter === 'ALL'
              ? 'bg-blue-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Institutions
        </button>
        <button
          onClick={() => setCategoryFilter('GGSIPU_AFFILIATED')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition ${
            categoryFilter === 'GGSIPU_AFFILIATED'
              ? 'bg-indigo-900 text-white'
              : 'bg-white text-indigo-900 hover:bg-indigo-50 border border-indigo-200'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>GGSIPU Affiliated</span>
        </button>
        <button
          onClick={() => setCategoryFilter('PRIVATE_UNIVERSITY')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition ${
            categoryFilter === 'PRIVATE_UNIVERSITY'
              ? 'bg-purple-900 text-white'
              : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Private Universities</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by FDR Number, College Name, AICTE Code, Bank..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {user?.role !== 'INSTITUTION' && (
            <select
              value={instFilter}
              onChange={e => setInstFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-medium max-w-[190px]"
            >
              <option value="ALL">All 21 Institutes</option>
              <optgroup label="GGSIPU Affiliated (12)">
                {CANONICAL_INSTITUTIONS.filter(i => i.category === 'GGSIPU_AFFILIATED').map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Private Universities (9)">
                {CANONICAL_INSTITUTIONS.filter(i => i.category === 'PRIVATE_UNIVERSITY').map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </optgroup>
            </select>
          )}

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Drafts (Unsubmitted)</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING">Expiring</option>
            <option value="MATURED">Matured</option>
            <option value="UNDER_SCRUTINY">Under Scrutiny</option>
            <option value="DEFICIENCY">Deficiency</option>
            <option value="RESUBMITTED">Resubmitted</option>
          </select>

          {/* Maturity filter */}
          <select
            value={maturityFilter}
            onChange={e => setMaturityFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Maturities</option>
            <option value="30">Urgent (≤ 30 Days)</option>
            <option value="90">Upcoming (≤ 90 Days)</option>
            <option value="matured">Already Matured</option>
          </select>

          {/* Bank filter */}
          <select
            value={bankFilter}
            onChange={e => setBankFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Banks</option>
            {uniqueBanks.map(b => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {(search || statusFilter !== 'ALL' || bankFilter !== 'ALL' || maturityFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setBankFilter('ALL');
                setMaturityFilter('ALL');
                setCategoryFilter('ALL');
              }}
              className="text-xs text-blue-700 font-bold hover:underline px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
            <p className="text-xs">Loading FDR registry...</p>
          </div>
        ) : fdrs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No FDR Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No security deposits match your active filters. Try adjusting search or reset filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">FDR Certificate</th>
                  <th className="px-4 py-3">Institution & Category</th>
                  <th className="px-4 py-3">Bank & Branch</th>
                  <th className="px-4 py-3 text-right">Principal (₹)</th>
                  <th className="px-4 py-3">Maturity Date</th>
                  <th className="px-4 py-3">Days Left</th>
                  <th className="px-4 py-3">Lifecycle Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fdrs.map(fdr => {
                  const isUrgent = fdr.isUrgentExpiring;
                  const isPrivateUniv = fdr.category === 'PRIVATE_UNIVERSITY';

                  return (
                    <tr
                      key={fdr.id}
                      onClick={() => handleFdrClick(fdr.id)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-950 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{fdr.fdrNumber}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            DEMO
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="font-bold text-slate-900 truncate">{fdr.institutionName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">{fdr.institutionCode}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            isPrivateUniv ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {isPrivateUniv ? 'Private Univ' : 'GGSIPU'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-slate-800">{fdr.bankName}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{fdr.ifscCode}</span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{fdr.principalAmount.toLocaleString('en-IN')}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          @ {fdr.interestRate}% p.a.
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        {fdr.maturityDate}
                        <span className="block text-[10px] text-slate-400">Issue: {fdr.issueDate}</span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {fdr.daysToMaturity !== undefined ? (
                          fdr.daysToMaturity <= 0 ? (
                            <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-purple-100 text-purple-800">
                              Matured
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                                fdr.daysToMaturity <= 30
                                  ? 'bg-rose-100 text-rose-800 animate-pulse'
                                  : fdr.daysToMaturity <= 90
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {fdr.daysToMaturity}d
                            </span>
                          )
                        ) : (
                          '...'
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(fdr.lifecycleStatus, isUrgent)}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleFdrClick(fdr.id);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-900 hover:text-white text-slate-700 rounded text-xs font-semibold transition cursor-pointer"
                        >
                          View 360°
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
