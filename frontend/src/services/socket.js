import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

let socket = null;
const listeners = new Map();

/**
 * Initializes and connects the global Socket.io client.
 * Uses the accessToken from localStorage for authentication.
 */
export const connectSocket = () => {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.warn('Socket connection aborted: No access token found in localStorage.');
    return null;
  }

  // Close existing if any
  if (socket) {
    socket.close();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log(`%c[Socket Connected] ID: ${socket.id}`, 'color: #10b981; font-weight: bold;');
    
    // Re-register all listeners in case we reconnected
    listeners.forEach((callbacks, event) => {
      socket.off(event);
      callbacks.forEach((cb) => socket.on(event, cb));
    });
  });

  socket.on('disconnect', (reason) => {
    console.warn(`%c[Socket Disconnected] Reason: ${reason}`, 'color: #f59e0b; font-weight: bold;');
  });

  socket.on('connect_error', (error) => {
    console.error('%c[Socket Connect Error]', 'color: #ef4444; font-weight: bold;', error);
  });

  return socket;
};

/**
 * Disconnects the global Socket.io client.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('%c[Socket Disconnected Manually]', 'color: #64748b; font-weight: bold;');
  }
};

/**
 * Subscribes to a real-time event.
 * Handles duplicate registration gracefully across re-connections.
 */
export const subscribeToEvent = (event, callback) => {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);

  // If active, bind to the socket directly
  if (socket) {
    socket.on(event, callback);
  }
};

/**
 * Unsubscribes from a real-time event.
 */
export const unsubscribeFromEvent = (event, callback) => {
  if (listeners.has(event)) {
    listeners.get(event).delete(callback);
    if (listeners.get(event).size === 0) {
      listeners.delete(event);
    }
  }

  if (socket) {
    socket.off(event, callback);
  }
};

/**
 * Returns the raw Socket.io instance if needed.
 */
export const getSocket = () => socket;
