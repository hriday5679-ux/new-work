import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Lock,
  UserCheck,
  Phone,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Search,
  KeyRound,
  GraduationCap,
} from 'lucide-react';
import { useAuth, parseAuthError, AuthErrorInfo } from '../../context/AuthContext.tsx';
import { isInstitutionRole } from '../../types/index.ts';
import sampleInstitutions from '../../data/aicte_institutions_directory.json';

interface RegisterPageProps {
  onNavigateLogin?: () => void;
  onNavigateLanding?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateLogin, onNavigateLanding }) => {
  const { signUpWithEmail, signUpWithInstituteId, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Toggle between Institute ID registration and individual Email registration
  const [authMethod, setAuthMethod] = useState<'institute' | 'email'>('institute');

  // Institution Directory
  const [institutionsList, setInstitutionsList] = useState<any[]>(sampleInstitutions);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInstId, setSelectedInstId] = useState<string>(sampleInstitutions[0]?.id || 'inst-01');

  // Form Fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [designation, setDesignation] = useState<string>('Head of Institution (Principal/Director)');

  // Status
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [successNotice, setSuccessNotice] = useState<string>('');

  // Selected institution details
  const selectedInstitution = institutionsList.find(i => i.id === selectedInstId) || institutionsList[0];

  // Load any extra institutions from API
  useEffect(() => {
    fetch('/api/institutions')
      .then(res => res.json())
      .then(data => {
        if (data.institutions && data.institutions.length > 0) {
          const map = new Map();
          sampleInstitutions.forEach(inst => map.set(inst.id, inst));
          data.institutions.forEach((inst: any) => map.set(inst.id, inst));
          setInstitutionsList(Array.from(map.values()));
        }
      })
      .catch(() => {});
  }, []);

  const filteredInstitutions = institutionsList.filter(
    inst =>
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.code && inst.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inst.state && inst.state.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 1. Submit Institute ID Registration
  const handleInstituteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);

    if (!selectedInstitution) {
      setErrorInfo({
        code: 'auth/missing-selection',
        message: 'Please select an affiliated institution from the list.',
      });
      return;
    }
    if (!name.trim()) {
      setErrorInfo({
        code: 'auth/missing-name',
        message: 'Please provide the full name of the authorized signatory.',
      });
      return;
    }
    if (!email.trim() || !password) {
      setErrorInfo({
        code: 'auth/missing-fields',
        message: 'Please provide contact email and password.',
      });
      return;
    }
    if (password.length < 6) {
      setErrorInfo({
        code: 'auth/weak-password',
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }
    if (password !== confirmPassword) {
      setErrorInfo({
        code: 'auth/password-mismatch',
        message: 'Passwords do not match.',
      });
      return;
    }

    setLoading(true);
    try {
      await signUpWithInstituteId({
        instituteId: selectedInstitution.id,
        instituteCode: selectedInstitution.code,
        instituteName: selectedInstitution.name,
        designation,
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        region: selectedInstitution.region || 'Northern',
      });

      setSuccessNotice(`Registration successful for ${selectedInstitution.name}! Redirecting to workspace...`);
      setTimeout(() => {
        navigate(`/institution/${selectedInstitution.id}`);
      }, 1200);
    } catch (err: any) {
      console.error('Institute registration error:', err);
      setErrorInfo({
        code: err?.code || 'auth/registration-failed',
        message: err?.message || 'Failed to complete registration.',
        help: 'Ensure this Institute ID is not already linked or contact Portal Admin.',
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Email Registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);

    if (!name.trim() || !email.trim() || !password) {
      setErrorInfo({
        code: 'auth/missing-fields',
        message: 'Please fill all required fields.',
      });
      return;
    }
    if (password.length < 6) {
      setErrorInfo({
        code: 'auth/weak-password',
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }
    if (password !== confirmPassword) {
      setErrorInfo({
        code: 'auth/password-mismatch',
        message: 'Passwords do not match.',
      });
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, {
        name: name.trim(),
        phone: phone.trim(),
        designation,
      });

      setSuccessNotice('Account created successfully! Redirecting to setup...');
      setTimeout(() => {
        navigate('/select-type');
      }, 1000);
    } catch (err: any) {
      console.error('Email registration error:', err);
      setErrorInfo(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Google Registration / Sign In (always accessible)
  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setErrorInfo(null);
    try {
      const profile = await signInWithGoogle();
      if (!profile?.onboardingComplete) {
        // First-login flow ("Who are you?" selection page)
        navigate('/select-type');
      } else {
        const isInst = isInstitutionRole(profile.role);
        navigate(isInst && profile.institutionId ? `/institution/${profile.institutionId}` : '/dashboard');
      }
    } catch (err: any) {
      console.error('Google registration error caught on RegisterPage:', err);
      setErrorInfo(parseAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07162b] via-[#0a1e38] to-[#0f2d52] flex flex-col justify-between p-4 sm:p-6 text-slate-100">
      {/* Top Bar */}
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
          <Link
            to="/login"
            onClick={onNavigateLogin}
            className="text-xs text-amber-300 hover:text-white font-semibold transition px-3 py-1.5 rounded-lg border border-amber-500/30 hover:bg-slate-800"
          >
            Already registered? Sign In →
          </Link>
        </div>
      </header>

      {/* Main Register Container */}
      <main className="max-w-xl w-full mx-auto my-6">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              New Account Registration
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
              Create Your Portal Account
            </h2>
            <p className="text-xs text-slate-500">
              Select one of the 3 registration methods below
            </p>
          </div>

          {/* ALWAYS VISIBLE: Direct Google Sign-In / Sign-Up (not hidden by role, mode or tab) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleRegister}
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
              <span>{googleLoading ? 'Connecting Google Account...' : 'Continue with Google'}</span>
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Instant registration using any Google or Gmail account • ABAC role configured on first sign-in
            </p>
          </div>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Or register with credentials
            </span>
          </div>

          {/* Sub-tabs for Institute ID and Individual Email */}
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
              <span>Individual Email</span>
            </button>
          </div>

          {/* Real Firebase Error Feedback with Error Code and Help */}
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

          {successNotice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <div className="font-semibold">{successNotice}</div>
            </div>
          )}

          {/* Option A: Institute ID Registration */}
          {authMethod === 'institute' && (
            <form onSubmit={handleInstituteRegister} className="space-y-4">
              {/* Searchable Institution Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select AICTE-Affiliated Institution *
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by college name, state, or ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <select
                  value={selectedInstId}
                  onChange={e => setSelectedInstId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  {filteredInstitutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code}) — {inst.state}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-filled Institute ID field */}
              {selectedInstitution && (
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-900 uppercase">
                      Auto-filled Institute ID
                    </span>
                    <p className="text-sm font-mono font-bold text-blue-950">
                      {selectedInstitution.code}
                    </p>
                    <p className="text-[11px] text-blue-800">
                      {selectedInstitution.state} • {selectedInstitution.region || 'Northern'} Region
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-200 text-blue-900">
                    Verified
                  </span>
                </div>
              )}

              {/* Designation Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Designation *
                </label>
                <select
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="Head of Institution (Principal/Director)">
                    Head of Institution (Principal/Director)
                  </option>
                  <option value="Registrar">Registrar</option>
                  <option value="Accounts Officer">Accounts Officer</option>
                  <option value="Nodal Officer">Nodal Officer</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Note: Only one Head of Institution account is permitted per institute unless approved by Portal Admin.
                </p>
              </div>

              {/* Signatory Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name of Representative *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajiv K. Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Contact Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="official or personal email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Set Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Registering Institute...' : 'Complete Institute Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Option B: Email & Password Registration */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smt. Neerja Mathur"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Accepts any @gmail.com or other address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Open to all individuals. Profile details & role will be selected on first login.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Creating Account...' : 'Register with Email'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Footer Link */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link
                to="/login"
                onClick={onNavigateLogin}
                className="text-blue-700 font-bold hover:underline"
              >
                Sign In to Your Workspace →
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-3">
        © {new Date().getFullYear()} All India Council for Technical Education (AICTE). All Rights Reserved.
      </footer>
    </div>
  );
};

export default RegisterPage;
