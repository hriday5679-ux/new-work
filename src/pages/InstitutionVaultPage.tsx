import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FolderArchive,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Building2,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Send,
  Plus,
  ArrowLeft,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { BackButton } from '../components/BackButton.tsx';
import { Institution, HealthCheckIssue, DocumentType } from '../types/index.ts';

interface ChecklistItem {
  type: DocumentType;
  title: string;
  mandatory: boolean;
  description: string;
  status: 'Uploaded' | 'Verified' | 'Pending' | 'Missing' | 'Mismatch';
  uploadedCount: number;
  documents: any[];
}

export const InstitutionVaultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [healthIssues, setHealthIssues] = useState<HealthCheckIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [notifyingIssueId, setNotifyingIssueId] = useState<string | null>(null);
  const [notifySuccessMsg, setNotifySuccessMsg] = useState<string>('');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<DocumentType>('FDR_RECEIPT');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchVaultData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/institutions/${id}/vault`);
      if (res.ok) {
        const data = await res.json();
        setInstitution(data.institution);
        setChecklist(data.checklist || []);
        setDocuments(data.documents || []);
        setHealthIssues(data.healthCheckIssues || []);
      }
    } catch (e) {
      console.error('Failed to load institution vault:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultData();
  }, [id]);

  const handleRunHealthCheck = async () => {
    if (!id) return;
    setRunningCheck(true);
    try {
      const res = await fetch(`/api/institutions/${id}/health-check`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setHealthIssues(data.issues || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningCheck(false);
    }
  };

  const handleNotifyInstitution = async (issue: HealthCheckIssue) => {
    if (!id) return;
    setNotifyingIssueId(issue.id);
    setNotifySuccessMsg('');
    try {
      const res = await fetch(`/api/institutions/${id}/notify-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId: issue.id,
          title: issue.title,
          description: issue.description,
          suggestedAction: issue.suggestedAction,
          officerName: user?.name || 'Regional Scrutiny Officer',
        }),
      });
      if (res.ok) {
        setNotifySuccessMsg(`Discrepancy notice sent for: "${issue.title}".`);
        setTimeout(() => setNotifySuccessMsg(''), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setNotifyingIssueId(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !uploadNotes) return;
    setUploading(true);

    try {
      const formData = new FormData();
      if (uploadFile) formData.append('file', uploadFile);
      formData.append('institutionId', id || '');
      formData.append('type', uploadType);
      formData.append('notes', uploadNotes);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadNotes('');
        await fetchVaultData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
          </span>
        );
      case 'Uploaded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Uploaded
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Under Scrutiny
          </span>
        );
      case 'Mismatch':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" /> Mismatch / Defect
          </span>
        );
      case 'Missing':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> Missing
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-xs font-medium">Loading Institution Document Vault...</p>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="p-8 text-center space-y-3">
        <BackButton />
        <h2 className="text-lg font-bold text-slate-900">Institution Not Found</h2>
        <p className="text-xs text-slate-500">The requested institution does not exist in the vault directory.</p>
        <Link to="/institutions" className="inline-block text-xs font-bold text-blue-700 underline">
          Return to Institutions Register
        </Link>
      </div>
    );
  }

  const hasNoDocs = documents.length === 0;

  return (
    <div className="space-y-6">
      {/* Back and Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {institution.name}
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                {institution.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{institution.type}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {institution.district ? `${institution.district}, ` : ''}{institution.state} ({institution.region} Region)
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/institution/${institution.id}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Institution Profile
          </Link>
          <button
            onClick={handleRunHealthCheck}
            disabled={runningCheck}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4 text-indigo-200" />
            {runningCheck ? 'Auditing Vault...' : 'Run Document Health Check'}
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-200" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {notifySuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notifySuccessMsg}</span>
        </div>
      )}

      {/* Health Check Findings Card */}
      {healthIssues.length > 0 && (
        <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-rose-900 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <div>
                <h3 className="font-bold text-sm sm:text-base">Document Health Check Audit Report</h3>
                <p className="text-[11px] text-rose-200">
                  Detected {healthIssues.length} compliance discrepancy{healthIssues.length > 1 ? 'ies' : ''} in this institution&apos;s vault.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded bg-rose-500/30 text-rose-200 border border-rose-400/30">
              Scrutiny Required
            </span>
          </div>

          <div className="divide-y divide-slate-100 p-2 sm:p-4 space-y-3">
            {healthIssues.map(issue => (
              <div key={issue.id} className="p-3 rounded-lg border border-rose-100 bg-rose-50/40 text-xs space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          issue.severity === 'HIGH'
                            ? 'bg-red-600 text-white'
                            : issue.severity === 'MEDIUM'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-600 text-white'
                        }`}
                      >
                        {issue.severity} Priority
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{issue.title}</h4>
                    </div>
                    <p className="text-slate-700 text-xs leading-relaxed">{issue.description}</p>
                  </div>

                  <button
                    onClick={() => handleNotifyInstitution(issue)}
                    disabled={notifyingIssueId === issue.id}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-50 text-rose-900 font-bold text-[11px] shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3 h-3 text-rose-600" />
                    {notifyingIssueId === issue.id ? 'Notifying...' : 'Notify Institution'}
                  </button>
                </div>

                {/* Discrepancy details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  {issue.expectedValue && (
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-900">
                      <strong className="font-sans block text-[10px] uppercase text-emerald-700">Expected Value:</strong>
                      {issue.expectedValue}
                    </div>
                  )}
                  {issue.foundValue && (
                    <div className="p-2 bg-rose-50 rounded border border-rose-200 text-rose-900">
                      <strong className="font-sans block text-[10px] uppercase text-rose-700">Found Value:</strong>
                      {issue.foundValue}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 flex items-center gap-1.5">
                  <span className="font-bold text-slate-800">Suggested Action:</span>
                  <span>{issue.suggestedAction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statutory Checklist Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              Required Documents Checklist ({institution.type})
            </h3>
            <p className="text-xs text-slate-500">
              Mandatory documents prescribed under AICTE Approval Process Handbook for {institution.type} institutions.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-200 text-slate-800">
            {checklist.filter(c => c.status === 'Verified').length} / {checklist.length} Verified
          </span>
        </div>

        {hasNoDocs ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <FolderArchive className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="font-bold text-sm text-slate-700">No Documents Uploaded Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              This institution has not submitted any statutory documents to the vault. All prescribed documents are currently recorded as <strong>Missing</strong> in the compliance audit.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-2 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Upload First Document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {checklist.map(item => (
              <div key={item.type} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">{item.title}</h4>
                    {item.mandatory && (
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{item.description}</p>

                  {/* If uploaded documents exist for this checklist type */}
                  {item.documents && item.documents.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {item.documents.map(doc => (
                        <Link
                          key={doc.id}
                          to={`/documents/${doc.id}`}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors"
                        >
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span>{doc.name}</span>
                          <Eye className="w-3 h-3 text-blue-500" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Documents Table in Vault */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              Vault Document Archive ({documents.length})
            </h3>
            <p className="text-xs text-slate-500">
              Click any document to inspect its realistic government letterhead in the full-page viewer.
            </p>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No document files in archive.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3">Document Title</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Linked FDR</th>
                  <th className="p-3">Uploaded By</th>
                  <th className="p-3">Upload Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="hover:text-blue-700 flex items-center gap-1.5 text-blue-950 font-bold"
                      >
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{doc.name}</span>
                      </Link>
                    </td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{doc.type}</td>
                    <td className="p-3 text-slate-700 font-mono font-medium">
                      {doc.fdrNumber ? (
                        <Link to={`/fdr/${doc.fdrId || doc.fdrNumber}`} className="text-blue-700 hover:underline">
                          {doc.fdrNumber}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">{doc.uploadedBy || 'Signatory'}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{doc.uploadDate}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          doc.reviewStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.reviewStatus === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {doc.reviewStatus || 'NEEDS_REVIEW'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View A4
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base">Upload Document to Vault</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Type</label>
                <select
                  value={uploadType}
                  onChange={e => setUploadType(e.target.value as DocumentType)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="FDR_RECEIPT">Bank Fixed Deposit Receipt (FDR)</option>
                  <option value="BANK_LIEN_CONFIRMATION">Bank Lien Confirmation Letter</option>
                  <option value="AFFIDAVIT">Security Deposit Undertaking (Stamp Paper)</option>
                  <option value="LOA_EOA">AICTE Approval / EoA Letter</option>
                  <option value="TRUST_REGISTRATION_CERT">Society / Trust Registration Certificate</option>
                  <option value="BOARD_RESOLUTION">Board / Governing Body Resolution</option>
                  <option value="RELEASE_APPLICATION">Refund / Release Application</option>
                  <option value="NO_DUES_CERT">No Dues Certificate</option>
                  <option value="CANCELLED_CHEQUE_MANDATE">Cancelled Cheque & Bank Mandate</option>
                  <option value="AUDITED_FINANCIAL_SUMMARY">Audited Financial Statement Summary</option>
                  <option value="OTHER">Other Statutory Document</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select File (PDF, DOC, Scan)</label>
                <input
                  type="file"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-900 hover:file:bg-blue-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Officer / Signatory Notes</label>
                <textarea
                  value={uploadNotes}
                  onChange={e => setUploadNotes(e.target.value)}
                  placeholder="Provide reference numbers, endorsing officer remarks, or verification notes..."
                  rows={3}
                  className="w-full p-2 border border-slate-300 rounded-lg resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-1.5 rounded-lg bg-blue-900 text-white font-bold hover:bg-blue-950 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
