import React, { useState } from 'react';
import { Calendar, FastForward, RotateCcw, AlertTriangle, CheckCircle, Clock, X, Info } from 'lucide-react';
import { useSystemDate } from '../context/SystemDateContext.tsx';

interface DateSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DateSimulatorModal: React.FC<DateSimulatorModalProps> = ({ isOpen, onClose }) => {
  const { simulatedDate, jumpDays, setCustomDate, resetToToday, loading } = useSystemDate();
  const [inputDate, setInputDate] = useState(simulatedDate);
  const [resultMessage, setResultMessage] = useState<{ updatedCount: number; newAlerts: number } | null>(null);

  if (!isOpen) return null;

  const handleJump = async (days: number, label: string) => {
    const res = await jumpDays(days);
    setResultMessage(res);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDate) return;
    const res = await setCustomDate(inputDate);
    setResultMessage(res);
  };

  const handleReset = async () => {
    await resetToToday();
    setInputDate('2026-10-27');
    setResultMessage({ updatedCount: 0, newAlerts: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800/80 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">SIH Demo Date Simulator</h3>
              <p className="text-xs text-blue-200">Demonstrate maturity triggers without waiting for real time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Date Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Simulated Portal Clock
              </span>
              <div className="text-2xl font-bold font-mono text-blue-950 mt-1">
                {new Date(simulatedDate + 'T00:00:00Z').toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                simulatedDate === '2026-10-27'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {simulatedDate === '2026-10-27' ? 'Benchmark Date' : 'Simulated Active'}
              </span>
            </div>
          </div>

          {/* Quick Jump Buttons */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
              Instant Maturity Fast-Forward Presets
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleJump(15, '+15 Days')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-sm font-semibold transition-all hover:scale-[1.01]"
              >
                <FastForward className="w-4 h-4 text-amber-600" />
                <span>+15 Days</span>
                <span className="text-xs text-amber-700 font-normal">(Urgent Alerts)</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleJump(30, '+30 Days')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 rounded-lg text-sm font-semibold transition-all hover:scale-[1.01]"
              >
                <FastForward className="w-4 h-4 text-orange-600" />
                <span>+30 Days</span>
                <span className="text-xs text-orange-700 font-normal">(1 Month)</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleJump(90, '+90 Days')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-sm font-semibold transition-all hover:scale-[1.01]"
              >
                <FastForward className="w-4 h-4 text-indigo-600" />
                <span>+90 Days</span>
                <span className="text-xs text-indigo-700 font-normal">(1 Quarter)</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleJump(365, '+1 Year')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-sm font-semibold transition-all hover:scale-[1.01]"
              >
                <FastForward className="w-4 h-4 text-purple-600" />
                <span>+1 Year</span>
                <span className="text-xs text-purple-700 font-normal">(Matured Cycle)</span>
              </button>
            </div>
          </div>

          {/* Custom Date Form */}
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Or Jump to Exact Custom Date
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={inputDate}
                onChange={e => setInputDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Simulating...' : 'Apply Date'}
              </button>
            </div>
          </form>

          {/* Result Alert */}
          {resultMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 flex items-start gap-3 animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 space-y-1">
                <p className="font-semibold text-blue-950">
                  Simulation updated: Clock set to {simulatedDate}
                </p>
                <p>
                  Recalculated all FDR maturity countdowns. Evaluated {resultMessage.updatedCount} status changes and generated {resultMessage.newAlerts} fresh notifications.
                </p>
              </div>
            </div>
          )}

          {/* Explanation note for SIH Judges */}
          <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              <strong>SIH Problem Statement Requirement:</strong> Allows judges to verify automated maturity notifications, expiring status badges, and 10-year lock-in release eligibility in real time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Real Benchmark Date (27 Oct 2026)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
