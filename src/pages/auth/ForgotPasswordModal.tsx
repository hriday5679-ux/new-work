import React, { useState } from 'react';
import { Mail, Building2, X, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
}) => {
  const { sendPasswordReset, sendInstitutePasswordReset } = useAuth();
  const [resetType, setResetType] = useState<'email' | 'institute'>('institute');
  const [email, setEmail] = useState<string>(defaultEmail);
  const [instituteId, setInstituteId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [dispatchedTo, setDispatchedTo] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (resetType === 'email') {
        if (!email.trim()) {
          setError('Please enter your registered email address.');
          setLoading(false);
          return;
        }
        await sendPasswordReset(email.trim());
        setDispatchedTo(email.trim());
        setSuccess(true);
      } else {
        if (!instituteId.trim()) {
          setError('Please enter your AICTE Institute ID.');
          setLoading(false);
          return;
        }
        const masked = await sendInstitutePasswordReset(instituteId.trim());
        setDispatchedTo(masked);
        setSuccess(true);
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Failed to send password reset instructions.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Reset Portal Password</h3>
              <p className="text-[11px] text-slate-500">Self-service password recovery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900">Reset Instructions Dispatched</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instructions to reset your password have been sent to{' '}
                <span className="font-semibold text-slate-900">{dispatchedTo}</span>. Please check your inbox and spam folder.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                onClose();
              }}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Toggle method */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setResetType('institute');
                  setError('');
                }}
                className={`py-1.5 px-3 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  resetType === 'institute' ? 'bg-white shadow-xs text-blue-950 font-bold' : 'text-slate-600'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Via Institute ID</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetType('email');
                  setError('');
                }}
                className={`py-1.5 px-3 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  resetType === 'email' ? 'bg-white shadow-xs text-blue-950 font-bold' : 'text-slate-600'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Via Email</span>
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed">
              {resetType === 'institute'
                ? 'Enter your AICTE Institute ID. We will look up your registered contact email and dispatch a secure reset link.'
                : 'Enter your registered email address. We will send a secure link to reset your account password.'}
            </p>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {resetType === 'institute' ? (
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">AICTE Institute ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-9318291011 or 1-4521098471"
                  value={instituteId}
                  onChange={e => setInstituteId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-xs font-mono"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Official / Registered Email *</label>
                <input
                  type="email"
                  required
                  placeholder="signatory@institute.ac.in or personal email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-xs font-medium"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
