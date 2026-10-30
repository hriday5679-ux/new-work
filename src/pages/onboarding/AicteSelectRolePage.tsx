import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Briefcase,
  MapPin,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/index.ts';

const AICTE_ROLES = [
  {
    role: 'CHAIRMAN_MEMBER_SECRETARY' as UserRole,
    title: 'Chairman / Member Secretary',
    desc: 'Apex approving authority: Full access to all institutions, FDRs, documents, final approval/rejection/forfeiture/release.',
    badge: 'Apex Authority',
  },
  {
    role: 'DIRECTOR_ADVISOR' as UserRole,
    title: 'Director / Advisor (Approval Bureau)',
    desc: 'Second-level review: Scrutinizes recommendations, reviews clearances, grants bureau-level approval.',
    badge: 'Bureau Level',
  },
  {
    role: 'REGIONAL_OFFICER' as UserRole,
    title: 'Regional Officer',
    desc: 'Zonal jurisdiction: Manages institutions in assigned region, verifies documents/FDRs, gives formal recommendations.',
    badge: 'Zonal Head',
    needsRegion: true,
  },
  {
    role: 'ACCOUNTS_FINANCE_OFFICER' as UserRole,
    title: 'Accounts / Finance Officer',
    desc: 'Financial oversight: Full visibility into deposit ledger, bank info, interest rates, maturity tracking, and refund processing.',
    badge: 'Finance',
  },
  {
    role: 'SECTION_OFFICER' as UserRole,
    title: 'Section Officer / Dealing Assistant',
    desc: 'First-level scrutiny: Verification of uploaded statutory documents, marking deficiencies, status updates.',
    badge: 'Scrutiny Officer',
  },
  {
    role: 'AUDIT_OFFICER' as UserRole,
    title: 'Audit Officer',
    desc: 'Independent compliance: Read-only access across all institutions, FDRs, and full system audit trail logs.',
    badge: 'Read-Only Audit',
  },
  {
    role: 'PORTAL_ADMIN' as UserRole,
    title: 'Portal Admin',
    desc: 'Portal management: Manages user accounts, configures policy rules, approves role change requests (no financial docs access).',
    badge: 'System Admin',
  },
];

const REGIONS = [
  'Northern',
  'Southern',
  'Western',
  'Eastern',
  'Central',
  'North-West',
  'South-West',
];

export const AicteSelectRolePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, completeUserProfile } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>('SECTION_OFFICER');
  const [selectedRegion, setSelectedRegion] = useState<string>('Northern');
  const [name, setName] = useState<string>(user?.name || '');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [designation, setDesignation] = useState<string>('Section Officer');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const currentRoleConfig = AICTE_ROLES.find(r => r.role === selectedRole) || AICTE_ROLES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your full official name.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await completeUserProfile({
        name: name.trim(),
        userType: 'AICTE',
        accountType: 'AICTE',
        role: selectedRole,
        designation: designation.trim() || currentRoleConfig.title,
        region: currentRoleConfig.needsRegion ? selectedRegion : 'Northern',
        employeeId: employeeId.trim(),
        status: 'ACTIVE',
        accountStatus: 'APPROVED',
        onboardingComplete: true,
      });

      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to configure AICTE profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07162b] via-[#0a1e38] to-[#0f2d52] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="max-w-2xl w-full bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        {/* Header with back */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => navigate('/select-type')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Type Selection</span>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            AICTE Officer Setup • Step 2 of 2
          </span>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Select Your AICTE Role & Bureau
          </h2>
          <p className="text-xs text-slate-500">
            Choose your designated statutory role. Access permissions and workflows are strictly tailored to your role.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Selection List */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              AICTE Statutory Roles *
            </label>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {AICTE_ROLES.map(r => {
                const isSelected = selectedRole === r.role;
                return (
                  <div
                    key={r.role}
                    onClick={() => {
                      setSelectedRole(r.role);
                      setDesignation(r.title);
                    }}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-blue-700 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{r.title}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{r.desc}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-blue-700 bg-blue-700' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* If Regional Officer: Ask for Region */}
          {currentRoleConfig.needsRegion && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Assigned AICTE Regional Jurisdiction *</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                As a Regional Officer, you will only have authority to inspect and give recommendations for institutions located in your assigned region.
              </p>
              <select
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-600"
              >
                {REGIONS.map(reg => (
                  <option key={reg} value={reg}>
                    {reg} Regional Office
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Full Name & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Shri V. Ramakrishnan"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Designation Title
              </label>
              <input
                type="text"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                placeholder="e.g. Section Officer"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              AICTE Employee ID / Token (Optional)
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              placeholder="e.g. AICTE-EMP-7821"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Setting up...' : 'Confirm Role & Enter Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AicteSelectRolePage;
