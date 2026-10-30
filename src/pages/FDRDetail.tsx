import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  IndianRupee,
  Clock,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  FileText,
  MessageSquare,
  History,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
  Upload,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { FDRRecord, FDRLifecycleStatus } from '../types/index.ts';
import { BackButton } from '../components/BackButton.tsx';
import {
  canViewFinancialDetails,
  canPerformFirstLevelScrutiny,
  canVerifyDocuments,
  canGiveRecommendations,
  canSecondLevelApproval,
  canFinalApproveRelease,
  canProcessRefund,
  isReadOnlyAudit,
} from '../utils/rbac.ts';

interface FDRDetailProps {
  fdrId?: string;
  onBack?: () => void;
  onInitiateRelease?: (fdr: FDRRecord) => void;
}

export const FDRDetail: React.FC<FDRDetailProps> = ({ fdrId: propFdrId, onBack, onInitiateRelease }) => {
  const params = useParams<{ id?: string; fdrId?: string }>();
  const fdrId = propFdrId || params.fdrId || params.id || '';
  const navigate = useNavigate();

  const handleBack = onBack || (() => navigate('/fdrs'));
  const handleInitiateRelease = onInitiateRelease || ((f: FDRRecord) => navigate(`/release?fdrId=${f.id}`));

  const { user, canVerifyFDR, canRaiseDeficiency } = useAuth();
  const { simulatedDate, refreshTrigger } = useSystemDate();

  const [fdr, setFdr] = useState<FDRRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'deficiencies' | 'remarks' | 'audit'>('overview');
  const [loading, setLoading] = useState<boolean>(true);

  const [showDeficiencyModal, setShowDeficiencyModal] = useState<boolean>(false);
  const [defTitle, setDefTitle] = useState('');
  const [defDesc, setDefDesc] = useState('');

  const [showResolveModal, setShowResolveModal] = useState<string | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState('');

  // Edit FDR Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editBankName, setEditBankName] = useState<string>('');
  const [editBranchName, setEditBranchName] = useState<string>('');
  const [editIfscCode, setEditIfscCode] = useState<string>('');
  const [editPrincipal, setEditPrincipal] = useState<number>(0);
  const [editRate, setEditRate] = useState<number>(0);
  const [editMaturityDate, setEditMaturityDate] = useState<string>('');
  const [editJointHolder, setEditJointHolder] = useState<string>('');
  const [editPurpose, setEditPurpose] = useState<string>('');
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>('');
  const [editSuccess, setEditSuccess] = useState<string>('');

  const [remarkText, setRemarkText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const openEditModal = () => {
    if (!fdr) return;
    setEditBankName(fdr.bankName);
    setEditBranchName(fdr.branchName || '');
    setEditIfscCode(fdr.ifscCode || '');
    setEditPrincipal(fdr.principalAmount);
    setEditRate(fdr.interestRate);
    setEditMaturityDate(fdr.maturityDate);
    setEditJointHolder(fdr.jointHolderName);
    setEditPurpose(fdr.purpose);
    setEditError('');
    setEditSuccess('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdr) return;
    setEditSaving(true);
    setEditError('');
    setEditSuccess('');

    try {
      const estimatedMaturity = Math.round(Number(editPrincipal) * (1 + (Number(editRate) / 100) * 10));
      const res = await fetch(`/api/fdrs/${fdr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: editBankName.trim(),
          branchName: editBranchName.trim(),
          ifscCode: editIfscCode.trim(),
          principalAmount: Number(editPrincipal),
          interestRate: Number(editRate),
          maturityValue: estimatedMaturity,
          maturityDate: editMaturityDate,
          jointHolderName: editJointHolder.trim(),
          purpose: editPurpose,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setFdr(updated);
        setEditSuccess('FDR particulars updated and persisted.');
        setTimeout(() => {
          setShowEditModal(false);
          setEditSuccess('');
        }, 1200);
      } else {
        const err = await res.json();
        setEditError(err.error || 'Failed to update FDR.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Network error.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteFdr = async () => {
    if (!fdr) return;
    if (!confirm(`Are you sure you want to delete FDR certificate ${fdr.fdrNumber}? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/fdrs/${fdr.id}`, { method: 'DELETE' });
      if (res.ok) {
        handleBack();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFDR = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/fdrs/${fdrId}`);
      if (res.ok) {
        const data = await res.json();
        setFdr(data);
      }
    } catch (e) {
      console.error('Error fetching FDR:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFDR();
  }, [fdrId, refreshTrigger, simulatedDate]);

  const handleTransition = async (nextStatus: FDRLifecycleStatus, remarks?: string) => {
    if (!fdr) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/fdrs/${fdr.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextStatus, remarks: remarks || `Transitioned by ${user?.role}` }),
      });
      if (res.ok) {
        await fetchFDR();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRaiseDeficiency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdr || !defTitle || !defDesc) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/fdrs/${fdr.id}/deficiencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: defTitle, description: defDesc }),
      });
      if (res.ok) {
        setShowDeficiencyModal(false);
        setDefTitle('');
        setDefDesc('');
        await fetchFDR();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDeficiency = async (defId: string) => {
    if (!fdr) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/fdrs/${fdr.id}/deficiencies/${defId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionRemarks }),
      });
      if (res.ok) {
        setShowResolveModal(null);
        setResolutionRemarks('');
        await fetchFDR();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdr || !remarkText.trim()) return;
    try {
      const res = await fetch(`/api/fdrs/${fdr.id}/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: remarkText, category: 'VERIFICATION' }),
      });
      if (res.ok) {
        setRemarkText('');
        await fetchFDR();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p className="text-xs">Loading FDR 360° record...</p>
      </div>
    );
  }

  if (!fdr) {
    return (
      <div className="p-8 text-center text-slate-500 space-y-3">
        <p className="font-semibold text-sm">FDR record not found.</p>
        <button onClick={handleBack} className="text-xs text-blue-700 underline font-semibold">
          Return to Registry
        </button>
      </div>
    );
  }

  // 6-stage statutory lifecycle requested by SIH26265 specification:
  // Submitted, Under Scrutiny, Verified, Recommended, Approved, Refunded/Forfeited
  const timelineStages = [
    { id: 'SUBMITTED', label: '1. Submitted', statuses: ['SUBMITTED', 'DOCUMENT_CHECK', 'DRAFT'] },
    { id: 'UNDER_SCRUTINY', label: '2. Under Scrutiny', statuses: ['UNDER_SCRUTINY', 'DEFICIENCY', 'RESUBMITTED'] },
    { id: 'VERIFIED', label: '3. Verified', statuses: ['VERIFIED', 'ACTIVE', 'EXPIRING', 'MATURED'] },
    { id: 'RECOMMENDED', label: '4. Recommended', statuses: ['RECOMMENDED', 'CLEARANCE_PENDING'] },
    { id: 'APPROVED', label: '5. Approved', statuses: ['APPROVED', 'NOC_ISSUED'] },
    { id: 'REFUNDED_FORFEITED', label: '6. Refunded/Forfeited', statuses: ['RELEASED', 'REFUNDED', 'FORFEITED'] },
  ];

  const getActiveStageIndex = (status: string) => {
    if (['RELEASED', 'REFUNDED', 'FORFEITED'].includes(status)) return 5;
    if (['APPROVED', 'NOC_ISSUED'].includes(status)) return 4;
    if (['RECOMMENDED', 'CLEARANCE_PENDING'].includes(status)) return 3;
    if (['VERIFIED', 'ACTIVE', 'EXPIRING', 'MATURED'].includes(status)) return 2;
    if (['UNDER_SCRUTINY', 'DEFICIENCY', 'RESUBMITTED'].includes(status)) return 1;
    return 0; // SUBMITTED
  };

  const currentTimelineIndex = getActiveStageIndex(fdr.lifecycleStatus);
  const canSeeFinance = canViewFinancialDetails(user);
  const readOnly = isReadOnlyAudit(user);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back Navigation */}
      <BackButton label="Back to FDR Registry" fallbackTo="/fdrs" />

      {/* Header Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-950 font-bold">
                {fdr.fdrNumber}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                fdr.lifecycleStatus === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : fdr.lifecycleStatus === 'EXPIRING'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                  : fdr.lifecycleStatus === 'MATURED'
                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                  : fdr.lifecycleStatus === 'DEFICIENCY'
                  ? 'bg-red-100 text-red-900 border border-red-300'
                  : 'bg-blue-100 text-blue-900'
              }`}>
                {fdr.lifecycleStatus}
              </span>
              {fdr.category === 'GGSIPU_AFFILIATED' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  GGSIPU-Affiliated College
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  State Private University
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{fdr.institutionName}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              AICTE Permanent Code: <span className="font-mono font-medium">{fdr.institutionCode}</span> • Issuing Bank: <strong>{fdr.bankName}</strong>
            </p>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Action: Initiate Release Request if mature or 10 years completed */}
              {['ACTIVE', 'EXPIRING', 'MATURED'].includes(fdr.lifecycleStatus) && (
                <button
                  onClick={() => handleInitiateRelease(fdr)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Submit Release Request</span>
                </button>
              )}

              {/* Section Officer First-Level Scrutiny */}
              {canPerformFirstLevelScrutiny(user) && fdr.lifecycleStatus === 'SUBMITTED' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleTransition('UNDER_SCRUTINY', 'Under scrutiny by Section Officer.')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Begin Scrutiny</span>
                </button>
              )}

              {/* Regional Officer Verification */}
              {canVerifyDocuments(user) && fdr.verificationStatus !== 'VERIFIED' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleTransition('VERIFIED', 'Verified against original bank deposit certificate.')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Verification</span>
                </button>
              )}

              {/* Regional Officer Recommendation */}
              {canGiveRecommendations(user) && ['VERIFIED', 'ACTIVE'].includes(fdr.lifecycleStatus) && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleTransition('RECOMMENDED', 'Recommended for release clearance by Regional Officer.')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Give RO Recommendation</span>
                </button>
              )}

              {/* Chairman / Member Secretary Apex Release / Forfeit */}
              {canFinalApproveRelease(user) && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleTransition('APPROVED', 'Apex statutory release approval granted by Chairman / Member Secretary.')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Final Approval (Chairman)</span>
                </button>
              )}

              {/* Accounts / Finance Officer Process Refund */}
              {canProcessRefund(user) && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleTransition('RELEASED', 'Refund / disbursement processed by Accounts & Finance Bureau.')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <IndianRupee className="w-4 h-4" />
                  <span>Process Refund</span>
                </button>
              )}

              {canRaiseDeficiency() && fdr.lifecycleStatus !== 'DEFICIENCY' && (
                <button
                  onClick={() => setShowDeficiencyModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Raise Deficiency</span>
                </button>
              )}

              {canSeeFinance && (
                <button
                  onClick={openEditModal}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
                >
                  <span>Edit Details</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Financial Highlights (Hidden from Portal Admin) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Principal Amount</span>
            {canSeeFinance ? (
              <span className="font-bold text-slate-900 font-mono text-sm">
                ₹{fdr.principalAmount.toLocaleString('en-IN')}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-mono italic">
                [Protected - Portal Admin Restricted]
              </span>
            )}
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Maturity Value</span>
            {canSeeFinance ? (
              <span className="font-bold text-emerald-800 font-mono text-sm">
                ₹{fdr.maturityValue.toLocaleString('en-IN')}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-mono italic">
                [Protected - Portal Admin Restricted]
              </span>
            )}
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Maturity Date</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{fdr.maturityDate}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Countdown on {simulatedDate}</span>
            <span className={`font-bold font-mono text-sm ${
              fdr.daysToMaturity !== undefined && fdr.daysToMaturity <= 0
                ? 'text-purple-700'
                : fdr.daysToMaturity !== undefined && fdr.daysToMaturity <= 30
                ? 'text-rose-600 animate-pulse'
                : 'text-slate-900'
            }`}>
              {fdr.daysToMaturity !== undefined
                ? fdr.daysToMaturity <= 0
                  ? 'MATURED (0 Days)'
                  : `${fdr.daysToMaturity} Days Left`
                : '...'}
            </span>
          </div>
        </div>

        {/* 6-Stage Statutory Status Timeline: Submitted, Under Scrutiny, Verified, Recommended, Approved, Refunded/Forfeited */}
        <div className="pt-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Status Timeline (Statutory 6-Stage Process)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs font-semibold">
            {timelineStages.map((stage, idx) => {
              const isPast = currentTimelineIndex > idx;
              const isCurrent = currentTimelineIndex === idx;
              return (
                <div
                  key={stage.id}
                  className={`p-2.5 rounded-xl border transition flex flex-col justify-center items-center gap-1 ${
                    isCurrent
                      ? 'bg-blue-900 text-white font-bold border-blue-900 shadow-md ring-2 ring-blue-500/30'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <span className="block truncate text-xs">{stage.label}</span>
                  {isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-blue-950 font-extrabold uppercase">
                      Current
                    </span>
                  )}
                  {isPast && (
                    <span className="text-[9px] text-emerald-700 font-bold">
                      ✓ Completed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-blue-900 text-blue-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview & Bank Coordinates
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'documents'
              ? 'border-blue-900 text-blue-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Document Vault</span>
          <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded-full font-mono">
            {fdr.documents?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('deficiencies')}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'deficiencies'
              ? 'border-blue-900 text-blue-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Deficiency Notes</span>
          {fdr.deficiencyNotes?.length > 0 && (
            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full font-mono font-bold">
              {fdr.deficiencyNotes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('remarks')}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'remarks'
              ? 'border-blue-900 text-blue-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Officer Scrutiny Remarks</span>
          <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded-full font-mono">
            {fdr.officerRemarks?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab 1: Overview & Financials */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1.5">
                Depository Banking Coordinates
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Scheduled Bank:</span>
                  <span className="font-semibold text-slate-900">{fdr.bankName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Branch Name:</span>
                  <span className="font-semibold text-slate-900">{fdr.branchName || 'Main Branch'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">IFSC Code:</span>
                  <span className="font-mono font-bold text-blue-900">{fdr.ifscCode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Deposit Purpose:</span>
                  <span className="font-semibold text-slate-800">{fdr.purpose}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1.5">
                Statutory Joint Operating Lien
              </h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-950 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>Mandatory AICTE Joint Mandate:</span>
                </div>
                <p className="font-semibold text-slate-900">{fdr.jointHolderName}</p>
                <p className="text-[10px] text-blue-800">
                  This deposit cannot be liquidated, transferred, or converted without an authentic written Release Order & NOC signed by the designated AICTE Competent Authority.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Document Vault */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Attached Statutory Certificates & Scans
            </h4>
          </div>

          <div className="divide-y divide-slate-100">
            {(!fdr.documents || fdr.documents.length === 0) ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No documents uploaded yet.
              </div>
            ) : (
              fdr.documents.map(doc => (
                <div key={doc.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-800">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <Link
                        to={`/documents/${doc.id}`}
                        className="font-bold text-slate-900 hover:text-blue-700 hover:underline block"
                      >
                        {doc.name}
                      </Link>
                      <p className="text-[11px] text-slate-400">
                        Uploaded by {doc.uploadedBy} on {doc.uploadDate} • {doc.fileSize}
                      </p>
                      {doc.notes && <p className="text-[11px] text-slate-600 mt-0.5">{doc.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.ocrConfidence && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        OCR {doc.ocrConfidence}%
                      </span>
                    )}
                    <Link
                      to={`/documents/${doc.id}`}
                      className="px-2.5 py-1 rounded text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition-colors"
                    >
                      View A4
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Deficiency Notes */}
      {activeTab === 'deficiencies' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Statutory Deficiency Tracker
            </h4>
            {canRaiseDeficiency() && (
              <button
                onClick={() => setShowDeficiencyModal(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Raise Deficiency</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(!fdr.deficiencyNotes || fdr.deficiencyNotes.length === 0) ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
                <span>Zero statutory deficiencies recorded on this FDR.</span>
              </div>
            ) : (
              fdr.deficiencyNotes.map(def => (
                <div
                  key={def.id}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    def.status === 'OPEN'
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        def.status === 'OPEN'
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-emerald-200 text-emerald-900'
                      }`}>
                        {def.status}
                      </span>
                      <h5 className="font-bold text-slate-900">{def.title}</h5>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Raised on {def.raisedDate} by {def.raisedBy} ({def.raisedByRole})
                    </span>
                  </div>

                  <p className="text-slate-700 text-xs leading-relaxed">{def.description}</p>

                  {def.status === 'RESOLVED' ? (
                    <div className="bg-white p-2.5 rounded border border-emerald-200 text-emerald-900 text-[11px]">
                      <strong>Resolution Remarks:</strong> {def.resolutionRemarks} (Resolved on {def.resolvedDate} by {def.resolvedBy})
                    </div>
                  ) : (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setShowResolveModal(def.id)}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold transition"
                      >
                        Resolve & Resubmit Compliance
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Officer Scrutiny Remarks */}
      {activeTab === 'remarks' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Scrutiny & Supervisory Notes
          </h4>

          <div className="divide-y divide-slate-100">
            {(!fdr.officerRemarks || fdr.officerRemarks.length === 0) ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No officer remarks recorded yet.
              </div>
            ) : (
              fdr.officerRemarks.map(rem => (
                <div key={rem.id} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950">{rem.author} ({rem.role})</span>
                    <span className="text-[10px] text-slate-400">{rem.date}</span>
                  </div>
                  <p className="text-slate-700">{rem.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Add Remark Form */}
          <form onSubmit={handleAddRemark} className="pt-4 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Record officer scrutiny observation..."
              value={remarkText}
              onChange={e => setRemarkText(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post Remark</span>
            </button>
          </form>
        </div>
      )}

      {/* Modal: Raise Deficiency */}
      {showDeficiencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Raise Statutory Deficiency Note</span>
            </h3>
            <p className="text-xs text-slate-500">
              This will transition the FDR status to <strong>DEFICIENCY</strong> and alert the institution to submit an amended lien/document.
            </p>

            <form onSubmit={handleRaiseDeficiency} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Deficiency Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AICTE Joint Operating Clause Missing"
                  value={defTitle}
                  onChange={e => setDefTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Detailed Observation & Remedial Action</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specify what document or lien amendment the college must procure from the bank..."
                  value={defDesc}
                  onChange={e => setDefDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeficiencyModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold"
                >
                  Confirm & Raise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve Deficiency */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Resolve Deficiency & Submit Compliance</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Resolution Compliance Remarks</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the corrected document or amended bank letter uploaded..."
                  value={resolutionRemarks}
                  onChange={e => setResolutionRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveDeficiency(showResolveModal)}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold"
                >
                  Mark Resolved & Resubmit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Deposit Particulars */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Edit Fixed Deposit Record:</span>
                <span className="font-mono text-blue-900">{fdr.fdrNumber}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Issuing Scheduled Bank *</label>
                  <input
                    type="text"
                    required
                    value={editBankName}
                    onChange={e => setEditBankName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={editBranchName}
                    onChange={e => setEditBranchName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Bank IFSC Code *</label>
                  <input
                    type="text"
                    required
                    value={editIfscCode}
                    onChange={e => setEditIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Principal Deposit (₹) *</label>
                  <input
                    type="number"
                    required
                    min="100000"
                    step="50000"
                    value={editPrincipal}
                    onChange={e => setEditPrincipal(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Interest Rate (% p.a.) *</label>
                  <input
                    type="number"
                    required
                    step="0.05"
                    value={editRate}
                    onChange={e => setEditRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-700">Maturity Date (Statutory 10-Yr Lock) *</label>
                  <input
                    type="date"
                    required
                    value={editMaturityDate}
                    onChange={e => setEditMaturityDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-700">Joint Account Operating Mandate *</label>
                  <input
                    type="text"
                    required
                    value={editJointHolder}
                    onChange={e => setEditJointHolder(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                >
                  {editSaving ? 'Saving...' : 'Save & Persist Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
