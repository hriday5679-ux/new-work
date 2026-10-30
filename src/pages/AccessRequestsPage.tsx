import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Building2,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Calendar,
  Mail,
  Phone,
  FileText,
  BadgeCheck,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { AccessRequest, UserRole } from '../types/index.ts';
import {
  getAccessRequestsList,
  approveFirestoreAccessRequest,
  rejectFirestoreAccessRequest,
} from '../services/firestoreService.ts';
import { CANONICAL_INSTITUTIONS } from '../components/OnboardingModal.tsx';

export const AccessRequestsPage: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const { refreshTrigger } = useSystemDate();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [modifyingRequest, setModifyingRequest] = useState<AccessRequest | null>(null);
  const [overrideRole, setOverrideRole] = useState<UserRole>('INSTITUTION');
  const [overrideInstId, setOverrideInstId] = useState('');
  const [overrideInstName, setOverrideInstName] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        // Fetch from local Express DB
        const res = await fetch('/api/access-requests');
        if (res.ok) {
          const data = await res.json();
          setRequests(data.requests || []);
        }
      } else {
        // Fetch from real Firestore
        try {
          const list = await getAccessRequestsList();
          setRequests(list);
        } catch (fsErr) {
          console.warn('Falling back to local access-requests:', fsErr);
          const res = await fetch('/api/access-requests');
          if (res.ok) {
            const data = await res.json();
            setRequests(data.requests || []);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching access requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [refreshTrigger, isDemoMode]);

  // Handle standard approval
  const handleApprove = async (req: AccessRequest) => {
    setActionLoading(req.id);
    try {
      const adminName = user?.name || 'AICTE System Administrator';

      if (!isDemoMode) {
        await approveFirestoreAccessRequest(req.userId || req.id, {
          role: req.requestedRole || 'INSTITUTION',
          institutionId: req.requestedInstitutionId || '',
          institutionName: req.requestedInstitutionName || '',
          adminName,
        });
      }

      // Also update Express local server db
      await fetch(`/api/access-requests/${req.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: req.requestedRole,
          institutionId: req.requestedInstitutionId,
          institutionName: req.requestedInstitutionName,
          adminName,
        }),
      });

      await fetchRequests();
    } catch (err: any) {
      alert(`Approval error: ${err.message || 'Failed to approve access request'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle rejection with mandatory reason
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId || !rejectionReason.trim()) return;

    setActionLoading(rejectingId);
    try {
      const adminName = user?.name || 'AICTE System Administrator';

      if (!isDemoMode) {
        await rejectFirestoreAccessRequest(rejectingId, rejectionReason.trim(), adminName);
      }

      // Also update Express local server db
      await fetch(`/api/access-requests/${rejectingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: rejectionReason.trim(),
          adminName,
        }),
      });

      setRejectingId(null);
      setRejectionReason('');
      await fetchRequests();
    } catch (err: any) {
      alert(`Rejection error: ${err.message || 'Failed to reject access request'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Approve as Different Role / Institution
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifyingRequest) return;

    setActionLoading(modifyingRequest.id);
    try {
      const adminName = user?.name || 'AICTE System Administrator';

      const instName = overrideInstId
        ? (CANONICAL_INSTITUTIONS.find(i => i.id === overrideInstId)?.name || overrideInstName)
        : overrideInstName;

      if (!isDemoMode) {
        await approveFirestoreAccessRequest(modifyingRequest.userId || modifyingRequest.id, {
          role: overrideRole,
          institutionId: overrideInstId,
          institutionName: instName,
          adminName,
        });
      }

      await fetch(`/api/access-requests/${modifyingRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: overrideRole,
          institutionId: overrideInstId,
          institutionName: instName,
          adminName,
        }),
      });

      setModifyingRequest(null);
      await fetchRequests();
    } catch (err: any) {
      alert(`Approval error: ${err.message || 'Failed to approve with override'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openOverrideModal = (req: AccessRequest) => {
    setModifyingRequest(req);
    setOverrideRole(req.requestedRole || 'INSTITUTION');
    setOverrideInstId(req.requestedInstitutionId || 'inst-01');
    setOverrideInstName(req.requestedInstitutionName || '');
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.userName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        (r.designation && r.designation.toLowerCase().includes(q)) ||
        (r.requestedInstitutionName && r.requestedInstitutionName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">User Access Requests & Authorizations</h2>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin console for reviewing, verifying, and granting role-based access to technical college representatives and AICTE bureau officers.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition border border-slate-300 shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-700' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilterStatus('PENDING')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterStatus === 'PENDING'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Approvals</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 font-mono">
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('APPROVED')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterStatus === 'APPROVED'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Approved Accounts</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 font-mono">
            {approvedCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('REJECTED')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterStatus === 'REJECTED'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected Requests</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 font-mono">
            {rejectedCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('ALL')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterStatus === 'ALL'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>All Requests</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 font-mono">
            {requests.length}
          </span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user name, email, designation, or college..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Requests Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading access requests queue...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
          <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No requests in this view</h3>
          <p className="text-xs text-slate-500 mt-1">
            {filterStatus === 'PENDING'
              ? 'All access requests have been reviewed and approved.'
              : 'No matching records found for the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(req => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';
            const isInstitution = req.accountType === 'INSTITUTION';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-xl border p-4 shadow-xs transition ${
                  isPending
                    ? 'border-amber-300 hover:border-amber-400'
                    : isApproved
                    ? 'border-slate-200'
                    : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* User Profile Coordinates */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold">
                        {req.userName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{req.userName}</h4>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              isInstitution
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {req.accountType}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isPending
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : isApproved
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-50 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{req.userEmail}</span>
                          </span>
                          {req.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{req.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Affiliation / Role details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Official Designation
                        </span>
                        <span className="font-semibold text-slate-900">{req.designation}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Requested Role
                        </span>
                        <span className="font-mono font-bold text-blue-900">
                          {req.requestedRole}
                        </span>
                      </div>

                      {isInstitution ? (
                        <div className="col-span-1 sm:col-span-2">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Affiliated Institution
                          </span>
                          <span className="font-semibold text-slate-900">
                            {req.requestedInstitutionName || 'Unspecified'}
                          </span>
                          {req.requestedInstitutionId && (
                            <span className="text-[10px] font-mono text-slate-500 ml-1.5">
                              (Code: {req.requestedInstitutionId})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="col-span-1 sm:col-span-2 flex items-center gap-4">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">
                              AICTE Region
                            </span>
                            <span className="font-semibold text-slate-900">{req.region || 'Northern'}</span>
                          </div>
                          {req.employeeId && (
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                Employee ID
                              </span>
                              <span className="font-mono font-bold text-slate-900">{req.employeeId}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="col-span-1 sm:col-span-2 text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200">
                        <span>Submitted: {req.submittedAt ? new Date(req.submittedAt).toLocaleString() : 'N/A'}</span>
                        {req.reviewedBy && (
                          <span>
                            Reviewed by: <strong>{req.reviewedBy}</strong> ({req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : ''})
                          </span>
                        )}
                      </div>

                      {/* Rejection Reason if rejected */}
                      {isRejected && req.rejectionReason && (
                        <div className="col-span-1 sm:col-span-2 p-2 bg-rose-100/60 rounded border border-rose-300 text-xs text-rose-900">
                          <strong>Rejection Note:</strong> {req.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {isPending && (
                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={actionLoading === req.id}
                        onClick={() => handleApprove(req)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve Access</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading === req.id}
                        onClick={() => openOverrideModal(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-xs font-semibold transition"
                      >
                        <Edit3 className="w-3 h-3 text-blue-700" />
                        <span>Approve as Other...</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading === req.id}
                        onClick={() => {
                          setRejectingId(req.id);
                          setRejectionReason('');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Reject Access Request</h3>
              <p className="text-xs text-slate-500">
                Please provide a statutory justification for rejecting this account request.
              </p>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Official authorization letter missing or unverified affiliation credentials..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectingId}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-lg font-bold"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve with Override Modal */}
      {modifyingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900">Approve with Custom Role / Scope</h3>
              <p className="text-slate-500">
                Adjust the assigned role or institutional coordinates before granting authorization.
              </p>
            </div>

            <form onSubmit={handleOverrideSubmit} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Applicant</label>
                <div className="p-2 bg-slate-50 rounded border border-slate-200 font-semibold text-slate-800">
                  {modifyingRequest.userName} ({modifyingRequest.userEmail})
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={overrideRole}
                  onChange={e => setOverrideRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="INSTITUTION">INSTITUTION (College / University Representative)</option>
                  <option value="REGIONAL_OFFICER">REGIONAL_OFFICER (Regional Scrutiny Desk)</option>
                  <option value="PGRC_OFFICER">PGRC_OFFICER (Public Grievance Reviewer)</option>
                  <option value="VIGILANCE_OFFICER">VIGILANCE_OFFICER (Chief Vigilance Officer)</option>
                  <option value="ADMINISTRATOR">ADMINISTRATOR (Full AICTE Central Authority)</option>
                </select>
              </div>

              {overrideRole === 'INSTITUTION' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Institution *
                  </label>
                  <select
                    value={overrideInstId}
                    onChange={e => {
                      setOverrideInstId(e.target.value);
                      const inst = CANONICAL_INSTITUTIONS.find(i => i.id === e.target.value);
                      if (inst) setOverrideInstName(inst.name);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <optgroup label="GGSIPU Affiliated Colleges">
                      {CANONICAL_INSTITUTIONS.filter(i => i.category === 'GGSIPU_AFFILIATED').map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.code})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="State Private Universities">
                      {CANONICAL_INSTITUTIONS.filter(i => i.category === 'PRIVATE_UNIVERSITY').map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.code})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModifyingRequest(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === modifyingRequest.id}
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-bold"
                >
                  Grant Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
