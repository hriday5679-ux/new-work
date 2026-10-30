import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building2,
  FastForward,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { FDRRecord } from '../types/index.ts';
import { BackButton } from '../components/BackButton.tsx';
import { useNavigate } from 'react-router-dom';

interface MaturityCalendarProps {
  onSelectFDR?: (id: string) => void;
  onOpenSimulator?: () => void;
}

export const MaturityCalendar: React.FC<MaturityCalendarProps> = ({ onSelectFDR, onOpenSimulator }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { simulatedDate, refreshTrigger } = useSystemDate();
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | '30' | '90' | 'MATURED'>('ALL');
  const [instFilter, setInstFilter] = useState<string>('ALL');
  const [institutions, setInstitutions] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const isPendingInstitution = user?.role === 'INSTITUTION' && user?.accountStatus === 'PENDING';

  useEffect(() => {
    fetch('/api/institutions')
      .then(res => res.json())
      .then(data => setInstitutions(data.institutions || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isPendingInstitution) {
      setFdrs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const url = instFilter !== 'ALL' ? `/api/fdrs?institutionId=${instFilter}` : '/api/fdrs';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setFdrs(data.fdrs || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshTrigger, simulatedDate, instFilter, isPendingInstitution]);

  const filtered = fdrs.filter(f => {
    if (filterPeriod === '30') return f.isUrgentExpiring;
    if (filterPeriod === '90') return f.isExpiringSoon;
    if (filterPeriod === 'MATURED') return f.isMatured || f.lifecycleStatus === 'MATURED';
    return true;
  });

  const groupedByMonth: Record<string, FDRRecord[]> = {};
  const maturedList: FDRRecord[] = [];

  for (const f of filtered) {
    if (f.isMatured || (f.daysToMaturity !== undefined && f.daysToMaturity <= 0)) {
      maturedList.push(f);
    } else {
      const monthKey = f.maturityDate.slice(0, 7); // YYYY-MM
      if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
      groupedByMonth[monthKey].push(f);
    }
  }

  const sortedMonthKeys = Object.keys(groupedByMonth).sort();

  const handleCardClick = (id: string) => {
    if (onSelectFDR) {
      onSelectFDR(id);
    } else {
      navigate(`/fdr/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <BackButton fallbackPath="/dashboard" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Interactive Maturity Radar & Calendar</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Clock: {simulatedDate}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological forecast of security deposit maturities across all AICTE affiliated institutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-blue-950 rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Clock className="w-4 h-4" />
            <span>Open Date Simulator</span>
          </button>
        </div>
      </div>

      {isPendingInstitution && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Institution Verification Pending Approval</h4>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Your institutional access request is currently pending review by an AICTE Administrator. In accordance with statutory security guidelines, historical fixed deposit maturity schedules are restricted until your official credentials are authenticated.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar with Period Chips and Institution Scope */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider pl-1">Filter Window:</span>
          <button
            onClick={() => setFilterPeriod('ALL')}
            className={`px-3 py-1 rounded-lg transition ${
              filterPeriod === 'ALL' ? 'bg-blue-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            All Timeline ({fdrs.length})
          </button>
          <button
            onClick={() => setFilterPeriod('30')}
            className={`px-3 py-1 rounded-lg transition ${
              filterPeriod === '30' ? 'bg-rose-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            Urgent ≤ 30 Days ({fdrs.filter(f => f.isUrgentExpiring).length})
          </button>
          <button
            onClick={() => setFilterPeriod('90')}
            className={`px-3 py-1 rounded-lg transition ${
              filterPeriod === '90' ? 'bg-amber-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            Upcoming ≤ 90 Days ({fdrs.filter(f => f.isExpiringSoon).length})
          </button>
          <button
            onClick={() => setFilterPeriod('MATURED')}
            className={`px-3 py-1 rounded-lg transition ${
              filterPeriod === 'MATURED' ? 'bg-purple-700 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            Already Matured ({fdrs.filter(f => f.isMatured || f.lifecycleStatus === 'MATURED').length})
          </button>
        </div>

        {user?.role !== 'INSTITUTION' && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <select
              aria-label="Filter maturity calendar by institution"
              value={instFilter}
              onChange={e => setInstFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden pr-2 cursor-pointer max-w-[220px] truncate"
            >
              <option value="ALL">All Institutions ({institutions.length || 21})</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.code} — {inst.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Matured Bucket (Past Due) */}
      {maturedList.length > 0 && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-200 text-purple-900 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wide">
                Already Matured Deposits ({maturedList.length} FDRs)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-purple-900">
              Total: ₹{(maturedList.reduce((acc, f) => acc + f.principalAmount, 0) / 100000).toFixed(1)} Lakhs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {maturedList.map(f => (
              <div
                key={f.id}
                onClick={() => handleCardClick(f.id)}
                className="bg-white p-3.5 rounded-lg border border-purple-200 shadow-2xs hover:border-purple-400 cursor-pointer transition text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-purple-950">{f.fdrNumber}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    Matured
                  </span>
                </div>
                <p className="font-bold text-slate-900 truncate">{f.institutionName}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Matured on: {f.maturityDate}</span>
                  <span className="font-mono font-bold text-slate-900">₹{(f.principalAmount / 100000).toFixed(1)}L</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Timeline Buckets */}
      <div className="space-y-6">
        {sortedMonthKeys.map(monthKey => {
          const list = groupedByMonth[monthKey];
          const totalMonthAmount = list.reduce((acc, f) => acc + f.principalAmount, 0);
          const dateObj = new Date(monthKey + '-01T00:00:00Z');
          const monthLabel = dateObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

          return (
            <div key={monthKey} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-700" />
                  <h3 className="text-sm font-bold text-slate-900">{monthLabel}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {list.length} FDRs
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-950">
                  Maturing: ₹{(totalMonthAmount / 100000).toFixed(1)} Lakhs
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map(f => {
                  const isUrgent = f.isUrgentExpiring;
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleCardClick(f.id)}
                      className={`p-3.5 rounded-lg border shadow-2xs hover:shadow-sm cursor-pointer transition text-xs space-y-1.5 ${
                        isUrgent
                          ? 'bg-rose-50/60 border-rose-200 hover:border-rose-400'
                          : 'bg-white border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-blue-950">{f.fdrNumber}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isUrgent ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {f.daysToMaturity}d left
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 truncate">{f.institutionName}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{f.bankName}</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{(f.principalAmount / 100000).toFixed(1)}L
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
