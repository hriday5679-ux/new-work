import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  ShieldAlert,
  User,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { AuditLog } from '../types/index.ts';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { BackButton } from '../components/BackButton.tsx';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const { refreshTrigger } = useSystemDate();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (entityFilter !== 'ALL') params.append('entityType', entityFilter);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, entityFilter, roleFilter, refreshTrigger]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity Label', 'Details', 'IP Address'];
    const rows = logs.map(l => [
      l.timestamp,
      `"${l.userName}"`,
      l.role,
      l.action,
      l.entityType,
      `"${l.entityLabel}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AICTE_FDR360_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      <BackButton label="Back to Dashboard" fallbackTo="/dashboard" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Tamper-Evident Regulatory Audit Trail</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900">
              {logs.length} Logged Events
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable chronological logging of all FDR lifecycle updates, officer scrutiny notes, clearances, and simulated date shifts.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by actor, action, remarks, or entity..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Entity Types</option>
            <option value="FDR">FDR Records</option>
            <option value="RELEASE">Release Requests</option>
            <option value="DOCUMENT">Documents & OCR</option>
            <option value="INSTITUTION">Institutions</option>
            <option value="TIME_SIMULATOR">Time Simulator</option>
            <option value="SYSTEM">System & Auth</option>
          </select>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Roles</option>
            <option value="INSTITUTION">Institution User</option>
            <option value="REGIONAL_OFFICER">Regional Officer</option>
            <option value="PGRC_OFFICER">PGRC Officer</option>
            <option value="VIGILANCE_OFFICER">Vigilance Officer</option>
            <option value="ADMINISTRATOR">Administrator</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
            <p className="text-xs">Fetching audit history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No audit logs found matching active filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Timestamp (UTC)</th>
                  <th className="px-4 py-3">Actor & Role</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Event Details & Remarks</th>
                  <th className="px-4 py-3 text-right">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-slate-900">{log.userName}</p>
                      <span className="text-[10px] text-blue-900 font-mono font-semibold">{log.role}</span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-blue-950 block">
                        {log.entityLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{log.entityType}</span>
                    </td>

                    <td className="px-4 py-3 text-slate-700 max-w-md">
                      {log.details}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
