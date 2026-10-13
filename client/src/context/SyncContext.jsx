import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncEngine } from '../services/syncEngine.js';

const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
  const [syncState, setSyncState] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
  });

  useEffect(() => {
    syncEngine.init();
    const unsubscribe = syncEngine.subscribe((state) => {
      setSyncState(state);
    });

    // Check pending count initially
    syncEngine.getPendingCount().then((count) => {
      setSyncState((prev) => ({ ...prev, pendingCount: count }));
    });

    return () => unsubscribe();
  }, []);

  const triggerSync = () => {
    return syncEngine.processOutboxAndPull();
  };

  const enqueueWrite = (entity, op, payload, clientId) => {
    return syncEngine.enqueueWrite(entity, op, payload, clientId);
  };

  return (
    <SyncContext.Provider
      value={{
        ...syncState,
        triggerSync,
        enqueueWrite,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
