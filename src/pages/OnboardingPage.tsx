import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { submitAccessRequest, createPendingInstitution } from '../services/firestoreService.ts';
import { UserRole, AccountType } from '../types/index.ts';
import { CANONICAL_INSTITUTIONS } from '../components/OnboardingModal.tsx';

const INSTITUTION_DESIGNATIONS = [
  'Director',
  'Principal',
  'Chairman',
  'Registrar',
  'Admission Officer',
  'Compliance Officer',
  'Accounts/Finance Officer',
  'Trustee/Secretary',
  'Other',
];

const AICTE_DESIGNATIONS: { label: string; role: UserRole; bureau: string }[] = [
  { label: 'Regional Officer / Maker', role: 'REGIONAL_OFFICER', bureau: 'Regional Office (RO)' },
  { label: 'Central Bureau Head / Checker', role: 'ADMINISTRATOR', bureau: 'Approval Bureau (New Delhi)' },
  { label: 'PGRC Reviewer', role: 'PGRC_OFFICER', bureau: 'Public Grievance Redressal Cell' },
  { label: 'Vigilance Reviewer', role: 'VIGILANCE_OFFICER', bureau: 'Chief Vigilance Office (CVO)' },
  { label: 'Approval & Security Deposits Director', role: 'ADMINISTRATOR', bureau: 'Policy & Academic Bureau' },
  { label: 'System Administrator', role: 'ADMINISTRATOR', bureau: 'National Data & Portal Directorate' },
];

const AICTE_REGIONS = [
  'Northern',
  'North-West',
  'Eastern',
  'Western',
  'Central',
  'South-West',
  'Southern',
  'South-Central',
];

export const OnboardingPage: React.FC = () => {
  const { user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active step from pathname:
  // /onboarding or /onboarding/type => 1
  // /onboarding/designation => 2
  // /onboarding/institution => 3
  const getStepFromPath = (): number => {
    if (location.pathname.includes('/designation')) return 2;
    if (location.pathname.includes('/institution')) return 3;
    return 1;
  };

  const currentStep = getStepFromPath();

  // Form State
  const [accountType, setAccountType] = useState<AccountType>(user?.accountType || 'INSTITUTION');
  const [fullName, setFullName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');

  // Institution State
  const [institutionDesignation, setInstitutionDesignation] = useState<string>('Principal');
  const [otherDesignation, setOtherDesignation] = useState<string>('');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('inst-01');
  const [isUnlisted, setIsUnlisted] = useState<boolean>(false);
  const [customInstName, setCustomInstName] = useState<string>('');
  const [customInstState, setCustomInstState] = useState<string>('Delhi');
  const [customInstRegion, setCustomInstRegion] = useState<string>('Northern');
  const [customInstAddress, setCustomInstAddress] = useState<string>('');
  const [instSearchQuery, setInstSearchQuery] = useState<string>('');

  // AICTE State
  const [aicteDesignationIdx, setAicteDesignationIdx] = useState<number>(0);
  const [aicteRegion, setAicteRegion] = useState<string>('Northern');
  const [employeeId, setEmployeeId] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Keep state initialized from existing user
  useEffect(() => {
    if (user) {
      if (user.name && !fullName) setFullName(user.name);
      if (user.phone && !phone) setPhone(user.phone);
    }
  }, [user]);

  const ggsipuList = CANONICAL_INSTITUTIONS.filter(i =>
    i.category === 'GGSIPU_AFFILIATED' &&
    (i.name.toLowerCase().includes(instSearchQuery.toLowerCase()) || i.code.includes(instSearchQuery))
  );

  const privateList = CANONICAL_INSTITUTIONS.filter(i =>
    i.category === 'PRIVATE_UNIVERSITY' &&
    (i.name.toLowerCase().includes(instSearchQuery.toLowerCase()) || i.code.includes(instSearchQuery))
  );

  // Navigation between steps
  const handleNextToDesignation = () => {
    setErrorMsg('');
    navigate('/onboarding/designation');
  };

  const handleNextToInstitution = () => {
    setErrorMsg('');
    if (!fullName.trim()) {
      setErrorMsg('Please provide your full legal name.');
      return;
    }
    navigate('/onboarding/institution');
  };

  const handleBack = () => {
    setErrorMsg('');
    if (currentStep === 3) {
      navigate('/onboarding/designation');
    } else if (currentStep === 2) {
      navigate('/onboarding/type');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName.trim()) {
      setErrorMsg('Please provide your full legal name.');
      navigate('/onboarding/designation');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (accountType === 'INSTITUTION') {
        const finalDesignation =
          institutionDesignation === 'Other' ? otherDesignation.trim() : institutionDesignation;

        let finalInstId = selectedInstitutionId;
        let finalInstName = '';

        if (isUnlisted) {
          if (!customInstName.trim()) {
            setErrorMsg('Please specify your institution legal name.');
            setSubmitting(false);
            return;
          }
          const pendingInst = await createPendingInstitution({
            name: customInstName.trim(),
            state: customInstState.trim() || 'Delhi',
            region: customInstRegion,
            address: customInstAddress.trim(),
            category: 'OTHER',
          });
          finalInstId = pendingInst.id;
          finalInstName = pendingInst.name;
        } else {
          const canonical = CANONICAL_INSTITUTIONS.find(i => i.id === selectedInstitutionId);
          finalInstName = canonical?.name || 'Selected Educational Institution';
        }

        // Submits and activates institution workspace immediately
        await submitAccessRequest(user.id, {
          name: fullName.trim(),
          accountType: 'INSTITUTION',
          designation: finalDesignation,
          requestedRole: 'INSTITUTION',
          requestedInstitutionId: finalInstId,
          requestedInstitutionName: finalInstName,
          phone: phone.trim(),
          region: isUnlisted ? customInstRegion : 'Northern',
        });

        await refreshProfile();
        navigate('/dashboard');
      } else {
        // AICTE Bureau Officer Flow
        const chosen = AICTE_DESIGNATIONS[aicteDesignationIdx];

        await submitAccessRequest(user.id, {
          name: fullName.trim(),
          accountType: 'AICTE',
          designation: `${chosen.label} (${chosen.bureau})`,
          requestedRole: chosen.role,
          region: aicteRegion,
          phone: phone.trim(),
          employeeId: employeeId.trim(),
        });

        await refreshProfile();
        navigate('/pending-approval');
      }
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      setErrorMsg(err.message || 'Failed to submit onboarding details. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07162b] via-[#0a1e38] to-[#0f2d52] flex flex-col justify-between p-4 sm:p-6 text-slate-100">
      {/* Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-blue-950 shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">AICTE FDR360</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                SIH26265
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Security Deposit & FDR Lifecycle Portal</p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="text-xs text-slate-300 hover:text-white font-semibold transition px-3 py-1.5 border border-slate-700 rounded-lg hover:bg-slate-800"
        >
          Sign Out
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl w-full mx-auto my-6">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Step Progress Tracker */}
          <div className="bg-[#07162b] text-white p-6 sm:p-7 border-b border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              <span>Official AICTE User Onboarding</span>
              <span>Step {currentStep} of {accountType === 'INSTITUTION' ? '3' : '2'}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-4">
              {currentStep === 1 && 'Where do you belong?'}
              {currentStep === 2 && 'Identity & Official Designation'}
              {currentStep === 3 && (accountType === 'INSTITUTION' ? 'Select Affiliated Institution' : 'Review & Submit')}
            </h1>

            {/* Stepper Pills */}
            <div className="flex items-center gap-2">
              <div
                className={`flex-1 h-2 rounded-full transition-all ${
                  currentStep >= 1 ? 'bg-amber-400' : 'bg-slate-700'
                }`}
              />
              <div
                className={`flex-1 h-2 rounded-full transition-all ${
                  currentStep >= 2 ? 'bg-amber-400' : 'bg-slate-700'
                }`}
              />
              {accountType === 'INSTITUTION' && (
                <div
                  className={`flex-1 h-2 rounded-full transition-all ${
                    currentStep >= 3 ? 'bg-amber-400' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="m-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Type Selection */}
          {currentStep === 1 && (
            <div className="p-6 sm:p-8 space-y-6">
              <p className="text-xs sm:text-sm text-slate-600">
                Please identify your organizational jurisdiction. All security deposit lifecycles are monitored jointly under AICTE Approval Process Handbook (APH) norms.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Institution Option */}
                <button
                  type="button"
                  onClick={() => setAccountType('INSTITUTION')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    accountType === 'INSTITUTION'
                      ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center mb-4">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Institution (College / University)
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    For Directors, Principals, Registrars & Authorized Signatories managing institutional FDRs, security deposits, and NOC release requests. Immediate workspace access.
                  </p>
                </button>

                {/* AICTE Option */}
                <button
                  type="button"
                  onClick={() => setAccountType('AICTE')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    accountType === 'AICTE'
                      ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    AICTE (Employee / Officer)
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    For AICTE Regional Officers (RO/Maker), Central Bureau Heads (Checker), PGRC Reviewers, and Vigilance Officers. Requires Administrator authorization.
                  </p>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextToDesignation}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-900/30"
                >
                  <span>Continue to Step 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Designation & Contact */}
          {currentStep === 2 && (
            <div className="p-6 sm:p-8 space-y-6 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kumar"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Mobile / Contact</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {accountType === 'INSTITUTION' ? (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Designation *</label>
                    <select
                      value={institutionDesignation}
                      onChange={e => setInstitutionDesignation(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    >
                      {INSTITUTION_DESIGNATIONS.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {institutionDesignation === 'Other' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Specify Other Designation *</label>
                      <input
                        type="text"
                        required
                        value={otherDesignation}
                        onChange={e => setOtherDesignation(e.target.value)}
                        placeholder="e.g. Dean of Academics / Financial Controller"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">AICTE Designation & Bureau *</label>
                    <select
                      value={aicteDesignationIdx}
                      onChange={e => setAicteDesignationIdx(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                    >
                      {AICTE_DESIGNATIONS.map((d, idx) => (
                        <option key={d.label} value={idx}>
                          {d.label} — {d.bureau}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">AICTE Regional Jurisdiction</label>
                      <select
                        value={aicteRegion}
                        onChange={e => setAicteRegion(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        {AICTE_REGIONS.map(r => (
                          <option key={r} value={r}>
                            {r} Regional Office
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Official Employee ID</label>
                      <input
                        type="text"
                        value={employeeId}
                        onChange={e => setEmployeeId(e.target.value)}
                        placeholder="e.g. AICTE-RO-2024-912"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                {accountType === 'INSTITUTION' ? (
                  <button
                    type="button"
                    onClick={handleNextToInstitution}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-md shadow-blue-900/30"
                  >
                    <span>Choose Institution</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-md shadow-blue-950/40"
                  >
                    <span>{submitting ? 'Submitting...' : 'Submit Access Request'}</span>
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Institution Picker (for Institution flow) */}
          {currentStep === 3 && accountType === 'INSTITUTION' && (
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 text-xs">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800 text-sm">
                  Select Approved Institution
                </label>
                <button
                  type="button"
                  onClick={() => setIsUnlisted(!isUnlisted)}
                  className="text-xs text-blue-700 font-bold hover:underline"
                >
                  {isUnlisted ? '← Choose from 21 Canonical Benchmark Institutes' : 'My institution is not listed'}
                </button>
              </div>

              {!isUnlisted ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={instSearchQuery}
                      onChange={e => setInstSearchQuery(e.target.value)}
                      placeholder="Search among 21 real institutes by name or code..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <select
                    size={7}
                    value={selectedInstitutionId}
                    onChange={e => setSelectedInstitutionId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white divide-y focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs max-h-56 overflow-y-auto"
                  >
                    <optgroup label="GGSIPU Affiliated Colleges (12 Colleges)">
                      {ggsipuList.map(i => (
                        <option key={i.id} value={i.id} className="py-1 px-2 hover:bg-blue-50">
                          {i.name} ({i.code}) — {i.state}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="State Private Universities (9 Universities)">
                      {privateList.map(i => (
                        <option key={i.id} value={i.id} className="py-1 px-2 hover:bg-blue-50">
                          {i.name} ({i.code}) — {i.state}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <p className="text-[11px] text-slate-600">
                    Enter your institution details. Your entry will be created with <strong>Affiliation requires verification</strong> status.
                  </p>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Institution Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={customInstName}
                      onChange={e => setCustomInstName(e.target.value)}
                      placeholder="e.g. Indraprastha Institute of Technology & Management"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={customInstState}
                        onChange={e => setCustomInstState(e.target.value)}
                        placeholder="e.g. Delhi / Uttar Pradesh"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">AICTE Region *</label>
                      <select
                        value={customInstRegion}
                        onChange={e => setCustomInstRegion(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        {AICTE_REGIONS.map(r => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Campus Address</label>
                    <input
                      type="text"
                      value={customInstAddress}
                      onChange={e => setCustomInstAddress(e.target.value)}
                      placeholder="Institutional area, city, pincode"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-md shadow-blue-950/40"
                >
                  <span>{submitting ? 'Activating Workspace...' : 'Activate Institution Workspace'}</span>
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center py-2 text-[11px] text-slate-400">
        AICTE FDR360 • Smart India Hackathon 2024 (SIH26265) • Statutory Compliance Prototype
      </footer>
    </div>
  );
};
