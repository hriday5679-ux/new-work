import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Building2,
  MapPin,
  GraduationCap,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Institution } from '../types/index.ts';
import { ALL_INDIAN_STATES, AICTE_REGIONS, INSTITUTION_TYPES, AicteRegion } from '../utils/aicteRegions.ts';

interface InstitutionDirectoryPickerProps {
  onSelect: (institution: Institution) => void;
  selectedId?: string;
  enforceRegion?: string; // If officer is restricted to a region
  title?: string;
  subtitle?: string;
}

export const InstitutionDirectoryPicker: React.FC<InstitutionDirectoryPickerProps> = ({
  onSelect,
  selectedId,
  enforceRegion,
  title = 'AICTE Approved Institution Directory',
  subtitle = 'Search national register by name, AICTE ID, state, or district',
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>(enforceRegion || 'ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isCsvMissing, setIsCsvMissing] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch directory results
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (selectedState !== 'ALL') params.append('state', selectedState);
    if (selectedRegion !== 'ALL') params.append('region', selectedRegion);
    if (selectedType !== 'ALL') params.append('type', selectedType);
    params.append('page', page.toString());
    params.append('limit', '10');

    fetch(`/api/institutions/directory?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (!isCancelled) {
          setInstitutions(data.institutions || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
          setIsCsvMissing(Boolean(data.isCsvMissing));
          setNoticeMessage(data.message || '');
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, selectedState, selectedRegion, selectedType, page]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-base sm:text-lg">{title}</h3>
        </div>
        <p className="text-xs text-blue-200">{subtitle}</p>
      </div>

      {/* CSV Notice Banner */}
      {isCsvMissing && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 sm:px-5 flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">National Directory File Notice</p>
            <p className="text-amber-800 mt-0.5">
              <code>/data/aicte_institutions.csv</code> was not found. Showing verified benchmark sample institutions. Place your official CSV in <code>/data</code> to query the complete national database.
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Institute Name, AICTE Permanent Code (e.g. 1-931829), District, or State..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder:text-slate-400 shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* State Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">State / UT</label>
            <select
              value={selectedState}
              onChange={e => {
                setSelectedState(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-700"
            >
              <option value="ALL">All States / UTs</option>
              {ALL_INDIAN_STATES.map(st => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">AICTE Region</label>
            <select
              value={selectedRegion}
              disabled={Boolean(enforceRegion)}
              onChange={e => {
                setSelectedRegion(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {enforceRegion ? (
                <option value={enforceRegion}>{enforceRegion} Regional Office</option>
              ) : (
                <>
                  <option value="ALL">All Regions (National)</option>
                  {AICTE_REGIONS.map(reg => (
                    <option key={reg} value={reg}>
                      {reg} Region
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Institution Type Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Institution Type</label>
            <select
              value={selectedType}
              onChange={e => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-700"
            >
              <option value="ALL">All Disciplines / Types</option>
              {INSTITUTION_TYPES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto max-h-[380px] p-3 space-y-2">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Querying AICTE National Institution Register...
          </div>
        ) : institutions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No matching AICTE institutions found</p>
            <p className="text-[11px] text-slate-500 mt-1">Try relaxing filters or searching by partial AICTE Code.</p>
          </div>
        ) : (
          institutions.map(inst => {
            const isSelected = selectedId === inst.id || selectedId === inst.code;
            return (
              <div
                key={inst.id}
                onClick={() => onSelect(inst)}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">{inst.name}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                      ID: {inst.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {inst.type}
                    </span>
                    {inst.isDemoReference && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                        Demo Sample
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {inst.district ? `${inst.district}, ` : ''}{inst.state} ({inst.region} Region)
                    </span>
                    {inst.programmes && (
                      <span className="flex items-center gap-1 text-slate-600 truncate max-w-md">
                        <GraduationCap className="w-3 h-3 text-slate-400" />
                        {inst.programmes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-bold text-blue-900 bg-slate-100 hover:bg-blue-600 hover:text-white px-3 py-1 rounded transition-colors"
                    >
                      Choose
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing <strong>{institutions.length}</strong> of <strong>{total}</strong> institutions
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
