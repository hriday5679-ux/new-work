import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  Building2,
  FileCheck2,
  ShieldCheck,
  CalendarDays,
  History,
  Download,
  Settings,
  AlertCircle,
  GraduationCap,
  FolderArchive,
  BookOpen,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { isInstitutionRole, isAicteRole } from '../types/index.ts';

interface SidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  const isInst = user ? isInstitutionRole(user.role) : false;
  const isAicte = user ? isAicteRole(user.role) : false;
  const isPortalAdmin = user?.role === 'PORTAL_ADMIN';
  const myInstId = user?.institutionId || 'inst-01';

  const navItems = [
    {
      id: 'dashboard',
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: 'institution-workspace',
      path: `/institution/${myInstId}`,
      label: 'My Institution Portal',
      icon: GraduationCap,
      show: isInst,
      badge: 'Profile',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'fdrs',
      path: '/fdrs',
      label: isInst ? 'My FDRs & Deposits' : 'Master FDR Register',
      icon: FileSpreadsheet,
      show: !isPortalAdmin, // Portal admin cannot view financial documents
    },
    {
      id: 'create-fdr',
      path: '/fdrs/new',
      label: 'Register New FDR (AI OCR)',
      icon: PlusCircle,
      badge: 'OCR',
      show: isInst || ['SECTION_OFFICER', 'REGIONAL_OFFICER', 'ADMINISTRATOR'].includes(user?.role || ''),
    },
    {
      id: 'documents',
      path: '/documents',
      label: 'Document Vault',
      icon: FolderArchive,
      badge: 'Storage',
      badgeColor: 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30',
      show: !isPortalAdmin, // Portal admin cannot view financial docs
    },
    {
      id: 'institutions',
      path: '/institutions',
      label: 'Institutions Directory',
      icon: Building2,
      show: isAicte || user?.role === 'ADMINISTRATOR',
    },
    {
      id: 'releases',
      path: '/release',
      label: 'Security Deposit Release',
      icon: FileCheck2,
      show: !isPortalAdmin,
    },
    {
      id: 'clearances',
      path: '/clearances',
      label: '3-Tier Clearance Matrix',
      icon: ShieldCheck,
      badge: 'Action',
      badgeColor: 'bg-amber-500 text-white',
      show: isAicte || user?.role === 'ADMINISTRATOR',
    },
    {
      id: 'calendar',
      path: '/maturity',
      label: 'Maturity Calendar',
      icon: CalendarDays,
      show: !isPortalAdmin,
    },
    {
      id: 'admin-users',
      path: '/admin/users',
      label: 'Portal Users & Role Approvals',
      icon: Users,
      badge: 'Admin',
      badgeColor: 'bg-amber-400 text-blue-950 font-bold',
      show: isPortalAdmin || user?.role === 'ADMINISTRATOR',
    },
    {
      id: 'audit-log',
      path: '/audit-log',
      label: 'Audit Trail & Logs',
      icon: History,
      show: isAicte || user?.role === 'ADMINISTRATOR',
    },
    {
      id: 'profile',
      path: '/profile',
      label: 'My Profile & Role Change',
      icon: GraduationCap,
      show: true,
    },
    {
      id: 'policy',
      path: '/policy',
      label: 'Statutory Policy Matrix',
      icon: BookOpen,
      show: true,
    },
    {
      id: 'reports',
      path: '/reports',
      label: 'Reports & CSV Exports',
      icon: Download,
      show: !isPortalAdmin,
    },
    {
      id: 'system',
      path: '/system',
      label: 'Demo Reset & Status',
      icon: Settings,
      show: isPortalAdmin || user?.role === 'ADMINISTRATOR',
    },
  ];

  const visibleItems = navItems.filter(item => item.show);

  const isItemActive = (item: typeof navItems[0]) => {
    if (location.pathname === item.path) return true;
    if (item.path !== '/dashboard' && location.pathname.startsWith(item.path)) return true;
    if (currentTab && currentTab === item.id) return true;
    return false;
  };

  const content = (
    <div className="flex flex-col h-full bg-[#0a1e38] text-slate-200 w-64 border-r border-slate-800">
      {/* Institution profile card if Institution role */}
      {isInst && (
        <Link
          to={`/institution/${myInstId}`}
          className="p-3.5 mx-3 mt-3 rounded-lg bg-blue-950/60 border border-blue-800/40 hover:bg-blue-900/60 transition block"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-300 mb-1">
            <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Affiliated Institution</span>
          </div>
          <p className="text-xs font-bold text-white line-clamp-1">{user?.institutionName || 'Affiliated College'}</p>
          <div className="flex items-center justify-between mt-1 text-[10px] text-blue-300/80 font-mono">
            <span>ID: {user?.instituteCode || myInstId}</span>
            <span>{user?.region || 'Northern'}</span>
          </div>
        </Link>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Portal Workflows
        </div>

        {visibleItems.map(item => {
          const Icon = item.icon;
          const active = isItemActive(item);
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => {
                if (onSelectTab) onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/40'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    item.badgeColor || 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / System Compliance Notice */}
      <div className="p-3.5 border-t border-slate-800 bg-[#07162b] text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>AICTE Security Compliance</span>
        </div>
        <p className="leading-relaxed text-slate-400/90">
          Enforcing 10-Year Lock-In & Joint Lien with Regional Officer under APH Regulations.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:block shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="fixed inset-y-0 left-0 max-w-full flex">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
