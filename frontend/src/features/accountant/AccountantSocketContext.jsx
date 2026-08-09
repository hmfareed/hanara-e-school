import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { subscribeToEvent, unsubscribeFromEvent, getSocket } from '../../services/socket';
import api from '../../services/api';

const AccountantSocketContext = createContext(null);

/**
 * AccountantSocketContext — provides live-event hooks and a manual resync function
 * to all accountant pages. All socket subscriptions are centrally managed here so
 * child pages register/unregister cleanly via the hook without touching the raw socket.
 */
export const AccountantSocketProvider = ({ children, onNewSubmission, onStatusChanged, onNewCorrection }) => {
  const lastSocketId = useRef(null);

  // Resync helper — called after a reconnect to catch any missed submissions
  const resyncPendingQueue = useCallback(async () => {
    try {
      const res = await api.get('/fees/daily-register/submissions?status=pending');
      return res.data?.data || [];
    } catch (e) {
      console.warn('[AccountantSocket] Resync failed:', e);
      return [];
    }
  }, []);

  useEffect(() => {
    const handleNewSubmission = (data) => {
      if (onNewSubmission) onNewSubmission(data);
    };
    const handleStatusChanged = (data) => {
      if (onStatusChanged) onStatusChanged(data);
    };
    const handleNewCorrection = (data) => {
      if (onNewCorrection) onNewCorrection(data);
    };

    // Detect reconnects (new socket.id vs. last known) and resync
    const handleConnect = async () => {
      const socket = getSocket();
      if (socket && socket.id !== lastSocketId.current) {
        lastSocketId.current = socket.id;
        if (lastSocketId.current !== null) {
          // This is a reconnect — resync
          const fresh = await resyncPendingQueue();
          if (onStatusChanged) onStatusChanged({ type: 'resync', data: fresh });
        }
      }
    };

    subscribeToEvent('newSubmission', handleNewSubmission);
    subscribeToEvent('submissionStatusChanged', handleStatusChanged);
    subscribeToEvent('newCorrection', handleNewCorrection);
    subscribeToEvent('connect', handleConnect);

    // Record current socket id
    const socket = getSocket();
    if (socket) lastSocketId.current = socket.id || null;

    return () => {
      unsubscribeFromEvent('newSubmission', handleNewSubmission);
      unsubscribeFromEvent('submissionStatusChanged', handleStatusChanged);
      unsubscribeFromEvent('newCorrection', handleNewCorrection);
      unsubscribeFromEvent('connect', handleConnect);
    };
  }, [onNewSubmission, onStatusChanged, onNewCorrection, resyncPendingQueue]);

  return (
    <AccountantSocketContext.Provider value={{ resyncPendingQueue }}>
      {children}
    </AccountantSocketContext.Provider>
  );
};

export const useAccountantSocket = () => useContext(AccountantSocketContext);
