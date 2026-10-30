import React, { useState } from 'react';
import {
  Building2,
  UserCheck,
  Upload,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText,
  Lock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

import { BackButton } from '../components/BackButton.tsx';
import { useNavigate } from 'react-router-dom';

interface RegisterInstitutionProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const RegisterInstitution: React.FC<RegisterInstitutionProps> = ({ onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const { switchPersona } = useAuth();

  const [step, setStep] = useState<number>(1);

  // Institution fields
  const [institutionName, setInstitutionName] = useState<string>('');
  const [category, setCategory] = useState<'GGSIPU_AFFILIATED' | 'PRIVATE_UNIVERSITY'>('GGSIPU_AFFILIATED');
  const [permanentCode, setPermanentCode] = useState<string>(`1-${Math.floor(1000000000 + Math.random() * 9000000000)}`);
  const [state, setState] = useState<string>('Delhi');
  const [district, setDistrict] = useState<string>('New Delhi');
  const [region, setRegion] = useState<'Northern' | 'North-West' | 'Western' | 'Central' | 'Eastern' | 'Southern' | 'South-West'>('Northern');
  const [type, setType] = useState<'Engineering & Tech' | 'Management' | 'Pharmacy' | 'Architecture' | 'Polytechnic'>('Engineering & Tech');
  const [address, setAddress] = useState<string>('');
  const [establishmentYear, setEstablishmentYear] = useState<number>(2020);

  // Signatory fields
  const [signatoryName, setSignatoryName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [designation, setDesignation] = useState<string>('Principal / Authorized Signatory');
  const [password, setPassword] = useState<string>('SecureAdmin@2026');

  // Document upload field
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');

  // Status
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    }
  };

  const handleRegister = async (isDraft = false) => {
    setErrorMsg('');
    if (!institutionName.trim()) {
      setErrorMsg('Official Institution Name is mandatory.');
      setStep(1);
      return;
    }
    if (!signatoryName.trim() || !email.trim()) {
      setErrorMsg('Authorized Signatory Name and Official Email are required.');
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        institutionName: institutionName.trim(),
        permanentCode: permanentCode.trim(),
        category,
        state,
        district,
        region,
        type,
        address,
        establishmentYear: Number(establishmentYear),
        authorizedSignatoryName: signatoryName.trim(),
        designation,
        email: email.trim(),
        phone: phone.trim(),
        isDraft,
        initialDocuments: uploadedFileName
          ? [
              {
                id: `doc-reg-${Date.now()}`,
                name: uploadedFileName,
                type: 'LOA_EOA',
                fileSize: fileSize || '1.8 MB',
                uploadDate: new Date().toISOString().split('T')[0],
                uploadedBy: signatoryName,
                verified: false,
                reviewStatus: 'NEEDS_REVIEW',
              },
            ]
          : [],
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(
          isDraft
            ? `Registration Draft saved for ${data.institution.name}. Permanent code: ${data.institution.code}.`
            : `Registration submitted successfully for ${data.institution.name}! AICTE Onboarding initiated.`
        );
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            navigate('/institutions');
          }
        }, 1500);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/institutions');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="mb-2">
        <BackButton fallbackPath="/institutions" />
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Institution Onboarding & Registration</h1>
            <p className="text-xs text-slate-500">
              Register an affiliated college or private university with the AICTE Security Deposit & FDR Management Portal.
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`p-2 rounded-lg text-left transition border ${
              step === 1 ? 'border-blue-900 bg-blue-50/70 font-bold text-blue-950' : 'border-slate-200 text-slate-500'
            }`}
          >
            <span className="block text-[10px] text-slate-400">Step 1</span>
            <span>Institution Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`p-2 rounded-lg text-left transition border ${
              step === 2 ? 'border-blue-900 bg-blue-50/70 font-bold text-blue-950' : 'border-slate-200 text-slate-500'
            }`}
          >
            <span className="block text-[10px] text-slate-400">Step 2</span>
            <span>Authorized Signatory</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`p-2 rounded-lg text-left transition border ${
              step === 3 ? 'border-blue-900 bg-blue-50/70 font-bold text-blue-950' : 'border-slate-200 text-slate-500'
            }`}
          >
            <span className="block text-[10px] text-slate-400">Step 3</span>
            <span>Statutory Verification</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Step 1: Institution Coordinates */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            1. Official Educational Institution Particulars
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-700">Official Institution Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Guru Gobind Singh College of Engineering & Research"
                value={institutionName}
                onChange={e => setInstitutionName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Institutional Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-medium"
              >
                <option value="GGSIPU_AFFILIATED">GGSIPU-Affiliated College</option>
                <option value="PRIVATE_UNIVERSITY">State Private University</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">AICTE Permanent Application / Institution Code *</label>
              <input
                type="text"
                required
                value={permanentCode}
                onChange={e => setPermanentCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">AICTE Administrative Region *</label>
              <select
                value={region}
                onChange={e => setRegion(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
              >
                <option value="Northern">Northern Regional Office (Kanpur/Delhi)</option>
                <option value="North-West">North-West Regional Office (Chandigarh)</option>
                <option value="Western">Western Regional Office (Mumbai)</option>
                <option value="Central">Central Regional Office (Bhopal)</option>
                <option value="Eastern">Eastern Regional Office (Kolkata)</option>
                <option value="Southern">Southern Regional Office (Chennai)</option>
                <option value="South-West">South-West Regional Office (Bangalore)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Primary Programme Discipline *</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
              >
                <option value="Engineering & Tech">Engineering & Technology</option>
                <option value="Management">Management (MBA/PGDM)</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Architecture">Architecture & Planning</option>
                <option value="Polytechnic">Polytechnic / Diploma</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">State / Union Territory *</label>
              <input
                type="text"
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">District *</label>
              <input
                type="text"
                value={district}
                onChange={e => setDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Year of Establishment *</label>
              <input
                type="number"
                value={establishmentYear}
                onChange={e => setEstablishmentYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-700">Registered Campus Address *</label>
              <textarea
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Full official postal campus address..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (!institutionName.trim()) {
                  setErrorMsg('Please specify the Institution Name before proceeding.');
                  return;
                }
                setErrorMsg('');
                setStep(2);
              }}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <span>Continue to Signatory Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Authorized Signatory */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            2. Institutional Signatory & Portal Credentials
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Authorized Signatory Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Ramesh Chander"
                value={signatoryName}
                onChange={e => setSignatoryName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Official Designation *</label>
              <input
                type="text"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Official Institutional Email *</label>
              <input
                type="email"
                required
                placeholder="principal@institution.edu.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
              />
              <span className="text-[10px] text-slate-400">Used for official communications and login identifier.</span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Mobile Phone Number *</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-700">Portal Security Passcode *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-medium"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!signatoryName.trim() || !email.trim()) {
                  setErrorMsg('Signatory Name and Email are mandatory.');
                  return;
                }
                setErrorMsg('');
                setStep(3);
              }}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <span>Continue to Statutory Verification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Statutory File & Submission */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            3. Statutory Annexures & Declaration
          </h3>

          <div className="space-y-3">
            <label className="font-bold text-slate-700 block">
              Upload AICTE Approval / University Affiliation / Trust Deed (.pdf, .jpg)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              {uploadedFileName ? (
                <div className="space-y-1">
                  <p className="font-bold text-blue-900 text-xs">{uploadedFileName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{fileSize}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700">Choose file to attach with onboarding</p>
                  <p className="text-[10px] text-slate-400">PDF or Scanned Copy (Max 20MB)</p>
                </div>
              )}
              <label className="mt-3 inline-block px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs">
                <span>Browse File</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[11px] text-amber-950 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Legal Undertaking:</strong> By submitting, the authorized signatory certifies that all details provided are authentic and compliant with AICTE Approval Process Handbook guidelines.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
            >
              Back
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleRegister(true)}
                className="px-3.5 py-2 border border-blue-900 text-blue-900 hover:bg-blue-50 rounded-lg text-xs font-bold transition"
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleRegister(false)}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                <span>Submit & Complete Onboarding</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
