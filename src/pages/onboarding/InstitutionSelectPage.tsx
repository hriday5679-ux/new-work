import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  Phone,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/index.ts';
import { InstitutionDirectoryPicker } from '../../components/InstitutionDirectoryPicker.tsx';
import sampleInstitutions from '../../data/aicte_institutions_directory.json';

const DESIGNATIONS = [
  {
    role: 'INSTITUTION_HEAD' as UserRole,
    title: 'Head of Institution (Principal/Director)',
    desc: 'Authorized to sign off on deposit releases, refund requests, and institutional submissions.',
  },
  {
    role: 'INSTITUTION_REGISTRAR' as UserRole,
    title: 'Registrar',
    desc: 'Authorized to upload statutory records, verify compliance notices, and reply to official scrutiny queries.',
  },
  {
    role: 'INSTITUTION_ACCOUNTS' as UserRole,
    title: 'Accounts Officer',
    desc: 'Authorized to submit FDR financial details, bank accounts, and payment receipts for the institution.',
  },
  {
    role: 'INSTITUTION_NODAL' as UserRole,
    title: 'Nodal Officer',
    desc: 'Authorized to track clearance matrices, manage deficiency submissions, and coordinate with AICTE.',
  },
];

export const InstitutionSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, completeUserProfile } = useAuth();

  const [institutionsList, setInstitutionsList] = useState<any[]>(sampleInstitutions);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInstId, setSelectedInstId] = useState<string>(sampleInstitutions[0]?.id || 'inst-01');
  const [selectedDesignation, setSelectedDesignation] = useState<string>(
    'Head of Institution (Principal/Director)'
  );
  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetch('/api/institutions')
      .then(res => res.json())
      .then(data => {
        if (data.institutions && data.institutions.length > 0) {
          const map = new Map();
          sampleInstitutions.forEach(inst => map.set(inst.id, inst));
          data.institutions.forEach((inst: any) => map.set(inst.id, inst));
          setInstitutionsList(Array.from(map.values()));
        }
      })
      .catch(() => {});
  }, []);

  const selectedInstitution =
    institutionsList.find(i => i.id === selectedInstId) || institutionsList[0];

  const filteredInstitutions = institutionsList.filter(
    inst =>
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.code && inst.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inst.state && inst.state.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstitution) {
      setError('Please select an affiliated institution from the directory.');
      return;
    }
    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    const matchedConfig = DESIGNATIONS.find(d => d.title === selectedDesignation) || DESIGNATIONS[0];

    setLoading(true);
    setError('');

    try {
      await completeUserProfile({
        name: name.trim(),
        userType: 'INSTITUTION',
        accountType: 'INSTITUTION',
        role: matchedConfig.role,
        designation: selectedDesignation,
        institutionId: selectedInstitution.id,
        institutionName: selectedInstitution.name,
        instituteCode: selectedInstitution.code,
        region: selectedInstitution.region || 'Northern',
        phone: phone.trim(),
        status: 'ACTIVE',
        accountStatus: 'APPROVED',
        onboardingComplete: true,
      });

      // Per specification: Institution users land directly on /institution/:id
      navigate(`/institution/${selectedInstitution.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete institution profile setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07162b] via-[#0a1e38] to-[#0f2d52] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="max-w-2xl w-full bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => navigate('/select-type')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Type Selection</span>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Institution Setup • Step 2 of 2
          </span>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Link Your AICTE-Affiliated Institution
          </h2>
          <p className="text-xs text-slate-500">
            Select your institution from the accredited AICTE directory and declare your official designation.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Institution Directory Picker with Search, State/Region/Type Filters, and Pagination */}
          <div className="space-y-2">
            <InstitutionDirectoryPicker
              selectedId={selectedInstId}
              onSelect={inst => {
                setSelectedInstId(inst.id);
                // Ensure institution is active in database
                fetch('/api/institutions/activate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(inst),
                }).catch(() => {});
              }}
              title="Select Your Institution from AICTE Directory"
              subtitle="Search by college name, permanent AICTE Code, district, or state"
            />
          </div>

          {/* Selected Institution Banner */}
          {selectedInstitution && (
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> Selected Institution
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-950">
                  ID: {selectedInstitution.code}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">{selectedInstitution.name}</p>
              <p className="text-[11px] text-slate-600">
                {selectedInstitution.address || `${selectedInstitution.state}, India`} • {selectedInstitution.region || 'Northern'} Region • Type: {selectedInstitution.type}
              </p>
            </div>
          )}

          {/* Designation Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Designation / Role in Institution *
            </label>
            <div className="space-y-2">
              {DESIGNATIONS.map(d => {
                const isSelected = selectedDesignation === d.title;
                return (
                  <div
                    key={d.title}
                    onClick={() => setSelectedDesignation(d.title)}
                    className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900">{d.title}</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{d.desc}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-emerald-700 bg-emerald-700' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name of Signatory *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Dr. Rajiv K. Sharma"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Linking Institution...' : 'Go to Institution Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default InstitutionSelectPage;
