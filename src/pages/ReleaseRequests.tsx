import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Printer,
  Plus,
  ArrowRight,
  Download,
  Building2,
  Award,
  RefreshCw,
  FileText,
  UserCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.tsx';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { ReleaseRequest, FDRRecord } from '../types/index.ts';
import { OfficialNOCModal } from '../components/OfficialNOCModal.tsx';
import { BackButton } from '../components/BackButton.tsx';

interface ReleaseRequestsProps {
  initialSelectId?: string;
  onSelectFDR?: (fdrId: string) => void;
}

export const ReleaseRequests: React.FC<ReleaseRequestsProps> = ({ initialSelectId: propInitialId, onSelectFDR }) => {
  const { id: routeId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const querySelectId = queryParams.get('selectId') || queryParams.get('fdrId');

  const initialSelectId = propInitialId || routeId || querySelectId || undefined;
  const handleSelectFDR = onSelectFDR || ((fdrId: string) => navigate(`/fdrs/${fdrId}`));

  const { user, canGrantClearance, canApproveRelease } = useAuth();
  const { simulatedDate, refreshTrigger } = useSystemDate();

  const [releases, setReleases] = useState<ReleaseRequest[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [instFilter, setInstFilter] = useState<string>('ALL');
  const [institutions, setInstitutions] = useState<{ id: string; name: string; code: string }[]>([]);

  const isPendingInstitution = user?.role === 'INSTITUTION' && user?.accountStatus === 'PENDING';

  // Clearance action modal state
  const [showClearanceModal, setShowClearanceModal] = useState<'regionalOfficer' | 'pgrc' | 'vigilance' | null>(null);
  const [clearanceStatus, setClearanceStatus] = useState<'APPROVED' | 'REJECTED' | 'OBSERVATION'>('APPROVED');
  const [clearanceRemarks, setClearanceRemarks] = useState('');

  // Disbursement modal state
  const [showDisburseModal, setShowDisburseModal] = useState<boolean>(false);
  const [disburseUtr, setDisburseUtr] = useState<string>('UTR-SBI-2026-992104');
  const [disburseRemarks, setDisburseRemarks] = useState<string>('Joint lien revoked and security deposit refunded to beneficiary account.');

  // NOC certificate modal
  const [viewNocRelease, setViewNocRelease] = useState<ReleaseRequest | null>(null);

  // Submit request modal
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [availableFdrs, setAvailableFdrs] = useState<FDRRecord[]>([]);
  const [selectedFdrId, setSelectedFdrId] = useState<string>('');
  const [releaseReason, setReleaseReason] = useState<'Tenure Completion (10+ Years)' | 'Course Closure' | 'Reduction in Intake' | 'Conversion of Institution'>('Tenure Completion (10+ Years)');
  const [submitError, setSubmitError] = useState<string>('');

  const fetchInstitutions = async () => {
    try {
      const res = await fetch('/api/institutions');
      if (res.ok) {
        const data = await res.json();
        setInstitutions(data.institutions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReleases = async () => {
    try {
      setLoading(true);
      if (isPendingInstitution) {
        setReleases([]);
        setSelectedRelease(null);
        setLoading(false);
        return;
      }
      const url = instFilter !== 'ALL' ? `/api/releases?institutionId=${instFilter}` : '/api/releases';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list = data.releases || [];
        setReleases(list);

        if (initialSelectId) {
          const match = list.find((r: ReleaseRequest) => r.id === initialSelectId);
          if (match) setSelectedRelease(match);
        } else if (list.length > 0 && !selectedRelease) {
          setSelectedRelease(list[0]);
        } else if (list.length > 0 && selectedRelease && !list.find((r: ReleaseRequest) => r.id === selectedRelease.id)) {
          setSelectedRelease(list[0]);
        } else if (list.length === 0) {
          setSelectedRelease(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleFdrs = async () => {
    try {
      const res = await fetch('/api/fdrs');
      if (res.ok) {
        const data = await res.json();
        // Eligible: active, expiring, or matured
        setAvailableFdrs(data.fdrs || []);
        if (data.fdrs && data.fdrs.length > 0) {
          setSelectedFdrId(data.fdrs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [refreshTrigger, simulatedDate, instFilter, isPendingInstitution]);

  const handleUpdateChecklist = async (itemKey: string, currentVal: boolean) => {
    if (!selectedRelease) return;
    try {
      const res = await fetch(`/api/releases/${selectedRelease.id}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey, verified: !currentVal }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedRelease(updated);
        setReleases(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRelease || !showClearanceModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/releases/${selectedRelease.id}/clearance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: showClearanceModal,
          status: clearanceStatus,
          remarks: clearanceRemarks,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedRelease(updated);
        setReleases(prev => prev.map(r => (r.id === updated.id ? updated : r)));
        setShowClearanceModal(null);
        setClearanceRemarks('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalApproval = async () => {
    if (!selectedRelease) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/releases/${selectedRelease.id}/final-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarks: 'All 3 statutory clearances confirmed and verified. Full release order issued.',
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedRelease(updated);
        setReleases(prev => prev.map(r => (r.id === updated.id ? updated : r)));
        // Celebrate with confetti
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch (_) {}
        // Open official NOC modal
        setViewNocRelease(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRelease) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/releases/${selectedRelease.id}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankTransactionId: disburseUtr.trim(),
          remarks: disburseRemarks.trim(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedRelease(updated);
        setReleases(prev => prev.map(r => (r.id === updated.id ? updated : r)));
        setShowDisburseModal(false);
        try {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        } catch (_) {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!selectedFdrId) return;

    try {
      const res = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdrId: selectedFdrId, reason: releaseReason }),
      });

      if (res.ok) {
        const created = await res.json();
        setShowNewModal(false);
        await fetchReleases();
        setSelectedRelease(created);
      } else {
        const data = await res.json();
        setSubmitError(data.error || 'Failed to submit release application.');
      }
    } catch (e: any) {
      setSubmitError(e.message || 'Error submitting request.');
    }
  };

  const isAllClearancesApproved =
    selectedRelease?.clearances.regionalOfficer.status === 'APPROVED' &&
    selectedRelease?.clearances.pgrc.status === 'APPROVED' &&
    selectedRelease?.clearances.vigilance.status === 'APPROVED';

  const isChecklistVerified = selectedRelease &&
    Object.values(selectedRelease.checklist).every((item: any) => item.verified);

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <BackButton fallbackPath="/dashboard" />
      </div>

      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Security Deposit Release & 3-Tier Statutory Clearance Matrix
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 font-mono">
              {releases.length} Requests
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              DEMO DATA — NOT REAL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict multi-tier regulatory approval pipeline: Regional Officer Scrutiny → Central PGRC Clearance → Chief Vigilance Clearance.
          </p>
          <p className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200/60 rounded px-2.5 py-1 mt-1.5 inline-block">
            <strong>Evaluation Disclaimer:</strong> All release requests, claim grounds, and clearance workflows shown below are simulated demo scenarios. Named institutions have not actually submitted deposit release applications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user?.role !== 'INSTITUTION' && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs">
              <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <select
                aria-label="Filter releases by institution"
                value={instFilter}
                onChange={e => setInstFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden pr-2 cursor-pointer max-w-[220px] truncate"
              >
                <option value="ALL">All Institutions ({institutions.length || 21})</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.code} — {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              fetchEligibleFdrs();
              setShowNewModal(true);
            }}
            disabled={isPendingInstitution}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-xs ${
              isPendingInstitution
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-900 hover:bg-blue-800 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Release</span>
          </button>
        </div>
      </div>

      {isPendingInstitution && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Institution Verification Pending Approval</h4>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Your institutional access request is currently pending review by an AICTE Administrator. In accordance with statutory security guidelines, historical fixed deposit release applications and clearance dossiers are inaccessible until your official credentials are authenticated.
            </p>
          </div>
        </div>
      )}

      {/* Main Two-Pane Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Requests List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[700px]">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 flex items-center justify-between">
            <span>Release Applications Registry</span>
            <span className="text-[10px] text-slate-400">Click to view clearance matrix</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {releases.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No security deposit release requests filed yet.
              </div>
            ) : (
              releases.map(rel => {
                const isSelected = selectedRelease?.id === rel.id;
                return (
                  <div
                    key={rel.id}
                    onClick={() => setSelectedRelease(rel)}
                    className={`p-3.5 rounded-lg cursor-pointer transition text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-blue-50/80 border border-blue-300 shadow-xs'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-purple-950">{rel.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rel.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rel.status === 'DEFICIENCY_RAISED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {rel.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 line-clamp-1">{rel.institutionName}</h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>FDR: <strong className="font-mono text-slate-700">{rel.fdrNumber}</strong></span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{(rel.principalAmount / 100000).toFixed(1)} Lakhs
                      </span>
                    </div>

                    {/* Clearance Dots */}
                    <div className="flex items-center gap-1.5 pt-1 text-[10px]">
                      <span className={`px-1.5 py-0.2 rounded font-mono ${
                        rel.clearances.regionalOfficer.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        RO: {rel.clearances.regionalOfficer.status}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded font-mono ${
                        rel.clearances.pgrc.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        PGRC: {rel.clearances.pgrc.status}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded font-mono ${
                        rel.clearances.vigilance.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        Vig: {rel.clearances.vigilance.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: 3-Tier Clearance Matrix & Checklist Detail (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6 overflow-y-auto max-h-[700px]">
          {selectedRelease ? (
            <div className="space-y-6 text-xs">
              {/* Request Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-purple-950">{selectedRelease.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                      {selectedRelease.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-1">{selectedRelease.institutionName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-slate-500 text-[11px]">
                      Filed by {selectedRelease.submittedBy} on {selectedRelease.submittedDate}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/institution/${selectedRelease.institutionId}/vault`)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition"
                    >
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                      <span>Statutory Vault & Checklist</span>
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-blue-950">
                    ₹{(selectedRelease.principalAmount / 100000).toFixed(1)} Lakhs
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Grounds: {selectedRelease.reason}</span>
                </div>
              </div>

              {/* NOC Issued Banner (If approved) */}
              {selectedRelease.status === 'APPROVED' && selectedRelease.finalApproval && (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-emerald-700 shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-950 text-xs">
                        Final Release Order & NOC Issued
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        Ref No.: <strong className="font-mono">{selectedRelease.finalApproval.nocReferenceNumber}</strong> • Approved by {selectedRelease.finalApproval.approvedBy}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewNocRelease(selectedRelease)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Official NOC</span>
                  </button>
                </div>
              )}

              {/* Section 1: Statutory Document Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    1. Mandatory Document Verification Checklist
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isChecklistVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {isChecklistVerified ? 'All 5 Documents Verified' : 'Pending Verification'}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
                  {Object.entries(selectedRelease.checklist).map(([key, item]: [string, any]) => {
                    const titles: Record<string, string> = {
                      noDuesCertificate: 'Institutional No Dues Certificate',
                      aicteApprovalLetter: 'AICTE Original Approval / Course Closure Order',
                      originalFdrSurrenderAffidavit: 'Notarized Surrender Affidavit on ₹100 Stamp Paper',
                      governingBodyResolution: 'Trust / Governing Body Release Resolution',
                      studentGrievanceClearRecord: 'Certified Clean Student/Faculty Redressal Record',
                    };

                    return (
                      <div key={key} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.verified}
                            onChange={() => handleUpdateChecklist(key, item.verified)}
                            disabled={!['REGIONAL_OFFICER', 'ADMINISTRATOR'].includes(user?.role || '')}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block text-xs">
                              {titles[key] || key}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.fileName ? `File: ${item.fileName}` : 'Awaiting document upload'}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {item.verified ? 'Verified' : 'Pending RO Check'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: 3-Tier Multi-Role Clearance Matrix */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  2. Three-Tier Statutory Regulatory Clearances
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {/* Tier 1: Regional Officer Clearance */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs">
                          1
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900">Tier 1: AICTE Regional Officer Scrutiny</h5>
                          <p className="text-[10px] text-slate-500">Physical bank record verification & site check</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedRelease.clearances.regionalOfficer.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedRelease.clearances.regionalOfficer.status === 'OBSERVATION'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {selectedRelease.clearances.regionalOfficer.status}
                        </span>

                        {canGrantClearance('regionalOfficer') && selectedRelease.status !== 'APPROVED' && (
                          <button
                            onClick={() => {
                              setShowClearanceModal('regionalOfficer');
                              setClearanceStatus('APPROVED');
                            }}
                            className="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-[11px] font-bold transition"
                          >
                            Update Clearance
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedRelease.clearances.regionalOfficer.remarks && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                        <strong>RO Remarks:</strong> {selectedRelease.clearances.regionalOfficer.remarks}
                        {selectedRelease.clearances.regionalOfficer.officerName && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Signed by {selectedRelease.clearances.regionalOfficer.officerName} on {selectedRelease.clearances.regionalOfficer.date}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Tier 2: PGRC Clearance */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 font-bold flex items-center justify-center text-xs">
                          2
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900">Tier 2: Public Grievance Redressal (PGRC) Clearance</h5>
                          <p className="text-[10px] text-slate-500">Student & faculty fee disputes/arbitration clearance</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedRelease.clearances.pgrc.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedRelease.clearances.pgrc.status === 'OBSERVATION'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {selectedRelease.clearances.pgrc.status}
                        </span>

                        {canGrantClearance('pgrc') && selectedRelease.status !== 'APPROVED' && (
                          <button
                            onClick={() => {
                              setShowClearanceModal('pgrc');
                              setClearanceStatus('APPROVED');
                            }}
                            className="px-2.5 py-1 bg-purple-900 hover:bg-purple-800 text-white rounded text-[11px] font-bold transition"
                          >
                            Update Clearance
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                      <span>Pending Central Grievance Tickets: <strong>{selectedRelease.clearances.pgrc.pendingGrievanceCount}</strong></span>
                      {selectedRelease.clearances.pgrc.officerName && (
                        <span className="text-[10px] text-slate-400">
                          Reviewed by {selectedRelease.clearances.pgrc.officerName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tier 3: Vigilance Officer Clearance */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-900 font-bold flex items-center justify-center text-xs">
                          3
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900">Tier 3: AICTE Chief Vigilance Officer (CVO) Clearance</h5>
                          <p className="text-[10px] text-slate-500">Anti-corruption & institutional financial propriety audit</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedRelease.clearances.vigilance.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedRelease.clearances.vigilance.status === 'OBSERVATION'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {selectedRelease.clearances.vigilance.status}
                        </span>

                        {canGrantClearance('vigilance') && selectedRelease.status !== 'APPROVED' && (
                          <button
                            onClick={() => {
                              setShowClearanceModal('vigilance');
                              setClearanceStatus('APPROVED');
                            }}
                            className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded text-[11px] font-bold transition"
                          >
                            Update Clearance
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                      <span>Vigilance Inquiry Ledger: <strong className="text-emerald-800">{selectedRelease.clearances.vigilance.inquiryStatus}</strong></span>
                      {selectedRelease.clearances.vigilance.officerName && (
                        <span className="text-[10px] text-slate-400">
                          Audited by {selectedRelease.clearances.vigilance.officerName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Final Administrative Approval & NOC Dispatch */}
              <div className="pt-4 border-t border-slate-200">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      AICTE Competent Authority Final Sanction
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enforces SIH26265 strict gatekeeping: Requires all 3 tiers APPROVED and all 5 checklist items checked.
                    </p>
                  </div>

                  {selectedRelease.status === 'RELEASED' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>FDR Liquidated & Disbursed ({selectedRelease.disbursement?.bankTransactionId || 'UTR Logged'})</span>
                      </div>
                      <button
                        onClick={() => setViewNocRelease(selectedRelease)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View NOC</span>
                      </button>
                    </div>
                  ) : selectedRelease.status === 'APPROVED' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setViewNocRelease(selectedRelease)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Printer className="w-4 h-4" />
                        <span>View Official AICTE NOC</span>
                      </button>
                      {user?.role === 'ADMINISTRATOR' && (
                        <button
                          onClick={() => setShowDisburseModal(true)}
                          className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Record Bank Disbursement (Mark RELEASED)</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      disabled={!isAllClearancesApproved || !isChecklistVerified || !canApproveRelease() || actionLoading}
                      onClick={handleFinalApproval}
                      className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Award className="w-4 h-4 text-amber-300" />
                      <span>Issue Final AICTE NOC & Release Order</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select a release application from the left registry to review clearance matrix.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Update Clearance (RO / PGRC / Vigilance) */}
      {showClearanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Record Statutory Clearance: {showClearanceModal.toUpperCase()}</span>
            </h3>

            <form onSubmit={handleClearanceSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Clearance Determination *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setClearanceStatus('APPROVED')}
                    className={`py-2 px-1 text-center font-bold rounded border ${
                      clearanceStatus === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    APPROVE
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearanceStatus('OBSERVATION')}
                    className={`py-2 px-1 text-center font-bold rounded border ${
                      clearanceStatus === 'OBSERVATION'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    OBSERVATION
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearanceStatus('REJECTED')}
                    className={`py-2 px-1 text-center font-bold rounded border ${
                      clearanceStatus === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    REJECT
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Officer Scrutiny Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={clearanceRemarks}
                  onChange={e => setClearanceRemarks(e.target.value)}
                  placeholder="Record justification, reference numbers, or observation notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearanceModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-bold"
                >
                  Save Clearance Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Release Application Wizard */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-purple-700" />
              <span>Apply for Security Deposit Release</span>
            </h3>

            {submitError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded text-xs">
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Eligible FDR Deposit *</label>
                <select
                  value={selectedFdrId}
                  onChange={e => setSelectedFdrId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {availableFdrs.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.fdrNumber} (₹{(f.principalAmount / 100000).toFixed(1)}L) - {f.institutionName} - {f.lifecycleStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Statutory Grounds for Release *</label>
                <select
                  value={releaseReason}
                  onChange={e => setReleaseReason(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Tenure Completion (10+ Years)">Tenure Completion (10+ Years Mandatory Lock-in)</option>
                  <option value="Course Closure">Course Closure / Progressive Discontinuation</option>
                  <option value="Reduction in Intake">Reduction in Approved Intake</option>
                  <option value="Conversion of Institution">Conversion of Institution / Society</option>
                </select>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-1 text-[11px] text-blue-900">
                <p className="font-bold">Automatic 5-Document Checklist Initiated:</p>
                <p>1. No Dues Certificate • 2. AICTE Approval • 3. Surrender Affidavit • 4. GB Resolution • 5. PGRC Clean Report</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-bold"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Bank Disbursement & Final Liquidation */}
      {showDisburseModal && selectedRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                ₹
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Record Deposit Disbursement & Lien Revocation</h3>
                <p className="text-[11px] text-slate-500">Close release workflow and mark deposit as RELEASED</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Institution:</span>
                <span className="font-bold text-slate-800">{selectedRelease.institutionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">FDR Certificate:</span>
                <span className="font-mono font-bold text-blue-900">{selectedRelease.fdrNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Refund Amount:</span>
                <span className="font-bold text-emerald-700">₹{(selectedRelease.principalAmount / 100000).toFixed(2)} Lakhs</span>
              </div>
            </div>

            <form onSubmit={handleDisburseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Bank Transaction / UTR Reference *</label>
                <input
                  type="text"
                  required
                  value={disburseUtr}
                  onChange={e => setDisburseUtr(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-950"
                  placeholder="e.g. UTR-SBI-2026-992104"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Closing Remarks</label>
                <textarea
                  rows={2}
                  value={disburseRemarks}
                  onChange={e => setDisburseRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                  placeholder="Joint lien revoked and principal transferred to institution"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDisburseModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm Disbursement (Mark RELEASED)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official AICTE NOC Printable Modal */}
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
