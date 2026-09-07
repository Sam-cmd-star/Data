import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile, Cargo } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ error?: string; cargo?: Cargo }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error("Error al obtener perfil:", error);
        setUser(null);
      } else {
        setUser({
          id: data.id,
          email: data.email,
          nombre: data.nombre,
          cargo: data.cargo as Cargo
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      setLoading(false);
      return { error: error.message };
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('usuarios')
        .select('cargo')
        .eq('id', data.user.id)
        .single();

      await fetchProfile(data.user.id);
      return { cargo: profile?.cargo as Cargo };
    }

    setLoading(false);
    return { error: 'No se pudo obtener la información del usuario.' };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);