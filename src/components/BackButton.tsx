import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string;
  fallbackTo?: string;
  fallbackPath?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label = 'Back',
  fallbackTo,
  fallbackPath,
  className = '',
}) => {
  const navigate = useNavigate();
  const targetFallback = fallbackPath || fallbackTo || '/dashboard';

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(targetFallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-300 rounded-lg shadow-2xs transition mb-4 cursor-pointer ${className}`}
      title="Return to previous screen"
    >
      <ArrowLeft className="w-4 h-4 text-slate-500" />
      <span>{label}</span>
    </button>
  );
};

export default BackButton;
