import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCheck, AlertTriangle, FileText, ShieldAlert, ArrowRight } from 'lucide-react';
import { AppNotification } from '../types/index.ts';
import { useSystemDate } from '../context/SystemDateContext.tsx';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLink: (linkType: string, linkId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, onSelectLink }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MATURITY_WARNING' | 'DEFICIENCY' | 'CLEARANCE_REQUEST'>('ALL');
  const { refreshTrigger } = useSystemDate();

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, refreshTrigger]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const filtered = activeTab === 'ALL'
    ? notifications
    : notifications.filter(n => n.type === activeTab);

  const getIcon = (type: string) => {
    switch (type) {
      case 'MATURITY_WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'DEFICIENCY':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'CLEARANCE_REQUEST':
        return <FileText className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold">AICTE In-App Alerts</h2>
              <span className="text-xs bg-blue-800 text-blue-200 px-2 py-0.5 rounded-full font-mono">
                {notifications.filter(n => !n.read).length} unread
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                title="Mark all as read"
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600 gap-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'ALL' ? 'bg-white text-blue-900 shadow-xs font-semibold' : 'hover:bg-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('MATURITY_WARNING')}
              className={`px-2.5 py-1.5 rounded-md transition ${
                activeTab === 'MATURITY_WARNING' ? 'bg-white text-blue-900 shadow-xs font-semibold' : 'hover:bg-slate-200'
              }`}
            >
              Maturity
            </button>
            <button
              onClick={() => setActiveTab('DEFICIENCY')}
              className={`px-2.5 py-1.5 rounded-md transition ${
                activeTab === 'DEFICIENCY' ? 'bg-white text-blue-900 shadow-xs font-semibold' : 'hover:bg-slate-200'
              }`}
            >
              Deficiencies
            </button>
            <button
              onClick={() => setActiveTab('CLEARANCE_REQUEST')}
              className={`px-2.5 py-1.5 rounded-md transition ${
                activeTab === 'CLEARANCE_REQUEST' ? 'bg-white text-blue-900 shadow-xs font-semibold' : 'hover:bg-slate-200'
              }`}
            >
              Clearances
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">No alerts in this category</p>
                <p className="text-xs text-slate-400">All regulatory notifications are up to date.</p>
              </div>
            ) : (
              filtered.map(notif => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-lg transition-all ${
                    notif.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/70 border border-blue-100 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-full bg-white shadow-xs shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{notif.title}</h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(notif.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{notif.message}</p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                        {notif.linkId && notif.linkType ? (
                          <button
                            onClick={() => {
                              handleMarkAsRead(notif.id);
                              onSelectLink(notif.linkType!, notif.linkId!);
                              onClose();
                            }}
                            className="text-[11px] font-semibold text-blue-800 hover:text-blue-950 flex items-center gap-1"
                          >
                            <span>Open {notif.linkType}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span />
                        )}
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-[10px] text-slate-400 hover:text-slate-600"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <span className="text-[11px] text-slate-500">
              System alerts generated as per AICTE Security Regulations & SIH26265
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
