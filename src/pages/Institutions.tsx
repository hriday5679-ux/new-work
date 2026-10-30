import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldCheck,
  Building,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { Institution, FDRRecord, InstitutionCategory } from '../types/index.ts';

import { BackButton } from '../components/BackButton.tsx';
import { useNavigate } from 'react-router-dom';

interface InstitutionsProps {
  onSelectFDR?: (id: string) => void;
  onSelectInstitutionProfile?: (id: string) => void;
  onNavigateRegister?: () => void;
}

export const Institutions: React.FC<InstitutionsProps> = ({
  onSelectFDR,
  onSelectInstitutionProfile,
  onNavigateRegister,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshTrigger } = useSystemDate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [instFDRs, setInstFDRs] = useState<FDRRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'GGSIPU_AFFILIATED' | 'PRIVATE_UNIVERSITY'>('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal: Register Institution
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newState, setNewState] = useState('Delhi');
  const [newRegion, setNewRegion] = useState<'Northern' | 'Western' | 'Eastern' | 'Southern' | 'Central' | 'South-West' | 'North-West'>('Northern');
  const [newType, setNewType] = useState<'Engineering & Tech' | 'Management' | 'Pharmacy' | 'Architecture' | 'Polytechnic'>('Engineering & Tech');
  const [newCategory, setNewCategory] = useState<InstitutionCategory>('GGSIPU_AFFILIATED');
  const [newAffiliationVerified, setNewAffiliationVerified] = useState<boolean>(false);
  const [newAddress, setNewAddress] = useState('');
  const [createError, setCreateError] = useState('');

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (regionFilter !== 'ALL') params.append('region', regionFilter);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);

      const res = await fetch(`/api/institutions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInstitutions(data.institutions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, [search, categoryFilter, regionFilter, typeFilter, refreshTrigger]);

  const handleOpenDetail = async (inst: Institution) => {
    setSelectedInst(inst);
    try {
      const res = await fetch(`/api/institutions/${inst.id}`);
      if (res.ok) {
        const data = await res.json();
        setInstFDRs(data.fdrs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    try {
      const res = await fetch('/api/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          code: newCode,
          state: newState,
          region: newRegion,
          type: newType,
          category: newCategory,
          isAffiliationVerified: newAffiliationVerified,
          address: newAddress,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewName('');
        setNewCode('');
        setNewAddress('');
        await fetchInstitutions();
      } else {
        const err = await res.json();
        setCreateError(err.error || 'Failed to create institution.');
      }
    } catch (e: any) {
      setCreateError(e.message || 'Error occurred.');
    }
  };

  const affiliatedCount = institutions.filter(i => i.category === 'GGSIPU_AFFILIATED').length;
  const privateUnivCount = institutions.filter(i => i.category === 'PRIVATE_UNIVERSITY').length;

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <BackButton fallbackPath="/dashboard" />
      </div>

      {/* Page Title & Register action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">AICTE Approved Institutions Directory</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 font-mono">
              {institutions.length} Institutes
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real educational institution reference directory featuring distinct GGSIPU-affiliated colleges and State Private Universities.
          </p>
        </div>

        {['ADMINISTRATOR', 'REGIONAL_OFFICER'].includes(user?.role || '') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Register Institution</span>
          </button>
        )}
      </div>

      {/* Prominent Benchmark Notice */}
      <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>DEMO DATA — NOT REAL:</strong> All institution names displayed (e.g. Maharaja Agrasen Institute of Technology, BPIT, Amity University, Sharda University) represent real public reference institutions. Fictional FDR transactions, deposits, and clearances are benchmark test data. Affiliated colleges and private universities are maintained in separate, distinct categories.
        </p>
      </div>

      {/* Category Tabs: GGSIPU Affiliated Colleges vs Private Universities */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            categoryFilter === 'ALL'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>All Categories</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/20">
            {institutions.length}
          </span>
        </button>

        <button
          onClick={() => setCategoryFilter('GGSIPU_AFFILIATED')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            categoryFilter === 'GGSIPU_AFFILIATED'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'bg-white text-indigo-900 hover:bg-indigo-50 border border-indigo-200'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
          <span>GGSIPU Affiliated Colleges</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-100 text-indigo-900">
            {categoryFilter === 'GGSIPU_AFFILIATED' ? institutions.length : 12}
          </span>
        </button>

        <button
          onClick={() => setCategoryFilter('PRIVATE_UNIVERSITY')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            categoryFilter === 'PRIVATE_UNIVERSITY'
              ? 'bg-purple-900 text-white shadow-xs'
              : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
          }`}
        >
          <Building className="w-3.5 h-3.5 text-purple-600" />
          <span>Private Universities</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-100 text-purple-900">
            {categoryFilter === 'PRIVATE_UNIVERSITY' ? institutions.length : 9}
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by college name, code, district, or university act..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All AICTE Regions</option>
            <option value="Northern">Northern</option>
            <option value="North-West">North-West</option>
            <option value="Western">Western</option>
            <option value="Southern">Southern</option>
            <option value="Eastern">Eastern</option>
            <option value="Central">Central</option>
            <option value="South-West">South-West</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Disciplines</option>
            <option value="Engineering & Tech">Engineering & Tech</option>
            <option value="Management">Management</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Architecture">Architecture</option>
            <option value="Polytechnic">Polytechnic</option>
          </select>

          {(search || regionFilter !== 'ALL' || typeFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('ALL');
                setRegionFilter('ALL');
                setTypeFilter('ALL');
              }}
              className="text-xs text-blue-700 font-bold hover:underline px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Grid of Institution Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading directory...</div>
      ) : institutions.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Institutions Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting the search or category filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions.map(inst => {
            const isPrivateUniv = inst.category === 'PRIVATE_UNIVERSITY';

            return (
              <div
                key={inst.id}
                onClick={() => handleOpenDetail(inst)}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-400 hover:shadow-md cursor-pointer transition flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {inst.code}
                    </span>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isPrivateUniv
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                      }`}
                    >
                      {isPrivateUniv ? 'Private University' : 'GGSIPU Affiliated'}
                    </span>
                  </div>

                  {/* Institution Name */}
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-900 transition line-clamp-2">
                    {inst.name}
                  </h3>

                  {/* Affiliation / Statutory Status Badge */}
                  <div>
                    {isPrivateUniv ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                        <Building className="w-3 h-3 text-purple-600 shrink-0" />
                        <span className="truncate">{inst.affiliationStatus || 'State Private University'}</span>
                      </span>
                    ) : inst.isAffiliationVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>GGSIPU-Affiliated (Verified)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Affiliation requires verification</span>
                      </span>
                    )}
                  </div>

                  {/* Location & Region */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{inst.district}, {inst.state} ({inst.region} Region)</span>
                  </div>
                </div>

                {/* Footer with Deposit Sum & Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Deposit Under Lien</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{(inst.totalDepositAmount / 100000).toFixed(1)} Lakhs
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/institution/${inst.id}/vault`);
                      }}
                      className="text-purple-700 hover:text-purple-900 font-semibold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3 text-purple-600" />
                      <span>Vault</span>
                    </button>
                    <span className="text-blue-700 font-semibold text-xs flex items-center gap-1 group-hover:underline">
                      <span>FDRs</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Institution Detail Modal */}
      {selectedInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedInst.code}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      selectedInst.category === 'PRIVATE_UNIVERSITY'
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-indigo-100 text-indigo-900'
                    }`}
                  >
                    {selectedInst.categoryLabel}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedInst.name}</h3>
                <p className="text-xs text-slate-500">{selectedInst.type} • Est. {selectedInst.establishmentYear}</p>
              </div>
              <button
                onClick={() => setSelectedInst(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Benchmark notice inside modal */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[11px] text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                <strong>DEMO DATA — NOT REAL:</strong> Fictional transactions linked to this real institution reference for AICTE platform evaluation.
              </span>
            </div>

            {/* Institution Info Summary */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Affiliation / Regulatory Status</span>
                <span className="font-semibold text-slate-800">
                  {selectedInst.affiliationStatus}
                </span>
                {!selectedInst.isAffiliationVerified && selectedInst.category === 'GGSIPU_AFFILIATED' && (
                  <span className="block text-[10px] text-amber-700 font-medium">
                    (Requires statutory verification of current academic session)
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">AICTE Jurisdiction Region</span>
                <span className="font-semibold text-slate-800">{selectedInst.region} Regional Office</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px]">Official Campus Address</span>
                <span className="font-medium text-slate-800">{selectedInst.address}</span>
              </div>
            </div>

            {/* Linked FDR Records */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Security Deposits Under AICTE Joint Lien ({instFDRs.length})
                </h4>
                <span className="text-xs font-mono font-bold text-blue-900">
                  Total: ₹{(selectedInst.totalDepositAmount / 100000).toFixed(1)} Lakhs
                </span>
              </div>

              {instFDRs.length === 0 ? (
                <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-lg text-xs">
                  No active FDR security deposits registered for this institute in the demo dataset.
                </div>
              ) : (
                <div className="space-y-2">
                  {instFDRs.map(f => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedInst(null);
                        if (onSelectFDR) {
                          onSelectFDR(f.id);
                        } else {
                          navigate(`/fdr/${f.id}`);
                        }
                      }}
                      className="p-3 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-lg cursor-pointer transition flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-900">{f.fdrNumber}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-700">
                            {f.lifecycleStatus}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[11px] block mt-0.5">
                          {f.bankName} • Matures: <span className="font-mono">{f.maturityDate}</span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 block">
                          ₹{(f.principalAmount / 100000).toFixed(1)}L
                        </span>
                        <span className="text-[10px] text-blue-700 hover:underline">
                          View Details →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const instId = selectedInst.id;
                    setSelectedInst(null);
                    if (onSelectInstitutionProfile) {
                      onSelectInstitutionProfile(instId);
                    } else {
                      navigate(`/institution/${instId}`);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const instId = selectedInst.id;
                    setSelectedInst(null);
                    navigate(`/institution/${instId}/vault`);
                  }}
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                  <span>Statutory Vault & Checklist</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedInst(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition ml-auto cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Institution Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Register Technical Institution</h3>
                <p className="text-xs text-slate-500">Add an approved institute to AICTE Master Registry</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maharaja Agrasen Institute of Technology"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Permanent Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1-1099-XYZ"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="GGSIPU_AFFILIATED">GGSIPU Affiliated College</option>
                    <option value="PRIVATE_UNIVERSITY">Private University</option>
                  </select>
                </div>
              </div>

              {newCategory === 'GGSIPU_AFFILIATED' && (
                <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="affVerified"
                    checked={newAffiliationVerified}
                    onChange={e => setNewAffiliationVerified(e.target.checked)}
                    className="rounded text-blue-900"
                  />
                  <label htmlFor="affVerified" className="text-indigo-900 font-semibold cursor-pointer">
                    Current GGSIPU Affiliation Officially Verified
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">AICTE Region *</label>
                  <select
                    value={newRegion}
                    onChange={e => setNewRegion(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Northern">Northern</option>
                    <option value="North-West">North-West</option>
                    <option value="Western">Western</option>
                    <option value="Southern">Southern</option>
                    <option value="Eastern">Eastern</option>
                    <option value="Central">Central</option>
                    <option value="South-West">South-West</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discipline Type *</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Engineering & Tech">Engineering & Tech</option>
                    <option value="Management">Management</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Polytechnic">Polytechnic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Address</label>
                <input
                  type="text"
                  placeholder="Campus address, City, Pincode"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold transition shadow-xs"
                >
                  Save to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
