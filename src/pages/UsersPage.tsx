import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, ArrowRight } from 'lucide-react';
import PageLoader from '../components/shared/PageLoader';
import { motion } from 'framer-motion';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';

interface UserItem {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 50%)`;
};

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async (query = '') => {
    setLoading(true);
    try {
      let url = `${supabaseUrl}/rest/v1/profiles?select=id,display_name,avatar_url&order=created_at.desc&limit=50`;
      if (query.trim()) {
        url = `${supabaseUrl}/rest/v1/profiles?display_name=ilike.*${encodeURIComponent(query.trim())}*&select=id,display_name,avatar_url&order=created_at.desc&limit=50`;
      }
      const res = await fetch(url, {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Users fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 400);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          className="text-[36px] font-black text-white mb-2"
          style={{ fontFamily: '"Syne", sans-serif', letterSpacing: '-0.02em' }}
        >
          Users
        </h1>
        <p className="text-sm text-zinc-500 mb-8">Discover users in the community</p>

        {/* Search */}
        <div className="relative mb-8 max-w-[400px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-[14px] py-3 pl-10 pr-4 text-[14px] text-white outline-none transition-colors"
            style={{
              background: 'var(--app-bg-2)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: '"Onest", sans-serif'
            }}
          />
        </div>

        {/* Users Grid */}
        {loading ? (
          <PageLoader size={40} className="py-20" />
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <User size={32} className="text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">No users found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {users.map((u, i) => (
              <motion.button
                key={u.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                onClick={() => navigate(`/profile/${u.id}`)}
                className="group flex flex-col items-center gap-3 p-5 rounded-[20px] text-center transition-all hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06]"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white overflow-hidden transition-transform group-hover:scale-105"
                  style={{ background: u.avatar_url ? 'transparent' : getAvatarColor(u.display_name || 'U') }}
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                  ) : (
                    (u.display_name || 'U')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white truncate max-w-[120px]">{u.display_name || 'User'}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">View Profile</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default UsersPage;
