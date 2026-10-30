import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Users,
  Building2,
  Mail,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { BackButton } from '../components/BackButton.tsx';
import {
  UserRole,
  RoleChangeRequest,
  AccessRequest,
  getRoleDisplayName,
} from '../types/index.ts';
import {
  getRoleChangeRequestsList,
  approveRoleChangeRequest,
  rejectRoleChangeRequest,
  getAccessRequestsList,
  approveFirestoreAccessRequest,
  rejectFirestoreAccessRequest,
} from '../services/firestoreService.ts';

export const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'roleChanges' | 'accessRequests' | 'usersList'>('roleChanges');
  const [roleRequests, setRoleRequests] = useState<RoleChangeRequest[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectType, setRejectType] = useState<'role' | 'access'>('role');
  const [rejectReason, setRejectReason] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roleList, accList] = await Promise.all([
        getRoleChangeRequestsList().catch(() => []),
        getAccessRequestsList().catch(() => []),
      ]);
      setRoleRequests(roleList);
      setAccessRequests(accList);

      // Fetch users list from server
      const res = await fetch('/api/auth/current');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.availableUsers || []);
      }
    } catch (err) {
      console.error('Error loading admin user data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveRoleChange = async (req: RoleChangeRequest) => {
    setActionLoading(req.id);
    try {
      const adminName = user?.name || 'Portal Admin';
      await approveRoleChangeRequest(req.id, adminName);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRoleChange = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    setActionLoading(rejectingId);
    try {
      const adminName = user?.name || 'Portal Admin';
      if (rejectType === 'role') {
        await rejectRoleChangeRequest(rejectingId, rejectReason.trim(), adminName);
      } else {
        await rejectFirestoreAccessRequest(rejectingId, rejectReason.trim(), adminName);
      }
      setRejectingId(null);
      setRejectReason('');
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAccessRequest = async (req: AccessRequest) => {
    setActionLoading(req.id);
    try {
      const adminName = user?.name || 'Portal Admin';
      await approveFirestoreAccessRequest(req.userId || req.id, {
        role: req.requestedRole || 'INSTITUTION',
        institutionId: req.requestedInstitutionId || '',
        institutionName: req.requestedInstitutionName || '',
        adminName,
      });
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve access request');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <BackButton label="Back to Dashboard" fallbackTo="/dashboard" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              User & Role Management
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
              Portal Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review role change requests, authorize access credentials, and audit administrative permissions.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('roleChanges')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'roleChanges'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Role Change Requests</span>
          {roleRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
              {roleRequests.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('accessRequests')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'accessRequests'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Access Requests</span>
          {accessRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">
              {accessRequests.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('usersList')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'usersList'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>System Users Directory</span>
        </button>
      </div>

      {/* TAB 1: Role Change Requests */}
      {activeTab === 'roleChanges' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Pending & Processed Role Change Requests
            </h3>
            <span className="text-xs text-slate-500">
              Total: {roleRequests.length} requests
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading requests...</div>
          ) : roleRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No role change requests found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {roleRequests.map(req => {
                const isPending = req.status === 'PENDING';
                return (
                  <div key={req.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{req.userName}</span>
                        <span className="text-xs text-slate-500">({req.userEmail})</span>
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

                      <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap">
                        <span className="font-medium">Current: {getRoleDisplayName(req.currentRole)}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-blue-900">
                          Target: {getRoleDisplayName(req.targetRole)}
                        </span>
                        {req.targetRegion && (
                          <span className="text-[11px] text-slate-500">({req.targetRegion} Region)</span>
                        )}
                        {req.targetInstitutionName && (
                          <span className="text-[11px] text-slate-500">({req.targetInstitutionName})</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="font-bold">Justification: </span>
                        {req.justification}
                      </p>

                      <span className="text-[10px] text-slate-400 block">
                        Submitted: {new Date(req.submittedAt).toLocaleString()}
                        {req.reviewedBy && ` • Reviewed by ${req.reviewedBy}`}
                      </span>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={actionLoading === req.id}
                          onClick={() => handleApproveRoleChange(req)}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === req.id}
                          onClick={() => {
                            setRejectingId(req.id);
                            setRejectType('role');
                            setRejectReason('');
                          }}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Access Requests */}
      {activeTab === 'accessRequests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              New Officer Access Queue
            </h3>
            <span className="text-xs text-slate-500">Total: {accessRequests.length} requests</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading access requests...</div>
          ) : accessRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No access requests pending.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {accessRequests.map(req => {
                const isPending = req.status === 'PENDING';
                return (
                  <div key={req.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{req.userName}</span>
                        <span className="text-xs text-slate-500">({req.userEmail})</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Requested Role: <span className="font-bold">{getRoleDisplayName(req.requestedRole)}</span> • Designation: {req.designation}
                      </p>
                      {req.region && (
                        <p className="text-[11px] text-slate-500">Jurisdiction: {req.region} Region</p>
                      )}
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={actionLoading === req.id}
                          onClick={() => handleApproveAccessRequest(req)}
                          className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve Access</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === req.id}
                          onClick={() => {
                            setRejectingId(req.id);
                            setRejectType('access');
                            setRejectReason('');
                          }}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: System Users Directory */}
      {activeTab === 'usersList' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Registered Accounts & Roles
            </h3>
            <span className="text-xs text-slate-500">Total: {usersList.length} accounts</span>
          </div>

          <div className="divide-y divide-slate-100">
            {usersList.map((u: any) => (
              <div key={u.id} className="p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0">
                    {u.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">{u.name}</span>
                    <span className="text-[11px] text-slate-500">{u.email}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-blue-900 block">{getRoleDisplayName(u.role)}</span>
                  <span className="text-[11px] text-slate-500">{u.designation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Specify Rejection Reason</h3>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="State the reason for rejecting this request..."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectRoleChange}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
