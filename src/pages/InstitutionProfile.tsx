import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Save,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Clock,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  FileCheck2,
  FolderArchive,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { BackButton } from '../components/BackButton.tsx';
import { Institution, FDRRecord } from '../types/index.ts';
import {
  canUserViewInstitution,
  canSubmitReleaseRequest,
  canAddFDRDetails,
  canUploadDocuments,
} from '../utils/rbac.ts';

interface InstitutionProfileProps {
  initialInstitutionId?: string;
  onSelectFDR?: (fdrId: string) => void;
}

export const InstitutionProfile: React.FC<InstitutionProfileProps> = ({ initialInstitutionId: propId, onSelectFDR }) => {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectFDR = onSelectFDR || ((fdrId: string) => navigate(`/fdr/${fdrId}`));

  const [selectedInstId, setSelectedInstId] = useState<string>(
    propId || routeId || (user?.institutionId ? user.institutionId : 'inst-01')
  );
  const [allInstitutions, setAllInstitutions] = useState<Institution[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  // Editable fields
  const [contactPerson, setContactPerson] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  // Load all institutions for officer dropdown
  useEffect(() => {
    fetch('/api/institutions')
      .then(res => res.json())
      .then(data => {
        setAllInstitutions(data.institutions || []);
      })
      .catch(console.error);
  }, []);

  // Update selectedInstId if propId or routeId changes
  useEffect(() => {
    if (propId) {
      setSelectedInstId(propId);
    } else if (routeId) {
      setSelectedInstId(routeId);
    } else if (user?.institutionId) {
      setSelectedInstId(user.institutionId);
    }
  }, [propId, routeId, user]);

  const fetchProfile = async (targetId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/institutions/${targetId}`);
      if (res.ok) {
        const data = await res.json();
        setInstitution(data.institution);
        setFdrs(data.fdrs || []);
        setContactPerson(data.institution.contactPerson || '');
        setEmail(data.institution.email || '');
        setPhone(data.institution.phone || '');
        setAddress(data.institution.address || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(selectedInstId);
  }, [selectedInstId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;
    setSaving(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      const res = await fetch(`/api/institutions/${institution.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactPerson,
          email,
          phone,
          address,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setInstitution(updated);
        setSaveSuccess('Institution profile information successfully updated and persisted.');
        setTimeout(() => setSaveSuccess(''), 3000);
      } else {
        const err = await res.json();
        setSaveError(err.error || 'Failed to save changes.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
        <p className="text-xs">Loading Institution Workspace Profile...</p>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto p-6">
        <BackButton label="Back to Dashboard" fallbackTo="/dashboard" />
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <p className="text-sm font-semibold">Institution record not found.</p>
        </div>
      </div>
    );
  }

  // RBAC Access Guard: Institution users can only view their own institute. Regional officers only their region.
  const isAuthorized = canUserViewInstitution(user, institution);
  if (!isAuthorized) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto p-6">
        <BackButton label="Back to Dashboard" fallbackTo="/dashboard" />
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Access Restricted by Role Policy</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            You are logged in as <strong>{user?.name}</strong> with role <strong>{user?.role}</strong>. You are only authorized to access records within your assigned institution or regional jurisdiction.
          </p>
          <button
            onClick={() => navigate(user?.institutionId ? `/institution/${user.institutionId}` : '/dashboard')}
            className="px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-950 transition cursor-pointer"
          >
            Go to Your Authorized Workspace
          </button>
        </div>
      </div>
    );
  }

  const totalDeposit = fdrs.reduce((acc, f) => acc + f.principalAmount, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <BackButton label="Back" fallbackTo="/dashboard" />

        {/* Role-Specific Quick Actions */}
        <div className="flex items-center gap-2">
          {canSubmitReleaseRequest(user) && (
            <button
              onClick={() => navigate('/release')}
              className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Request Deposit Release</span>
            </button>
          )}

          {canAddFDRDetails(user) && (
            <button
              onClick={() => navigate('/fdrs/new')}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register New FDR</span>
            </button>
          )}

          <button
            onClick={() => navigate(`/institution/${institution.id}/vault`)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <FolderArchive className="w-3.5 h-3.5 text-indigo-700" />
            <span>Statutory Vault & Checklist</span>
          </button>

          {canUploadDocuments(user) && (
            <button
              onClick={() => navigate('/vault')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>National Vault</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Profile Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-lg shrink-0">
              <GraduationCap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                  Permanent Code: {institution.code}
                </span>
                {institution.category === 'GGSIPU_AFFILIATED' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    GGSIPU-Affiliated College (Verified)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    State Private University
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {institution.approvalStatus}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{institution.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                AICTE {institution.region} Regional Jurisdiction • Established: {institution.establishmentYear} • Discipline: {institution.type}
              </p>
            </div>
          </div>

          {/* Institution Switcher for Officers */}
          {user?.role !== 'INSTITUTION' && allInstitutions.length > 0 && (
            <div className="sm:text-right">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Switch Institution Workspace
              </label>
              <select
                value={selectedInstId}
                onChange={e => setSelectedInstId(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold max-w-xs focus:ring-2 focus:ring-blue-600"
              >
                {allInstitutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.category === 'PRIVATE_UNIVERSITY' ? 'Private Univ' : 'GGSIPU'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Active Security Deposits</span>
            <span className="font-bold text-blue-950 font-mono text-sm">{fdrs.length} FDRs</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Total Lien Value</span>
            <span className="font-bold text-emerald-800 font-mono text-sm">
              ₹{(totalDeposit / 100000).toFixed(1)} Lakhs
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Affiliation Status</span>
            <span className="font-semibold text-slate-800 text-xs">{institution.affiliationStatus}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">State & District</span>
            <span className="font-semibold text-slate-800 text-xs">
              {institution.district}, {institution.state}
            </span>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Editable Profile Form (7 cols) */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-sm text-slate-900">Authorized Contact Information</h3>
            <span className="text-[10px] text-slate-400">Directly persisted to portal registry</span>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Official Contact Person / Representative *</label>
            <input
              type="text"
              required
              value={contactPerson}
              onChange={e => setContactPerson(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Official Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Official Telephone *</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Campus Postal Address *</label>
            <textarea
              rows={3}
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Persisting Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>

        {/* Right: Institution Deposits Summary (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900">Registered Security Deposits</h3>
            <span className="font-mono text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
              {fdrs.length} Deposits
            </span>
          </div>

          {fdrs.length === 0 ? (
            <p className="text-slate-400 py-6 text-center">No active FDR records for this institution.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {fdrs.map(f => (
                <div
                  key={f.id}
                  onClick={() => handleSelectFDR(f.id)}
                  className="p-3 bg-slate-50 hover:bg-blue-50/80 rounded-lg border border-slate-200 hover:border-blue-300 space-y-1 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-950 group-hover:text-blue-700">{f.fdrNumber}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-900">
                      {f.lifecycleStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>{f.bankName}</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{(f.principalAmount / 100000).toFixed(1)} Lakhs
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                    <span>Maturity: {f.maturityDate}</span>
                    <span className="text-blue-700 font-semibold group-hover:underline">
                      View Details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
