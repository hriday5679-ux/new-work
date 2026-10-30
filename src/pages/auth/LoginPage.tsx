import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Mail,
  Building2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  KeyRound,
  GraduationCap,
} from 'lucide-react';
import { useAuth, parseAuthError, AuthErrorInfo } from '../../context/AuthContext.tsx';
import { isInstitutionRole } from '../../types/index.ts';
import { ForgotPasswordModal } from './ForgotPasswordModal.tsx';

interface LoginPageProps {
  onNavigateRegister?: () => void;
  onNavigateLanding?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateRegister, onNavigateLanding }) => {
  const { signInWithEmail, signInWithGoogle, signInWithInstituteId, enterDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const returnTo = queryParams.get('returnTo') || '/dashboard';

  // Toggle between Institute ID and Email credentials
  const [authMethod, setAuthMethod] = useState<'institute' | 'email'>('institute');

  // Form states
  const [instituteId, setInstituteId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [demoLoading, setDemoLoading] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [isForgotOpen, setIsForgotOpen] = useState<boolean>(false);

  // Sign In with Institute ID
  const handleInstituteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instituteId.trim() || !password) {
      setErrorInfo({
        code: 'auth/missing-fields',
        message: 'Please provide both AICTE Institute ID and password.',
      });
      return;
    }
    setLoading(true);
    setErrorInfo(null);
    try {
      await signInWithInstituteId(instituteId.trim(), password);
      navigate(returnTo);
    } catch (err: any) {
      console.error('Institute ID sign-in error:', err);
      setErrorInfo({
        code: err?.code || 'auth/invalid-credentials',
        message: err?.message || 'Invalid Institute ID or password',
        help: 'Ensure your AICTE Permanent Institute ID is registered and password is correct.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorInfo({
        code: 'auth/missing-fields',
        message: 'Please provide both registered email and password.',
      });
      return;
    }
    setLoading(true);
    setErrorInfo(null);
    try {
      await signInWithEmail(email.trim(), password);
      navigate(returnTo);
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      setErrorInfo(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Google (always accessible, popup with automatic redirect fallback)
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorInfo(null);
    try {
      const profile = await signInWithGoogle();
      if (!profile?.onboardingComplete) {
        // First-login flow ("Who are you?" selection page)
        navigate('/select-type');
      } else {
        const isInst = isInstitutionRole(profile.role);
        navigate(isInst && profile.institutionId ? `/institution/${profile.institutionId}` : (returnTo || '/dashboard'));
      }
    } catch (err: any) {
      console.error('Google sign-in caught on LoginPage:', err);
      setErrorInfo(parseAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07162b] via-[#0a1e38] to-[#0f2d52] flex flex-col justify-between p-4 sm:p-6 text-slate-100">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <Link
          to="/"
          onClick={onNavigateLanding}
          className="flex items-center gap-3 text-left group hover:opacity-95 transition"
        >
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
            <p className="text-[11px] text-slate-400">Security Deposit & FDR Lifecycle Portal</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setDemoLoading(true);
              try {
                await enterDemoMode('INSTITUTION');
                navigate('/dashboard');
              } finally {
                setDemoLoading(false);
              }
            }}
            disabled={demoLoading}
            className="text-xs text-amber-300 hover:text-white font-semibold transition px-3 py-1.5 rounded-lg border border-amber-500/30 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{demoLoading ? 'Starting Demo...' : 'Try Demo Mode'}</span>
          </button>
          <Link
            to="/"
            onClick={onNavigateLanding}
            className="text-xs text-slate-300 hover:text-white font-semibold transition"
          >
            ← Back to Overview
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-lg w-full mx-auto my-8">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Government of India • AICTE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
              Sign In to AICTE FDR360
            </h2>
            <p className="text-xs text-slate-500">
              Choose your preferred authentication method below
            </p>
          </div>

          {/* ALWAYS VISIBLE: Direct Google Sign-In button (not hidden by role, mode or tab) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-400 text-slate-800 rounded-2xl font-bold text-sm shadow-xs transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? 'Signing in with Google...' : 'Sign in with Google'}</span>
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Open to all Google & Gmail accounts • Direct seamless authentication
            </p>
          </div>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Or sign in with password
            </span>
          </div>

          {/* Sub-tabs for Institute ID and Email */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('institute');
                setErrorInfo(null);
              }}
              className={`py-2 px-1 text-center rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                authMethod === 'institute'
                  ? 'bg-blue-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Institute ID</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('email');
                setErrorInfo(null);
              }}
              className={`py-2 px-1 text-center rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                authMethod === 'email'
                  ? 'bg-blue-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>Email & Password</span>
            </button>
          </div>

          {/* Real Firebase Error Display with Error Code and Actionable Help */}
          {errorInfo && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs space-y-2 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div className="space-y-1 w-full">
                  <div className="font-bold text-red-950">{errorInfo.message}</div>
                  {errorInfo.code && (
                    <div className="font-mono text-[10px] text-red-700 bg-red-100/70 px-2 py-0.5 rounded inline-block">
                      Error Code: {errorInfo.code}
                    </div>
                  )}
                  {errorInfo.help && (
                    <div className="text-red-900 text-[11px] font-medium bg-white/90 p-2 rounded-lg border border-red-200/80 mt-1 shadow-2xs">
                      <span className="font-bold text-red-950">Help:</span> {errorInfo.help}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Option A: Institute ID Sign In */}
          {authMethod === 'institute' && (
            <form onSubmit={handleInstituteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  AICTE Institute ID
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={instituteId}
                    onChange={e => setInstituteId(e.target.value)}
                    placeholder="e.g. 1-9318291011 or 1-4521098471"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono text-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter your official AICTE Permanent Institute ID assigned during accreditation.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In with Institute ID'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Option B: Email & Password Sign In */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="officer@aicte.gov.in or any personal/official email"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Accepts any registered email address (AICTE official, Gmail, or personal).
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Signing in...' : 'Sign In with Email'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Switch to Register */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              New to AICTE FDR360?{' '}
              <Link
                to="/register"
                onClick={onNavigateRegister}
                className="text-blue-700 font-bold hover:underline"
              >
                Register your institution or account →
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-3">
        © {new Date().getFullYear()} All India Council for Technical Education (AICTE). All Rights Reserved.
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
    </div>
  );
};

export default LoginPage;
