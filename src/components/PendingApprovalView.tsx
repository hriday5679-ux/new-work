import React from 'react';
import { ShieldAlert, Clock, LogOut, Sparkles, Building2, UserCheck, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const PendingApprovalView: React.FC = () => {
  const { user, signOut, enterDemoMode, refreshProfile } = useAuth();

  return (
    <div className="min-h-screen bg-[#07162b] flex flex-col justify-between text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Tricolor Government Strip */}
      <div className="h-2 w-full flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-[#0a1e38] rounded-2xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Emblem & Status Icon */}
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-blue-950 font-black rounded-full flex items-center justify-center text-[10px]">
              !
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Regulatory Verification in Progress
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Awaiting Administrator Approval
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Your official request for an AICTE Regulatory Bureau account has been registered and forwarded to the Central System Administrator for identity verification.
            </p>
          </div>

          {/* Submitted Request Card */}
          <div className="bg-[#071426] p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 text-[11px]">Applicant Name</span>
              <span className="font-bold text-white">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 text-[11px]">Official Email</span>
              <span className="font-mono text-blue-300">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 text-[11px]">Requested Role</span>
              <span className="font-bold text-amber-400">{user?.requestedRole || user?.role}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 text-[11px]">Designation</span>
              <span className="text-slate-200">{user?.designation}</span>
            </div>
            {user?.region && (
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 text-[11px]">AICTE Region</span>
                <span className="text-slate-200">{user?.region} Regional Office</span>
              </div>
            )}
            {user?.employeeId && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Employee ID</span>
                <span className="font-mono text-slate-200">{user?.employeeId}</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-800/40 text-[11px] text-blue-200 text-left flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              In accordance with AICTE Zero-Trust security rules, official clearance authorities (RO scrutiny, PGRC clearance, Vigilance sign-off) are locked until authorization is granted.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={refreshProfile}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-amber-300" />
              <span>Check Approval Status (Refresh)</span>
            </button>

            <button
              onClick={() => enterDemoMode('REGIONAL_OFFICER')}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Portal in Evaluator Demo Mode (Judge Sandbox)</span>
            </button>

            <button
              onClick={signOut}
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition border border-slate-700 flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of Current Account</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 text-center text-[11px] text-slate-500 border-t border-slate-800/80">
        AICTE FDR360 • Smart India Hackathon SIH26265 • All India Council for Technical Education
      </div>
    </div>
  );
};
