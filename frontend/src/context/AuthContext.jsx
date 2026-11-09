import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('company_a_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('company_a_token'));
  const [loading, setLoading] = useState(false);

  const loginAsRole = async (role) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auth/demo-login/${role}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Demo login failed');
      const data = await res.json();
      
      const userData = {
        name: data.user_name,
        role: data.role,
        phone: data.phone,
        vehicle_number: data.vehicle_number,
      };
      
      setUser(userData);
      setToken(data.access_token);
      localStorage.setItem('company_a_user', JSON.stringify(userData));
      localStorage.setItem('company_a_token', data.access_token);
    } catch (err) {
      console.error(err);
      alert('Failed to sign in as ' + role);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('company_a_user');
    localStorage.removeItem('company_a_token');
  };

  // Default to DRIVER on first load if nothing selected
  useEffect(() => {
    if (!user) {
      loginAsRole('DRIVER');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, loginAsRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

