import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  FileX,
  FileWarning,
  ExternalLink,
} from 'lucide-react';
import { DEMO_CASES_CATALOG } from '../data/fictionalDemoData.ts';

export const DemoCasesPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MISSING' | 'MISMATCH' | 'LIEN' | 'CLEAN'>('ALL');

  const filteredCases = DEMO_CASES_CATALOG.filter(c => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'MISSING') return c.category === 'MISSING_DOCUMENT';
    if (activeTab === 'MISMATCH') return c.category === 'AMOUNT_MISMATCH' || c.category === 'NAME_MISMATCH';
    if (activeTab === 'LIEN') return c.category === 'LIEN_DEFECT';
    if (activeTab === 'CLEAN') return c.category === 'CLEAN';
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden mb-6">
      {/* Header bar */}
      <div
        onClick={() => setIsExpanded(p => !p)}
        className="p-3.5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm tracking-wide">
                Officer Demo & Benchmark Scrutiny Cases (12 Test Institutions)
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
                SIH26265 Evaluation
              </span>
            </div>
            <p className="text-[11px] text-blue-200">
              Quick-access jump panel: 4 Missing Document Cases • 3 Amount Mismatches • 2 Name Mismatches • 2 Lien Defects • 3 Clean Cases
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3.5 bg-slate-50 space-y-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-blue-950 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              All 12 Cases
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MISSING')}
              className={`px-3 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                activeTab === 'MISSING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Missing Docs (4)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MISMATCH')}
              className={`px-3 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                activeTab === 'MISMATCH'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Amount & Name Mismatches (5)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('LIEN')}
              className={`px-3 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                activeTab === 'LIEN'
                  ? 'bg-red-700 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Lien Defect (2)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CLEAN')}
              className={`px-3 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                activeTab === 'CLEAN'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Clean Verified (3)
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredCases.map(item => (
              <div
                key={item.institutionId}
                className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between space-y-2 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        item.category === 'CLEAN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.category === 'MISSING_DOCUMENT'
                          ? 'bg-amber-100 text-amber-800'
                          : item.category === 'LIEN_DEFECT'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.category.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{item.institutionId}</span>
                  </div>

                  <h4 className="font-bold text-slate-900 leading-snug">{item.label}</h4>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <Link
                    to={`/institution/${item.institutionId}/vault`}
                    className="font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
                  >
                    <span>Open Vault & Audit</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <Link
                    to={`/institution/${item.institutionId}`}
                    className="text-slate-500 hover:text-slate-700 font-semibold"
                  >
                    Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
