import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  AlertTriangle,
  FileCheck2,
  Building2,
  ShieldAlert,
  Clock,
  CheckCircle,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { BackButton } from '../components/BackButton.tsx';

interface ReportCard {
  id: string;
  title: string;
  category: string;
  description: string;
  recordType: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { simulatedDate } = useSystemDate();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [instFilter, setInstFilter] = useState<string>('ALL');
  const [institutions, setInstitutions] = useState<{ id: string; name: string; code: string }[]>([]);

  const isPendingInstitution = user?.role === 'INSTITUTION' && user?.accountStatus === 'PENDING';

  React.useEffect(() => {
    fetch('/api/institutions')
      .then(res => res.json())
      .then(data => setInstitutions(data.institutions || []))
      .catch(console.error);
  }, []);

  const reports: ReportCard[] = [
    {
      id: 'master-fdr',
      title: 'Master FDR Security Deposit Register',
      category: 'Statutory Core',
      description: 'Comprehensive register of all active, expiring, matured, and scrutiny FDRs across all 8 AICTE regions with bank IFSC, principal amounts, interest rates, and joint lien operating mandates.',
      recordType: 'Full FDR Portfolio',
      badge: 'All Statuses',
      icon: FileSpreadsheet,
      color: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      id: 'institution-report',
      title: 'Institutions Directory & Deposit Summary',
      category: 'Institutional Master',
      description: 'Directory of 21 real educational institutions (12 GGSIPU-affiliated colleges and 9 private universities) with distinct categories and statutory deposit summaries.',
      recordType: '21 Real Institutions',
      badge: 'Directory',
      icon: Building2,
      color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
    {
      id: 'active-fdrs',
      title: 'Active & Locked-In Deposits Register',
      category: 'Financial Operations',
      description: 'Registry of verified, active fixed deposits currently under statutory 10-year lock-in period with AICTE joint lien endorsement.',
      recordType: 'Active Deposits',
      badge: 'Locked-In',
      icon: ShieldCheck,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      id: 'maturing-fdrs',
      title: 'Maturity Alert & Expiration Radar Report',
      category: 'Risk & Monitoring',
      description: 'Filtered statutory audit report of all FDRs expiring within 7 days (Critical), 30 days (Urgent), or 90 days (Upcoming) relative to the active simulated portal date.',
      recordType: 'Expiring FDRs',
      badge: 'Urgent Radar',
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      id: 'matured-fdrs',
      title: 'Matured FDRs Pending Claim / Re-Investment',
      category: 'Maturity Follow-up',
      description: 'List of all security deposits that have reached or passed their maturity date without formal release claim or renewal by the institution.',
      recordType: 'Matured Deposits',
      badge: 'Requires Action',
      icon: Clock,
      color: 'bg-rose-50 text-rose-800 border-rose-200',
    },
    {
      id: 'releases',
      title: 'Security Deposit Release & NOC Sanctions Log',
      category: 'Sanctions & Disbursement',
      description: 'Audit log of all filed release applications, statutory checklist compliance, Regional Officer / PGRC / Vigilance clearance determinations, and official NOC dispatch references.',
      recordType: 'Release Applications',
      badge: 'NOC Sanctions',
      icon: FileCheck2,
      color: 'bg-purple-50 text-purple-800 border-purple-200',
    },
    {
      id: 'pending-clearances',
      title: 'Multi-Tier Clearances Backlog Report',
      category: 'Officer Pipeline',
      description: 'Cross-departmental pipeline report tracking pending Regional Officer scrutiny, PGRC student grievance checks, and Chief Vigilance Officer integrity inquiries.',
      recordType: 'Clearance Pipeline',
      badge: 'RO / PGRC / CVO',
      icon: ShieldAlert,
      color: 'bg-teal-50 text-teal-800 border-teal-200',
    },
  ];

  const handleDownload = (reportId: string) => {
    if (isPendingInstitution) return;
    setDownloading(reportId);
    const query = instFilter !== 'ALL' ? `?institutionId=${instFilter}` : '';
    window.location.href = `/api/reports/csv/${reportId}${query}`;
    setTimeout(() => {
      setDownloading(null);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <BackButton fallbackPath="/dashboard" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Official AICTE Reports & CSV Export Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and download compliant statutory data exports for ministry submission, regulatory audits, and institutional reconciliation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role !== 'INSTITUTION' && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs text-xs">
              <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <select
                aria-label="Filter report export by institution"
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
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
            <span>Audit Date:</span>
            <span className="font-bold text-blue-900">{simulatedDate}</span>
          </div>
        </div>
      </div>

      {isPendingInstitution && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Institutional Access Verification Pending</h4>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              CSV statutory reports are restricted while your institution profile is awaiting administrative approval. Once an AICTE administrator approves your registration, export capabilities will activate automatically.
            </p>
          </div>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reports.map(rep => {
          const Icon = rep.icon;
          const isDownloading = downloading === rep.id;
          return (
            <div
              key={rep.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-400 hover:shadow-sm transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${rep.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">
                    {rep.badge}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-blue-900 font-bold uppercase tracking-wider block">
                    {rep.category}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-0.5">{rep.title}</h3>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    CSV Format • UTF-8 Delimited
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {rep.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleDownload(rep.id)}
                  disabled={isDownloading}
                  className="w-full py-2 px-3 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading ? 'Generating CSV Export...' : 'Download CSV Report'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regulatory Certification Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Statutory Audit Compliance Standards (SIH26265)</span>
        </h4>
        <p className="text-[11px] leading-relaxed text-slate-500">
          All generated reports conform to Ministry of Education and AICTE Approval Process Handbook (APH) guidelines.
          Files are encoded with the active system timestamp (<span className="font-mono font-bold text-slate-700">{simulatedDate}</span>)
          and cryptographically formatted to ensure audit-trail authenticity across regional offices and central directorates.
        </p>
      </div>
    </div>
  );
};
