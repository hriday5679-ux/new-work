import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { submitAccessRequest, createPendingInstitution } from '../services/firestoreService.ts';
import { UserRole, AccountType } from '../types/index.ts';

// 21 Canonical AICTE Benchmark Institutions (12 GGSIPU + 9 Private Universities)
export const CANONICAL_INSTITUTIONS = [
  // 12 GGSIPU Affiliated Colleges
  {
    id: 'inst-01',
    name: 'Maharaja Agrasen Institute of Technology',
    code: '1-9318291011',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-02',
    name: 'Bhagwan Parshuram Institute of Technology',
    code: '1-9318291012',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-03',
    name: 'Bharati Vidyapeeth College of Engineering',
    code: '1-9318291013',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-04',
    name: 'Guru Tegh Bahadur Institute of Technology',
    code: '1-9318291014',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-05',
    name: 'Northern India Engineering College (Dr. ADGITM)',
    code: '1-9318291015',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-06',
    name: 'Maharaja Surajmal Institute of Technology',
    code: '1-9318291016',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-07',
    name: 'HMR Institute of Technology and Management',
    code: '1-9318291017',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-08',
    name: 'Delhi Institute of Tool Engineering',
    code: '1-9318291018',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-09',
    name: 'Chanderprabhu Jain College of Higher Studies',
    code: '1-9318291019',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-10',
    name: 'Jagan Institute of Management Studies (Rohini)',
    code: '1-9318291020',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-11',
    name: 'Vivekananda Institute of Professional Studies',
    code: '1-9318291021',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },
  {
    id: 'inst-12',
    name: 'Trinity Institute of Professional Studies (Dwarka)',
    code: '1-9318291022',
    category: 'GGSIPU_AFFILIATED' as const,
    categoryLabel: 'GGSIPU Affiliated College',
    state: 'Delhi',
    region: 'Northern',
  },

  // 9 State Private Universities
  {
    id: 'inst-13',
    name: 'Amity University Uttar Pradesh',
    code: '1-9318291023',
    category: 'PRIVATE_UNIVERSITY' as const,
    categoryLabel: 'State Private University',
    state: 'Uttar Pradesh',
    region: 'Northern',
  },
  {
    id: 'inst-14',
    name: 'Sharda University',
    code: '1-9318291024',
    category: 'PRIVATE_UNIVERSITY' as const,
    categoryLabel: 'State Private University',
    state: 'Uttar Pradesh',
    region: 'Northern',
  },
  {
    id: 'inst-15',
    name: 'Galgotias University',
    code: '1-9318291025',
    category: 'PRIVATE_UNIVERSITY' as const,
    categoryLabel: 'State Private University',
    state: 'Uttar Pradesh',
    region: 'Northern',
  },
  {
    id: 'inst-16',
    name: 'Bennett University',
    code: '1-9318291026',
    category: 'PRIVATE_UNIVERSITY' as const,
    categoryLabel: 'State Private University',
    state: 'Uttar Pradesh',
    region: 'Northern',
  },
  {
    id: 'inst-17',
    name: 'Shiv Nadar University',
    code: '1-9318291027',
    category: 'PRIVATE_UNIVERSITY' as const,
    categoryLabel: 'State Private University',
    state: 'Uttar Pradesh',
    region: 'Northern',
  },
  {
    id: 'inst-18',
    name: 'K.R. Mangalam University',
    code: '1-9318291028',
    category: 'PRIVATE_UNIVERSITY' as const,
    categoryLabel: 'State Private University',
    state: 'Haryana',
    region: 'North-West',
  },
  {
    id: 'inst-19',
    name: 'GD Goenka University',
    code: '1-9318291029',
    category: 'PRIVATE_UNIVERSITY' as const,
    categoryLabel: 'State Private University',
    state: 'Haryana',
    region: 'North-West',
  },
  {
    id: 'inst-20',
    name: 'Manav Rachna International Institute of Research and Studies',
    code: '1-9318291030',
    category: 'PRIVATE_UNIVERSITY' as const,
    categoryLabel: 'State Private University',
    state: 'Haryana',
    region: 'North-West',
  },
  {
    id: 'inst-21',
    name: 'BML Munjal University',
    code: '1-9318291031',
    category: 'PRIVATE_UNIVERSITY' as const,
    categoryLabel: 'State Private University',
    state: 'Haryana',
    region: 'North-West',
  },
];

export const INSTITUTION_DESIGNATIONS = [
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

export const AICTE_DESIGNATIONS = [
  { label: 'Regional Officer/Maker (RO)', role: 'REGIONAL_OFFICER' as UserRole },
  { label: 'Central Bureau Head/Checker', role: 'ADMINISTRATOR' as UserRole },
  { label: 'PGRC Reviewer (Public Grievance Cell)', role: 'PGRC_OFFICER' as UserRole },
  { label: 'Vigilance Reviewer (CVO Office)', role: 'VIGILANCE_OFFICER' as UserRole },
  { label: 'Approval & Security Deposits Director', role: 'ADMINISTRATOR' as UserRole },
  { label: 'System Administrator (Full Oversight)', role: 'ADMINISTRATOR' as UserRole },
];

export const AICTE_REGIONS = [
  'Northern',
  'North-West',
  'Western',
  'Central',
  'Eastern',
  'Southern',
  'South-West',
];

interface OnboardingModalProps {
  onComplete: () => void;
  onExitDemo?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const { user, firebaseUser } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  // Institution Form
  const [institutionDesignation, setInstitutionDesignation] = useState('Director');
  const [otherDesignation, setOtherDesignation] = useState('');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('inst-01');
  const [instSearchQuery, setInstSearchQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState(user?.name || firebaseUser?.displayName || '');

  // Custom Institution Form (if unlisted)
  const [isUnlisted, setIsUnlisted] = useState(false);
  const [customInstName, setCustomInstName] = useState('');
  const [customInstState, setCustomInstState] = useState('Delhi');
  const [customInstRegion, setCustomInstRegion] = useState('Northern');
  const [customInstAddress, setCustomInstAddress] = useState('');

  // AICTE Form
  const [aicteDesignationIdx, setAicteDesignationIdx] = useState(0);
  const [aicteRegion, setAicteRegion] = useState('Northern');
  const [employeeId, setEmployeeId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter canonical institutions
  const filteredInstitutions = CANONICAL_INSTITUTIONS.filter(inst => {
    if (!instSearchQuery.trim()) return true;
    const q = instSearchQuery.toLowerCase();
    return inst.name.toLowerCase().includes(q) || inst.code.toLowerCase().includes(q) || inst.state.toLowerCase().includes(q);
  });

  const ggsipuList = filteredInstitutions.filter(i => i.category === 'GGSIPU_AFFILIATED');
  const privateList = filteredInstitutions.filter(i => i.category === 'PRIVATE_UNIVERSITY');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const uid = firebaseUser?.uid || user?.id || `user-${Date.now()}`;
      const name = fullName.trim() || 'Authorized Representative';

      if (accountType === 'INSTITUTION') {
        const finalDesignation = institutionDesignation === 'Other'
          ? (otherDesignation.trim() || 'Authorized Representative')
          : institutionDesignation;

        let instId = selectedInstitutionId;
        let instName = CANONICAL_INSTITUTIONS.find(i => i.id === selectedInstitutionId)?.name || '';

        // If unlisted, create pending institution record first
        if (isUnlisted) {
          if (!customInstName.trim()) {
            throw new Error('Please enter the official legal name of your institution.');
          }
          const createdInst = await createPendingInstitution(
            {
              name: customInstName.trim(),
              state: customInstState,
              region: customInstRegion,
              address: customInstAddress,
            },
            uid
          );
          instId = createdInst.id;
          instName = createdInst.name;
        }

        // Submit to Firestore
        await submitAccessRequest(uid, {
          name,
          accountType: 'INSTITUTION',
          designation: finalDesignation,
          requestedRole: 'INSTITUTION',
          requestedInstitutionId: instId,
          requestedInstitutionName: instName,
          phone,
        });

        // Synchronize with local server database
        await fetch('/api/access-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: uid,
            userName: name,
            userEmail: firebaseUser?.email || user?.email || '',
            accountType: 'INSTITUTION',
            designation: finalDesignation,
            requestedRole: 'INSTITUTION',
            requestedInstitutionId: instId,
            requestedInstitutionName: instName,
            phone,
          }),
        }).catch(() => {});

        onComplete();
      } else if (accountType === 'AICTE') {
        const selectedAicte = AICTE_DESIGNATIONS[aicteDesignationIdx];

        // Submit to Firestore
        await submitAccessRequest(uid, {
          name,
          accountType: 'AICTE',
          designation: selectedAicte.label,
          requestedRole: selectedAicte.role,
          region: aicteRegion,
          employeeId: employeeId.trim(),
          phone,
        });

        // Synchronize with local server database
        await fetch('/api/access-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: uid,
            userName: name,
            userEmail: firebaseUser?.email || user?.email || '',
            accountType: 'AICTE',
            designation: selectedAicte.label,
            requestedRole: selectedAicte.role,
            region: aicteRegion,
            employeeId: employeeId.trim(),
            phone,
          }),
        }).catch(() => {});

        onComplete();
      }
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      setErrorMsg(err.message || 'Failed to submit onboarding request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Tricolor Government Top Strip */}
        <div className="h-2 w-full flex">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>

        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-[#07162b] via-[#0d2345] to-[#112d59] text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-blue-950 font-black flex items-center justify-center text-sm shadow-md">
              AICTE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">AICTE FDR360 Onboarding</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 font-bold">
                  Step {step} of 2
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Official Security Deposit & FDR Lifecycle Verification Portal (SIH26265)
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Please identify your institutional affiliation or AICTE bureau designation. All account registrations are submitted for Administrator approval to maintain statutory data integrity.
          </p>
        </div>

        {/* Step 1: Where do you belong? */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Where do you belong?</h3>
              <p className="text-xs text-slate-500">
                Select your primary institutional role to access the relevant security deposit registers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Option A: Technical Institution */}
              <button
                type="button"
                onClick={() => {
                  setAccountType('INSTITUTION');
                  setStep(2);
                }}
                className="p-5 rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 text-left transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-blue-600 group-hover:text-white text-indigo-700 flex items-center justify-center transition">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-900">
                    College or University
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    For authorized Directors, Principals, Registrars & Finance Officers managing institutional FDRs, lock-ins & refund applications.
                  </p>
                </div>
                <div className="pt-2 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                  21 Canonical Institutes or New College →
                </div>
              </button>

              {/* Option B: AICTE Official */}
              <button
                type="button"
                onClick={() => {
                  setAccountType('AICTE');
                  setStep(2);
                }}
                className="p-5 rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 text-left transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 group-hover:bg-blue-600 group-hover:text-white text-amber-700 flex items-center justify-center transition">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-900">
                    AICTE Official / Regulatory Bureau
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    For Regional Officers (RO), Central Bureau Checker, Public Grievance (PGRC) Reviewers, Vigilance Officers & AICTE Administrators.
                  </p>
                </div>
                <div className="pt-2 text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Multi-Tier Clearance Desk →
                </div>
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                <strong>Zero-Trust Access Control:</strong> Role selections are verified by Central Administration. Awaiting accounts are granted draft access until authorized.
              </span>
            </div>
          </div>
        )}

        {/* Step 2: Role-Specific Details */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* User Full Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Your Full Name *</label>
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
                <label className="block font-semibold text-slate-700 mb-1">Official Mobile / Contact</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Institution Flow Details */}
            {accountType === 'INSTITUTION' && (
              <div className="space-y-4 pt-1 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Designation *</label>
                  <select
                    value={institutionDesignation}
                    onChange={e => setInstitutionDesignation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                    <label className="block font-semibold text-slate-700 mb-1">Specify Other Designation *</label>
                    <input
                      type="text"
                      required
                      value={otherDesignation}
                      onChange={e => setOtherDesignation(e.target.value)}
                      placeholder="e.g. Dean of Academics / Head of Treasury"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                {/* Institution Picker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-700">
                      Select Approved Institution *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsUnlisted(!isUnlisted)}
                      className="text-xs text-blue-700 font-bold hover:underline"
                    >
                      {isUnlisted ? '← Choose from 21 Canonical Institutes' : 'My institution is not listed'}
                    </button>
                  </div>

                  {!isUnlisted ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={instSearchQuery}
                          onChange={e => setInstSearchQuery(e.target.value)}
                          placeholder="Search among 21 real institutes by name or code..."
                          className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <select
                        size={6}
                        value={selectedInstitutionId}
                        onChange={e => setSelectedInstitutionId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white divide-y focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs max-h-48 overflow-y-auto"
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
                    /* Custom unlisted institution inputs */
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <p className="text-[11px] text-slate-600">
                        Enter your institution coordinates. Your entry will be added with <strong>Affiliation requires verification</strong> status.
                      </p>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Institution Legal Name *</label>
                        <input
                          type="text"
                          required
                          value={customInstName}
                          onChange={e => setCustomInstName(e.target.value)}
                          placeholder="e.g. Indraprastha Institute of Technology & Management"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
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
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">AICTE Region *</label>
                          <select
                            value={customInstRegion}
                            onChange={e => setCustomInstRegion(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
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
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AICTE Bureau Flow Details */}
            {accountType === 'AICTE' && (
              <div className="space-y-4 pt-1 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">AICTE Designation & Bureau *</label>
                  <select
                    value={aicteDesignationIdx}
                    onChange={e => setAicteDesignationIdx(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {AICTE_DESIGNATIONS.map((d, idx) => (
                      <option key={d.label} value={idx}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">AICTE Region Jurisdiction</label>
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
                    <label className="block font-semibold text-slate-700 mb-1">Official Employee ID</label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      placeholder="e.g. AICTE-RO-2024-912"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Statutory Review Clearance Notice</span>
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    Regulatory officer privileges (recording RO, PGRC, or Vigilance clearances) will take effect immediately upon approval by an AICTE Administrator in the Access Requests console.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
              >
                ← Back
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-md"
              >
                {submitting ? (
                  <span>Submitting Access Request...</span>
                ) : (
                  <>
                    <span>Submit for Administrator Approval</span>
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
