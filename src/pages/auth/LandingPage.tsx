import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Lock,
  FileCheck2,
  History,
  FileSpreadsheet,
  CalendarDays,
  CheckCircle2,
  Award,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface LandingPageProps {
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateLogin, onNavigateRegister }) => {
  const { enterDemoMode } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Header */}
      <header className="border-b border-slate-800 bg-[#07162b]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group hover:opacity-95 transition">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-blue-950 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white">AICTE FDR360</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  SIH26265
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Security Deposit & FDR Lifecycle Portal</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/demo"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 hover:text-white hover:bg-slate-800/80 transition hidden sm:inline-flex items-center gap-1.5 border border-amber-500/30"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Try Demo Mode</span>
            </Link>

            <Link
              to="/login"
              onClick={onNavigateLogin}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800/90 transition border border-slate-700/80"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              onClick={onNavigateRegister}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-900/40"
            >
              Register Institution
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-800/80">
        <div className="absolute inset-0 bg-radial from-blue-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-700/40 text-blue-300 text-xs font-semibold">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Smart India Hackathon SIH26265 • Technical Education Regulatory Portal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Streamlining AICTE Security Deposits & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400">
              FDR Lifecycle Management
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A unified, secure enterprise portal replacing manual tracking with automated 10-year lock-in surveillance, AI OCR receipt verification, 3-tier statutory clearances, and tamper-evident audit trails.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              to="/login"
              onClick={onNavigateLogin}
              className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-xl shadow-blue-900/40"
            >
              <span>Access Institutional Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/register"
              onClick={onNavigateRegister}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <span>Register New Institution</span>
            </Link>

            <Link
              to="/demo"
              className="w-full sm:w-auto px-5 py-3.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Try Demo Mode (Simulated Data)</span>
            </Link>
          </div>

          {/* Live System Highlights */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold block">Statutory Lock-In</span>
              <span className="text-xl font-bold font-mono text-white">10 Years</span>
              <span className="text-[10px] text-blue-400 block">Joint Lien with Regional Officer</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold block">Maturity Alerts</span>
              <span className="text-xl font-bold font-mono text-white">90 • 30 • 7 Days</span>
              <span className="text-[10px] text-emerald-400 block">Dynamic Window Surveillance</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold block">Regulatory Clearance</span>
              <span className="text-xl font-bold font-mono text-white">3-Tier Matrix</span>
              <span className="text-[10px] text-purple-400 block">RO • PGRC • Vigilance Desk</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold block">Audit Logging</span>
              <span className="text-xl font-bold font-mono text-white">Tamper Evident</span>
              <span className="text-[10px] text-amber-400 block">Append-Only Regulatory Ledger</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Grid */}
      <section className="py-16 bg-slate-900/40 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Enterprise Features Built for Smart India Hackathon
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Designed specifically to solve problem statement SIH26265 for technical educational institutions and council regulators across India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Automated Maturity Surveillance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tracks 10-year lock-in maturities with 90, 30, and 7-day urgent alert thresholds. Includes an interactive date-simulation engine for testing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">AI OCR Receipt Extraction</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instant extraction of FDR numbers, joint lien operating clauses, IFSC codes, and principal deposit values from physical receipts with discrepancy detection.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">3-Tier Statutory Clearance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sequential sign-offs by Regional Officer (RO), Public Grievance Redressal Cell (PGRC), and Chief Vigilance Officer (CVO) before final NOC issuance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-slate-500">
        <p>All India Council for Technical Education • New Delhi • SIH26265 Official Prototype</p>
      </footer>
    </div>
  );
};
