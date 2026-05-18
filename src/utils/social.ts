import { supabase } from '../lib/supabase';

export type Visibility = 'public' | 'friends' | 'private';
export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export interface SocialProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role?: string | string[] | null;
  status_state?: string | null;
  status_text?: string | null;
  last_active_at?: string | null;
  profile_visibility?: Visibility | null;
  activity_visibility?: Visibility | null;
  watching_status_visibility?: Visibility | null;
}

export interface WatchActivity {
  id: string;
  user_id?: string;
  anime_id: string;
  episode_id: string;
  anime_title: string;
  anime_cover?: string | null;
  episode_title?: string | null;
  episode_number?: number | null;
  episode_image?: string | null;
  href?: string | null;
  progress_time?: number | null;
  duration?: number | null;
  created_at: string;
}

export interface WatchEventPayload {
  user_id: string;
  anime_id: string;
  episode_id: string;
  anime_title: string;
  anime_cover?: string | null;
  episode_title?: string | null;
  episode_number?: number | null;
  episode_image?: string | null;
  href?: string | null;
  progress_time?: number | null;
  duration?: number | null;
}

const DEFAULT_VISIBILITY: Visibility = 'public';

interface FetchWatchActivityOptions {
  dedupeEpisodes?: boolean;
}

const dedupeWatchActivityByEpisode = (rows: WatchActivity[], limit: number) => {
  const seen = new Set<string>();
  const deduped: WatchActivity[] = [];

  for (const row of rows) {
    const key = `${row.anime_id}:${row.episode_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
    if (deduped.length >= limit) break;
  }

  return deduped;
};

export const getVisibility = (profile: Partial<SocialProfile> | null | undefined, key: keyof Pick<SocialProfile, 'profile_visibility' | 'activity_visibility' | 'watching_status_visibility'>): Visibility => {
  const value = profile?.[key];
  return value === 'friends' || value === 'private' || value === 'public' ? value : DEFAULT_VISIBILITY;
};

export const canViewVisibility = (ownerId: string | undefined, viewerId: string | undefined, friendshipStatus: FriendshipStatus, visibility: Visibility) => {
  if (!ownerId) return false;
  if (ownerId === viewerId) return true;
  if (visibility === 'public') return true;
  if (visibility === 'friends') return friendshipStatus === 'accepted';
  return false;
};

export const isRecentlyOnline = (profile: Pick<SocialProfile, 'last_active_at' | 'status_state'> | null | undefined) => {
  if (!profile?.last_active_at || !profile.status_state || profile.status_state === 'offline') return false;
  return Date.now() - new Date(profile.last_active_at).getTime() < 15 * 60 * 1000;
};

export const normalizeFriendshipStatus = (row: any, viewerId: string): FriendshipStatus => {
  if (!row) return 'none';
  if (row.status === 'accepted') return 'accepted';
  return row.user_id === viewerId ? 'pending_sent' : 'pending_received';
};

export const fetchFriendshipStatus = async (viewerId: string | undefined, targetId: string | undefined): Promise<FriendshipStatus> => {
  if (!viewerId || !targetId || viewerId === targetId) return 'none';
  const { data } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .or(`and(user_id.eq.${viewerId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${viewerId})`)
    .limit(1);

  return normalizeFriendshipStatus(data?.[0], viewerId);
};

export const fetchWatchActivity = async (userId: string, limit = 20, options: FetchWatchActivityOptions = {}): Promise<WatchActivity[]> => {
  const queryLimit = options.dedupeEpisodes ? Math.max(limit * 4, limit) : limit;

  const { data: eventRows, error: eventError } = await supabase
    .from('anime_watch_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(queryLimit);

  if (!eventError && eventRows) {
    const rows = eventRows.map((row: any) => ({
      id: row.id || `watch-${row.anime_id}-${row.episode_id}-${row.created_at}`,
      user_id: row.user_id,
      anime_id: String(row.anime_id || ''),
      episode_id: String(row.episode_id || ''),
      anime_title: row.anime_title || 'Unknown anime',
      anime_cover: row.anime_cover,
      episode_title: row.episode_title,
      episode_number: row.episode_number,
      episode_image: row.episode_image,
      href: row.href,
      progress_time: row.progress_time,
      duration: row.duration,
      created_at: row.created_at || row.updated_at || new Date().toISOString(),
    }));
    return options.dedupeEpisodes ? dedupeWatchActivityByEpisode(rows, limit) : rows;
  }

  const { data: historyRows } = await supabase
    .from('anime_watch_history')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(queryLimit);

  const rows = (historyRows || []).map((row: any) => ({
    id: `watch-${row.anime_id}-${row.episode_id}`,
    user_id: row.user_id,
    anime_id: String(row.anime_id || ''),
    episode_id: String(row.episode_id || ''),
    anime_title: row.anime_title || 'Unknown anime',
    anime_cover: row.anime_cover,
    episode_title: row.episode_title,
    episode_number: row.episode_number,
    episode_image: row.episode_image,
    href: row.href,
    progress_time: row.progress_time,
    duration: row.duration,
    created_at: row.updated_at || new Date().toISOString(),
  }));
  return options.dedupeEpisodes ? dedupeWatchActivityByEpisode(rows, limit) : rows;
};

export const recordWatchEvent = async (payload: WatchEventPayload) => {
  const { error } = await supabase.from('anime_watch_events').insert({
    ...payload,
    created_at: new Date().toISOString(),
  });

  if (error && !sessionStorage.getItem('watch-events-schema-warning')) {
    sessionStorage.setItem('watch-events-schema-warning', '1');
    console.warn('anime_watch_events is not available yet. Apply files/supabase-social-features.sql to enable full watch history.', error.message);
  }
};

export const updateWatchingPresence = async (userId: string, statusText: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({
      status_state: 'watching',
      status_text: statusText,
      last_active_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error && !sessionStorage.getItem('presence-schema-warning')) {
    sessionStorage.setItem('presence-schema-warning', '1');
    console.warn('Watching presence columns are not available yet. Apply files/supabase-social-features.sql to enable live statuses.', error.message);
  }
};
