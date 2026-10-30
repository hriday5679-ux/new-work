import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Shield,
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  HelpCircle,
  KeyRound,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { BackButton } from '../components/BackButton.tsx';
import {
  UserRole,
  getRoleDisplayName,
  isAicteRole,
  isInstitutionRole,
  RoleChangeRequest,
} from '../types/index.ts';
import {
  submitRoleChangeRequest,
  updateUserProfile,
  getRoleChangeRequestsList,
} from '../services/firestoreService.ts';
import sampleInstitutions from '../data/aicte_institutions_directory.json';

const ALL_ROLES: { role: UserRole; label: string; group: 'AICTE' | 'Institution' }[] = [
  { role: 'CHAIRMAN_MEMBER_SECRETARY', label: 'Chairman / Member Secretary', group: 'AICTE' },
  { role: 'DIRECTOR_ADVISOR', label: 'Director / Advisor (Approval Bureau)', group: 'AICTE' },
  { role: 'REGIONAL_OFFICER', label: 'Regional Officer', group: 'AICTE' },
  { role: 'ACCOUNTS_FINANCE_OFFICER', label: 'Accounts / Finance Officer', group: 'AICTE' },
  { role: 'SECTION_OFFICER', label: 'Section Officer / Dealing Assistant', group: 'AICTE' },
  { role: 'AUDIT_OFFICER', label: 'Audit Officer', group: 'AICTE' },
  { role: 'PORTAL_ADMIN', label: 'Portal Admin', group: 'AICTE' },
  { role: 'INSTITUTION_HEAD', label: 'Head of Institution (Principal/Director)', group: 'Institution' },
  { role: 'INSTITUTION_REGISTRAR', label: 'Registrar', group: 'Institution' },
  { role: 'INSTITUTION_ACCOUNTS', label: 'Accounts Officer', group: 'Institution' },
  { role: 'INSTITUTION_NODAL', label: 'Nodal Officer', group: 'Institution' },
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

export const UserProfilePage: React.FC = () => {
  const { user, refreshProfile, isDemoMode } = useAuth();

  // Basic Profile Edit
  const [name, setName] = useState(user?.name || '');
  const [designation, setDesignation] = useState(user?.designation || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingBasic, setSavingBasic] = useState(false);
  const [basicMsg, setBasicMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Role Change Request State
  const [targetRole, setTargetRole] = useState<UserRole>('REGIONAL_OFFICER');
  const [targetRegion, setTargetRegion] = useState<string>('Northern');
  const [targetInstId, setTargetInstId] = useState<string>('inst-01');
  const [targetDesignation, setTargetDesignation] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqMsg, setReqMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [myRequests, setMyRequests] = useState<RoleChangeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setDesignation(user.designation || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const fetchMyRequests = async () => {
    if (!user) return;
    setLoadingRequests(true);
    try {
      const list = await getRoleChangeRequestsList();
      const filtered = list.filter(r => r.userId === user.id);
      setMyRequests(filtered);
    } catch {
      // Non-blocking
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [user]);

  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingBasic(true);
    setBasicMsg(null);
    try {
      await updateUserProfile(user.id, {
        name: name.trim(),
        designation: designation.trim(),
        phone: phone.trim(),
      });
      await refreshProfile();
      setBasicMsg({ type: 'success', text: 'Profile details successfully updated.' });
    } catch (err: any) {
      setBasicMsg({ type: 'error', text: err?.message || 'Failed to update profile.' });
    } finally {
      setSavingBasic(false);
    }
  };

  const handleRoleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!justification.trim()) {
      setReqMsg({ type: 'error', text: 'Please provide a justification for the requested role change.' });
      return;
    }

    setSubmittingReq(true);
    setReqMsg(null);

    const targetInst = sampleInstitutions.find(i => i.id === targetInstId);

    try {
      await submitRoleChangeRequest({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        currentRole: user.role,
        targetRole,
        targetRegion: targetRole === 'REGIONAL_OFFICER' ? targetRegion : user.region,
        targetInstitutionId: isInstitutionRole(targetRole) ? targetInstId : '',
        targetInstitutionName: isInstitutionRole(targetRole) ? targetInst?.name || '' : '',
        targetDesignation: targetDesignation.trim() || getRoleDisplayName(targetRole),
        justification: justification.trim(),
      });

      setReqMsg({
        type: 'success',
        text: 'Your role change request has been sent to the Portal Admin for review and approval.',
      });
      setJustification('');
      await fetchMyRequests();
    } catch (err: any) {
      setReqMsg({ type: 'error', text: err?.message || 'Failed to submit role change request.' });
    } finally {
      setSubmittingReq(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <BackButton label="Back to Dashboard" fallbackTo="/dashboard" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-blue-950 font-black text-2xl shadow-lg shrink-0">
            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{user?.name || 'User Profile'}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-blue-950">
                {user?.status || 'ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white/10 text-white border border-white/20">
                {getRoleDisplayName(user?.role)}
              </span>
              {user?.region && (
                <span className="text-xs text-blue-300 font-mono">
                  Region: {user.region}
                </span>
              )}
            </div>
          </div>
        </div>

        {user?.institutionName && (
          <div className="text-left sm:text-right bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">Affiliated Institute</span>
            <span className="text-xs font-bold text-white block">{user.institutionName}</span>
            {user.instituteCode && (
              <span className="text-[11px] font-mono text-blue-200">ID: {user.instituteCode}</span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Basic Information Edit */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserIcon className="w-5 h-5 text-blue-900" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Personal & Contact Information</h3>
              <p className="text-[11px] text-slate-500">Update your public profile display details</p>
            </div>
          </div>

          {basicMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                basicMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {basicMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{basicMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveBasic} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Registered Email (Read-Only)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-mono text-xs cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-xs font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingBasic}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <span>{savingBasic ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Request Role Change */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Request Role Change</h3>
              <p className="text-[11px] text-slate-500">
                Requires Portal Admin authorization before changes take effect
              </p>
            </div>
          </div>

          {reqMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                reqMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {reqMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{reqMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleRoleChangeSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Desired Role *</label>
              <select
                value={targetRole}
                onChange={e => {
                  const newRole = e.target.value as UserRole;
                  setTargetRole(newRole);
                  setTargetDesignation(getRoleDisplayName(newRole));
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-xs font-semibold bg-white"
              >
                <optgroup label="AICTE Official Roles">
                  {ALL_ROLES.filter(r => r.group === 'AICTE').map(r => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Institution Representative Roles">
                  {ALL_ROLES.filter(r => r.group === 'Institution').map(r => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* If Regional Officer: select target region */}
            {targetRole === 'REGIONAL_OFFICER' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Region Jurisdiction *</label>
                <select
                  value={targetRegion}
                  onChange={e => setTargetRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-xs font-semibold bg-white"
                >
                  {REGIONS.map(reg => (
                    <option key={reg} value={reg}>
                      {reg} Regional Office
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* If Institution role: select institution */}
            {isInstitutionRole(targetRole) && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Affiliated Institution *</label>
                <select
                  value={targetInstId}
                  onChange={e => setTargetInstId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-xs font-semibold bg-white"
                >
                  {sampleInstitutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Justification / Order Reference *</label>
              <textarea
                required
                rows={3}
                placeholder="State the transfer order, board resolution, or appointment reference..."
                value={justification}
                onChange={e => setJustification(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-xs font-medium"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submittingReq}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingReq ? 'Submitting...' : 'Submit Role Change Request'}</span>
              </button>
            </div>
          </form>

          {/* Pending requests list */}
          {myRequests.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                My Submitted Requests
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {myRequests.map(req => (
                  <div
                    key={req.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        Target: {getRoleDisplayName(req.targetRole)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Submitted: {new Date(req.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
