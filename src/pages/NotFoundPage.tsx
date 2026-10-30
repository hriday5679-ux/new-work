import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft, Home, FileSpreadsheet } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07162b] via-[#0a1e38] to-[#0f2d52] flex flex-col items-center justify-center p-6 text-slate-100 text-center selection:bg-blue-600 selection:text-white">
      {/* Brand Emblem */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-blue-950 shadow-2xl mb-6">
        <Building2 className="w-9 h-9" />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl font-black tracking-tight text-white">AICTE FDR360</h1>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
          SIH26265
        </span>
      </div>

      <div className="text-6xl font-black font-mono text-amber-400 my-4 tracking-wider">
        404
      </div>

      <h2 className="text-xl font-bold text-white mb-2">
        Resource or Page Not Found
      </h2>
      <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
        The portal path you requested does not exist or may have been relocated. All statutory actions are tracked securely under AICTE security deposit regulations.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          to="/dashboard"
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>

        <Link
          to="/fdrs"
          className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>View FDR Register</span>
        </Link>
      </div>
    </div>
  );
};
