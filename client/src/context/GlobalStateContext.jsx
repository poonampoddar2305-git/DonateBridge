import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../components/ui/Toast';

// Create isolated contexts
const ThemeContext = createContext();
const AuthContext = createContext();
const SocketContext = createContext();

// ─────────────────────────────────────────────
// Configured Axios Instance
// ─────────────────────────────────────────────
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;
let isNotifiedSessionExpired = false;

// ─────────────────────────────────────────────
// GlobalStateProvider
// ─────────────────────────────────────────────
export const GlobalStateProvider = ({ children }) => {
  const { toast } = useToast();

  // --- THEME ---
  const theme = 'light';
  const toggleTheme = () => {};
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    localStorage.setItem('theme', 'light');
  }, []);

  // --- AUTH STATE ---
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken') || null);
  const [authMessage, setAuthMessage] = useState('');

  const clearAuthMessage = useCallback(() => {
    setAuthMessage('');
  }, []);

  const setSessionExpired = useCallback(() => {
    const existingToken = localStorage.getItem('token');
    const existingUser = localStorage.getItem('user');

    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');

    if ((existingToken || existingUser) && !isNotifiedSessionExpired) {
      isNotifiedSessionExpired = true;
      const msg = 'Session expired. Please sign in again.';
      setAuthMessage(msg);
      toast.error(msg);
      setTimeout(() => {
        isNotifiedSessionExpired = false;
      }, 5000);
    }
  }, [toast]);

  /**
   * loginWithTokens - Called after successful API login/register.
   * Stores user and tokens; attaches Bearer header to future requests.
   */
  const loginWithTokens = useCallback((userData, accessToken, refreshTkn, ngoDetails = null) => {
    const userToStore = {
      id: userData.id,
      name: userData.username || userData.name || userData.email,
      email: userData.email,
      role: userData.role,
      avatar: userData.avatar || '👤',
      verificationStatus: ngoDetails?.verification_status || userData.profile?.verification_status || userData.verificationStatus || null,
      rejectionReason: ngoDetails?.rejection_reason || userData.profile?.rejection_reason || userData.rejectionReason || '',
      trustScore: ngoDetails?.trust_score || null,
      ngoId: ngoDetails?.id || null,
      aadhaarNumber: userData.profile?.aadhaar_number || null,
      panNumber: userData.profile?.pan_number || null,
      aadhaarDoc: userData.profile?.aadhaar_doc || null,
      panDoc: userData.profile?.pan_doc || null,
    };
    clearAuthMessage();
    setUser(userToStore);
    setToken(accessToken);
    setRefreshToken(refreshTkn);
    localStorage.setItem('user', JSON.stringify(userToStore));
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshTkn);
    toast.success(`Welcome back, ${userToStore.name}!`);
  }, [clearAuthMessage, toast]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    toast.info('Signed out successfully.');
  }, [toast]);

  /**
   * refreshUserData - Re-fetch /api/users/me/ and update localStorage.
   * Called after profile updates or NGO registration to sync latest data.
   */
  const refreshUserData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/api/users/me/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedUser = {
        ...user,
        name: res.data.username || user?.name,
        email: res.data.email,
        avatar: res.data.avatar,
        verificationStatus: res.data.profile?.verification_status || user?.verificationStatus,
        rejectionReason: res.data.profile?.rejection_reason || user?.rejectionReason,
        aadhaarNumber: res.data.profile?.aadhaar_number || user?.aadhaarNumber,
        panNumber: res.data.profile?.pan_number || user?.panNumber,
        aadhaarDoc: res.data.profile?.aadhaar_doc || user?.aadhaarDoc,
        panDoc: res.data.profile?.pan_doc || user?.panDoc,
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch {
      // Silently fail — non-critical
    }
  }, [token, user]);

  // ─── Axios interceptors (attach JWT, handle 401 refresh) ───
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        const liveToken = localStorage.getItem('token');
        if (liveToken) {
          config.headers['Authorization'] = `Bearer ${liveToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config || {};
        const url = originalRequest.url || '';

        // DO NOT trigger session expiration logic for auth endpoints
        if (
          url.includes('/api/auth/login') ||
          url.includes('/api/auth/register') ||
          url.includes('/api/auth/token') ||
          url.includes('/api/auth/refresh') ||
          url.includes('/api/auth/otp')
        ) {
          return Promise.reject(error);
        }

        const liveRefreshToken = localStorage.getItem('refreshToken');

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          if (!liveRefreshToken) {
            setSessionExpired();
            return Promise.reject(error);
          }

          try {
            if (!refreshPromise) {
              refreshPromise = axios.post(
                `${api.defaults.baseURL}/api/auth/refresh/`,
                { refresh: liveRefreshToken }
              ).then((res) => {
                const newAccess = res.data.access;
                const newRefresh = res.data.refresh || liveRefreshToken;
                
                localStorage.setItem('token', newAccess);
                localStorage.setItem('refreshToken', newRefresh);
                setToken(newAccess);
                setRefreshToken(newRefresh);
                
                return newAccess;
              }).finally(() => {
                refreshPromise = null;
              });
            }

            const newAccess = await refreshPromise;
            originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
            return api(originalRequest);
          } catch (refreshError) {
            setSessionExpired();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [setSessionExpired]);

  // --- SOCKET + NOTIFICATIONS ---
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // Fetch real notifications from API when user is logged in
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    api.get('/api/notifications/')
      .then((res) => {
        const data = res.data.results || res.data;
        const mapped = data.map((n) => ({
          id: n.id,
          type: n.notification_type,
          message: n.message,
          title: n.title,
          time: new Date(n.created_at).toLocaleString(),
          read: n.is_read,
        }));
        setNotifications(mapped);
        setUnreadCount(mapped.filter((n) => !n.read).length);
      })
      .catch(() => {
        // Silently fail - user may be offline
      });
  }, [token]);

  // Real-time WebSocket connection for user notifications
  useEffect(() => {
    if (!token || !user) return;

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsProtocol = apiBase.startsWith('https') ? 'wss:' : 'ws:';
    const host = apiBase.replace(/^https?:\/\//, '');

    let ws = null;
    let reconnectTimeout = null;
    let attempts = 0;

    const connectWs = () => {
      const activeToken = localStorage.getItem('token') || token;
      if (!activeToken) return;
      const wsUrl = `${wsProtocol}//${host}/ws/notifications/?token=${encodeURIComponent(activeToken)}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        attempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification' && data.notification) {
            const n = data.notification;
            const mapped = {
              id: n.id,
              type: n.notification_type,
              message: n.message,
              title: n.title,
              time: new Date(n.created_at || Date.now()).toLocaleString(),
              read: n.is_read || false,
            };
            setNotifications((prev) => [mapped, ...prev]);
            setUnreadCount((prev) => prev + 1);
            toast.info(`🔔 ${n.title}: ${n.message}`);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket notification:", err);
        }
      };

      ws.onclose = (event) => {
        if (event.code !== 4001 && event.code !== 4003 && attempts < 5) {
          attempts += 1;
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
          reconnectTimeout = setTimeout(connectWs, delay);
        }
      };
    };

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [token, user, toast]);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/api/notifications/mark-all-read/');
    } catch {
      // Offline fallback
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const addNotification = useCallback((n) => {
    setNotifications((prev) => [n, ...prev]);
    setUnreadCount((prev) => prev + 1);
    if (n.title || n.message) {
      toast.info(`🔔 ${n.title || 'Notification'}: ${n.message || ''}`);
    }
  }, [toast]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthContext.Provider
        value={{
          user,
          setUser,
          token,
          refreshToken,
          isAuthenticated: !!token,
          loginWithTokens,
          logout,
          authMessage,
          clearAuthMessage,
          refreshUserData,
        }}
      >
        <SocketContext.Provider
          value={{ socket, unreadCount, notifications, markAllRead, addNotification, setNotifications, setUnreadCount }}
        >
          {children}
        </SocketContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
};

// Custom hooks
export const useTheme = () => useContext(ThemeContext);
export const useAuth = () => useContext(AuthContext);
export const useSocket = () => useContext(SocketContext);
