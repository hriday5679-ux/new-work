import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Download, Award, Building2 } from 'lucide-react';
import { ReleaseRequest } from '../types/index.ts';

interface OfficialNOCModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: ReleaseRequest;
}

export const OfficialNOCModal: React.FC<OfficialNOCModalProps> = ({ isOpen, onClose, release }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const nocNumber = release.finalApproval?.nocReferenceNumber || `AICTE/FDR-REL/2026/NOC-${release.id.slice(-4)}`;
  const approvedDate = release.finalApproval?.approvedDate || release.submittedDate;
  const approvedBy = release.finalApproval?.approvedBy || 'Director (Approval & Finance), AICTE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-300 overflow-hidden my-8">
        {/* Action Header */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-sm">Official AICTE Security Deposit Release Order & NOC</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document */}
        <div className="p-8 sm:p-12 text-slate-800 space-y-6 print:p-0 relative overflow-hidden">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none rotate-[-30deg]">
            <span className="text-6xl sm:text-7xl font-extrabold text-slate-900 border-8 border-slate-900 p-8 rounded-2xl uppercase">
              DEMO NOC — NOT REAL
            </span>
          </div>

          {/* Demo Alert Banner */}
          <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-lg text-[11px] text-amber-950 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold uppercase text-[9px]">
              DEMO DATA — NOT REAL
            </span>
            <span>
              Simulated sanction order generated for AICTE portal demonstration & evaluation. Not an official government instrument.
            </span>
          </div>

          {/* Government / AICTE Official Letterhead */}
          <div className="text-center border-b-2 border-slate-900 pb-5">
            {/* National Emblem Representation */}
            <div className="w-12 h-12 mx-auto mb-2 rounded-full border-2 border-amber-600 bg-amber-50 flex items-center justify-center font-serif text-amber-900 font-bold text-xs shadow-xs">
              सत्यमेव जयते
            </div>
            <h2 className="text-base font-bold text-slate-950 uppercase tracking-wide">
              अखिल भारतीय तकनीकी शिक्षा परिषद
            </h2>
            <h1 className="text-lg sm:text-xl font-extrabold text-blue-950 uppercase tracking-tight">
              ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              (A Statutory Body of the Government of India, Ministry of Education)
            </p>
            <p className="text-[11px] text-slate-500">
              Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 | Phone: 011-29581000 | Web: www.aicte-india.org
            </p>
          </div>

          {/* Reference & Date Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-mono border-b border-slate-200 pb-3 gap-2">
            <div>
              <span className="text-slate-500">F. No.: </span>
              <span className="font-bold text-blue-900">{nocNumber}</span>
            </div>
            <div>
              <span className="text-slate-500">Date of Sanction: </span>
              <span className="font-bold text-slate-900">{approvedDate}</span>
            </div>
          </div>

          {/* Addressee */}
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-slate-900 uppercase">To,</p>
            <p className="font-semibold text-slate-900">The Branch Manager,</p>
            <p>{release.bankName}</p>
            <p>Subject Branch: Specified Designated Depository Branch</p>
          </div>

          {/* Subject */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <span className="font-bold text-blue-950 uppercase">Sub: </span>
            <span className="font-semibold text-slate-900">
              Revocation of AICTE Joint Lien & Final Release of Fixed Deposit Receipt No.{' '}
              <span className="font-mono text-blue-900">{release.fdrNumber}</span> (Security Deposit) in respect of{' '}
              <span className="font-bold text-slate-950">{release.institutionName}</span> (AICTE Permanent Code:{' '}
              <span className="font-mono">{release.institutionCode}</span>).
            </span>
          </div>

          {/* Body Paragraphs */}
          <div className="text-xs leading-relaxed space-y-3 text-slate-700">
            <p>
              Sir/Madam,
            </p>
            <p>
              I am directed to convey the sanction and clearance of the All India Council for Technical Education (AICTE) for the unconditional release and refund of the Fixed Deposit Receipt detailed below, standing jointly in the name of the <strong>Regional Officer, AICTE</strong> and the <strong>Principal/Director, {release.institutionName}</strong>:
            </p>

            {/* FDR Metadata Table */}
            <table className="w-full border-collapse border border-slate-300 text-xs my-3">
              <tbody>
                <tr className="bg-slate-100">
                  <td className="border border-slate-300 px-3 py-2 font-bold text-slate-800 w-1/3">FDR / Certificate Number</td>
                  <td className="border border-slate-300 px-3 py-2 font-mono font-bold text-blue-950">{release.fdrNumber}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 font-bold text-slate-800">Principal Amount</td>
                  <td className="border border-slate-300 px-3 py-2 font-bold text-slate-900">
                    ₹{release.principalAmount.toLocaleString('en-IN')} (Rupees {toWordsIndian(release.principalAmount)} Only)
                  </td>
                </tr>
                <tr className="bg-slate-100">
                  <td className="border border-slate-300 px-3 py-2 font-bold text-slate-800">Beneficiary Institution</td>
                  <td className="border border-slate-300 px-3 py-2">{release.institutionName}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 font-bold text-slate-800">Grounds for Release</td>
                  <td className="border border-slate-300 px-3 py-2 font-semibold text-emerald-800">{release.reason}</td>
                </tr>
              </tbody>
            </table>

            {/* Clearance Verification Matrix */}
            <div className="border border-emerald-200 bg-emerald-50/60 rounded-lg p-3.5 my-3">
              <h4 className="font-bold text-emerald-950 text-xs mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Multi-Tier Statutory Clearances Verified & Completed:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">1. Regional Officer:</span>
                  <span className="text-emerald-700 font-semibold">✓ Cleared & Recommended</span>
                  <span className="text-[10px] text-slate-500 block truncate">{release.clearances.regionalOfficer.officerName}</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">2. PGRC Bureau:</span>
                  <span className="text-emerald-700 font-semibold">✓ Nil Student Grievances</span>
                  <span className="text-[10px] text-slate-500 block truncate">{release.clearances.pgrc.officerName}</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">3. Vigilance Bureau:</span>
                  <span className="text-emerald-700 font-semibold">✓ Clean Vigilance Record</span>
                  <span className="text-[10px] text-slate-500 block truncate">{release.clearances.vigilance.officerName}</span>
                </div>
              </div>
            </div>

            <p>
              In view of the above statutory compliances and upon surrender of the original FDR, the bank is hereby authorized to release the maturity proceeds along with accrued interest into the official designated institution account without requiring further counter-signature from AICTE.
            </p>
          </div>

          {/* Signatures & QR Code */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
            {/* Digital Verification QR Code */}
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 bg-slate-900 text-white p-1.5 rounded flex flex-col items-center justify-center font-mono text-[8px] text-center shrink-0">
                <div className="w-16 h-16 border border-white/40 p-1 flex items-center justify-center text-center">
                  [AICTE QR VERIFIED]
                </div>
              </div>
              <div className="text-[10px] text-slate-500">
                <p className="font-bold text-slate-700 uppercase">Digitally Authenticated</p>
                <p>Scan to verify authentic NOC on AICTE Portal</p>
                <p className="font-mono text-slate-400">ID: {release.id}</p>
              </div>
            </div>

            {/* Authorized Signatory */}
            <div className="text-right">
              <div className="font-script text-lg text-blue-900 font-serif italic mb-1">
                {approvedBy.split(',')[0]}
              </div>
              <p className="font-bold text-slate-900">{approvedBy}</p>
              <p className="text-slate-600">All India Council for Technical Education</p>
              <p className="text-[10px] text-slate-500">New Delhi - 110070</p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper for converting amount to words (Indian numbering system)
function toWordsIndian(num: number): string {
  const lakh = 100000;
  const crore = 10000000;
  if (num >= crore) {
    const cr = (num / crore).toFixed(2);
    return `${cr} Crores`;
  }
  if (num >= lakh) {
    const lk = (num / lakh).toFixed(2);
    return `${lk} Lakhs`;
  }
  return num.toLocaleString('en-IN');
}
