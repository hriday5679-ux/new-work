import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SystemDateContextType {
  simulatedDate: string;
  isDateSimulated: boolean;
  refreshTrigger: number;
  loading: boolean;
  jumpDays: (days: number) => Promise<{ updatedCount: number; newAlerts: number }>;
  setCustomDate: (date: string) => Promise<{ updatedCount: number; newAlerts: number }>;
  resetToToday: () => Promise<void>;
  refreshAll: () => void;
}

const SystemDateContext = createContext<SystemDateContextType | undefined>(undefined);

export const SystemDateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simulatedDate, setSimulatedDateState] = useState<string>('2026-10-27');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSystemState = useCallback(async () => {
    try {
      const res = await fetch('/api/system/state');
      if (res.ok) {
        const data = await res.json();
        setSimulatedDateState(data.simulatedDate || '2026-10-27');
      }
    } catch (e) {
      console.error('Error fetching system state:', e);
    }
  }, []);

  useEffect(() => {
    fetchSystemState();
  }, [fetchSystemState]);

  const refreshAll = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const setCustomDate = async (newDate: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/system/simulate-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatedDateState(data.simulatedDate);
        refreshAll();
        return { updatedCount: data.updatedFDRsCount || 0, newAlerts: data.newAlerts || 0 };
      }
    } catch (e) {
      console.error('Error setting simulated date:', e);
    } finally {
      setLoading(false);
    }
    return { updatedCount: 0, newAlerts: 0 };
  };

  const jumpDays = async (days: number) => {
    const current = new Date(simulatedDate + 'T00:00:00Z');
    current.setUTCDate(current.getUTCDate() + days);
    const targetDateStr = current.toISOString().split('T')[0];
    return await setCustomDate(targetDateStr);
  };

  const resetToToday = async () => {
    await setCustomDate('2026-10-27');
  };

  const isDateSimulated = simulatedDate !== '2026-10-27';

  return (
    <SystemDateContext.Provider
      value={{
        simulatedDate,
        isDateSimulated,
        refreshTrigger,
        loading,
        jumpDays,
        setCustomDate,
        resetToToday,
        refreshAll,
      }}
    >
      {children}
    </SystemDateContext.Provider>
  );
};

export const useSystemDate = () => {
  const context = useContext(SystemDateContext);
  if (!context) {
    throw new Error('useSystemDate must be used within a SystemDateProvider');
  }
  return context;
};
