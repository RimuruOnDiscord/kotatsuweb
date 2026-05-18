import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';
import { hasStaffRole } from '../utils/invites';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role?: string | string[] | null;
  profile_visibility?: 'public' | 'friends' | 'private';
  activity_visibility?: 'public' | 'friends' | 'private';
  watching_status_visibility?: 'public' | 'friends' | 'private';
  invite_code_id?: string | null;
  invite_accepted_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  hasInviteAccess: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string, inviteCode: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  redeemInviteCode: (inviteCode: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  hasInviteAccess: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  redeemInviteCode: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInviteAccess, setHasInviteAccess] = useState(false);

  const verifyInviteAccess = useCallback(async (userId?: string | null) => {
    if (!userId) return false;

    const { data, error } = await supabase.rpc('has_invite_access', { user_id: userId });
    if (error) {
      console.warn('Invite access check failed:', error);
      return false;
    }

    return data === true;
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    let { data, error }: { data: any; error: any } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, role, profile_visibility, activity_visibility, watching_status_visibility, invite_code_id, invite_accepted_at')
      .eq('id', userId)
      .single();

    if (error) {
      const fallback = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, role')
        .eq('id', userId)
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (!error && data) {
      const nextProfile = data as Profile;
      setProfile(nextProfile);
      setHasInviteAccess(Boolean(nextProfile.invite_accepted_at) || hasStaffRole(nextProfile.role));
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) console.warn('Auth session error:', error);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await Promise.all([
          fetchProfile(session.user.id),
          verifyInviteAccess(session.user.id).then((allowed) => {
            if (mounted) setHasInviteAccess(allowed);
          }),
        ]);
      } else {
        setHasInviteAccess(false);
      }

      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setHasInviteAccess(false);
      } else if (session) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
        verifyInviteAccess(session.user.id).then((allowed) => {
          if (mounted) setHasInviteAccess(allowed);
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, verifyInviteAccess]);

  const clearLocalAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setHasInviteAccess(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const allowed = await verifyInviteAccess(data.user?.id);
    if (!allowed) {
      await supabase.auth.signOut();
      clearLocalAuthState();
      return { error: 'This account has not redeemed an invite code yet.' };
    }

    setHasInviteAccess(true);
    return { error: null };
  }, [clearLocalAuthState, verifyInviteAccess]);

  const redeemSignedInUser = useCallback(async (inviteCode: string, displayName: string, userId?: string | null) => {
    const { error } = await supabase.rpc('redeem_invite_code', {
      p_code: inviteCode.trim(),
      p_display_name: displayName,
    });

    if (error) {
      await supabase.auth.signOut();
      clearLocalAuthState();
      return { error: error.message };
    }

    setHasInviteAccess(true);
    if (userId) await fetchProfile(userId);
    return { error: null };
  }, [clearLocalAuthState, fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName: string, inviteCode: string) => {
    if (!inviteCode.trim()) return { error: 'Invite code is required' };

    // Pre-validate the invite code before creating the auth account.
    // This catches invalid/used/expired codes even when email confirmation
    // is enabled (where there is no session to redeem against at signup time).
    const { data: codeValid, error: codeCheckError } = await supabase.rpc(
      'verify_invite_code_valid',
      { p_code: inviteCode.trim() }
    );
    if (codeCheckError || !codeValid) {
      return { error: 'Invalid invite code' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (error) return { error: error.message };

    if (data.session) {
      const redeemResult = await redeemSignedInUser(inviteCode, displayName, data.user?.id);
      if (redeemResult.error) return redeemResult;
      setSession(data.session);
      setUser(data.user);
      return { error: null };
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInData.session) {
      const redeemResult = await redeemSignedInUser(inviteCode, displayName, signInData.user?.id);
      if (redeemResult.error) return redeemResult;
      setSession(signInData.session);
      setUser(signInData.user);
      return { error: null };
    }

    return { error: signInError?.message ?? 'Account created. Please confirm your email, then sign in to redeem your invite code.' };
  }, [redeemSignedInUser]);

  const redeemInviteCode = useCallback(async (inviteCode: string) => {
    if (!user) return { error: 'You must be signed in to redeem an invite code' };
    if (!inviteCode.trim()) return { error: 'Invite code is required' };

    const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Member';
    const { error } = await supabase.rpc('redeem_invite_code', {
      p_code: inviteCode.trim(),
      p_display_name: displayName,
    });

    if (error) return { error: error.message };

    setHasInviteAccess(true);
    await fetchProfile(user.id);
    return { error: null };
  }, [fetchProfile, profile?.display_name, user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearLocalAuthState();
  }, [clearLocalAuthState]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Not logged in' };

    try {
      let { data, error }: { data: any; error: any } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates }, { onConflict: 'id' })
        .select('id, display_name, avatar_url, role, profile_visibility, activity_visibility, watching_status_visibility, invite_code_id, invite_accepted_at')
        .single();

      if (error) {
        const basicUpdates = {
          id: user.id,
          display_name: updates.display_name,
          avatar_url: updates.avatar_url,
        };
        const fallback = await supabase
          .from('profiles')
          .upsert(basicUpdates, { onConflict: 'id' })
          .select('id, display_name, avatar_url, role')
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      if (data) setProfile(data as Profile);

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
    <AuthContext.Provider value={{ user, session, profile, loading, hasInviteAccess, signIn, signUp, redeemInviteCode, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
