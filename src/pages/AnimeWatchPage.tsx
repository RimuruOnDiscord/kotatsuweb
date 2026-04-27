/* ─── START OF FILE AnimeWatchPage.tsx ────────────────────────────── */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import CommentSection from '../components/shared/CommentSection';
import WatchTogetherModal from '../components/shared/WatchTogetherModal';
import { useWatchTogether } from '../hooks/useWatchTogether';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronsLeft, ChevronsRight, Loader2, AlertCircle, FastForward,
  Server, MonitorPlay, Layers, ArrowDownUp, Link2, Play,
  Bookmark, BookmarkCheck, Users, Share2, Clapperboard,
  X, Copy, Check, ExternalLink
} from 'lucide-react';

import {
  fetchAnimeInfo,
  fetchAnimeEpisodes,
  fetchAnimeSearch,
  getProviderEpisodes,
  AnimeWatchProviderPayload,
  fetchAnimeStreams
} from '../utils/animeApi';
import { isBookmarked as checkLocalBookmark, readBookmarks, toggleBookmark } from '../utils/bookmarks';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, Track, type MediaPlayerInstance, isHLSProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

/* ─── Proxy Configuration ───────────────────────────────────────── */
const WORKER_PROXY_URL = "https://proxypipe.vercel.app";

/* ─── Font & Design Tokens Injection ─────────────────────────────── */
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-card:        var(--app-card);
    --aw-border:      var(--app-border);
    --aw-border-hi:   var(--app-border-hover);
    --aw-accent:      var(--app-accent);
    --aw-accent-2:    var(--app-accent);
    --aw-accent-dim:  var(--app-accent-muted);
    --aw-accent-glow: var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { font-family: var(--aw-font-body); background: transparent; color: var(--aw-text); }

  .aw-layout { 
    max-width: 1460px; 
    margin: 0 auto; 
    width: 100%; 
    padding: 32px 16px; 
    gap: 32px; 
    position: relative; 
    z-index: 10; 
    display: grid; 
    grid-template-columns: 1fr; 
  }
  .aw-main { 
    min-width: 0; 
    width: 100%; 
    display: flex; 
    flex-direction: column; 
    gap: 20px; 
    position: relative; 
    z-index: 50; 
  }
  .aw-sidebar {
    width: 100%;
    display: flex;
    flex-direction: column;
    background: rgba(10, 10, 15, 0.1) !important;
    backdrop-filter: blur(12px) saturate(120%) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,0.8);
    height: fit-content;
  }

  @media (min-width: 1280px) {
    .aw-layout { grid-template-columns: 1fr 380px; align-items: start; }
    .aw-sidebar { 
      position: sticky; 
      top: 100px; 
      max-height: calc(100vh - 140px); 
    }
  }

  .aw-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
  .aw-scroll::-webkit-scrollbar-track { background: transparent; }
  .aw-scroll::-webkit-scrollbar-thumb { background: var(--aw-accent-dim); border-radius: 2px; }
  .aw-scroll::-webkit-scrollbar-thumb:hover { background: var(--aw-accent); }

  .ep-item { transition: background 0.18s, border-color 0.18s, transform 0.2s; }
  .ep-item:hover .ep-thumb { transform: scale(1.08); }
  .ep-thumb { transition: transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.3s; }

  .aw-action-btn { 
    transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94); 
    position: relative;
    overflow: hidden;
  }
  .aw-action-btn:hover:not(:disabled) { 
    background: color-mix(in srgb, var(--aw-accent) 12%, transparent) !important; 
    border-color: color-mix(in srgb, var(--aw-accent) 60%, transparent) !important; 
    color: var(--aw-text) !important; 
    transform: translateY(-2px); 
    box-shadow: 0 6px 16px -8px rgba(0,0,0,0.8); 
  }
  .aw-action-btn:active:not(:disabled) { 
    transform: translateY(0) scale(0.96); 
    box-shadow: none; 
  }

  .aw-segment-btn { transition: background 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s, filter 0.2s; }
  .aw-segment-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .aw-segment-btn[data-active='false']:hover { background: rgba(255,255,255,0.08) !important; color: var(--aw-text) !important; }
  .aw-segment-btn[data-active='true']:hover { background: var(--aw-s2) !important; color: var(--aw-accent) !important; box-shadow: 0 8px 22px -18px var(--aw-accent-glow); filter: brightness(1.08); }

  .skip-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .skip-btn:hover { background: rgba(255, 255, 255, 0.2) !important; transform: scale(1.05) translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1) !important; }

  .aw-toggle { cursor: pointer; }
  .aw-toggle-track, .aw-toggle-label { transition: all 0.2s cubic-bezier(0.25,0.46,0.45,0.94); }
  .aw-toggle:hover .aw-toggle-track[data-checked='false'] { background: rgba(255,255,255,0.06) !important; border-color: var(--aw-accent-dim) !important; }
  .aw-toggle:hover .aw-toggle-track[data-checked='true'] { filter: brightness(1.08); box-shadow: 0 0 16px -8px var(--aw-accent-glow); }
  .aw-toggle:hover .aw-toggle-label { color: var(--aw-text) !important; }

  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.95); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
  .aw-toast { animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

  @keyframes markerSlide { from { height: 0; opacity: 0; } to { height: 100%; opacity: 1; } }
  .ep-active-marker { animation: markerSlide 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }

  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  .aw-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%); background-size: 400px 100%; animation: shimmer 1.4s ease infinite; }

  .aw-label { font-family: var(--aw-font-display); font-size: 10px; letter-spacing: 0.18em; font-weight: 600; text-transform: uppercase; color: var(--aw-accent); }
  
  .genre-pill { display: inline-flex; align-items: center; gap: 6px; background: var(--aw-bg); border: 1px solid var(--aw-border); color: var(--aw-text); font-family: var(--aw-font-display); font-size: 10px; letter-spacing: 0.1em; font-weight: 600; text-transform: uppercase; padding: 4px 12px; border-radius: 100px; transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .genre-pill:hover { 
    background: rgba(255,255,255,0.04) !important; 
    border-color: var(--aw-accent) !important; 
    color: var(--aw-accent) !important; 
    transform: translateY(-2px); 
    box-shadow: 0 4px 20px -6px color-mix(in srgb, var(--aw-accent) 25%, transparent); 
  }
  .studio-pill { display: inline-flex; align-items: center; gap: 6px; background: color-mix(in srgb, var(--aw-accent) 15%, transparent); border: 1px solid color-mix(in srgb, var(--aw-accent) 40%, transparent); color: var(--aw-accent); font-family: var(--aw-font-display); font-size: 10px; letter-spacing: 0.1em; font-weight: 700; text-transform: uppercase; padding: 5px 14px; border-radius: 100px; }

  .aw-noise::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E"); background-repeat: repeat; background-size: 180px; }

  @keyframes epSlideIn {
    from { opacity: 0; transform: translateX(16px) scale(0.98); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }
  .ep-slide-in {
    animation: epSlideIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) both;
  }

  @keyframes btnShimmer {
    0% { transform: translateX(-150%) skewX(-25deg); }
    100% { transform: translateX(150%) skewX(-25deg); }
  }
  .aw-btn-shimmer {
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--aw-accent), transparent 90%), transparent);
    width: 60%;
    height: 100%;
    left: 0;
    top: 0;
    position: absolute;
    animation: btnShimmer 3.5s infinite ease-in-out;
    pointer-events: none;
  }
  .aw-shimmer-wrapper {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
  }
  .aw-action-hover {
    transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .aw-action-hover:hover:not(:disabled) {
    transform: translateY(-3px);
    filter: brightness(1.2);
    box-shadow: 0 12px 30px -10px rgba(0,0,0,0.6);
    background: rgba(255,255,255,0.08) !important;
  }
  .aw-action-hover:active:not(:disabled) {
    transform: translateY(-1px) scale(0.98);
  }

  @keyframes seekFlash {
    0%   { opacity: 0; transform: translateY(-50%) scale(0.8) rotate(-5deg); }
    20%  { opacity: 1; transform: translateY(-50%) scale(1.05) rotate(0deg); }
    60%  { opacity: 1; transform: translateY(-50%) scale(1) rotate(0deg); }
    100% { opacity: 0; transform: translateY(-50%) scale(0.95); }
  }
  .aw-seek-overlay {
    position: absolute;
    top: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: white;
    pointer-events: none;
    z-index: 100;
    animation: seekFlash 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    font-family: var(--aw-font-display);
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    padding: 14px 18px;
    text-shadow: 0 1px 8px rgba(0,0,0,0.9);
    white-space: nowrap;
    min-width: 100px;
  }
  .aw-seek-left { left: 20px; }
  .aw-seek-right { right: 20px; }

  /* Share Modal */
  @keyframes shareModalIn {
    from { opacity: 0; transform: scale(0.88) translateY(20px) rotateX(10deg); }
    to { opacity: 1; transform: scale(1) translateY(0) rotateX(0deg); }
  }
  @keyframes shareModalOut {
    from { opacity: 1; transform: scale(1) translateY(0) rotateX(0deg); }
    to { opacity: 0; transform: scale(0.88) translateY(20px) rotateX(10deg); }
  }
  .aw-share-modal {
    animation: shareModalIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }
  .aw-share-modal.closing {
    animation: shareModalOut 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }
  @keyframes shareBackdropIn {
    from { opacity: 0; backdrop-filter: blur(0px); }
    to { opacity: 1; backdrop-filter: blur(8px); }
  }
  @keyframes shareBackdropOut {
    from { opacity: 1; backdrop-filter: blur(8px); }
    to { opacity: 0; backdrop-filter: blur(0px); }
  }
  .aw-share-backdrop {
    animation: shareBackdropIn 0.3s ease forwards;
  }
  .aw-share-backdrop.closing {
    animation: shareBackdropOut 0.3s ease forwards;
  }

  /* Server Tabs */
  .server-tab { transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94); position: relative; }
  .server-tab:hover:not([data-active='true']) { background: rgba(255,255,255,0.06) !important; transform: translateY(-2px); }
  .server-tab[data-active='true'] { box-shadow: 0 0 0 1px var(--aw-accent), 0 4px 20px -8px var(--aw-accent-glow); animation: glowPulse 2s ease-in-out infinite; }

  /* Quality/Source badges */
  .source-badge { transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .source-badge:hover:not([data-active='true']) { background: rgba(255,255,255,0.06) !important; border-color: rgba(255,255,255,0.15) !important; transform: translateY(-2px); }
  .source-badge[data-active='true'] { animation: glowPulse 2s ease-in-out infinite; }

  /* ─── Vidstack Player Theme Overrides ─── */
  media-player[data-view-type="video"] {
    --media-brand: var(--aw-accent);
    --media-focus-ring: 0 0 0 3px var(--aw-accent-dim);
    --video-brand: var(--aw-accent);
    --video-font-family: var(--aw-font-body);
  }

  .vds-video-layout {
    --video-brand: var(--aw-accent);
    --video-font-family: var(--aw-font-body);
    --video-controls-bg: rgba(7, 7, 12, 0.5) !important;
    --video-controls-backdrop-filter: blur(12px) saturate(180%);
  }

  .vds-button:hover {
    color: var(--aw-accent) !important;
    transform: scale(1.1);
    transition: transform 0.15s, color 0.15s;
  }

  /* ═══ SUPER ANIMATION KEYFRAMES ═══ */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeInLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes fadeInRight {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes bounceIn {
    0% { opacity: 0; transform: scale(0.3); }
    50% { transform: scale(1.05); }
    70% { transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 5px -2px var(--aw-accent-glow); }
    50% { box-shadow: 0 0 20px -2px var(--aw-accent-glow), 0 0 40px -10px var(--aw-accent-glow); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }
  @keyframes spinIn {
    from { opacity: 0; transform: rotate(-180deg) scale(0.5); }
    to { opacity: 1; transform: rotate(0deg) scale(1); }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); max-height: 0; }
    to { opacity: 1; transform: translateY(0); max-height: 500px; }
  }
  @keyframes pulseRing {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }
  @keyframes borderGlow {
    0%, 100% { border-color: rgba(255,255,255,0.08); }
    50% { border-color: color-mix(in srgb, var(--aw-accent) 40%, transparent); }
  }

  .anim-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  .anim-fade-in-down { animation: fadeInDown 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  .anim-fade-in-left { animation: fadeInLeft 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  .anim-fade-in-right { animation: fadeInRight 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  .anim-scale-in { animation: scaleIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  .anim-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  .anim-slide-down { animation: slideDown 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }

  .anim-delay-1 { animation-delay: 0.1s; }
  .anim-delay-2 { animation-delay: 0.2s; }
  .anim-delay-3 { animation-delay: 0.3s; }
  .anim-delay-4 { animation-delay: 0.4s; }
  .anim-delay-5 { animation-delay: 0.5s; }
  .anim-delay-6 { animation-delay: 0.6s; }

  .hover-lift {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .hover-lift:hover {
    box-shadow: 0 20px 40px -15px rgba(0,0,0,0.6);
  }

  .room-glow {
    animation: glowPulse 2s ease-in-out infinite;
  }

  .input-glow:focus {
    animation: borderGlow 2s ease-in-out infinite;
    box-shadow: 0 0 20px -8px var(--aw-accent-glow);
  }

  .speed-indicator {
    animation: bounceIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .tab-content-enter {
    animation: fadeInUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }

  .season-float {
    animation: float 4s ease-in-out infinite;
  }
  .season-float:nth-child(2n) { animation-delay: 0.5s; }
  .season-float:nth-child(3n) { animation-delay: 1s; }

  .stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
  .stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
  .stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
  .stagger-children > *:nth-child(4) { animation-delay: 0.2s; }
  .stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
  .stagger-children > *:nth-child(6) { animation-delay: 0.3s; }
  .stagger-children > *:nth-child(7) { animation-delay: 0.35s; }
  .stagger-children > *:nth-child(8) { animation-delay: 0.4s; }

  .skeleton-wave {
    background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%);
    background-size: 200% 100%;
    animation: skeletonWave 1.5s ease infinite;
  }
  @keyframes skeletonWave {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .controls-bar-enter {
    animation: fadeInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both;
  }

  .video-container-enter {
    animation: scaleIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }

  .sidebar-enter {
    animation: fadeInRight 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s both;
  }

  .sources-panel-enter {
    animation: fadeInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.35s both;
  }

  .seasons-enter {
    animation: fadeInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.45s both;
  }

  .ep-item-hover:hover {
    transform: translateX(4px);
    background: rgba(255,255,255,0.04) !important;
  }
  .ep-item-hover:hover .ep-number {
    color: var(--aw-accent) !important;
    transform: scale(1.1);
  }
  .ep-number {
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .provider-switch {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .provider-switch:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 24px -8px rgba(0,0,0,0.5);
  }
`;

interface StreamSource { url: string; type: string; quality: string; referer?: string; }
interface StreamSubtitle { file: string; label: string; }
interface StreamData {
  streams: StreamSource[];
  subtitles?: StreamSubtitle[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

/* ─── Timeline / Slug Helpers ────────────────────────────────────── */
export const createSlug = (title: string) => {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const getBaseTitle = (title: string) => {
  if (!title) return '';
  let t = title;
  const seasonMatch = t.match(/\b(?:Season|Part|Arc|Chapter|Cour|Act)\s*\d+\b/i);
  if (seasonMatch && seasonMatch.index !== undefined) t = t.substring(0, seasonMatch.index);
  const nthSeasonMatch = t.match(/\b\d+(?:st|nd|rd|th)\s+Season\b/i);
  if (nthSeasonMatch && nthSeasonMatch.index !== undefined) t = t.substring(0, nthSeasonMatch.index);
  const separatorMatch = t.match(/:|\s+-\s+/);
  if (separatorMatch && separatorMatch.index !== undefined) {
    const candidate = t.substring(0, separatorMatch.index).trim();
    if (candidate.length > 2 || !t.includes(' - ')) t = candidate;
    else t = t.split(' - ')[0];
  }
  return t.replace(/\s+(I{1,3}|IV|V|VI{0,3}|IX|X|\d+)$/i, '').trim();
};

const generateTabLabel = (_title: string, _baseTitle: string, index: number) => {
  return `Season ${index + 1}`;
};

const extractSlug = (episodeId: string) => episodeId.split('/').pop() || episodeId;

const getEpisodeHref = (animeSlug: string, provider: string, category: 'sub' | 'dub', episodeId: string) =>
  `/watch/${animeSlug}/${encodeURIComponent(provider)}/${category}/${encodeURIComponent(extractSlug(episodeId))}`;

const formatEpisodeDate = (isoDate?: string) => {
  if (!isoDate) return '?';
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) return '?';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsedDate);
};

const PREFERRED_SERVERS = ['kiwi', 'animepahe', 'hd-1', 'vidstreaming', 'megacloud', 'hd-2', 'zoro', 'gogoanime', 'kai'];

const rankProviders = (providers: string[]) =>
  [...providers].sort((a, b) => {
    const ra = PREFERRED_SERVERS.findIndex(p => a.toLowerCase().includes(p));
    const rb = PREFERRED_SERVERS.findIndex(p => b.toLowerCase().includes(p));
    return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
  });

/* ─── Toggle Component ────────────────────────────────────────────── */
const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  accent?: string;
}> = ({ checked, onChange, label, accent = 'var(--aw-accent)' }) => (
  <label
    className="aw-toggle flex items-center gap-3 select-none anim-fade-in-up"
    onClick={() => onChange(!checked)}
    style={{ fontFamily: 'var(--aw-font-display)' }}
  >
    <div
      className="aw-toggle-track"
      data-checked={checked}
      style={{
        width: 32, height: 18, borderRadius: 100,
        background: checked ? accent : 'var(--aw-bg)',
        border: `1px solid ${checked ? accent : 'var(--aw-border)'}`,
        position: 'relative', transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      <div
        className="aw-toggle-knob"
        style={{
          position: 'absolute', top: 2, left: checked ? 16 : 2,
          width: 12, height: 12, borderRadius: '50%', background: 'white',
          transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: checked ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
        }}
      />
    </div>
    <span
      className="aw-toggle-label"
      style={{
        fontSize: 10, letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase',
        color: checked ? 'var(--aw-text)' : 'var(--aw-muted)', transition: 'color 0.2s',
      }}
    >
      {label}
    </span>
  </label>
);

/* ─── Share Modal Component ───────────────────────────────────────── */
const ShareModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  coverImage: string;
  episodeInfo: string;
  studioName: string | null;
}> = ({ open, onClose, title, coverImage, episodeInfo, studioName }) => {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, 300); // Matches the 0.3s closing animation
      return () => clearTimeout(timer);
    }
  }, [open, visible]);

  if (!visible) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} - ${episodeInfo}`, url: shareUrl });
      } catch (e) { /* cancelled */ }
    }
  };

  return (
    <div
      className={`aw-share-backdrop ${closing ? 'closing' : ''}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}
      onClick={onClose}
    >
      <div
        className={`aw-share-modal hover-lift ${closing ? 'closing' : ''}`}
        style={{
          background: 'var(--aw-bg)', border: '1px solid var(--aw-border)', borderRadius: 20,
          maxWidth: 420, width: '100%', overflow: 'hidden', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.9)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#000' }}>
          <img
            src={coverImage || 'https://via.placeholder.com/640x360/0d0d1a/3f3f56?text=Anime'}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.6s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 24px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontFamily: 'var(--aw-font-display)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--aw-accent)' }}>{studioName || 'Anime'}</p>
            <h3 style={{ margin: 0, fontFamily: 'var(--aw-font-display)', fontSize: 18, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{title}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>{episodeInfo}</p>
          </div>
          <button
            onClick={onClose}
            className="aw-action-hover"
            style={{
              position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 16px', fontFamily: 'var(--aw-font-display)', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-muted)' }}>Share Link</p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <div style={{
              flex: 1, background: 'var(--aw-s2)', border: '1px solid var(--aw-border)', borderRadius: 10,
              padding: '10px 14px', fontSize: 12, color: 'var(--aw-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: 'var(--aw-font-body)', transition: 'all 0.2s'
            }}>
              {shareUrl}
            </div>
            <button
              onClick={handleCopy}
              className="aw-action-btn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '0 18px', borderRadius: 10, border: `1px solid ${copied ? 'var(--aw-accent)' : 'var(--aw-border)'}`,
                background: copied ? 'var(--aw-accent-dim)' : 'var(--aw-bg)', color: copied ? 'var(--aw-accent)' : 'var(--aw-text)',
                fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, minWidth: 100
              }}
            >
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>

          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="aw-action-btn"
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                background: 'var(--aw-accent-dim)', border: '1px solid var(--aw-accent-dim)',
                color: 'var(--aw-accent)', fontSize: 12, fontFamily: 'var(--aw-font-display)',
                fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 12
              }}
            >
              <Share2 size={16} /> Share via Device
            </button>
          )}

          <button
            onClick={() => window.open(shareUrl, '_blank')}
            className="aw-action-hover"
            style={{
              width: '100%', padding: '10px', borderRadius: 10,
              background: 'transparent', border: '1px solid var(--aw-border)',
              color: 'var(--aw-muted)', fontSize: 11, fontFamily: 'var(--aw-font-display)',
              fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--aw-border-hi)'; e.currentTarget.style.color = 'var(--aw-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.style.color = 'var(--aw-muted)'; }}
          >
            <ExternalLink size={14} /> Open in New Tab
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ──────────────────────────────────────────────── */
const AnimeWatch: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    const original = MediaSource.prototype.addSourceBuffer;
    MediaSource.prototype.addSourceBuffer = function (mimeType: string) {
      const fixed = mimeType.replace('mp4a.40.1', 'mp4a.40.2');
      if (fixed !== mimeType) console.log('[codec-fix] Remapped:', mimeType, '->', fixed);
      return original.call(this, fixed);
    };
    return () => { MediaSource.prototype.addSourceBuffer = original; };
  }, []);

  const { animeId: urlSlug, provider, category, episodeId } = useParams<{
    animeId: string;
    provider?: string;
    category?: 'sub' | 'dub';
    episodeId?: string;
  }>();

  const navigate = useNavigate();
  const activeEpRef = useRef<HTMLDivElement>(null);
  const epListScrollRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MediaPlayerInstance>(null);

  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [episodesData, setEpisodesData] = useState<Record<string, AnimeWatchProviderPayload>>({});
  const [resolvedId, setResolvedId] = useState<number | string | null>(null);
  const [animeInfo, setAnimeInfo] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);

  const [streamLoading, setStreamLoading] = useState(false);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [epSearchQuery, setEpSearchQuery] = useState('');
  const [episodeSortOrder, setEpisodeSortOrder] = useState<'asc' | 'desc'>(() =>
    (localStorage.getItem('watchEpisodeSortOrder') as 'asc' | 'desc') || 'asc'
  );

  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('watchAutoPlay') !== 'false');
  const [autoSkip, setAutoSkip] = useState(() => localStorage.getItem('watchAutoSkip') !== 'false');
  const [lightsOff, setLightsOff] = useState(false);

  const [bookmarked, setBookmarked] = useState(false);
  const [savedBookmarkId, setSavedBookmarkId] = useState<string | null>(null);
  const isSyncingBookmark = useRef(false);
  const [likes, setLikes] = useState(6600);
  const [dislikes, setDislikes] = useState(124);
  const [likeState, setLikeState] = useState<'like' | 'dislike' | null>(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showWatchTogetherModal, setShowWatchTogetherModal] = useState(false);

  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sourcesTab, setSourcesTab] = useState<'servers' | 'providers' | 'player'>('servers');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [proxifiedSources, setProxifiedSources] = useState<Record<string, string>>({});
  const [proxifiedStreamUrl, setProxifiedStreamUrl] = useState<string | null>(null);

  const wtUserName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || ('Anonymous ' + Math.floor(Math.random() * 9999));
  const watchTogether = useWatchTogether(
    user?.id,
    wtUserName,
    useCallback((event) => {
      if (event.type === 'episode_change' && event.payload) {
        if (window.location.pathname !== event.payload) {
          navigate(event.payload, { replace: false });
        }
        return;
      }
      if (!playerRef.current) return;
      const diff = Math.abs(playerRef.current.currentTime - event.time);
      switch (event.type) {
        case 'play':
          playerRef.current.play();
          break;
        case 'pause':
          playerRef.current.pause();
          break;
        case 'seek':
          if (diff > 2) playerRef.current.currentTime = event.time;
          break;
        case 'timeupdate':
          if (diff > 5) playerRef.current.currentTime = event.time;
          break;
      }
    }, [navigate])
  );

  const [seekIndicator, setSeekIndicator] = useState<'rewind' | 'forward' | null>(null);
  const pointerStateRef = useRef({
    downTime: 0, downX: 0, downY: 0, lastTapTime: 0, lastTapX: 0, lastTapY: 0, clickTimeout: null as any
  });
  const seekIndicatorTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { localStorage.setItem('watchAutoPlay', String(autoPlay)); }, [autoPlay]);
  useEffect(() => { localStorage.setItem('watchAutoSkip', String(autoSkip)); }, [autoSkip]);
  useEffect(() => { localStorage.setItem('watchEpisodeSortOrder', episodeSortOrder); }, [episodeSortOrder]);

  useEffect(() => {
    const activeTab = tabRefs.current[sourcesTab];
    if (activeTab) {
      setIndicatorStyle({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
      });
    }
  }, [sourcesTab]);

useEffect(() => {
    const checkStatus = async () => {
      let isFound = false;
      let foundId: string | null = null;
      
      const targetIdMal = animeInfo?.idMal ? String(animeInfo.idMal) : null;
      const targetIdAni = animeInfo?.id ? String(animeInfo.id) : null;
      const targetIdStr = String(resolvedId || urlSlug);
      const currentSlug = animeInfo ? createSlug(animeInfo.title?.english || animeInfo.title?.romaji || animeInfo.title?.native || '') : '';

      if (user) {
        try {
          const { data } = await supabase.from('anime_bookmarks').select('mal_id, title').eq('user_id', user.id);
          if (data) {
            const match = data.find(b => 
              (targetIdMal && b.mal_id === targetIdMal) ||
              (targetIdAni && b.mal_id === targetIdAni) ||
              b.mal_id === targetIdStr || 
              (urlSlug && createSlug(b.title) === urlSlug) || 
              (currentSlug && createSlug(b.title) === currentSlug)
            );
            if (match) {
              isFound = true;
              foundId = match.mal_id;
            }
          }
        } catch { /* ignore */ }
      } else {
        const localBookmarks = readBookmarks();
        const match = localBookmarks.find(b => 
          (targetIdMal && String(b.malId) === targetIdMal) ||
          (targetIdAni && String(b.malId) === targetIdAni) ||
          String(b.malId) === targetIdStr || 
          (urlSlug && createSlug(b.title) === urlSlug) || 
          (currentSlug && createSlug(b.title) === currentSlug)
        );
        if (match) {
          isFound = true;
          foundId = String(match.malId);
        }
      }
      setBookmarked(isFound);
      setSavedBookmarkId(foundId);
    };

    checkStatus();
  }, [user, resolvedId, urlSlug, animeInfo]);

  useEffect(() => {
    if (!user || !urlSlug || !episodeId) return;
    const fetchRemoteProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('anime_watch_history')
          .select('episode_id, progress_time')
          .eq('user_id', user.id)
          .eq('anime_id', urlSlug)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') return;
        if (data && data.episode_id === episodeId && data.progress_time > 3) {
          localStorage.setItem(`progress-${urlSlug}-${episodeId}`, data.progress_time.toString());
        }
      } catch (e) {
        console.warn('Sync Remote Progress error:', e);
      }
    };
    fetchRemoteProgress();
  }, [user, urlSlug, episodeId]);

  useEffect(() => {
    const id = 'aw-design-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === ',' || e.key === '.') {
        e.preventDefault();
        if (playerRef.current) {
          const forward = e.key === '.';
          const current = playerRef.current.currentTime;
          playerRef.current.currentTime = Math.max(0, current + (forward ? 0.0416 : -0.0416));
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const availableProviders = Object.keys(episodesData);
  const rankedProviders = useMemo(() =>
    rankProviders(availableProviders).filter(p => /arc|kiwi/i.test(p)),
    [availableProviders]
  );

  useEffect(() => {
    let isMounted = true;
    const loadAnimeData = async () => {
      if (!urlSlug) return;
      setLoadingEpisodes(true);

      try {
        let anilistId = Number(urlSlug);
        if (isNaN(anilistId)) {
          const searchRes = await fetchAnimeSearch(urlSlug, 1);
          if (searchRes?.results?.length) {
            anilistId = searchRes.results[0].id;
          } else throw new Error("Anime not found in database.");
        }

        if (!isMounted) return;
        setResolvedId(anilistId);

        const [info, epsPayload] = await Promise.all([
          fetchAnimeInfo(anilistId),
          fetchAnimeEpisodes(anilistId)
        ]);

        if (!isMounted) return;

        setAnimeInfo(info);
        setEpisodesData(epsPayload?.providers || {});

        const allowedRelations = ['SEQUEL', 'PREQUEL', 'ALTERNATIVE', 'PARENT', 'SIDE_STORY'];
        const excludedFormats = ['SPECIAL', 'MUSIC', 'TV_SHORT', 'OVA', 'ONA', 'MOVIE'];
        const currentTitle = info.title?.english || info.title?.romaji || info.title?.native || '?';
        const baseTitle = getBaseTitle(currentTitle);

        const seenIds = new Set<number>([info.id]);
        const tabs: any[] = [{ id: info.id, title: currentTitle, format: info.format, active: true, displayLabel: '' }];

        let queue = [info];
        let depth = 0;
        const MAX_DEPTH = 3;
        const MAX_TOTAL = 15;

        while (queue.length > 0 && depth < MAX_DEPTH && tabs.length < MAX_TOTAL) {
          const nextQueue: any[] = [];
          const idsToFetch: number[] = [];
          queue.forEach(item => {
            item.relations?.edges?.forEach((edge: any) => {
              const node = edge.node;
              if (
                node?.type === 'ANIME' && allowedRelations.includes(edge.relationType) &&
                !excludedFormats.includes(node.format) && !seenIds.has(node.id)
              ) {
                idsToFetch.push(node.id); seenIds.add(node.id);
              }
            });
          });

          if (idsToFetch.length === 0) break;
          const results = await Promise.allSettled(idsToFetch.slice(0, 5).map(id => fetchAnimeInfo(id)));

          results.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
              tabs.push({
                id: res.value.id,
                title: res.value.title?.english || res.value.title?.romaji || res.value.title?.native || '',
                format: res.value.format, active: false, displayLabel: '',
              });
              nextQueue.push(res.value);
            }
          });
          queue = nextQueue; depth++;
        }

        if (!isMounted) return;

        tabs.sort((a: any, b: any) => a.id - b.id);
        tabs.forEach((tab, idx) => { tab.displayLabel = generateTabLabel(tab.title, baseTitle, idx); });
        setSeasons(tabs);

      } catch (err) {
        console.error("Watch Page Load Error:", err);
        if (isMounted) setEpisodesData({});
      } finally {
        if (isMounted) setLoadingEpisodes(false);
      }
    };

    loadAnimeData();
    return () => { isMounted = false; };
  }, [urlSlug]);

  useEffect(() => {
    if (loadingEpisodes || availableProviders.length === 0 || !urlSlug || provider) return;
    const best = rankedProviders[0];
    if (!best) return;
    const defCat = episodesData[best]?.episodes?.['sub']?.length ? 'sub' : 'dub';
    const firstEp = episodesData[best]?.episodes?.[defCat]?.[0];
    if (firstEp) navigate(getEpisodeHref(urlSlug, best, defCat, firstEp.id), { replace: true });
  }, [loadingEpisodes, episodesData, provider, urlSlug, navigate, rankedProviders, availableProviders]);

  const currentCategory = category || 'sub';
  const currentProvider = provider || '';

  const providerEpisodes = useMemo(() => {
    if (!currentProvider) return [];
    return getProviderEpisodes({ providers: episodesData }, currentProvider, currentCategory);
  }, [episodesData, currentProvider, currentCategory]);

  const visibleEpisodes = useMemo(() => {
    let filtered = providerEpisodes.filter(ep =>
      String(ep.number).includes(epSearchQuery.trim()) ||
      (ep.title && ep.title.toLowerCase().includes(epSearchQuery.trim().toLowerCase()))
    );
    if (episodeSortOrder === 'desc') { filtered = [...filtered].reverse(); }
    return filtered;
  }, [providerEpisodes, epSearchQuery, episodeSortOrder]);

  const currentIndex = useMemo(() => {
    if (!episodeId) return -1;
    let idx = providerEpisodes.findIndex(ep => extractSlug(ep.id) === episodeId);
    if (idx === -1) {
      const epNumMatch = episodeId.match(/\d+$/);
      if (epNumMatch) idx = providerEpisodes.findIndex(ep => String(ep.number) === epNumMatch[0]);
    }
    return idx;
  }, [providerEpisodes, episodeId]);

  const currentEpData = currentIndex !== -1 ? providerEpisodes[currentIndex] : providerEpisodes[0];

  useEffect(() => {
    if (!loadingEpisodes || !activeEpRef.current) return;
    const el = activeEpRef.current;
    const container = epListScrollRef.current;
    if (container) {
      const elTop = el.offsetTop;
      const elHeight = el.offsetHeight;
      const containerHeight = container.clientHeight;
      container.scrollTop = elTop - containerHeight / 2 + elHeight / 2;
    }
  }, [loadingEpisodes, episodeId, currentProvider, currentCategory]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < providerEpisodes.length - 1 && currentIndex !== -1;

  useEffect(() => {
    if (!currentEpData?.id || !resolvedId || !currentProvider || !episodeId) return;
    let mounted = true;
    const load = async () => {
      setStreamLoading(true); setStreamData(null); setStreamError(null); setLikeState(null);
      setShowSkipIntro(false); setShowSkipOutro(false);
      try {
        const data = await fetchAnimeStreams(currentProvider.toLowerCase(), resolvedId, currentCategory as 'sub' | 'dub', episodeId);
        if (!data.streams?.length) throw new Error('Server is not responding.');
        if (mounted) setStreamData(data as any);

        if (!data.intro && !data.outro && mounted) {
          const skipProviders = ['arc', 'kiwi', 'animepahe', 'animekai', 'animedunya', 'anikoto'];
          for (const sp of skipProviders) {
            if (sp === currentProvider.toLowerCase()) continue;
            const providerKey = Object.keys(episodesData).find(k => k.toLowerCase() === sp);
            if (!providerKey) continue;
            try {
              const epList = getProviderEpisodes({ providers: episodesData }, providerKey, currentCategory as 'sub' | 'dub');
              const matchEp = epList.find(e => e.number === currentEpData.number);
              if (matchEp) {
                const spPure = extractSlug(matchEp.id);
                const spData = await fetchAnimeStreams(sp, resolvedId, currentCategory as 'sub' | 'dub', spPure);
                if (spData.intro || spData.outro) {
                  if (mounted) {
                    setStreamData((prev: any) => ({ ...prev, intro: spData.intro || prev?.intro, outro: spData.outro || prev?.outro }));
                  }
                  break;
                }
              }
            } catch (e) { }
          }
        }
      } catch (err: any) {
        if (mounted) setStreamError(err.message || 'Failed to load media.');
      } finally {
        if (mounted) setStreamLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentEpData?.id, resolvedId, currentProvider, currentCategory, episodeId]);

  const [selectedStreamIndex, setSelectedStreamIndex] = useState<number>(-1);

  useEffect(() => {
    if (streamData?.streams && streamData.streams.length > 0 && selectedStreamIndex === -1) {
      const internalIndex = streamData.streams.findIndex((s: any) =>
        s.type === 'hls' || (!s.url.includes('iframe') && !s.url.includes('/embed/') && s.url.includes('.m3u8'))
      );
      if (internalIndex !== -1) setSelectedStreamIndex(internalIndex);
      else setSelectedStreamIndex(0);
    }
  }, [streamData, selectedStreamIndex]);

  const activeStream = useMemo<any>(() => {
    if (!streamData?.streams) return null;
    const stream = streamData.streams[selectedStreamIndex] || streamData.streams[0];
    if (!stream) return null;
    if ((stream.type === 'embed' || stream.url.includes('iframe') || stream.url.includes('/embed/')) && !stream.url.includes('.m3u8')) {
      return { ...stream, type: 'embed' };
    }
    return { ...stream, type: 'hls' };
  }, [streamData, selectedStreamIndex]);

  const [isProxifying, setIsProxifying] = useState(false);

  useEffect(() => {
    let mounted = true;
    setProxifiedStreamUrl(null);
    setProxifiedSources({});

    if (!activeStream?.url?.includes('.m3u8') || !activeStream?.url) {
      setIsProxifying(false); return;
    }

    setIsProxifying(true);
    try {
      const b64 = btoa(activeStream.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const url = `https://proxypipe.vercel.app/proxy/${b64}`;
      if (mounted) {
        setProxifiedSources({ proxypipe: url });
        setProxifiedStreamUrl(url);
      }
    } finally {
      if (mounted) setIsProxifying(false);
    }
    return () => { mounted = false; };
  }, [activeStream]);


  const derivedTitle = typeof animeInfo?.title === 'string'
    ? animeInfo.title
    : animeInfo?.title?.english || animeInfo?.title?.romaji || animeInfo?.title?.userPreferred;
  const displayTitle = derivedTitle || (!/^\d+$/.test(String(urlSlug)) ? String(urlSlug).replace(/-/g, ' ') : 'Anime Details');

  const progressDataRef = useRef<any>(null);
  const playingEpisodeRef = useRef<string>('');
  const videoStateRef = useRef({ episodeId: '', currentTime: 0, duration: 0 });
  const lastSavedTime = useRef<number>(-1);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    setIsVideoReady(false);
    videoStateRef.current = { episodeId: '', currentTime: 0, duration: 0 };
    lastSavedTime.current = -1;
    if (streamData && episodeId) { playingEpisodeRef.current = episodeId; }
  }, [episodeId, streamData]);

  progressDataRef.current = {
    animeId: String(resolvedId || urlSlug), episodeId: episodeId || '', animeTitle: displayTitle,
    animeCover: animeInfo?.image || animeInfo?.coverImage?.large || animeInfo?.images?.jpg?.large_image_url || undefined,
    episodeTitle: currentEpData?.title || `Episode ${currentEpData?.number || '?'}`,
    episodeNumber: currentEpData?.number || 0,
    href: (episodeId && urlSlug) ? getEpisodeHref(urlSlug, currentProvider, currentCategory, episodeId) : ''
  };

  const forceSaveProgress = useCallback(async (explicitPayload?: any) => {
    const payload = explicitPayload?.episodeId ? explicitPayload : progressDataRef.current;
    if (!payload?.episodeId || !payload?.animeId) return;

    let currentTime = 0; let duration = 0;
    if (videoStateRef.current.episodeId === payload.episodeId) {
      currentTime = videoStateRef.current.currentTime || 0;
      duration = videoStateRef.current.duration || 0;
    }
    if (currentTime === 0 && playingEpisodeRef.current === payload.episodeId && playerRef.current) {
      const vTime = playerRef.current.state.currentTime;
      const vDur = playerRef.current.state.duration;
      if (Number.isFinite(vTime) && vTime > 0) currentTime = vTime;
      if (Number.isFinite(vDur) && vDur > 0) duration = vDur;
    }

    const safeDuration = (Number.isFinite(duration) && duration > 0) ? duration : 0;
    let safeTime = (Number.isFinite(currentTime) && currentTime > 0) ? currentTime : 0;
    
    // FIX: Don't save progress if within the last 5% or last 15 seconds of the video.
    // This prevents the "resume from end" bug when navigating back after finishing.
    if (safeDuration > 0 && (safeTime > safeDuration - 15 || safeTime > safeDuration * 0.95)) {
      return;
    }
    
    if (safeTime < 3) return;

    try {
      if (user) {
        await supabase.from('anime_watch_history').upsert({
          user_id: user.id, anime_id: String(payload.animeId), episode_id: String(payload.episodeId),
          anime_title: payload.animeTitle, anime_cover: payload.animeCover, episode_title: payload.episodeTitle,
          episode_number: payload.episodeNumber, href: payload.href, duration: safeDuration,
          progress_time: safeTime, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, anime_id' });
      }

      const progressKey = `progress-${payload.animeId}-${payload.episodeId}`;
      localStorage.setItem(progressKey, safeTime.toString());

      const raw = localStorage.getItem('anime-continue-watching');
      const entries = raw ? JSON.parse(raw) : [];
      const filtered = (Array.isArray(entries) ? entries : []).filter((e: any) => String(e.animeId) !== String(payload.animeId));

      filtered.unshift({ kind: 'anime', ...payload, duration: safeDuration, currentTime: safeTime, updatedAt: Date.now() });
      localStorage.setItem('anime-continue-watching', JSON.stringify(filtered.slice(0, 40)));
      window.dispatchEvent(new Event('storage'));
    } catch (e) { console.warn('Failed to save progress', e); }
  }, [user]);

  useEffect(() => {
    const onSave = () => forceSaveProgress();
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') forceSaveProgress(); };
    window.addEventListener('beforeunload', onSave); document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', onSave); document.removeEventListener('visibilitychange', onVisibilityChange);
      onSave();
    };
  }, [forceSaveProgress]);

  const [isSpeeding, setIsSpeeding] = useState(false);
  const isSpeedingRef = useRef(false);
  const normalSpeedRef = useRef(1);
  const wasPausedRef = useRef(false);
  const preventClickRef = useRef(false);
  const speedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!e.isPrimary) return;

    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], [role="slider"], [role="menu"], input, .vds-controls-group')) return;

    pointerStateRef.current.downTime = Date.now();
    pointerStateRef.current.downX = e.clientX;
    pointerStateRef.current.downY = e.clientY;

    if (playerRef.current) wasPausedRef.current = playerRef.current.state.paused;

    speedTimeoutRef.current = setTimeout(() => {
      if (playerRef.current) {
        preventClickRef.current = true;
        normalSpeedRef.current = playerRef.current.state.playbackRate || 1;
        if (wasPausedRef.current) playerRef.current.play();
        playerRef.current.playbackRate = 2;
        isSpeedingRef.current = true;
        setIsSpeeding(true);
      }
    }, 350);
  }, []);

  const stopSpeeding = useCallback((e?: React.PointerEvent | PointerEvent | Event) => {
    if (speedTimeoutRef.current) { clearTimeout(speedTimeoutRef.current); speedTimeoutRef.current = null; }
    if (isSpeedingRef.current && playerRef.current) {
      if (e && 'stopPropagation' in e) { e.stopPropagation(); e.preventDefault(); }
      playerRef.current.playbackRate = normalSpeedRef.current;
      if (wasPausedRef.current) playerRef.current.pause();
      isSpeedingRef.current = false; setIsSpeeding(false);
      preventClickRef.current = true;
      setTimeout(() => { preventClickRef.current = false; }, 100);
      return true;
    }
    return false;
  }, []);

  const handleVideoPointerUp = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    const wasSpeeding = stopSpeeding(e);
    if (wasSpeeding) { pointerStateRef.current.lastTapTime = 0; return; }
    if (e.pointerType !== 'touch') return;

    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], [role="slider"], [role="menu"], input, .vds-controls-group')) return;

    const upTime = Date.now();
    const upX = e.clientX; const upY = e.clientY;
    const pState = pointerStateRef.current;
    const isTap = (upTime - pState.downTime < 300) && Math.abs(upX - pState.downX) < 15 && Math.abs(upY - pState.downY) < 15;

    if (!isTap) { pState.lastTapTime = 0; return; }

    const timeSinceLastTap = upTime - pState.lastTapTime;
    const distFromLastTap = Math.sqrt(Math.pow(upX - pState.lastTapX, 2) + Math.pow(upY - pState.lastTapY, 2));

    if (timeSinceLastTap < 350 && distFromLastTap < 40) {
      if (pState.clickTimeout) { clearTimeout(pState.clickTimeout); pState.clickTimeout = null; }

      if (playerRef.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = upX - rect.left;
        const width = rect.width;

        if (clickX < width * 0.4) {
          e.stopPropagation(); e.preventDefault(); preventClickRef.current = true;
          setTimeout(() => { preventClickRef.current = false; }, 200);
          playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - 10);
          setSeekIndicator('rewind');
          if (seekIndicatorTimeout.current) clearTimeout(seekIndicatorTimeout.current);
          seekIndicatorTimeout.current = setTimeout(() => setSeekIndicator(null), 550);
        } else if (clickX > width * 0.6) {
          e.stopPropagation(); e.preventDefault(); preventClickRef.current = true;
          setTimeout(() => { preventClickRef.current = false; }, 200);
          playerRef.current.currentTime = Math.min(playerRef.current.state.duration || 0, playerRef.current.currentTime + 10);
          setSeekIndicator('forward');
          if (seekIndicatorTimeout.current) clearTimeout(seekIndicatorTimeout.current);
          seekIndicatorTimeout.current = setTimeout(() => setSeekIndicator(null), 550);
        }
      }
      pState.lastTapTime = upTime; pState.lastTapX = upX; pState.lastTapY = upY;
    } else {
      pState.lastTapTime = upTime; pState.lastTapX = upX; pState.lastTapY = upY;
    }
  }, [stopSpeeding]);

  const handleVideoPointerLeave = useCallback((e: React.PointerEvent | PointerEvent | Event) => {
    stopSpeeding(e as PointerEvent);
  }, [stopSpeeding]);

  const handleVideoClickCapture = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isControl = !!target.closest('button, [role="button"], [role="slider"], [role="menu"], input, .vds-controls-group');
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const isSide = x < w * 0.4 || x > w * 0.6;

    if ((preventClickRef.current || isSide) && !isControl) {
      e.stopPropagation(); e.preventDefault();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('pointerup', handleVideoPointerLeave);
    window.addEventListener('blur', handleVideoPointerLeave);
    return () => { window.removeEventListener('pointerup', handleVideoPointerLeave); window.removeEventListener('blur', handleVideoPointerLeave); };
  }, [handleVideoPointerLeave]);

  const chapterTrackUrl = useMemo(() => {
    if (!streamData) return null;
    const { intro, outro } = streamData;
    if (!intro && !outro) return null;

    const formatVtt = (sec: number) => {
      const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = Math.floor(sec % 60); const ms = Math.floor((sec % 1) * 1000);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    let vtt = "WEBVTT\n\n";
    if (intro && intro.start > 0) { vtt += `${formatVtt(0)} --> ${formatVtt(intro.start)}\nEpisode\n\n`; }
    else if (!intro && outro && outro.start > 0) { vtt += `${formatVtt(0)} --> ${formatVtt(outro.start)}\nEpisode\n\n`; }

    if (intro) {
      vtt += `${formatVtt(intro.start)} --> ${formatVtt(intro.end)}\nIntro\n\n`;
      if (outro) vtt += `${formatVtt(intro.end)} --> ${formatVtt(outro.start)}\nEpisode\n\n`;
    }
    if (outro) vtt += `${formatVtt(outro.start)} --> ${formatVtt(outro.end)}\nOutro\n\n`;

    const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
    return URL.createObjectURL(blob);
  }, [streamData]);

  useEffect(() => { return () => { if (chapterTrackUrl) URL.revokeObjectURL(chapterTrackUrl); }; }, [chapterTrackUrl]);

  const finalStreamUrl = useMemo(() => {
    if (!activeStream || activeStream.type === 'embed') return null;
    if (isProxifying) return null;
    if (proxifiedStreamUrl) return proxifiedStreamUrl;
    return activeStream.url || null;
  }, [activeStream, proxifiedStreamUrl, isProxifying]);

  useEffect(() => {
    const currentPayload = { ...progressDataRef.current };
    return () => { forceSaveProgress(currentPayload); };
  }, [activeStream, forceSaveProgress]);

  const handleTimeUpdate = useCallback(({ currentTime, duration }: { currentTime: number, duration: number }) => {
    videoStateRef.current.currentTime = currentTime;
    if (duration > 0) videoStateRef.current.duration = duration;

    if (streamData?.intro) {
      const { start, end } = streamData.intro;
      const isWithinIntro = currentTime >= start && currentTime < end;
      if (isWithinIntro) { if (autoSkip) skipTo(end); else setShowSkipIntro(true); } else setShowSkipIntro(false);
    }

    if (streamData?.outro) {
      const { start, end } = streamData.outro;
      const isWithinOutro = currentTime >= start && currentTime < end;
      if (isWithinOutro) { if (autoSkip) skipTo(end); else setShowSkipOutro(true); } else setShowSkipOutro(false);
    }
  }, [streamData, autoSkip]);

  const skipTo = (t: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = t;
      watchTogether.broadcastEvent('seek', t);
    }
  };

  const handleVote = (type: 'like' | 'dislike') => {
    if (likeState === type) {
      setLikeState(null);
      if (type === 'like') setLikes(l => l - 1);
      if (type === 'dislike') setDislikes(d => d - 1);
    } else {
      if (likeState === 'like') setLikes(l => l - 1);
      if (likeState === 'dislike') setDislikes(d => d - 1);
      setLikeState(type);
      if (type === 'like') setLikes(l => l + 1);
      if (type === 'dislike') setDislikes(d => d + 1);
    }
  };

  const formatK = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();

  const handleEpisodeClick = useCallback((targetId: string) => {
    forceSaveProgress();
    if (!urlSlug || !currentProvider) return;
    let finalTargetId = extractSlug(targetId);
    const customPrefixes = ['animepahe', 'animekai', 'animedunya', 'anikoto'];
    const activePrefix = customPrefixes.find(p => episodeId?.toLowerCase().startsWith(p));

    if (activePrefix) {
      const targetNumMatch = finalTargetId.match(/\d+$/);
      if (targetNumMatch) finalTargetId = `${activePrefix}-${targetNumMatch[0]}`;
    }
    const href = getEpisodeHref(urlSlug, currentProvider, currentCategory, finalTargetId);
    if (watchTogether.isInRoom) {
      watchTogether.broadcastEvent('episode_change', 0, href);
    }
    navigate(href);
  }, [urlSlug, currentProvider, currentCategory, navigate, forceSaveProgress, episodeId, watchTogether.isInRoom, watchTogether.broadcastEvent]);

  const handleCategorySwitch = useCallback((newCat: 'sub' | 'dub') => {
    forceSaveProgress();
    if (!urlSlug || !currentProvider || newCat === currentCategory) return;
    const eps = getProviderEpisodes({ providers: episodesData }, currentProvider, newCat);
    if (!eps.length) return showToast(`No ${newCat.toUpperCase()} episodes found.`);

    const match = eps.find(ep => ep.number === currentEpData?.number) || eps[0];
    let finalTargetId = extractSlug(match.id);
    const customPrefixes = ['animepahe', 'animekai', 'animedunya', 'anikoto'];
    const activePrefix = customPrefixes.find(p => episodeId?.toLowerCase().startsWith(p));
    if (activePrefix) {
      const targetNumMatch = finalTargetId.match(/\d+$/);
      if (targetNumMatch) finalTargetId = `${activePrefix}-${targetNumMatch[0]}`;
    }
    const href = getEpisodeHref(urlSlug, currentProvider, newCat, finalTargetId);
    if (watchTogether.isInRoom) {
      watchTogether.broadcastEvent('episode_change', 0, href);
    }
    navigate(href);
  }, [urlSlug, currentProvider, currentCategory, episodesData, currentEpData, navigate, showToast, forceSaveProgress, episodeId, watchTogether.isInRoom, watchTogether.broadcastEvent]);

  const handleProviderSwitch = useCallback((newProv: string) => {
    forceSaveProgress();
    if (!urlSlug || newProv === currentProvider) return;
    const eps = getProviderEpisodes({ providers: episodesData }, newProv, currentCategory);
    if (!eps.length) return showToast(`Server [${newProv}] has no episodes.`);
    const match = eps.find(ep => ep.number === currentEpData?.number) || eps[0];
    const href = getEpisodeHref(urlSlug, newProv, currentCategory, match.id);
    if (watchTogether.isInRoom) {
      watchTogether.broadcastEvent('episode_change', 0, href);
    }
    navigate(href);
  }, [urlSlug, currentProvider, currentCategory, episodesData, currentEpData, navigate, showToast, forceSaveProgress, watchTogether.isInRoom, watchTogether.broadcastEvent]);

  const handleVideoEnd = useCallback(() => {
    if (autoPlay && hasNext && providerEpisodes[currentIndex + 1]) {
      handleEpisodeClick(providerEpisodes[currentIndex + 1].id);
    }
  }, [autoPlay, hasNext, handleEpisodeClick, providerEpisodes, currentIndex]);

  const studioName = useMemo(() => {
    if (!animeInfo?.studios) return null;
    if (Array.isArray(animeInfo.studios)) {
      const first = animeInfo.studios[0];
      return typeof first === 'string' ? first : first?.name;
    }
    if (animeInfo.studios.edges) {
      const main = animeInfo.studios.edges.find((e: any) => e.isMain) || animeInfo.studios.edges[0];
      return main?.node?.name;
    }
    return null;
  }, [animeInfo]);

  const handleBookmarkToggle = useCallback(async () => {
    if (!animeInfo || isSyncingBookmark.current) return;
    const previousState = bookmarked;
    setBookmarked(!previousState);
    isSyncingBookmark.current = true;
    try {
      // Use the actual saved ID if we matched by title, otherwise firmly default to idMal -> AniList ID -> resolved ID -> slug
      const targetId = savedBookmarkId || String(animeInfo.idMal || animeInfo.id || resolvedId || urlSlug);
      const title = animeInfo.title?.english || animeInfo.title?.romaji || animeInfo.title?.native || displayTitle || 'Unknown Title';
      const coverUrl = animeInfo.coverImage?.extraLarge || animeInfo.coverImage?.large || animeInfo.image;
      
      if (user) {
        if (previousState) {
          const { error } = await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).eq('mal_id', targetId);
          if (error) { console.error('Failed to remove bookmark:', error); setBookmarked(previousState); }
          else { showToast('Removed from Bookmarks'); setSavedBookmarkId(null); }
        } else {
          const { error } = await supabase.from('anime_bookmarks').insert({
            user_id: user.id, mal_id: targetId, title, cover: coverUrl,
            type: animeInfo.format || 'Anime', status: animeInfo.status || 'Unknown',
            score: animeInfo.averageScore || null, author: studioName || null
          });
          if (error) { console.error('Failed to add bookmark:', error); setBookmarked(previousState); }
          else { showToast('Added to Bookmarks'); setSavedBookmarkId(targetId); }
        }
      } else {
        const numericId = Number(targetId) || 0;
        const result = toggleBookmark({
          malId: numericId, title, cover: coverUrl,
          type: animeInfo.format || 'Anime', status: animeInfo.status,
          score: animeInfo.averageScore, author: studioName
        });
        setBookmarked(result.bookmarked);
        setSavedBookmarkId(result.bookmarked ? String(numericId) : null);
        showToast(result.bookmarked ? 'Added to Bookmarks' : 'Removed from Bookmarks');
      }
    } catch (err) {
      console.error('Bookmark toggle error:', err);
      setBookmarked(previousState);
    } finally {
      isSyncingBookmark.current = false;
    }
  }, [animeInfo, bookmarked, savedBookmarkId, resolvedId, urlSlug, displayTitle, studioName, user, showToast]);

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="aw-root aw-noise min-h-screen flex flex-col relative">
      {lightsOff && (
        <div onClick={() => setLightsOff(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(2px)', cursor: 'pointer', transition: 'opacity 0.5s' }} />
      )}

      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={displayTitle}
        coverImage={animeInfo?.bannerImage || animeInfo?.coverImage?.extraLarge || animeInfo?.image || animeInfo?.coverImage?.large}
        episodeInfo={`${currentEpData?.title || `Episode ${currentEpData?.number || '?'}`} - ${currentCategory.toUpperCase()}`}
        studioName={studioName}
      />

      <WatchTogetherModal
        open={showWatchTogetherModal}
        onClose={() => setShowWatchTogetherModal(false)}
        isInRoom={watchTogether.isInRoom}
        roomCode={watchTogether.roomCode}
        participants={watchTogether.participants}
        isHost={watchTogether.isHost}
        connectionStatus={watchTogether.connectionStatus}
        error={watchTogether.error}
        onCreateRoom={watchTogether.createRoom}
        onJoinRoom={watchTogether.joinRoom}
        onLeaveRoom={watchTogether.leaveRoom}
      />

      <div style={{ height: 24 }} />

      <div className="aw-layout">
        <main className="aw-main">
          {/* Video Container */}
          <div
            className="video-container-enter hover-lift"
            style={{
              position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000',
              borderRadius: 16, overflow: 'hidden', zIndex: lightsOff ? 50 : 'auto', transition: 'box-shadow 0.5s',
              boxShadow: lightsOff
                ? '0 0 0 2px var(--aw-accent), 0 0 80px 8px var(--aw-accent-glow), 0 30px 80px -20px rgba(0,0,0,0.9)'
                : '0 24px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
              userSelect: 'none'
            }}
            onPointerDownCapture={handleVideoPointerDown}
            onPointerUpCapture={handleVideoPointerUp}
            onPointerLeave={handleVideoPointerLeave}
            onClickCapture={handleVideoClickCapture}
            onContextMenu={(e) => { if (isSpeeding) e.preventDefault(); }}
          >
            {(streamLoading || loadingEpisodes || isProxifying) ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,7,13,0.9)', backdropFilter: 'blur(4px)', zIndex: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <Loader2 style={{ width: 40, height: 40, color: 'var(--aw-accent)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-muted)' }}>
                    {isProxifying ? 'Redirecting Stream' : 'Loading Stream'}
                  </span>
                </div>
              </div>
            ) : streamError ? (
              <div className="anim-bounce-in" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,7,13,0.95)', padding: 32, textAlign: 'center', gap: 16, zIndex: 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(232,54,93,0.1)', border: '1px solid rgba(232,54,93,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4, animation: 'pulse 2s ease-in-out infinite' }}><AlertCircle style={{ color: 'var(--aw-accent)', width: 24, height: 24 }} /></div>
                <p style={{ fontFamily: 'var(--aw-font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-accent)' }}>Stream Failed</p>
                <p style={{ fontSize: 13, color: 'var(--aw-muted)', maxWidth: 320, lineHeight: 1.6, fontWeight: 300 }}>{streamError}</p>
                <button onClick={() => window.location.reload()} className="aw-action-btn" style={{ marginTop: 8, padding: '10px 28px', background: 'var(--aw-card)', border: '1px solid var(--aw-border-hi)', borderRadius: 100, color: 'var(--aw-text)', fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>Reload Player</button>
              </div>
            ) : (activeStream) ? (
              <>
                {(activeStream?.type === 'embed' && activeStream?.url) ? (
                  <iframe src={activeStream.url} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
                ) : (
                  <MediaPlayer
                    ref={playerRef}
                    title={displayTitle}
                    poster={currentEpData?.image || animeInfo?.image}
                    src={finalStreamUrl ? { src: finalStreamUrl, type: 'application/vnd.apple.mpegurl' } : undefined}
                    onProviderChange={(provider) => {
                      if (isHLSProvider(provider)) {
                        provider.config = {
                          enableWorker: true, backBufferLength: 0, maxBufferLength: 30, maxMaxBufferLength: 60,
                          manifestLoadingMaxRetry: 3, levelLoadingMaxRetry: 3, fragLoadingMaxRetry: 6,
                          appendErrorMaxRetry: 3, testBandwidth: false
                        };
                      }
                    }}
                    onPlay={() => watchTogether.broadcastEvent('play', playerRef.current?.currentTime || 0)}
                    onPause={() => watchTogether.broadcastEvent('pause', playerRef.current?.currentTime || 0)}
                    onTimeUpdate={(e: any) => {
                      const time = typeof e === 'number' ? e : e?.detail?.currentTime || e?.detail || e?.currentTime || 0;
                      const duration = playerRef.current?.state?.duration || videoStateRef.current.duration || 0;
                      handleTimeUpdate({ currentTime: time, duration });
                      watchTogether.broadcastEvent('timeupdate', time);
                    }}
                    onEnded={handleVideoEnd}
                    onCanPlay={() => {
                      setIsVideoReady(true);
                      if (!playerRef.current) return;
                      const epId = progressDataRef.current?.episodeId || episodeId;
                      const aId = progressDataRef.current?.animeId || urlSlug;
                      if (!epId || !aId) return;
                      const savedTimeRaw = localStorage.getItem(`progress-${aId}-${epId}`);
                      if (savedTimeRaw) {
                        const parsedTime = parseFloat(savedTimeRaw);
                        const duration = playerRef.current.state?.duration || 0;
                        // FIX: Only resume if saved time is valid and NOT near the end.
                        // This prevents the infinite "resume -> ended -> next" loop.
                        if (parsedTime > 10 && playerRef.current.currentTime < 5) {
                          if (duration > 0 && parsedTime < duration - 20 && parsedTime < duration * 0.92) {
                            playerRef.current.currentTime = parsedTime;
                            showToast(`Resumed playback`);
                          }
                        }
                      }
                      if (watchTogether.isInRoom) {
                        setTimeout(() => {
                          if (playerRef.current) {
                            watchTogether.broadcastEvent('play', playerRef.current.currentTime);
                          }
                        }, 2000);
                      }
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', outline: 'none' }}
                  >
                    <MediaProvider>
                      {chapterTrackUrl && <Track src={chapterTrackUrl} kind="chapters" label="Chapters" language="en" default />}
                      {streamData?.subtitles?.map((sub, i) => (
                        <Track key={String(i)} src={sub.file} kind="subtitles" label={sub.label} language={sub.label.substring(0, 2).toLowerCase()} default={sub.label.toLowerCase().includes('english')} />
                      ))}
                    </MediaProvider>
                    <DefaultVideoLayout icons={defaultLayoutIcons} />

                    {isSpeeding && (
                      <div className="speed-indicator" style={{
                        position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)',
                        zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
                        padding: '8px 20px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 8,
                        color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
                        fontFamily: 'var(--aw-font-display)', pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <FastForward size={16} style={{ color: 'var(--aw-accent)' }} /> 2x Speed
                      </div>
                    )}

                    {seekIndicator === 'rewind' && (
                      <div className="aw-seek-overlay aw-seek-left">
                        {currentEpData?.image && (
                          <div style={{ width: 80, height: 45, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
                            <img src={currentEpData.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ChevronsLeft size={20} style={{ color: 'white' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>-10s</span>
                        </div>
                      </div>
                    )}
                    {seekIndicator === 'forward' && (
                      <div className="aw-seek-overlay aw-seek-right">
                        {currentEpData?.image && (
                          <div style={{ width: 80, height: 45, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
                            <img src={currentEpData.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ChevronsRight size={20} style={{ color: 'white' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>+10s</span>
                        </div>
                      </div>
                    )}

                    {toastMessage && (
                      <div className="aw-toast" style={{
                        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)',
                        color: 'white', padding: '8px 20px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--aw-font-display)',
                        fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', zIndex: 60, whiteSpace: 'nowrap',
                      }}>{toastMessage}</div>
                    )}
                    {showSkipIntro && streamData?.intro && !autoSkip && (
                      <button className="skip-btn anim-bounce-in" onClick={() => skipTo(streamData.intro!.end)} style={{ position: 'absolute', bottom: 90, right: 32, zIndex: 100, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '12px 24px', color: 'white', fontSize: 14, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)', textTransform: 'uppercase' }}>
                        <FastForward size={16} style={{ color: 'var(--aw-accent)' }} /> <span style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Skip Intro</span>
                      </button>
                    )}
                    {showSkipOutro && streamData?.outro && !autoSkip && (
                      <button className="skip-btn anim-bounce-in" onClick={() => skipTo(streamData.outro!.end)} style={{ position: 'absolute', bottom: 90, right: 32, zIndex: 100, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '12px 24px', color: 'white', fontSize: 14, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)', textTransform: 'uppercase' }}>
                        <FastForward size={16} style={{ color: 'var(--aw-accent)' }} /> <span style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Skip Outro</span>
                      </button>
                    )}
                  </MediaPlayer>
                )}
              </>
            ) : null}
          </div>

          {/* Controls Bar */}
          <div className="controls-bar-enter hover-lift" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', background: 'var(--aw-s1)', borderRadius: 12, border: '1px solid var(--aw-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <Toggle checked={autoPlay} onChange={setAutoPlay} label="Autoplay" />
              <Toggle checked={autoSkip} onChange={setAutoSkip} label="Auto Skip" />
              <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="aw-action-btn anim-fade-in-up anim-delay-1" onClick={() => hasPrev && handleEpisodeClick(providerEpisodes[currentIndex - 1].id)} disabled={!hasPrev || streamLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 18px', borderRadius: 100, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: (!hasPrev || streamLoading) ? 'rgba(255,255,255,0.25)' : 'var(--aw-muted)', fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: (!hasPrev || streamLoading) ? 'not-allowed' : 'pointer' }}>
                  <ChevronsLeft size={14} /> PREV
                </button>
                <button className="aw-action-btn anim-fade-in-up anim-delay-2" onClick={() => hasNext && handleEpisodeClick(providerEpisodes[currentIndex + 1].id)} disabled={!hasNext || streamLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 18px', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: (!hasNext || streamLoading) ? 'rgba(255,255,255,0.25)' : 'white', fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: (!hasNext || streamLoading) ? 'not-allowed' : 'pointer' }}>
                  NEXT <ChevronsRight size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className={`aw-action-btn anim-fade-in-up anim-delay-3 ${watchTogether.isInRoom ? 'room-glow' : ''}`}
                onClick={() => setShowWatchTogetherModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', borderRadius: 100,
                  background: watchTogether.isInRoom ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.05)',
                  border: watchTogether.isInRoom ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.08)',
                  color: watchTogether.isInRoom ? 'var(--aw-accent)' : 'var(--aw-text)',
                  fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer'
                }}
              >
                <Users size={14} />
                {watchTogether.isInRoom ? `ROOM: ${watchTogether.roomCode}` : 'WATCH TOGETHER'}
              </button>

              <button
                className="aw-action-btn anim-fade-in-up anim-delay-4"
                onClick={() => setShowShareModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', borderRadius: 100, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--aw-text)', fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                <Share2 size={14} /> SHARE
              </button>
            </div>
          </div>

          {/* Sources Panel */}
          <div className="sources-panel-enter hover-lift" style={{ padding: '24px 24px 16px', background: 'var(--aw-s1)', borderRadius: 24, border: '1px solid var(--aw-border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div className="anim-fade-in-left" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p className="aw-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MonitorPlay size={11} /> Now Playing
                </p>
                <h1 style={{ fontFamily: 'var(--aw-font-display)', fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 700, color: 'var(--aw-text)', letterSpacing: '-0.01em', lineHeight: 1.2, margin: 0 }}>
                  {currentEpData?.title || `Episode ${currentEpData?.number || '?'}`}
                </h1>
              </div>
            </div>

            {currentEpData?.description && (
              <p className="anim-fade-in-up anim-delay-1" style={{ margin: 0, fontSize: 13, fontWeight: 300, color: 'var(--aw-muted)', lineHeight: 1.6, maxWidth: 800 }}>
                {currentEpData.description}
              </p>
            )}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

            <div style={{ position: 'relative', display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { key: 'servers', label: 'Video Servers', icon: Server },
                { key: 'providers', label: 'Stream Providers', icon: Link2 },
                { key: 'player', label: 'Video Player', icon: Play },
              ].map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = sourcesTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    ref={el => { tabRefs.current[tab.key] = el; }}
                    type="button"
                    onClick={() => setSourcesTab(tab.key as any)}
                    className={`anim-fade-in-down anim-delay-${idx + 1}`}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '2px solid transparent',
                      color: isActive ? 'var(--aw-accent)' : 'var(--aw-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--aw-font-display)',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'color 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--aw-text)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--aw-muted)'; }}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
              <div
                style={{
                  position: 'absolute',
                  bottom: -1,
                  height: 2,
                  background: 'var(--aw-accent)',
                  borderRadius: 2,
                  left: indicatorStyle.left,
                  width: indicatorStyle.width,
                  transition: 'left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {sourcesTab === 'servers' && (
              <div className="tab-content-enter stagger-children" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 20 }}>
                {rankedProviders.map((p) => {
                  const isActive = currentProvider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProviderSwitch(p)}
                      className="server-tab aw-action-hover"
                      data-active={isActive}
                      style={{
                        position: 'relative',
                        padding: '8px 16px', borderRadius: 10,
                        border: isActive ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)',
                        background: isActive ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)',
                        color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.6)',
                        fontSize: 12, fontFamily: 'var(--aw-font-display)', fontWeight: 700,
                        cursor: 'pointer', textTransform: 'lowercase',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      {isActive && <div className="aw-shimmer-wrapper"><div className="aw-btn-shimmer" /></div>}
                      {p}
                    </button>
                  );
                })}
              </div>
            )}

            {sourcesTab === 'providers' && (
              <div className="tab-content-enter stagger-children" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 20 }}>
                {['animepahe', 'animekai', 'animedunya', 'anikoto'].map((prefix) => {
                  const isActive = episodeId?.toLowerCase().startsWith(prefix);
                  return (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() => {
                        const epNumMatch = episodeId?.match(/\d+$/);
                        const epNum = epNumMatch ? epNumMatch[0] : (currentEpData?.number || '1');
                        const newEpisodeId = `${prefix}-${epNum}`;
                        if (urlSlug) navigate(getEpisodeHref(urlSlug, currentProvider, currentCategory, newEpisodeId));
                      }}
                      className="source-badge aw-action-hover"
                      data-active={isActive}
                      style={{
                        position: 'relative', padding: '8px 16px', borderRadius: 10,
                        border: isActive ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)',
                        background: isActive ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)',
                        color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.6)',
                        fontSize: 12, fontFamily: 'var(--aw-font-display)', fontWeight: 700,
                        cursor: 'pointer', textTransform: 'lowercase',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      {isActive && <div className="aw-shimmer-wrapper"><div className="aw-btn-shimmer" /></div>}
                      {prefix}
                    </button>
                  );
                })}
              </div>
            )}

            {sourcesTab === 'player' && streamData && (
              <div className="tab-content-enter" style={{ display: 'flex', flexWrap: 'wrap', gap: 32, paddingLeft: 20 }}>
                {streamData.streams.some(s => s.type === 'hls' && s.url) && (
                  <div className="anim-fade-in-up anim-delay-1">
                    <p style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--aw-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--aw-muted)', opacity: 0.6, marginBottom: 12 }}><MonitorPlay size={10} /> Internal</p>
                    <div className="stagger-children" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {streamData.streams.map((s, idx) => {
                        if (s.type !== 'hls' || !s.url) return null;
                        const isActive = selectedStreamIndex === idx;
                        return (
                          <button key={idx} type="button" onClick={() => setSelectedStreamIndex(idx)} className="source-badge aw-action-hover" data-active={isActive} style={{ padding: '8px 16px', borderRadius: 10, border: isActive ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)', background: isActive ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)', color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'var(--aw-font-display)', fontWeight: 700, textTransform: 'lowercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                            {isActive && <div className="aw-shimmer-wrapper"><div className="aw-btn-shimmer" /></div>}
                            {s.quality || 'auto'}
                            <span style={{ fontSize: 8, letterSpacing: '0.1em', opacity: 0.6, textTransform: 'uppercase' }}>HLS</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {streamData.streams.some(s => s.type === 'embed' && s.url) && (
                  <div className="anim-fade-in-up anim-delay-2">
                    <p style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--aw-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--aw-muted)', opacity: 0.6, marginBottom: 12 }}><MonitorPlay size={10} /> External</p>
                    <div className="stagger-children" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {streamData.streams.map((s, idx) => {
                        if (s.type !== 'embed' || !s.url) return null;
                        const isActive = selectedStreamIndex === idx;
                        return (
                          <button key={idx} type="button" onClick={() => setSelectedStreamIndex(idx)} className="source-badge aw-action-hover" data-active={isActive} style={{ padding: '8px 16px', borderRadius: 10, border: isActive ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)', background: isActive ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)', color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'var(--aw-font-display)', fontWeight: 700, textTransform: 'lowercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                            {isActive && <div className="aw-shimmer-wrapper"><div className="aw-btn-shimmer" /></div>}
                            {s.quality || 'auto'}
                            <span style={{ fontSize: 8, letterSpacing: '0.1em', opacity: 0.6, textTransform: 'uppercase' }}>EMBED</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {seasons.length > 1 && (
            <div className="seasons-enter hover-lift" style={{ padding: '24px 28px', background: 'var(--aw-s1)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p className="anim-fade-in-left" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--aw-font-display)', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--aw-muted)' }}><Layers size={11} style={{ opacity: 0.7 }} /> Seasons</p>
              <div className="aw-scroll stagger-children" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '10px 4px 18px', margin: '-10px -4px 0' }}>
                {seasons.map((s, idx) => (
                  <button key={s.id} onClick={() => { if (!s.active) navigate(`/watch/${s.id}/kiwi/sub/animepahe-1`); }} className={`aw-action-hover season-float`} style={{ flexShrink: 0, position: 'relative', padding: '10px 20px', borderRadius: 10, border: s.active ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)', background: s.active ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)', color: s.active ? 'var(--aw-accent)' : 'var(--aw-text)', fontFamily: 'var(--aw-font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', cursor: s.active ? 'default' : 'pointer', animationDelay: `${idx * 0.1}s` }}>
                    {s.active && <div className="aw-shimmer-wrapper"><div className="aw-btn-shimmer" /></div>}
                    {s.displayLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* About This Anime Area — NO ANIMATIONS per request */}
<div 
  className="anim-fade-in-up anim-delay-5 hover-lift"
  style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 28, padding: '28px 28px', background: 'transparent', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}
> 
  <div style={{ flexShrink: 0, width: 150 }}> 
    <div 
      className="hover-lift"
      style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '2/3', boxShadow: '0 16px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)', position: 'relative' }}
    > 
      <img src={animeInfo?.image || animeInfo?.coverImage?.large || 'https://via.placeholder.com/300x450/0d0d1a/3f3f56?text=N/A'} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> 
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'transparent' }} /> 
    </div> 
  </div> 
  <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}> 
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}> 
      <h1 style={{ fontFamily: 'var(--aw-font-display)', fontSize: 'clamp(22px, 3.5vw, 38px)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '-0.02em', color: 'white', margin: '0 0 16px', lineHeight: 1.05, textTransform: 'uppercase' }}> 
        {displayTitle} 
      </h1> 
      <button className="aw-action-hover" onClick={handleBookmarkToggle} title="Bookmark Anime" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: bookmarked ? 'color-mix(in srgb, var(--aw-accent) 15%, transparent)' : 'rgba(255,255,255,0.05)', border: bookmarked ? '2px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)', color: bookmarked ? 'var(--aw-accent)' : 'var(--aw-muted)', cursor: 'pointer', transition: 'all 0.2s' }} > 
        {bookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />} 
      </button> 
    </div> 
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, alignItems: 'center' }}> 
      {studioName && ( <span className="studio-pill"> <Clapperboard size={11} /> {studioName} </span> )} 
      {(animeInfo?.genres || ['Anime']).map((g: string) => ( <button key={g} onClick={() => navigate(`/browse?genres=${encodeURIComponent(g)}`)} className="genre-pill">{g}</button> ))} 
    </div> 
    <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7, color: 'var(--aw-muted)', margin: 0, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}> 
      {animeInfo?.description?.replace(/<[^>]*>?/gm, '') || animeInfo?.synopsis || 'No description available for this anime.'} 
    </p> 
  </div> 
</div>


          <div className="anim-fade-in-up anim-delay-6" style={{ padding: '0 20px 20px' }}>
            {currentEpData && <CommentSection pageType="watch" pageId={`anime-${resolvedId || urlSlug}-ep-${currentEpData.number}`} />}
            {!currentEpData && loadingEpisodes && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Loader2 className="animate-spin text-[var(--aw-accent)]" size={24} /></div>}
          </div>
        </main>

        <aside className="aw-sidebar sidebar-enter hover-lift" style={{ zIndex: 40 }}>
          <div style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--aw-border)', flexShrink: 0 }}>
            <div className="anim-fade-in-down" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--aw-font-display)', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>Episodes
                {providerEpisodes.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--aw-accent)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 100 }}>{providerEpisodes.length}</span>}
              </h3>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: 4, gap: 2 }}>
                {(['sub', 'dub'] as const).map(cat => (
                  <button key={cat} className="aw-segment-btn" data-active={currentCategory === cat} onClick={() => handleCategorySwitch(cat)} style={{ padding: '4px 14px', borderRadius: 100, border: 'none', background: currentCategory === cat ? 'rgba(255,255,255,0.1)' : 'transparent', color: currentCategory === cat ? 'var(--aw-accent)' : 'var(--aw-muted)', fontSize: 10, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', boxShadow: currentCategory === cat ? '0 2px 12px rgba(0,0,0,0.3)' : 'none' }}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="anim-fade-in-up anim-delay-1" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input type="text" placeholder="Search episodes…" value={epSearchQuery} onChange={e => setEpSearchQuery(e.target.value)} className="input-glow" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 14px', color: 'var(--aw-text)', fontSize: 12, fontFamily: 'var(--aw-font-body)', fontWeight: 400, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }} />
              </div>
              <button onClick={() => setEpisodeSortOrder((current) => current === 'desc' ? 'asc' : 'desc')} title="Sort Episodes" className="aw-action-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, flexShrink: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--aw-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
                {episodeSortOrder === 'desc' ? <ArrowDownUp size={14} /> : <ArrowDownUp size={14} style={{ transform: 'rotate(180deg)' }} />}
              </button>
            </div>
          </div>
          <div ref={epListScrollRef} className="aw-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {loadingEpisodes ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[...Array(7)].map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--aw-border)' }}>
                    <div className="skeleton-wave" style={{ width: 28, height: 64, borderRadius: 6, flexShrink: 0 }} />
                    <div className="skeleton-wave" style={{ width: 110, height: 64, borderRadius: 8, flexShrink: 0, animationDelay: '0.1s' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                      <div className="skeleton-wave" style={{ width: '60%', height: 12, borderRadius: 4, animationDelay: '0.2s' }} />
                      <div className="skeleton-wave" style={{ width: '80%', height: 10, borderRadius: 4, animationDelay: '0.3s' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleEpisodes.length > 0 ? (
              visibleEpisodes.map((ep, idx) => {
                const isActive = (extractSlug(ep.id) === episodeId || String(ep.number) === episodeId?.match(/\d+$/)?.[0]);
                return (
                  <div key={`${episodeSortOrder}-${ep.id}`} ref={isActive ? activeEpRef : null} onClick={() => handleEpisodeClick(ep.id)} className={`ep-item ep-slide-in ep-item-hover`} style={{ animationDelay: `${Math.min(idx * 0.04, 0.5)}s`, position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--aw-border)', cursor: 'pointer', background: isActive ? 'var(--aw-accent-dim)' : 'transparent' }}>
                    {isActive && <div className="ep-active-marker" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, var(--aw-accent), var(--aw-accent-2))', borderRadius: '0 2px 2px 0' }} />}
                    <div className={`ep-number ${isActive ? '' : ''}`} style={{ width: 28, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: 'var(--aw-font-display)', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.25)', transition: 'color 0.2s' }}>{ep.number || '–'}</div>
                    <div style={{ width: 110, height: 64, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: 'var(--aw-card)', boxShadow: isActive ? '0 0 0 1.5px var(--aw-accent)' : '0 0 0 1px rgba(255,255,255,0.06)', position: 'relative' }}>
                      <img src={ep.image || 'https://via.placeholder.com/128x72/0d0d1a/3f3f56?text=–'} alt="" className="ep-thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isActive ? 1 : 0.75 }} onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/128x72/0d0d1a/3f3f56?text=–'; }} />
                      {ep.filler && <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.8)', fontSize: 9, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)', padding: '2px 5px', borderRadius: 3, textTransform: 'uppercase' }}>Filler</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 64 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
                        <h4 style={{ margin: 0, fontSize: 13, fontFamily: 'var(--aw-font-display)', fontWeight: isActive ? 700 : 600, color: isActive ? 'white' : 'rgba(255,255,255,0.8)', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title || `Episode ${ep.number || '?'}`}</h4>
                        {ep.duration && <span style={{ flexShrink: 0, fontSize: 10, color: 'var(--aw-muted)', fontWeight: 400 }}>{Math.round(ep.duration / 60)}m</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 300, color: 'var(--aw-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ep.description || `Episode ${ep.number}. ${ep.airDate ? `Aired ${formatEpisodeDate(ep.airDate)}.` : 'No synopsis available.'}`}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="anim-fade-in-up" style={{ padding: '48px 0', textAlign: 'center' }}>
                <AlertCircle size={22} style={{ color: 'var(--aw-muted)', margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                <p style={{ fontFamily: 'var(--aw-font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--aw-muted)' }}>No Matches</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AnimeWatch;
/* ─── END OF FILE AnimeWatchPage.tsx ────────────────────────────── */