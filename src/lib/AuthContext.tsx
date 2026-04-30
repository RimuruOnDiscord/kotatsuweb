import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Profile helpers ──────────────────────────────────────────────────────
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', userId)
      .single();

    if (!error && data) setProfile(data as Profile);
  }, []);

  // ── Session bootstrap ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) console.warn('Auth session error:', error);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
      } else if (session) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ── Auth actions ─────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (error) return { error: error.message };

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user) fetchProfile(data.user.id);
      return { error: null };
    }

    // Auto-login fallback (email confirmation disabled in Supabase)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInData.session) {
      setSession(signInData.session);
      setUser(signInData.user);
      if (signInData.user) fetchProfile(signInData.user.id);
      return { error: null };
    }

    return { error: signInError?.message ?? 'Account created. Please sign in.' };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  /**
   * Update the user's profile row using the supabase-js client (upsert handles
   * both insert-on-first-login and update cases) instead of raw REST calls.
   */
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Not logged in' };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates }, { onConflict: 'id' })
        .select('id, display_name, avatar_url')
        .single();

      if (error) throw error;
      if (data) setProfile(data as Profile);

      // Keep Supabase auth metadata in sync (best-effort)
      supabase.auth.updateUser({
        data: {
          avatar_url: updates.avatar_url ?? profile?.avatar_url,
          display_name: updates.display_name ?? profile?.display_name,
        },
      }).catch(() => {});

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error updating profile:', err);
      return { error: message };
    }
  }, [user, profile]);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
