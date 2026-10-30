import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  FileCheck2,
  Building2,
  Printer,
  ChevronRight,
  Filter,
  RefreshCw,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { ReleaseRequest } from '../types/index.ts';
import { OfficialNOCModal } from '../components/OfficialNOCModal.tsx';
import { BackButton } from '../components/BackButton.tsx';
import { useNavigate } from 'react-router-dom';

interface ClearanceMatrixPageProps {
  onSelectRelease?: (id: string) => void;
}

export const ClearanceMatrixPage: React.FC<ClearanceMatrixPageProps> = ({ onSelectRelease }) => {
  const navigate = useNavigate();
  const { user, canGrantClearance } = useAuth();
  const { simulatedDate, refreshTrigger } = useSystemDate();

  const [releases, setReleases] = useState<ReleaseRequest[]>([]);
  const [filterTier, setFilterTier] = useState<'ALL' | 'PENDING_MY_ROLE' | 'RO_PENDING' | 'PGRC_PENDING' | 'VIG_PENDING' | 'APPROVED'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [viewNocRelease, setViewNocRelease] = useState<ReleaseRequest | null>(null);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/releases');
      if (res.ok) {
        const data = await res.json();
        setReleases(data.releases || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, [refreshTrigger, simulatedDate]);

  const filtered = releases.filter(r => {
    if (filterTier === 'APPROVED') return r.status === 'APPROVED';
    if (filterTier === 'RO_PENDING') return r.clearances.regionalOfficer.status === 'PENDING';
    if (filterTier === 'PGRC_PENDING') return r.clearances.pgrc.status === 'PENDING';
    if (filterTier === 'VIG_PENDING') return r.clearances.vigilance.status === 'PENDING';
    if (filterTier === 'PENDING_MY_ROLE') {
      if (user?.role === 'REGIONAL_OFFICER') return r.clearances.regionalOfficer.status === 'PENDING';
      if (user?.role === 'PGRC_OFFICER') return r.clearances.pgrc.status === 'PENDING';
      if (user?.role === 'VIGILANCE_OFFICER') return r.clearances.vigilance.status === 'PENDING';
      if (user?.role === 'ADMINISTRATOR') return r.status === 'CLEARANCE_PENDING' || r.status === 'SUBMITTED';
    }
    return true;
  });

  const handleRowClick = (id: string) => {
    if (onSelectRelease) {
      onSelectRelease(id);
    } else {
      navigate(`/release?selectId=${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <BackButton fallbackPath="/dashboard" />
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900">3-Tier Statutory Clearance Matrix</h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 font-mono">
            Official Multi-Role Desk
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            DEMO DATA — NOT REAL
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Review queue for Regional Officers, PGRC student grievance committee, and Chief Vigilance Bureau.
        </p>
        <p className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200/60 rounded px-2.5 py-1 mt-1.5 inline-block">
          <strong>Evaluation Notice:</strong> All clearance requests and regulatory decisions shown are simulation records for portal evaluation.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs font-semibold bg-white p-2.5 rounded-xl border border-slate-200 overflow-x-auto">
        <button
          onClick={() => setFilterTier('ALL')}
          className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
            filterTier === 'ALL' ? 'bg-blue-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          All Requests ({releases.length})
        </button>

        {user?.role !== 'INSTITUTION' && (
          <button
            onClick={() => setFilterTier('PENDING_MY_ROLE')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              filterTier === 'PENDING_MY_ROLE' ? 'bg-amber-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Action Required by My Role ({user?.role})</span>
          </button>
        )}

        <button
          onClick={() => setFilterTier('RO_PENDING')}
          className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
            filterTier === 'RO_PENDING' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          RO Scrutiny Pending
        </button>

        <button
          onClick={() => setFilterTier('PGRC_PENDING')}
          className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
            filterTier === 'PGRC_PENDING' ? 'bg-purple-700 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          PGRC Clearance Pending
        </button>

        <button
          onClick={() => setFilterTier('VIG_PENDING')}
          className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
            filterTier === 'VIG_PENDING' ? 'bg-rose-700 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          Vigilance Pending
        </button>

        <button
          onClick={() => setFilterTier('APPROVED')}
          className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
            filterTier === 'APPROVED' ? 'bg-emerald-700 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          NOC Sanctioned ({releases.filter(r => r.status === 'APPROVED').length})
        </button>
      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
            <span>Loading clearance matrix...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-1">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-slate-700">Clearance desk is clear!</p>
            <p className="text-slate-400">No applications matching this filter category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Institution & Code</th>
                  <th className="px-4 py-3">Linked FDR</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3 text-center">Tier 1: Regional Officer</th>
                  <th className="px-4 py-3 text-center">Tier 2: PGRC Bureau</th>
                  <th className="px-4 py-3 text-center">Tier 3: Vigilance Bureau</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(rel => (
                  <tr
                    key={rel.id}
                    onClick={() => handleRowClick(rel.id)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-purple-950 whitespace-nowrap">
                      {rel.id}
                      <span className="block text-[10px] text-slate-400 font-normal">{rel.submittedDate}</span>
                    </td>

                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-bold text-slate-900 truncate">{rel.institutionName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">{rel.institutionCode}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/institution/${rel.institutionId}/vault`);
                          }}
                          className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-0.5"
                        >
                          <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                          <span>Vault</span>
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold text-blue-900">
                      {rel.fdrNumber}
                      <span className="block text-[10px] text-slate-500 font-normal font-sans">
                        Reason: {rel.reason}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      ₹{(rel.principalAmount / 100000).toFixed(1)} Lakhs
                    </td>

                    {/* Tier 1 RO */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rel.clearances.regionalOfficer.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rel.clearances.regionalOfficer.status === 'OBSERVATION'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {rel.clearances.regionalOfficer.status}
                      </span>
                    </td>

                    {/* Tier 2 PGRC */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rel.clearances.pgrc.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rel.clearances.pgrc.status === 'OBSERVATION'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {rel.clearances.pgrc.status}
                      </span>
                    </td>

                    {/* Tier 3 Vigilance */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rel.clearances.vigilance.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rel.clearances.vigilance.status === 'OBSERVATION'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {rel.clearances.vigilance.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {rel.status === 'APPROVED' ? (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setViewNocRelease(rel);
                          }}
                          className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded text-xs font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <Award className="w-3.5 h-3.5 text-emerald-700" />
                          <span>View NOC</span>
                        </button>
                      ) : (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleRowClick(rel.id);
                          }}
                          className="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-bold transition cursor-pointer"
                        >
                          Review Matrix →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official NOC Printable Modal */}
      {viewNocRelease && (
        <OfficialNOCModal
          isOpen={true}
          onClose={() => setViewNocRelease(null)}
          release={viewNocRelease}
        />
      )}
    </div>
  );
};
