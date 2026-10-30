import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Landmark, GraduationCap, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const SelectTypePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07162b] via-[#0a1e38] to-[#0f2d52] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="max-w-2xl w-full bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-10 space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-blue-950 shadow-lg">
            <Building2 className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            First-Time Setup • Step 1 of 2
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
            Who are you?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Welcome to AICTE FDR360, {user?.name || user?.email || 'User'}. Please select your organization profile to configure your role-based workspace.
          </p>
        </div>

        {/* 2 Options Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option A: AICTE Employee / Officer */}
          <button
            type="button"
            onClick={() => navigate('/aicte/select-role')}
            className="p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-700 hover:bg-blue-50/50 text-left transition group cursor-pointer flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900">
                  AICTE Employee / Officer
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Headquarters bureau officer, Regional Officer, Scrutiny dealing assistant, Accounts & Finance, or Audit Officer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 group-hover:translate-x-1 transition">
              <span>Select AICTE Role</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Option B: Institution Representative */}
          <button
            type="button"
            onClick={() => navigate('/institution/select')}
            className="p-6 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 text-left transition group cursor-pointer flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900">
                  Institution Representative
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Affiliated college/polytechnic representative: Principal/Director, Registrar, Accounts Officer, or Nodal Officer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition">
              <span>Link Institution</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Informational security note */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-blue-900 shrink-0" />
          <span>
            AICTE Security Deposit and FDR records are protected by strict Attribute-Based Access Control (ABAC).
          </span>
        </div>
      </div>
    </div>
  );
};

export default SelectTypePage;
