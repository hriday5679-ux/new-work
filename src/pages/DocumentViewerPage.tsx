import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Building2,
  FileText,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Institution, FDRRecord, HealthCheckIssue } from '../types/index.ts';
import { BackButton } from '../components/BackButton.tsx';

interface DocumentDetails {
  id: string;
  name: string;
  type: string;
  institutionId: string;
  institutionName?: string;
  fdrId?: string;
  fdrNumber?: string;
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
  verified: boolean;
  reviewStatus: string;
  notes?: string;
  fileData?: string;
}

export const DocumentViewerPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [document, setDocument] = useState<DocumentDetails | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [fdr, setFdr] = useState<FDRRecord | null>(null);
  const [healthIssues, setHealthIssues] = useState<HealthCheckIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [allDocs, setAllDocs] = useState<any[]>([]);

  useEffect(() => {
    if (!docId) return;
    setLoading(true);

    fetch(`/api/documents/${docId}`)
      .then(res => res.json())
      .then(data => {
        if (data.document) {
          setDocument(data.document);
          setInstitution(data.institution || null);
          setFdr(data.fdr || null);
          setHealthIssues(data.healthCheckIssues || []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // Also fetch list of all documents to enable Prev/Next navigation
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        setAllDocs(data.documents || []);
      })
      .catch(() => {});
  }, [docId]);

  const currentIndex = allDocs.findIndex(d => d.id === docId);
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex !== -1 && currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Print dialog formatted for PDF saving
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-center text-slate-500">
        <div>
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-900 mb-2" />
          <p className="text-xs font-semibold">Loading Statutory A4 Document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-8 text-center space-y-3">
        <BackButton />
        <h2 className="text-lg font-bold text-slate-900">Document Not Found</h2>
        <p className="text-xs text-slate-500">The requested statutory document could not be located in the vault.</p>
        <Link to="/documents" className="text-xs font-bold text-blue-700 underline">
          Return to Document Vault
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200/90 flex flex-col font-sans -m-4 sm:-m-6 lg:-m-8">
      {/* Top Controls Toolbar (Hidden during print) */}
      <header className="print:hidden bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="hidden sm:block border-l border-slate-700 pl-3">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-md">
              {document.name}
            </h2>
            <p className="text-[10px] text-slate-400">
              {institution ? `${institution.name} (${institution.code})` : document.institutionName}
            </p>
          </div>
        </div>

        {/* Toolbar Center / Right Buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setZoomLevel(z => Math.max(0.65, z - 0.15))}
              className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(z => Math.min(1.6, z + 0.15))}
              className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Prev / Next Document */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              disabled={!prevDoc}
              onClick={() => prevDoc && navigate(`/documents/${prevDoc.id}`)}
              className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous Document"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!nextDoc}
              onClick={() => nextDoc && navigate(`/documents/${nextDoc.id}`)}
              className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Document"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: A4 Document Paper in Center + Details Sidebar on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Document Canvas (A4 Paper Viewport) */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-slate-200">
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="bg-white text-slate-900 shadow-2xl rounded-sm w-[210mm] min-h-[297mm] p-[20mm] relative border border-slate-300 overflow-hidden print:w-full print:p-0 print:border-none print:shadow-none"
          >
            {/* Watermark "SAMPLE – DEMO DATA" diagonally across paper */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10 select-none">
              <span className="text-slate-900/7 text-6xl sm:text-7xl font-black uppercase tracking-widest rotate-[-35deg] border-4 border-slate-900/7 px-16 py-4 rounded-xl">
                SAMPLE – DEMO DATA
              </span>
            </div>

            {/* Document Content Rendered from Template */}
            <div
              className="relative z-20"
              dangerouslySetInnerHTML={{
                __html:
                  document.fileData ||
                  `<div class="p-8 text-center text-slate-500 font-mono text-xs">A4 Content Preview Loading...</div>`,
              }}
            />

            {/* Footer Page Number */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-slate-400 font-mono">
              AICTE FDR360 • Official Security Deposit Document Archive • Page 1 of 1
            </div>
          </div>
        </div>

        {/* Side Panel: Metadata, Linked FDR, Health Check Findings */}
        <aside className="print:hidden w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-300 p-5 overflow-y-auto space-y-5 shrink-0 shadow-lg">
          {/* Document Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                {document.type}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  document.reviewStatus === 'VERIFIED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : document.reviewStatus === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {document.reviewStatus}
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 break-words">{document.name}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              File Size: {document.fileSize} • Uploaded on {document.uploadDate}
            </p>
          </div>

          {/* Verification Issues from Health Check */}
          {healthIssues.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Verification Issues ({healthIssues.length})</span>
              </div>
              <div className="space-y-2">
                {healthIssues.map(iss => (
                  <div key={iss.id} className="p-2.5 bg-white rounded border border-rose-200 space-y-1">
                    <p className="font-bold text-rose-950 text-xs">{iss.title}</p>
                    <p className="text-[11px] text-slate-700">{iss.description}</p>
                    <p className="text-[10px] font-bold text-rose-800">
                      Action: {iss.suggestedAction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Institution Coordinates */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Institution Coordinates</span>
            </div>
            <p className="font-semibold text-slate-900">
              {institution?.name || document.institutionName}
            </p>
            {institution && (
              <div className="text-[11px] text-slate-600 space-y-1 font-mono">
                <p>AICTE Code: <strong>{institution.code}</strong></p>
                <p>Region: {institution.region} Regional Office</p>
                <p>Head: {institution.contactPerson}</p>
              </div>
            )}
            <Link
              to={`/institution/${document.institutionId}/vault`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 mt-1"
            >
              Open Full Institution Vault →
            </Link>
          </div>

          {/* Linked FDR Record */}
          {fdr && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <FileText className="w-4 h-4 text-blue-700" />
                <span>Linked Fixed Deposit (FDR)</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <p>FDR No: <strong className="font-mono text-slate-900">{fdr.fdrNumber}</strong></p>
                <p>Bank: {fdr.bankName} ({fdr.branchName || 'Branch'})</p>
                <p>Principal: <strong className="text-blue-950">₹ {fdr.principalAmount.toLocaleString('en-IN')}</strong></p>
                <p>Maturity Date: <span className="font-mono">{fdr.maturityDate}</span></p>
                <p>Status: <span className="font-bold">{fdr.lifecycleStatus}</span></p>
              </div>
              <Link
                to={`/fdr/${fdr.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 mt-1"
              >
                View Master FDR Ledger →
              </Link>
            </div>
          )}

          {/* Audit & Notes */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-xs space-y-1 text-slate-600">
            <p className="font-bold text-slate-800">Vault Filing Audit</p>
            <p>Uploaded By: {document.uploadedBy || 'Signatory'}</p>
            <p>Vault Timestamp: {document.uploadDate}</p>
            {document.notes && <p className="italic mt-1 text-[11px]">Note: &ldquo;{document.notes}&rdquo;</p>}
          </div>
        </aside>
      </div>
    </div>
  );
};
