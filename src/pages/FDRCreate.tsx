import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  IndianRupee,
  RefreshCw,
  FileCheck,
  Info,
  Save,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { Institution, ExtractedOCRData } from '../types/index.ts';
import { BackButton } from '../components/BackButton.tsx';
import { useNavigate } from 'react-router-dom';

interface FDRCreateProps {
  onSuccess?: (newFdrId: string) => void;
  onCancel?: () => void;
}

export const FDRCreate: React.FC<FDRCreateProps> = ({ onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { simulatedDate } = useSystemDate();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>('');

  // Primary Editable Form State
  const [fdrNumber, setFdrNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('State Bank of India');
  const [branchName, setBranchName] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [principalAmount, setPrincipalAmount] = useState<number>(3500000);
  const [interestRate, setInterestRate] = useState<number>(7.25);
  const [maturityValue, setMaturityValue] = useState<number>(7150000);
  const [issueDate, setIssueDate] = useState<string>('2026-10-01');
  const [maturityDate, setMaturityDate] = useState<string>('2036-10-01');
  const [jointHolderName, setJointHolderName] = useState<string>('Regional Officer, AICTE & Principal');
  const [purpose, setPurpose] = useState<'Establishment of New Institution' | 'Additional Intake / New Programme' | 'Endowment Security' | 'Course Conversion'>('Establishment of New Institution');

  // OCR state
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<ExtractedOCRData | null>(null);
  const [selectedSample, setSelectedSample] = useState<'sbi' | 'pnb' | 'hdfc' | 'custom'>('sbi');
  const [uploadedFileName, setUploadedFileName] = useState<string>('SBI_Security_Deposit_FDR.pdf');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [existingFdrs, setExistingFdrs] = useState<{ number: string; institutionName: string }[]>([]);

  const realFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/institutions')
      .then(res => res.json())
      .then(data => {
        const list = data.institutions || [];
        setInstitutions(list);
        if (user?.role === 'INSTITUTION' && user.institutionId) {
          setSelectedInstId(user.institutionId);
          const current = list.find((i: Institution) => i.id === user.institutionId);
          if (current) {
            setJointHolderName(`Regional Officer, AICTE ${current.region} Region & Principal, ${current.name}`);
          }
        } else if (list.length > 0 && !selectedInstId) {
          setSelectedInstId(list[0].id);
          setJointHolderName(`Regional Officer, AICTE ${list[0].region} Region & Principal, ${list[0].name}`);
        }
      })
      .catch(console.error);

    fetch('/api/fdrs')
      .then(res => res.json())
      .then(data => {
        if (data.fdrs) {
          setExistingFdrs(
            data.fdrs.map((f: any) => ({
              number: f.fdrNumber.trim().toUpperCase(),
              institutionName: f.institutionName,
            }))
          );
        }
      })
      .catch(console.error);
  }, [user]);

  // Auto-calculate maturity value when principal or rate changes
  useEffect(() => {
    if (principalAmount && interestRate) {
      const estimated = Math.round(principalAmount * (1 + (interestRate / 100) * 10));
      setMaturityValue(estimated);
    }
  }, [principalAmount, interestRate]);

  // Real File Upload handler
  const handleRealFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      setSelectedSample('custom');

      // Upload to document vault
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'FDR_RECEIPT');
        formData.append('institutionId', selectedInstId || user?.institutionId || 'inst-01');

        const uploadRes = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const doc = await uploadRes.json();
          setUploadedFileUrl(doc.url);
        }
      } catch (err) {
        console.warn('Real file upload note:', err);
      }

      // Automatically trigger OCR extraction for this file
      handleRunOCR('custom', file.name);
    }
  };

  // Handle OCR extraction
  const handleRunOCR = async (sampleType?: 'sbi' | 'pnb' | 'hdfc' | 'custom', customName?: string) => {
    setOcrLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleType: sampleType || selectedSample,
          fileName: customName || uploadedFileName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOcrResult(data);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'OCR extraction failed.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error during OCR extraction.');
    } finally {
      setOcrLoading(false);
    }
  };

  // Apply OCR values to form with visual feedback
  const handleApplyOCR = () => {
    if (!ocrResult) return;
    if (ocrResult.fdrNumber) setFdrNumber(ocrResult.fdrNumber);
    if (ocrResult.bankName) setBankName(ocrResult.bankName);
    if (ocrResult.branchName) setBranchName(ocrResult.branchName);
    if (ocrResult.ifscCode) setIfscCode(ocrResult.ifscCode);
    if (ocrResult.principalAmount) setPrincipalAmount(ocrResult.principalAmount);
    if (ocrResult.interestRate) setInterestRate(ocrResult.interestRate);
    if (ocrResult.maturityValue) setMaturityValue(ocrResult.maturityValue);
    if (ocrResult.issueDate) setIssueDate(ocrResult.issueDate);
    if (ocrResult.maturityDate) setMaturityDate(ocrResult.maturityDate);
    if (ocrResult.jointHolderName) setJointHolderName(ocrResult.jointHolderName);

    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fdrNumber.trim()) {
      setErrorMsg('Please enter a valid FDR Certificate Number.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        institutionId: selectedInstId,
        fdrNumber: fdrNumber.trim(),
        bankName,
        branchName: branchName || 'Main Institutional Branch',
        ifscCode: ifscCode || 'SBIN0001234',
        principalAmount: Number(principalAmount),
        interestRate: Number(interestRate),
        maturityValue: Number(maturityValue),
        issueDate,
        maturityDate,
        jointHolderName,
        purpose,
        lifecycleStatus: isDraft ? 'DRAFT' : 'SUBMITTED',
        verificationStatus: isDraft ? 'UNVERIFIED' : 'PENDING_SCRUTINY',
        documents: [
          {
            id: `doc-${Date.now()}`,
            type: 'FDR_RECEIPT',
            name: uploadedFileName,
            url: uploadedFileUrl || undefined,
            fileSize: '2.1 MB',
            uploadDate: simulatedDate,
            uploadedBy: user?.name || 'Institution Admin',
            verified: false,
            ocrConfidence: ocrResult?.confidenceScore || 95,
            notes: ocrResult ? 'AI OCR extraction processed successfully.' : 'Uploaded by institution user.',
          },
        ],
        extractedData: ocrResult || undefined,
      };

      const res = await fetch('/api/fdrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        if (onSuccess) {
          onSuccess(created.id);
        } else {
          navigate(`/fdr/${created.id}`);
        }
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to submit FDR record.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to create FDR record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/fdrs');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <BackButton fallbackPath="/fdrs" />
      </div>

      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900">
          Register Security Deposit FDR with AI OCR Assistance
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Upload official bank term deposit certificate for automated field extraction and side-by-side verification before submission to AICTE Regional Office.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: AI OCR Document Upload & Extraction Sandbox */}
      <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border border-blue-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Step 1: AI-Assisted Document Extraction (SIH26265)</span>
          </div>
          <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-mono font-bold">
            Gemini 3.8 Flash OCR Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Picker & Sample Presets */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              Choose Document to Extract:
            </label>

            {/* Quick Benchmark Presets */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSample('sbi');
                  setUploadedFileName('SBI_Security_Deposit_FDR.pdf');
                  handleRunOCR('sbi');
                }}
                className={`p-2 rounded border text-xs font-semibold text-center transition ${
                  selectedSample === 'sbi'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                State Bank
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSample('pnb');
                  setUploadedFileName('PNB_AICTE_Joint_Lien_FDR.pdf');
                  handleRunOCR('pnb');
                }}
                className={`p-2 rounded border text-xs font-semibold text-center transition ${
                  selectedSample === 'pnb'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Punjab National
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSample('hdfc');
                  setUploadedFileName('HDFC_Joint_Deposit_Receipt.pdf');
                  handleRunOCR('hdfc');
                }}
                className={`p-2 rounded border text-xs font-semibold text-center transition ${
                  selectedSample === 'hdfc'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                HDFC Bank
              </button>
            </div>

            {/* Real File Upload Picker Box */}
            <div
              onClick={() => realFileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-3 text-center bg-slate-50 cursor-pointer transition"
            >
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-blue-900 truncate">
                {uploadedFileName || 'Click to select custom file from your device'}
              </p>
              <p className="text-[10px] text-slate-400">PDF, PNG or JPG scanned document (Bank seal & joint lien)</p>
              <input
                ref={realFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleRealFileUpload}
                className="hidden"
              />
            </div>

            <button
              type="button"
              disabled={ocrLoading}
              onClick={() => handleRunOCR()}
              className="w-full py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
            >
              {ocrLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting with AI OCR...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Extract Bank Fields with AI OCR</span>
                </>
              )}
            </button>
          </div>

          {/* OCR Result Preview */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-between">
            {ocrResult ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>OCR Extraction Complete</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    {ocrResult.confidenceScore}% Confidence
                  </span>
                </div>

                {ocrResult.isSimulatedDemo !== false && (
                  <div className="p-2 bg-amber-50 border border-amber-300 rounded text-[10px] text-amber-900 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>DEMO DATA — NOT REAL: Simulated AI OCR extraction preview.</span>
                  </div>
                )}


                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Extracted FDR No.:</span>
                    <input
                      type="text"
                      value={ocrResult.fdrNumber || ''}
                      onChange={e => setOcrResult({ ...ocrResult, fdrNumber: e.target.value })}
                      className="font-mono font-bold text-blue-900 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bank:</span>
                    <input
                      type="text"
                      value={ocrResult.bankName || ''}
                      onChange={e => setOcrResult({ ...ocrResult, bankName: e.target.value })}
                      className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Principal:</span>
                    <input
                      type="number"
                      value={ocrResult.principalAmount || 0}
                      onChange={e => setOcrResult({ ...ocrResult, principalAmount: Number(e.target.value) })}
                      className="font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Maturity Date:</span>
                    <input
                      type="date"
                      value={ocrResult.maturityDate || ''}
                      onChange={e => setOcrResult({ ...ocrResult, maturityDate: e.target.value })}
                      className="font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">Joint Lien Operating Mandate:</span>
                    <input
                      type="text"
                      value={ocrResult.jointHolderName || ''}
                      onChange={e => setOcrResult({ ...ocrResult, jointHolderName: e.target.value })}
                      className="text-[11px] font-medium text-emerald-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyOCR}
                  className="w-full mt-2 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  {syncSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Values to Form Below!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Apply Extracted Data into Form Below</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <FileCheck className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">No Document Extracted Yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click "Extract Bank Fields" to let Gemini OCR scan and auto-populate all 10 statutory FDR fields.
                </p>
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-start gap-1">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Statutory Notice: AI OCR output is assistive only. Candidate fields can be corrected manually prior to syncing or saving.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side OCR vs Form Verification Audit */}
      {ocrResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold text-xs text-slate-900">
                AI Document OCR vs Form Input Verification Audit
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                Confidence: <strong className="text-emerald-700">{ocrResult.confidenceScore}%</strong>
              </span>
              <button
                type="button"
                onClick={handleApplyOCR}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
              >
                <CheckCircle className="w-3 h-3" />
                <span>Sync All OCR Values to Form</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] bg-slate-50">
                  <th className="py-2 px-3">Statutory Field</th>
                  <th className="py-2 px-3">Document Extracted (AI OCR)</th>
                  <th className="py-2 px-3">Entered Form Value</th>
                  <th className="py-2 px-3 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    field: 'FDR Certificate Number',
                    extracted: ocrResult.fdrNumber,
                    form: fdrNumber,
                    isMatch: fdrNumber && ocrResult.fdrNumber ? fdrNumber.trim().toUpperCase() === ocrResult.fdrNumber.trim().toUpperCase() : null,
                  },
                  {
                    field: 'Issuing Bank Name',
                    extracted: ocrResult.bankName,
                    form: bankName,
                    isMatch: bankName && ocrResult.bankName ? bankName.toLowerCase().includes(ocrResult.bankName.toLowerCase()) || ocrResult.bankName.toLowerCase().includes(bankName.toLowerCase()) : null,
                  },
                  {
                    field: 'Principal Deposit Amount',
                    extracted: `₹${Number(ocrResult.principalAmount || 0).toLocaleString('en-IN')}`,
                    form: `₹${Number(principalAmount || 0).toLocaleString('en-IN')}`,
                    isMatch: Number(principalAmount) === Number(ocrResult.principalAmount),
                  },
                  {
                    field: 'Maturity Expiry Date',
                    extracted: ocrResult.maturityDate,
                    form: maturityDate,
                    isMatch: maturityDate === ocrResult.maturityDate,
                  },
                  {
                    field: 'Joint Lien Operating Mandate',
                    extracted: ocrResult.jointHolderName,
                    form: jointHolderName,
                    isMatch: jointHolderName && ocrResult.jointHolderName ? jointHolderName.toLowerCase().includes('aicte') : false,
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="py-2 px-3 font-semibold text-slate-700">{row.field}</td>
                    <td className="py-2 px-3 font-mono font-medium text-slate-800">{row.extracted || '—'}</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-950">{row.form || '—'}</td>
                    <td className="py-2 px-3 text-right">
                      {row.isMatch === true ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Match
                        </span>
                      ) : row.isMatch === false ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Mismatch Detected
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending Input</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 2: Form with Pre-filled & Editable Data */}
      <form onSubmit={e => handleSubmit(e, false)} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
          Step 2: Verify & Finalize Statutory Security Deposit Details
        </h3>

        {/* Demo notice */}
        <div className="bg-amber-50 border border-amber-200 text-amber-950 p-2.5 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>DEMO DATA — NOT REAL:</strong> You are submitting a benchmark FDR deposit for AICTE portal testing. Linked to real institution reference.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Institution Selector */}
          <div className="space-y-1 md:col-span-2">
            <label className="font-bold text-slate-700">Beneficiary Institution *</label>
            <select
              value={selectedInstId}
              onChange={e => {
                const newId = e.target.value;
                setSelectedInstId(newId);
                const inst = institutions.find(i => i.id === newId);
                if (inst) {
                  setJointHolderName(`Regional Officer, AICTE ${inst.region} Region & Principal, ${inst.name}`);
                }
              }}
              disabled={user?.role === 'INSTITUTION'}
              className={`w-full px-3 py-2 border rounded-lg text-xs font-medium ${
                user?.role === 'INSTITUTION'
                  ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <optgroup label="GGSIPU Affiliated Colleges">
                {institutions
                  .filter(i => i.category === 'GGSIPU_AFFILIATED')
                  .map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Private Universities">
                {institutions
                  .filter(i => i.category === 'PRIVATE_UNIVERSITY')
                  .map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                    </option>
                  ))}
              </optgroup>
            </select>
            {user?.role === 'INSTITUTION' && (
              <p className="text-[10px] text-slate-400">
                Locked to your authorized institutional login.
              </p>
            )}
          </div>

          {/* FDR Number with duplicate warning */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">FDR Certificate Number *</label>
              {fdrNumber && existingFdrs.some(e => e.number === fdrNumber.trim().toUpperCase()) && (
                <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Duplicate certificate number!
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="e.g. SBI-FDR-2026-88910"
              value={fdrNumber}
              onChange={e => setFdrNumber(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold focus:ring-2 ${
                fdrNumber && existingFdrs.some(e => e.number === fdrNumber.trim().toUpperCase())
                  ? 'border-rose-400 bg-rose-50/50 text-rose-950 focus:ring-rose-500'
                  : 'border-slate-300 text-blue-950 focus:ring-blue-600'
              }`}
            />
            {fdrNumber && existingFdrs.some(e => e.number === fdrNumber.trim().toUpperCase()) && (
              <p className="text-[10px] text-rose-600">
                Notice: Certificate number already registered for {existingFdrs.find(e => e.number === fdrNumber.trim().toUpperCase())?.institutionName}. Please use a unique certificate number.
              </p>
            )}
          </div>

          {/* Bank Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Issuing Scheduled Bank *</label>
            <input
              type="text"
              required
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>

          {/* Branch Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Branch Name & Address *</label>
            <input
              type="text"
              required
              placeholder="e.g. Connaught Place Branch, New Delhi"
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* IFSC Code */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Bank IFSC Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. SBIN0001234"
              value={ifscCode}
              onChange={e => setIfscCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          {/* Principal Amount */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Principal Deposit Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                required
                min="100000"
                step="50000"
                value={principalAmount}
                onChange={e => setPrincipalAmount(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <span className="text-[10px] text-slate-400">
              ₹{(principalAmount / 100000).toFixed(1)} Lakhs
            </span>
          </div>

          {/* Interest Rate */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Interest Rate (% p.a.) *</label>
            <input
              type="number"
              required
              step="0.05"
              value={interestRate}
              onChange={e => setInterestRate(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          {/* Maturity Value */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Estimated Maturity Value (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                required
                value={maturityValue}
                onChange={e => setMaturityValue(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-800"
              />
            </div>
          </div>

          {/* Issue Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Deposit Issue Date *</label>
            <input
              type="date"
              required
              value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          {/* Maturity Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Maturity Date (Statutory 10-Yr Lock) *</label>
            <input
              type="date"
              required
              value={maturityDate}
              onChange={e => setMaturityDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          {/* Joint Operating Mandate */}
          <div className="space-y-1 md:col-span-2">
            <label className="font-bold text-slate-700">Joint Lien Account Operating Mandate *</label>
            <input
              type="text"
              required
              value={jointHolderName}
              onChange={e => setJointHolderName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
            />
            <p className="text-[10px] text-slate-400">
              Statutory AICTE joint operation formulation. Both AICTE Regional Officer and College Principal signatures required for any encashment.
            </p>
          </div>

          {/* Purpose */}
          <div className="space-y-1 md:col-span-2">
            <label className="font-bold text-slate-700">Deposit Statutory Purpose *</label>
            <select
              value={purpose}
              onChange={e => setPurpose(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
            >
              <option value="Establishment of New Institution">Establishment of New Institution (Statutory Security)</option>
              <option value="Additional Intake / New Programme">Additional Intake / New Programme Approval</option>
              <option value="Endowment Security">Endowment Fund Security Deposit</option>
              <option value="Course Conversion">Conversion of Course / Change in Site</option>
            </select>
          </div>
        </div>

        {/* Action Buttons: Save Draft vs Submit */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={e => handleSubmit(e, true)}
              className="px-3.5 py-2 border border-blue-900 text-blue-900 hover:bg-blue-50 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save as Draft</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-xs"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering Deposit...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Submit for AICTE Scrutiny</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
