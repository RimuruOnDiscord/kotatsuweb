import { Tv, Sparkles } from 'lucide-react';
import { readBookmarks, readFollows, writeFollows } from './bookmarks';
import { fetchAnimeInfo } from './animeApi';

// ─── TRACKER STORAGE ───
// Tracks the last known airing episode count per malId.
// Stored in localStorage under this key:
const UPDATE_TRACKER_KEY = 'mangavel:anime-update-tracker';

interface AnimeUpdateRecord {
  malId: number;
  lastKnownEpisode: number; // The highest episode number we've already notified for
  lastChecked: number;       // Unix timestamp (ms) of last check
}

// Read the full tracker map from localStorage.
// Returns a plain object keyed by malId (as a string, because JSON).
const readUpdateTracker = (): Record<string, AnimeUpdateRecord> => {
  try {
    const raw = window.localStorage.getItem(UPDATE_TRACKER_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, AnimeUpdateRecord>;
  } catch {
    return {};
  }
};

// Write the full tracker map back to localStorage.
const writeUpdateTracker = (tracker: Record<string, AnimeUpdateRecord>): void => {
  try {
    window.localStorage.setItem(UPDATE_TRACKER_KEY, JSON.stringify(tracker));
  } catch {
    // Silently ignore quota errors
  }
};

// ─── NOTIFICATION FACTORY ───
// Builds a notification object in the exact shape that NotificationDropdown expects.
// The `id` must be unique — use Date.now() + malId to guarantee no collision.
// The `icon` must be the `Tv` component from lucide-react.
// The `color` must be `'var(--aw-accent, #3b82f6)'` so it respects the active theme.
// The `coverImage` field is NEW — NotificationDropdown will be updated to render it.

const toSlug = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const buildAnimeUpdateNotification = (
  malId: number,
  title: string,
  episodeNumber: number,
  _coverImage: string | undefined
) => ({
  id: Date.now() + malId,
  title: 'New Episode Available',
  message: `${title} — Episode ${episodeNumber} just dropped!`,
  time: 'Just now',
  unread: true,
  icon: Tv,
  color: 'var(--aw-accent, #3b82f6)',
  type: 'release' as const,
  slug: toSlug(title),
});

const buildFollowUpdateNotification = (
  malId: number,
  title: string,
  newStatus: string,
  _coverImage: string | undefined
) => ({
  id: Date.now() + malId,
  title: 'Status Update',
  message: `${title} is now ${newStatus}!`,
  time: 'Just now',
  unread: true,
  icon: Sparkles,
  color: '#eab308',
  type: 'release' as const,
  slug: toSlug(title),
});

// ─── MAIN CHECKER ───
// Call this function with the React state setter from DesktopTopbar.
// It reads anime bookmarks, fetches fresh info for each RELEASING one,
// detects newly aired episodes, and prepends new notification objects.
//
// setNotifications signature must match:
//   React.Dispatch<React.SetStateAction<typeof INITIAL_NOTIFICATIONS>>
// But because the type is inferred as an array of notification objects,
// just type it as: (fn: (prev: any[]) => any[]) => void
export const checkBookmarksForUpdates = async (
  setNotifications: (fn: (prev: any[]) => any[]) => void
): Promise<void> => {
  if (typeof window === 'undefined') return;

  // Read bookmarks stored under 'mangavel:anime-bookmarks'
  // readBookmarks() reads from localStorage using the current content mode key.
  // Since we're in anime mode, this correctly reads 'mangavel:anime-bookmarks'.
  const bookmarks = readBookmarks();
  console.log(`[Notif Debug] Starting check for ${bookmarks.length} bookmarks...`);
  // Filter for only anime items if the list contains mixed media
  const animeBookmarks = bookmarks.filter(b => 
    !b.type || b.type.toLowerCase().includes('anime') || b.type.toLowerCase() === 'tv' || b.type.toLowerCase() === 'movie'
  );
  if (animeBookmarks.length === 0) return;

  // Load existing tracker
  const tracker = readUpdateTracker();
  const updatedTracker = { ...tracker };
  const newNotifications: ReturnType<typeof buildAnimeUpdateNotification>[] = [];

  // Process bookmarks one-by-one with sequential fetches to avoid hammering the API
  for (const bookmark of animeBookmarks) {
    const trackerKey = String(bookmark.malId);
    const record = updatedTracker[trackerKey];
    const lastKnown = record?.lastKnownEpisode ?? 0;

    // Prevent API spam: skip if checked within the last hour
    if (record && Date.now() - record.lastChecked < 3600000) {
      continue;
    }

    try {
      // Fetch fresh anime info from /api/info/{malId}
      const info = await fetchAnimeInfo(bookmark.malId);
      console.log(`[Notif Debug] Checking "${bookmark.title}" (Status: ${info.status}, Next Ep: ${info.nextAiringEpisode?.episode || 'N/A'})`);

      // We only care about currently airing anime.
      // Check info.status === 'RELEASING' OR info.nextAiringEpisode != null;
      const isReleasing =
        info.status === 'RELEASING' || info.nextAiringEpisode != null;
      if (!isReleasing) continue;

      // nextAiringEpisode.episode is the NEXT episode that will air.
      // The most recently aired episode is therefore nextAiringEpisode.episode - 1.
      const nextEp = info.nextAiringEpisode?.episode;
      if (typeof nextEp !== 'number' || nextEp < 2) continue;
      const latestAiredEp = nextEp - 1;

      // If the latest aired episode is higher than what we last notified for,
      // a new episode has aired — create a notification.
      if (latestAiredEp > lastKnown) {
        const title =
          info.title?.english || info.title?.romaji || info.title?.native || bookmark.title;
        const coverImage =
          info.coverImage?.large ?? info.coverImage?.extraLarge ?? bookmark.cover;

        newNotifications.push(
          buildAnimeUpdateNotification(bookmark.malId, title, latestAiredEp, coverImage)
        );

        // Update the tracker so we don't notify again for the same episode
        updatedTracker[trackerKey] = {
          malId: bookmark.malId,
          lastKnownEpisode: latestAiredEp,
          lastChecked: Date.now(),
        };
      } else {
        // Still update lastChecked even if no new episode
        updatedTracker[trackerKey] = {
          malId: bookmark.malId,
          lastKnownEpisode: lastKnown,
          lastChecked: Date.now(),
        };
      }
    } catch {
      // Silently skip — a failed fetch for one title shouldn't break the rest
      continue;
    }
  }

  // Persist the updated tracker
  writeUpdateTracker(updatedTracker);

  // ─── CHECK FOLLOWS ───
  const follows = readFollows();
  const remainingFollows = [];
  
  if (follows.length > 0) {
    for (const follow of follows) {
      const trackerKey = `follow_${follow.malId}`;
      const record = updatedTracker[trackerKey];
      
      // Prevent API spam: skip if checked within the last hour
      if (record && Date.now() - record.lastChecked < 3600000) {
        remainingFollows.push(follow);
        continue;
      }

      try {
        const info = await fetchAnimeInfo(follow.malId);
        updatedTracker[trackerKey] = { malId: follow.malId, lastKnownEpisode: 0, lastChecked: Date.now() };
        
        // If it's no longer 'NOT_YET_RELEASED' (e.g. RELEASING or FINISHED)
        // and we have successfully retrieved a status.
        if (info.status && info.status !== 'NOT_YET_RELEASED' && info.status !== 'Unknown') {
          const title = info.title?.english || info.title?.romaji || info.title?.native || follow.title;
          const coverImage = info.coverImage?.large ?? info.coverImage?.extraLarge ?? follow.cover;
          
          newNotifications.push(
            buildFollowUpdateNotification(follow.malId, title, info.status, coverImage)
          );
          // Do NOT add to remainingFollows, so it is effectively removed/unfollowed
        } else {
          remainingFollows.push(follow);
        }
      } catch {
        updatedTracker[trackerKey] = { malId: follow.malId, lastKnownEpisode: 0, lastChecked: Date.now() };
        remainingFollows.push(follow); // keep it if fetch fails
      }
    }
    
    // Update the local storage with any unfollowed items
    if (remainingFollows.length !== follows.length) {
      writeFollows(remainingFollows);
    }
  }

  // Prepend new notifications to the existing list (newest at top)
  if (newNotifications.length > 0) {
    setNotifications((prev) => [...newNotifications, ...prev]);
  }
};
