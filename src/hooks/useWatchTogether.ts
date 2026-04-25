import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

export interface WatchTogetherParticipant {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  joinedAt: number;
}

export interface PlaybackEvent {
  type: 'play' | 'pause' | 'seek' | 'timeupdate' | 'episode_change';
  time: number;
  timestamp: number;
  senderId: string;
  payload?: string;
}

interface PresenceData {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  is_host: boolean;
  joined_at: number;
}

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const ANON_ID_KEY = 'wt_anon_id';
const ROOM_CODE_KEY = 'wt_room_code';

function getAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = 'anon-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

// ─── Module-level singleton so room survives component remounts ───
let globalChannel: RealtimeChannel | null = null;
let globalRoomCode: string | null = null;
let globalIsHost = false;
const globalListeners = new Set<() => void>();

function notifyListeners() {
  globalListeners.forEach((fn) => fn());
}

export function useWatchTogether(
  userId: string | undefined,
  userName: string,
  onPlaybackEvent?: (event: PlaybackEvent) => void
) {
  const effectiveUserId = userId || getAnonId();
  const effectiveUserName = userName || 'Anonymous';

  const [isInRoom, setIsInRoom] = useState(!!globalRoomCode);
  const [roomCode, setRoomCode] = useState<string | null>(globalRoomCode);
  const [participants, setParticipants] = useState<WatchTogetherParticipant[]>([]);
  const [isHost, setIsHost] = useState(globalIsHost);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>(
    globalRoomCode ? 'connected' : 'disconnected'
  );
  const [error, setError] = useState<string | null>(null);

  const lastBroadcastTime = useRef(0);
  const onPlaybackEventRef = useRef(onPlaybackEvent);
  onPlaybackEventRef.current = onPlaybackEvent;

  const transformPresence = useCallback((state: RealtimePresenceState<PresenceData>): WatchTogetherParticipant[] => {
    const list: WatchTogetherParticipant[] = [];
    Object.values(state).forEach((presences) => {
      presences.forEach((p) => {
        if (p.user_id) {
          list.push({
            id: p.user_id,
            name: p.user_name || 'Anonymous',
            avatar: p.user_avatar,
            isHost: p.is_host || false,
            joinedAt: p.joined_at || Date.now(),
          });
        }
      });
    });
    return list;
  }, []);

  const attachChannelListeners = useCallback((channel: RealtimeChannel, code: string, asHost: boolean) => {
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceData>();
        setParticipants(transformPresence(state));
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState<PresenceData>();
        setParticipants(transformPresence(state));
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState<PresenceData>();
        setParticipants(transformPresence(state));
      })
      .on('broadcast', { event: 'playback' }, (payload) => {
        const evt = payload.payload as PlaybackEvent;
        if (evt.senderId !== effectiveUserId) {
          onPlaybackEventRef.current?.(evt);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setIsInRoom(true);
          setRoomCode(code);
          setIsHost(asHost);
          globalRoomCode = code;
          globalIsHost = asHost;
          notifyListeners();
          await channel.track({
            user_id: effectiveUserId,
            user_name: effectiveUserName,
            is_host: asHost,
            joined_at: Date.now(),
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
          setError(asHost ? 'Failed to create room.' : 'Failed to join room.');
          globalChannel = null;
          globalRoomCode = null;
          globalIsHost = false;
          setIsInRoom(false);
          setRoomCode(null);
          setIsHost(false);
          try { sessionStorage.removeItem(ROOM_CODE_KEY); } catch {}
        }
      });
  }, [effectiveUserId, effectiveUserName, transformPresence]);

  const setupChannel = useCallback((code: string, asHost: boolean) => {
    if (globalChannel) {
      // Already have a global channel – just sync local state to it
      setConnectionStatus('connected');
      setIsInRoom(true);
      setRoomCode(code);
      setIsHost(asHost);
      // Pull current presence
      const state = globalChannel.presenceState<PresenceData>();
      setParticipants(transformPresence(state));
      return;
    }

    const channelName = `watch-together:${code}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: effectiveUserId },
      },
    });

    globalChannel = channel;
    globalRoomCode = code;
    globalIsHost = asHost;
    setConnectionStatus('connecting');
    setError(null);

    attachChannelListeners(channel, code, asHost);
  }, [effectiveUserId, attachChannelListeners, transformPresence]);

  const leaveRoom = useCallback(() => {
    if (globalChannel) {
      globalChannel.unsubscribe();
      supabase.removeChannel(globalChannel);
      globalChannel = null;
    }
    globalRoomCode = null;
    globalIsHost = false;
    setIsInRoom(false);
    setRoomCode(null);
    setParticipants([]);
    setIsHost(false);
    setConnectionStatus('disconnected');
    setError(null);
    try { sessionStorage.removeItem(ROOM_CODE_KEY); } catch {}
    notifyListeners();
  }, []);

  const createRoom = useCallback(async () => {
    leaveRoom();
    const code = generateRoomCode();
    try { sessionStorage.setItem(ROOM_CODE_KEY, code); } catch {}
    setupChannel(code, true);
  }, [leaveRoom, setupChannel]);

  const joinRoom = useCallback(async (code: string) => {
    leaveRoom();
    try { sessionStorage.setItem(ROOM_CODE_KEY, code.toUpperCase()); } catch {}
    setupChannel(code.toUpperCase(), false);
  }, [leaveRoom, setupChannel]);

  const broadcastEvent = useCallback((type: PlaybackEvent['type'], time: number, payload?: string) => {
    if (!globalChannel || !globalRoomCode) return;

    const now = Date.now();
    if (type === 'timeupdate' && now - lastBroadcastTime.current < 5000) {
      return;
    }
    if (type === 'timeupdate') {
      lastBroadcastTime.current = now;
    }

    globalChannel.send({
      type: 'broadcast',
      event: 'playback',
      payload: {
        type,
        time,
        timestamp: now,
        senderId: effectiveUserId,
        payload,
      } as PlaybackEvent,
    });
  }, [effectiveUserId]);

  // On mount: auto-rejoin if there's a saved room code or global channel
  useEffect(() => {
    try {
      const savedCode = sessionStorage.getItem(ROOM_CODE_KEY);
      if (savedCode) {
        setupChannel(savedCode, globalIsHost);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for global changes from other hook instances
  useEffect(() => {
    const sync = () => {
      setIsInRoom(!!globalRoomCode);
      setRoomCode(globalRoomCode);
      setIsHost(globalIsHost);
      if (globalChannel) {
        const state = globalChannel.presenceState<PresenceData>();
        setParticipants(transformPresence(state));
      }
    };
    globalListeners.add(sync);
    return () => { globalListeners.delete(sync); };
  }, [transformPresence]);

  return useMemo(
    () => ({
      isInRoom,
      roomCode,
      participants,
      isHost,
      connectionStatus,
      error,
      createRoom,
      joinRoom,
      leaveRoom,
      broadcastEvent,
      setError,
    }),
    [isInRoom, roomCode, participants, isHost, connectionStatus, error, createRoom, joinRoom, leaveRoom, broadcastEvent]
  );
}
