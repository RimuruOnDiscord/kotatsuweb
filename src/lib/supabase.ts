import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: async (_name, _acquireTimeout, fn) => {
      // By bypassing navigator.locks, we skip the lock contention
      // that causes newly duplicated tabs to hang in a signed out state.
      return await fn();
    }
  }
});
