import React, { useState, useEffect, useRef } from 'react';
import {
  FolderArchive,
  Upload,
  FileText,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Plus,
  Building2,
  FileCheck2,
  ShieldCheck,
  ExternalLink,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { DocumentAttachment, DocumentType, Institution } from '../types/index.ts';
import { Link } from 'react-router-dom';
import { uploadVaultDocument } from '../services/storageService.ts';
import { saveDocumentMetadata } from '../services/firestoreService.ts';
import { BackButton } from '../components/BackButton.tsx';
import { DemoCasesPanel } from '../components/DemoCasesPanel.tsx';
import {
  canUploadDocuments,
  canVerifyDocuments,
  canViewFinancialDetails,
  isReadOnlyAudit,
} from '../utils/rbac.ts';

interface VaultDoc extends DocumentAttachment {
  institutionId: string;
  institutionName?: string;
  fdrId?: string;
  fdrNumber?: string;
  releaseId?: string;
  version?: number;
  verifiedBy?: string;
  verifiedAt?: string;
}

export const DocumentVault: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const { simulatedDate, refreshTrigger } = useSystemDate();

  const [documents, setDocuments] = useState<VaultDoc[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [instFilter, setInstFilter] = useState<string>('ALL');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>('FDR_RECEIPT');
  const [targetInstId, setTargetInstId] = useState<string>('');
  const [docNotes, setDocNotes] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string>('');

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<VaultDoc | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPendingInstitution = user?.role === 'INSTITUTION' && user?.accountStatus === 'PENDING';

  const fetchDocs = async () => {
    try {
      setLoading(true);
      if (isPendingInstitution) {
        setDocuments([]);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (instFilter !== 'ALL') params.append('institutionId', instFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchDocs();
    fetchInstitutions();
    if (user?.role === 'INSTITUTION' && user.institutionId) {
      setTargetInstId(user.institutionId);
    }
  }, [typeFilter, instFilter, search, refreshTrigger, simulatedDate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check size (20MB)
      if (file.size > 20 * 1024 * 1024) {
        setUploadError('File size exceeds the 20 MB statutory upload limit.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError('');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF or image file from your device.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess('');

    try {
      const activeInstId = targetInstId || user?.institutionId || 'inst-01';
      let cloudUrl = '';

      // Upload directly to real Firebase Storage when not in demo sandbox
      if (!isDemoMode && user) {
        try {
          const uploadResult = await uploadVaultDocument(selectedFile, activeInstId, progress => {
            setUploadProgress(progress);
          });
          cloudUrl = uploadResult.url;
          try {
            await saveDocumentMetadata(
              {
                type: docType,
                name: selectedFile.name,
                url: cloudUrl,
                fileSize: `${(selectedFile.size / 1024).toFixed(1)} KB`,
                uploadDate: simulatedDate,
                uploadedBy: user.name,
                verified: false,
                institutionId: activeInstId,
                notes: docNotes,
              },
              user.id
            );
          } catch (fsErr) {
            console.warn('Firestore document metadata write notice:', fsErr);
          }
        } catch (storageErr: any) {
          console.warn('Direct Firebase Storage notice:', storageErr.message);
          // If storage bucket is pending activation or restricted in environment, we gracefully proceed to the API
        }
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', docType);
      formData.append('institutionId', activeInstId);
      formData.append('notes', docNotes);
      if (cloudUrl) {
        formData.append('cloudUrl', cloudUrl);
      }

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setUploadSuccess(
          cloudUrl
            ? 'Document successfully uploaded to Firebase Storage and registered in AICTE Vault.'
            : 'Document successfully uploaded and registered in AICTE Vault.'
        );
        setSelectedFile(null);
        setDocNotes('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadSuccess('');
          fetchDocs();
        }, 1200);
      } else {
        const err = await res.json();
        setUploadError(err.error || 'Upload failed.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Network error during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to remove "${docName}" from the Document Vault?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDocs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const docTypeLabels: Record<DocumentType, string> = {
    FDR_RECEIPT: 'Original Fixed Deposit Receipt',
    LOA_EOA: 'AICTE Approval / EoA Letter',
    BANK_LIEN_CONFIRMATION: 'Bank Lien Confirmation Letter',
    AFFIDAVIT: 'Security Deposit Undertaking (Stamp Paper)',
    TRUST_REGISTRATION_CERT: 'Society / Trust Registration Certificate',
    BOARD_RESOLUTION: 'Trust / Society Resolution',
    RELEASE_APPLICATION: 'Refund / Release Application',
    NO_DUES_CERT: 'No Dues Certificate',
    CANCELLED_CHEQUE_MANDATE: 'Cancelled Cheque & Bank Mandate',
    AUDITED_FINANCIAL_SUMMARY: 'Audited Financial Statement Summary',
    PAYMENT_PROOF: 'Bank Deposit Counterfoil',
    ENCUMBRANCE_CERT: 'Operating Mandate Certificate',
    REQUEST_LETTER: 'Institutional Request Letter',
    CLEARANCE_DOC: 'Statutory Clearance Order',
    JOINT_AGREEMENT: 'Joint Lien Agreement',
    OTHER: 'General Statutory Document',
  };

  return (
    <div className="space-y-6 pb-12">
      <BackButton label="Back to Dashboard" fallbackTo="/dashboard" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">AICTE Statutory Document Vault</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900">
              {documents.length} Stored Documents
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized encrypted repository for bank certificates, joint operating mandates, non-encumbrance affidavits, and approval letters.
          </p>
        </div>

        {/* Quick-Access Demo Cases Panel */}
        <div className="w-full">
          <DemoCasesPanel />
        </div>

        {canUploadDocuments(user) && (
          <button
            onClick={() => {
              setUploadError('');
              setUploadSuccess('');
              setShowUploadModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document to Vault</span>
          </button>
        )}
      </div>

      {/* Disclaimers & Info */}
      <div className="bg-slate-100 border border-slate-300 p-3 rounded-xl flex items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Secure Document Storage:</strong> Files are stored on persistent storage with cryptographic hashes and role-scoped permissions.
          </span>
        </div>
        <span className="font-mono text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-700">
          Max File Size: 20 MB
        </span>
      </div>

      {isPendingInstitution && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Institution Verification Pending Approval</h4>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Your institutional access request is currently pending review by an AICTE Administrator. In accordance with statutory security guidelines, historical fixed deposit receipts and statutory certificates are restricted until your official credentials are authenticated.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search documents by filename, FDR number, or institution..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent border-0 focus:ring-0 text-xs text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Document Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Categories</option>
            <option value="FDR_RECEIPT">FDR Certificate</option>
            <option value="LOA_EOA">AICTE Approval (LoA / EoA)</option>
            <option value="AFFIDAVIT">Affidavit / Resolution</option>
            <option value="NO_DUES_CERT">No Dues Certificate</option>
            <option value="OTHER">Other Documents</option>
          </select>

          {/* Institution Filter if Officer */}
          {user?.role !== 'INSTITUTION' && (
            <select
              value={instFilter}
              onChange={e => setInstFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-medium max-w-[200px]"
            >
              <option value="ALL">All Institutions</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          )}

          {(search || typeFilter !== 'ALL' || instFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setInstFilter('ALL');
              }}
              className="text-xs text-blue-700 font-bold hover:underline px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Documents Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
            <p className="text-xs">Accessing Document Vault...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FolderArchive className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No Documents Found in Vault</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {user?.role === 'INSTITUTION'
                ? 'Your institution has not uploaded any documents yet. Use the upload button above to add your first FDR certificate or statutory affidavit.'
                : 'No documents match your active search or filter criteria.'}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-3 px-3.5 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Document Title & Filename</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Beneficiary Institution</th>
                  <th className="px-4 py-3">Linked FDR</th>
                  <th className="px-4 py-3">File Size</th>
                  <th className="px-4 py-3">Upload Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Verified By & When</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map(doc => {
                  return (
                    <tr key={doc.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                          <div className="min-w-0">
                            <Link
                              to={`/documents/${doc.id}`}
                              className="font-bold text-blue-950 hover:text-blue-700 truncate block hover:underline"
                            >
                              {doc.name}
                            </Link>
                            <span className="text-[10px] text-slate-400 font-mono">v{doc.version || 1} • {doc.uploadedBy}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {docTypeLabels[doc.type] || doc.type}
                        </span>
                      </td>

                      <td className="px-4 py-3 max-w-[200px]">
                        {doc.institutionId ? (
                          <Link
                            to={`/institution/${doc.institutionId}/vault`}
                            className="font-semibold text-blue-900 hover:text-blue-700 hover:underline truncate block"
                            title="Open Institution Vault & Checklist"
                          >
                            {doc.institutionName || 'View Vault'}
                          </Link>
                        ) : (
                          <p className="font-semibold text-slate-800 truncate">{doc.institutionName || '—'}</p>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-blue-950">
                        {doc.fdrNumber || 'General Document'}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600">
                        {doc.fileSize}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600">
                        {doc.uploadDate}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {doc.reviewStatus === 'VERIFIED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Verified
                          </span>
                        ) : doc.reviewStatus === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Deficient
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600" />
                            Needs Review
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {doc.reviewStatus === 'VERIFIED' ? (
                          <div className="text-[11px]">
                            <span className="font-bold text-slate-800 block">
                              {doc.verifiedBy || 'Regional Officer'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {doc.verifiedAt || doc.uploadDate}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending Scrutiny</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/documents/${doc.id}`}
                            title="Open Full A4 Document Viewer"
                            className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-blue-50 rounded transition inline-flex items-center"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-700" />
                          </Link>

                          {doc.url ? (
                            <a
                              href={doc.url}
                              download={doc.name}
                              target="_blank"
                              rel="noreferrer"
                              title="Download File"
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition inline-flex"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              title="Synthetic preview available"
                              className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {['ADMINISTRATOR', 'REGIONAL_OFFICER', 'INSTITUTION'].includes(user?.role || '') && (
                            <button
                              onClick={() => handleDelete(doc.id, doc.name)}
                              title="Delete from Vault"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">Upload Statutory File to Vault</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-900 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Institution Selector */}
              {user?.role !== 'INSTITUTION' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Institution *</label>
                  <select
                    value={targetInstId}
                    onChange={e => setTargetInstId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-medium"
                  >
                    <option value="">Select Institution...</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Document Category */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Document Classification Category *</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-medium"
                >
                  <option value="FDR_RECEIPT">Fixed Deposit Receipt (Endorsed Bank Scan)</option>
                  <option value="LOA_EOA">AICTE Approval Letter (LoA / EoA)</option>
                  <option value="AFFIDAVIT">Non-Encumbrance Affidavit (Stamp Paper)</option>
                  <option value="BOARD_RESOLUTION">Society / Trust Governing Body Resolution</option>
                  <option value="PAYMENT_PROOF">Bank Deposit Proof / UTR Challan</option>
                  <option value="NO_DUES_CERT">No Dues Certificate</option>
                  <option value="ENCUMBRANCE_CERT">Joint Operating Mandate</option>
                  <option value="OTHER">Other Statutory Annexure</option>
                </select>
              </div>

              {/* Real File Input Area */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Document File (.pdf, .png, .jpg) *</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    selectedFile ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400 bg-slate-50'
                  }`}
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="font-bold text-blue-900 text-xs">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Ready to upload
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Click to choose file from your device</p>
                      <p className="text-[10px] text-slate-400 mt-1">PDF, PNG, JPG supported up to 20 MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description / Mandatory Reference Notes</label>
                <textarea
                  rows={2}
                  value={docNotes}
                  onChange={e => setDocNotes(e.target.value)}
                  placeholder="e.g. Countersigned with branch manager seal; Joint lien in favor of AICTE Northern Region."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Encrypting & Storing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload & Encrypt in Vault</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">{previewDoc.name}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Document Type:</span>
                  <span className="font-bold text-slate-900">{docTypeLabels[previewDoc.type] || previewDoc.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary Institution:</span>
                  <span className="font-bold text-slate-900">{previewDoc.institutionName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Linked FDR:</span>
                  <span className="font-mono font-bold text-blue-900">{previewDoc.fdrNumber || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Size:</span>
                  <span className="font-mono text-slate-700">{previewDoc.fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Upload Date:</span>
                  <span className="font-mono text-slate-700">{previewDoc.uploadDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uploaded By:</span>
                  <span className="font-semibold text-slate-800">{previewDoc.uploadedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verification Review:</span>
                  <span className="font-bold text-emerald-800">{previewDoc.reviewStatus || 'NEEDS_REVIEW'}</span>
                </div>
              </div>

              {previewDoc.notes && (
                <div className="text-[11px] bg-blue-50 border border-blue-200 p-2.5 rounded text-blue-900">
                  <strong className="block text-blue-950 mb-0.5">Officer / Verification Remarks:</strong>
                  {previewDoc.notes}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Close
                </button>
                {previewDoc.url && (
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-blue-900 text-white rounded-lg font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
