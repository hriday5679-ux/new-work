import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  UserCheck,
  ChevronDown,
  Building,
  Shield,
  FileCheck,
  LogOut,
  Sparkles,
  Menu,
  AlertTriangle,
  Mail,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSystemDate } from '../context/SystemDateContext.tsx';
import { UserRole, getRoleDisplayName } from '../types/index.ts';

interface HeaderProps {
  onOpenSimulator: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  onToggleSidebarMobile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSimulator,
  onOpenNotifications,
  unreadNotificationsCount,
  onToggleSidebarMobile,
}) => {
  const {
    user,
    availableUsers,
    switchPersona,
    signOut,
    isDemoMode,
    exitDemoMode,
    emailVerified,
    resendVerificationEmail,
  } = useAuth();
  const navigate = useNavigate();
  const { simulatedDate, isDateSimulated } = useSystemDate();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    const label = getRoleDisplayName(role);
    if (role === 'CHAIRMAN_MEMBER_SECRETARY') {
      return { label, bg: 'bg-purple-100 text-purple-900 border-purple-300' };
    }
    if (role === 'DIRECTOR_ADVISOR') {
      return { label, bg: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
    }
    if (role === 'REGIONAL_OFFICER') {
      return { label: `${label} (${user?.region || 'Northern'})`, bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    if (role === 'ACCOUNTS_FINANCE_OFFICER') {
      return { label, bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    }
    if (role === 'SECTION_OFFICER') {
      return { label, bg: 'bg-cyan-100 text-cyan-900 border-cyan-300' };
    }
    if (role === 'AUDIT_OFFICER') {
      return { label, bg: 'bg-slate-200 text-slate-800 border-slate-400' };
    }
    if (role === 'PORTAL_ADMIN' || role === 'ADMINISTRATOR') {
      return { label, bg: 'bg-amber-100 text-amber-900 border-amber-300' };
    }
    if (role?.startsWith('INSTITUTION')) {
      return { label, bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    return { label: label || 'AICTE Officer', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
  };

  const badge = getRoleBadge(user?.role);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Tricolor Government Strip */}
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Demo Mode Notice Banner (Isolated sandbox indicator) */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white px-4 py-1.5 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white shrink-0 animate-spin" />
            <span>
              <strong>DEMO MODE ACTIVE — SIMULATED BENCHMARK DATA (NOT REAL):</strong> Multi-role evaluator sandbox with preloaded test data.
            </span>
          </div>
          <button
            onClick={() => {
              exitDemoMode();
              navigate('/login');
            }}
            className="px-2.5 py-0.5 bg-black/30 hover:bg-black/50 text-white rounded font-bold text-[11px] transition"
          >
            Exit Demo Mode →
          </button>
        </div>
      )}

      {/* Email Verification Warning for Live Registered Users */}
      {!isDemoMode && !emailVerified && user && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Official email verification pending for <strong>{user.email}</strong>.
            </span>
          </div>
          {verificationSent ? (
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Verification email sent!</span>
            </span>
          ) : (
            <button
              onClick={handleResendVerification}
              className="text-blue-700 font-bold hover:underline"
            >
              Resend verification email
            </button>
          )}
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Mobile Menu + Emblem & Branding */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebarMobile}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/dashboard" className="flex items-center gap-3 group hover:opacity-95 transition">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-900 to-indigo-950 text-white flex flex-col items-center justify-center shadow-xs border border-blue-800/40 shrink-0">
                <span className="text-[10px] font-extrabold tracking-tighter text-amber-300 leading-tight">AICTE</span>
                <span className="text-[8px] font-mono tracking-widest text-blue-200">FDR360</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                    AICTE FDR360
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                    SIH26265
                  </span>
                  {isDemoMode && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                      DEMO SANDBOX
                    </span>
                  )}
                </div>
                <p className="hidden md:block text-[11px] text-slate-500 font-medium">
                  अखिल भारतीय तकनीकी शिक्षा परिषद • Security Deposit & FDR Lifecycle Portal
                </p>
              </div>
            </Link>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Date Simulator Trigger Badge (Demo or Testing) */}
            <button
              onClick={onOpenSimulator}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs border ${
                isDateSimulated
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/40'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Click to fast-forward simulated date to test maturity alerts"
            >
              <Calendar className={`w-3.5 h-3.5 ${isDateSimulated ? 'text-amber-700 animate-pulse' : 'text-slate-500'}`} />
              <div className="text-left font-mono">
                <span className="text-[10px] text-slate-500 block uppercase leading-none">Simulated Clock</span>
                <span className="font-bold text-slate-900">{simulatedDate}</span>
              </div>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/80 text-blue-900 border border-slate-200 shadow-2xs">
                Simulator
              </span>
            </button>

            {/* In-App Notifications Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce shadow-xs">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* User Profile / Auth Control */}
            {isDemoMode ? (
              /* Persona Switcher Dropdown - ONLY in Demo Mode for SIH judges */
              <div className="relative">
                <button
                  onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-left transition"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user?.name?.charAt(0) || 'D'}
                  </div>
                  <div className="hidden lg:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                      {user?.name}
                    </div>
                    <span className="text-[9px] font-bold text-amber-800">
                      Demo Persona ({badge.label})
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500 ml-1" />
                </button>

                {showPersonaMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowPersonaMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-100 bg-amber-50/60">
                        <p className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                          SIH Judge Persona Switcher
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Switch demo personas to test multi-tier clearance workflows:
                        </p>
                      </div>

                      <div className="py-1 max-h-72 overflow-y-auto">
                        {availableUsers.map(u => {
                          const isCurrent = user?.id === u.id;
                          return (
                            <button
                              key={u.id}
                              onClick={() => {
                                switchPersona(u.role, u.id);
                                setShowPersonaMenu(false);
                              }}
                              className={`w-full px-4 py-2 text-left flex items-start gap-3 hover:bg-blue-50/80 transition ${
                                isCurrent ? 'bg-blue-50/60 font-semibold' : ''
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                {u.name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                                  {isCurrent && (
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">{u.designation}</p>
                                <span className="text-[10px] font-mono text-slate-400">{u.role}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="border-t border-slate-100 pt-1 px-2">
                        <button
                          onClick={() => {
                            exitDemoMode();
                            setShowPersonaMenu(false);
                            navigate('/login');
                          }}
                          className="w-full px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-2 font-medium transition"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Exit Demo & Return to Sign In</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Real Authenticated User Profile & Sign Out */
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-2 text-right hover:opacity-85 transition"
                  title="View your Institution Profile"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {user?.name || 'Authorized Signatory'}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                      {user?.institutionName || user?.email}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                </Link>

                <button
                  onClick={async () => {
                    await signOut();
                    navigate('/login');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                  title="Sign out of your institution session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
