import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, TOKEN_STORAGE_KEY } from '../services/api.js';
import { disconnectSocket } from '../services/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' until we know whether a stored token is still valid.
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) {
      setStatus('anonymous');
      return;
    }

    let cancelled = false;
    authApi
      .me()
      .then(({ user: currentUser }) => {
        if (!cancelled) {
          setUser(currentUser);
          setStatus('authenticated');
        }
      })
      .catch((error) => {
        if (cancelled) return;

        // Only a token the server actually rejected is really gone. The browser
        // aborts this request on every page reload, and clearing the token there
        // would sign the user out for no reason.
        if (error.status === 401) localStorage.removeItem(TOKEN_STORAGE_KEY);
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const storeSession = useCallback(({ token, user: signedInUser }) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setUser(signedInUser);
    setStatus('authenticated');
  }, []);

  const login = useCallback(
    async (credentials) => storeSession(await authApi.login(credentials)),
    [storeSession],
  );

  const register = useCallback(
    async (payload) => storeSession(await authApi.register(payload)),
    [storeSession],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    disconnectSocket();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(
    () => ({ user, status, isAuthenticated: status === 'authenticated', login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
