import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';
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
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
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
  signOut: async () => { },
  updateProfile: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id,display_name,avatar_url`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data[0]) setProfile(data[0]);
      }
    } catch {
      // Profile might not exist yet if trigger hasn't fired
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session robustly
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) console.warn('Auth session error:', error);
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
        } else if (session) {
          setSession(session);
          setUser(session.user);
          // Don't await here to avoid blocking auth state transitions
          fetchProfile(session.user.id);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOutFn = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Not logged in' };
    
    try {
      // Use direct REST API to bypass potential client hangs
      const token = session?.access_token || supabaseAnonKey;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        // If PATCH fails, it might not exist, try POST (upsert)
        const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation,resolution=merge-duplicates'
          },
          body: JSON.stringify({ id: user.id, ...updates })
        });
        
        if (!upsertResponse.ok) {
          throw new Error(await upsertResponse.text());
        }
      }

      // Success! Fetch the latest profile data using direct REST API
      const refetchResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=id,display_name,avatar_url`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (refetchResponse.ok) {
        const data = await refetchResponse.json();
        if (data && data[0]) {
          setProfile(data[0]);
        }
      }

      // 3. Update auth user metadata (non-blocking)
      supabase.auth.updateUser({
        data: {
          avatar_url: updates.avatar_url ?? profile?.avatar_url,
          display_name: updates.display_name ?? profile?.display_name
        }
      }).catch(() => {});

      return { error: null };
    } catch (err: any) {
      console.error('Error updating profile:', err);
      return { error: err.message || 'An unknown error occurred' };
    }
  }, [user, session, profile]);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut: signOutFn, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
