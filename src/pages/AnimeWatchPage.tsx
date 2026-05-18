
/* --- START OF FILE AnimeWatchPage.tsx --- */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import CommentSection from '../components/shared/CommentSection';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertCircle,
  FastForward,
  MonitorPlay,
  ArrowDown01,
  ArrowUp01,
  ExternalLink,
  Clock,
  Share2,
  ChevronDown,
  Info,
  Languages,
  Layout,
  X,
  Copy,
  Check,
  Server,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  ListPlus,
  Maximize,
  Minimize,
  Download,
  PictureInPicture,
  PictureInPicture2,
  CaptionsOff,
  Subtitles,
  FileText,
  RotateCcw,
  RotateCw,
  Keyboard,
  Captions,
  Repeat,
  Zap,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Accessibility,
  Rewind,
  SkipForward,
  ChevronUp,
  Plus,
  LayoutGrid,
  List,
  Image,
  Bell,
  Search,
  Flag
} from 'lucide-react';

import {
  fetchAnimeInfo,
  fetchAnimeEpisodes,
  fetchAnimeSearch,
  getProviderEpisodes,
  fetchAnimeStreams,
  fetchAnimeHybridStreams,
  fetchRemuxStream
} from '../utils/animeApi';
import type { AnimeWatchProviderPayload } from '../utils/animeApi';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { recordWatchEvent, updateWatchingPresence } from '../utils/social';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, Track, isHLSProvider } from '@vidstack/react';
import type { MediaPlayerInstance } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

/* ─── Proxy Configuration ───────────────────────────────────────── */
const WORKER_PROXY_URL = "https://proxypipe-production.up.railway.app/";

/* ─── Font & Design Tokens Injection ─────────────────────────────── */
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-card:        var(--app-card);
    --aw-border:      rgba(255, 255, 255, 0.08);
    --aw-border-hi:   rgba(255, 255, 255, 0.15);
    --aw-accent:      var(--app-accent);
    --aw-accent-2:    var(--app-accent);
    --aw-accent-dim:  var(--app-accent-muted);
    --aw-accent-glow: var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { font-family: var(--aw-font-body); background: transparent; color: var(--aw-text); overflow-x: clip; width: 100vw; max-width: 100%; }

  .aw-layout { 
    max-width: 1460px; 
    margin: 0 auto; 
    width: 100%; 
    padding: 24px 16px 60px; 
    gap: 24px; 
    position: relative; 
    z-index: 10; 
    display: grid; 
    grid-template-columns: 1fr; 
    box-sizing: border-box;
  }
  .modern-card {
    padding: 24px 28px;
    background: rgba(10, 10, 15, 0.4) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-sizing: border-box;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05);
  }
  .watch-description-frame {
    isolation: isolate;
    overflow: hidden;
    background: rgba(10, 10, 15, 0.42) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    box-shadow:
      0 40px 100px -30px rgba(0, 0, 0, 0.8),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }
  .watch-description-frame::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 34%);
    opacity: 0.55;
  }
  .watch-description-frame::after {
    content: '';
    position: absolute;
    inset: 1px;
    z-index: 0;
    pointer-events: none;
    border-radius: 23px;
    box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.02);
    opacity: 1;
  }
  .watch-description-frame > * {
    position: relative;
    z-index: 1;
  }
  .watch-description-copy {
    text-shadow: 0 1px 14px rgba(0, 0, 0, 0.28);
  }
  .watch-description-toggle {
    border-radius: 8px !important;
    transition:
      transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
      color 0.18s ease,
      background 0.18s ease,
      padding 0.18s ease !important;
  }
  .watch-description-toggle:hover {
    background: rgba(255, 255, 255, 0.055) !important;
    color: #ffffff !important;
    padding-left: 10px !important;
    padding-right: 10px !important;
  }
  .watch-description-toggle:active {
    transform: scale(0.97);
    background: rgba(255, 255, 255, 0.035) !important;
  }
  
  /* Layout specific header blocks */
  .watch-desc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 12px;
  }
  .aw-title-text {
    margin: 0;
    font-size: 22px;
    font-family: var(--aw-font-display);
    font-weight: 600;
    color: white;
    letter-spacing: -0.01em;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .aw-title-text-main {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .watch-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .watch-control-group {
    display: flex;
    align-items: center;
    height: 38px;
    padding: 2px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.065);
    background: rgba(255, 255, 255, 0.022);
    backdrop-filter: blur(16px) saturate(140%);
    -webkit-backdrop-filter: blur(16px) saturate(140%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.035),
      0 10px 28px -22px rgba(0, 0, 0, 0.82);
    transition:
      border-color 0.18s ease,
      background 0.18s ease,
      box-shadow 0.18s ease;
  }
  .watch-control-group:hover,
  .watch-control-group:focus-within {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.055),
      0 14px 34px -24px rgba(0, 0, 0, 0.9);
  }
  .watch-control-group.playback {
    position: relative;
    z-index: 1000;
  }
  .watch-control-divider {
    width: 1px;
    height: 16px;
    margin: 0 1px;
    background: rgba(255, 255, 255, 0.075);
    transition: background 0.18s ease;
  }
  .watch-control-group:hover .watch-control-divider {
    background: rgba(255, 255, 255, 0.105);
  }
  .watch-icon-button,
  .watch-control-segment {
    height: 100%;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: rgba(255, 255, 255, 0.68);
    cursor: pointer;
    outline: none;
    transition:
      transform 0.16s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.16s ease,
      color 0.16s ease,
      box-shadow 0.16s ease;
  }
  .watch-icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
  }
  .watch-control-segment {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    font: inherit;
  }
  .watch-icon-button:hover,
  .watch-control-segment:hover,
  .watch-icon-button:focus-visible,
  .watch-control-segment:focus-visible {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }
  .watch-icon-button:active,
  .watch-control-segment:active {
    transform: scale(0.96);
    background: rgba(255, 255, 255, 0.05);
  }
  .watch-control-icon {
    color: currentColor;
    opacity: 0.95;
    transition: opacity 0.16s ease, filter 0.16s ease;
  }
  .watch-icon-button:hover .watch-control-icon,
  .watch-control-segment:hover .watch-control-icon {
    opacity: 1;
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.08));
  }
  .watch-control-label {
    font-size: 12px;
    font-weight: 700;
    font-family: var(--aw-font-display);
    letter-spacing: 0.04em;
    text-transform: capitalize;
    line-height: 1;
  }
  .watch-control-chevrons {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-left: 2px;
    opacity: 0.42;
    color: currentColor;
    transition: opacity 0.16s ease;
  }
  .watch-control-segment:hover .watch-control-chevrons {
    opacity: 0.72;
  }
  .aw-main { 
    min-width: 0; 
    width: 100%; 
    display: grid; 
    grid-template-columns: 100%;
    align-content: start;
    gap: 24px; 
    position: relative; 
    z-index: 50; 
  }
  .aw-info-panel {
    width: 100%;
    padding: 24px 28px;
    background: rgba(10, 10, 15, 0.4) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-sizing: border-box;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05);
    margin-bottom: 24px;
  }
  .aw-sidebar {
    width: 100%;
    display: flex;
    flex-direction: column;
    background: rgba(10, 10, 15, 0.4) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05);
    height: fit-content;
    transition: max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s ease;
  }
  .aw-sidebar:hover {
    box-shadow: 0 50px 120px -20px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.08);
  }

  /* --- Responsive Adjustments --- */
  @media (min-width: 1280px) {
    .aw-layout { grid-template-columns: 1fr 400px; gap: 32px; }
    .aw-sidebar { 
      height: 0;
      min-height: 100%;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }
    .aw-sidebar.collapsed {
      height: auto;
      min-height: 0;
      align-self: start;
    }
  }

  @media (max-width: 1024px) {
    .watch-desc-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
    .watch-controls {
      width: 100%;
      flex-wrap: nowrap;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .watch-controls::-webkit-scrollbar { height: 0px; display: none; }
    .aw-sidebar {
      height: 500px; /* Constrain height on stacked layouts so scrolling works */
      min-height: 400px;
    }
  }

  @media (max-width: 768px) {
    .yt-player-controls .yt-btn { padding: 8px; }
    .yt-volume-container { display: none !important; } /* Hidden on mobile to save space */
  }

  @media (max-width: 640px) {
    .modern-card.watch-description-frame {
      padding: 16px !important;
    }
    .watch-desc-header {
      margin-bottom: 12px;
    }
    .watch-control-group {
      height: 44px; /* Taller touch targets */
      padding: 4px;
    }
    .watch-icon-button { width: 44px; height: 100%; }
    .watch-control-segment { height: 100%; padding: 0 12px; }
    .aw-layout {
      padding: 12px 8px calc(84px + env(safe-area-inset-bottom)) !important;
      gap: 16px !important;
    }
    .aw-title-text {
      font-size: 18px !important;
      line-height: 1.3 !important;
    }
    .aw-sidebar {
      height: 55vh;
      min-height: 350px;
      max-height: 500px;
    }
    .yt-time-display { font-size: 12px !important; margin-left: 4px !important; padding: 4px !important; }
    .yt-player-controls { padding: 10px 8px 8px !important; }
    .yt-settings-menu {
      width: calc(100vw - 24px) !important;
      max-width: 320px !important;
      right: -8px !important;
      bottom: calc(100% + 12px) !important;
    }
  }

  /* Hide custom scroll thumb on touch devices */
  @media (hover: none) and (pointer: coarse) {
    .custom-scroll-thumb-container { display: none !important; }
  }

  .ep-item {
    transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
    position: relative;
    overflow: hidden;
  }
  .ep-item::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, var(--aw-accent), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 0;
  }
  .ep-item:hover::before {
    opacity: 0.03;
  }
  .ep-item-hover {
    transition: background 0.2s, border-color 0.2s;
  }
  .ep-active-hover {
    background: color-mix(in srgb, var(--aw-accent) 8%, rgba(255,255,255,0.02)) !important;
  }
  .ep-item-hover::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    bottom: 50%;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--aw-accent);
    opacity: 0;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .ep-item-hover:hover::before {
    opacity: 0.4;
    top: 8px;
    bottom: 8px;
  }
  .ep-item-hover:hover {
    background: rgba(255, 255, 255, 0.04) !important;
  }
  
  .ep-thumb-container {
    position: relative;
    width: 110px;
    height: 64px;
    flex-shrink: 0;
    border-radius: 10px;
    overflow: hidden;
    background: var(--aw-card);
    border: 1px solid rgba(255,255,255,0.05);
    transition: transform 0.3s ease;
  }
  .ep-item:hover .ep-thumb-container {
    transform: scale(1.04);
    border-color: rgba(255,255,255,0.15);
  }

  /* --- HIDDEN NATIVE SCROLLBARS FOR CUSTOM IMPLEMENTATION --- */
  .hide-scroll-native {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  .hide-scroll-native::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  .aw-action-btn { 
    position: relative;
    will-change: transform;
    transition: border-color 0.1s, color 0.1s !important;
  }

  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  .aw-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%); background-size: 400px 100%; animation: shimmer 1.4s ease infinite; }

  .aw-label { font-family: var(--aw-font-display); font-size: 10px; letter-spacing: 0.18em; font-weight: 600; text-transform: uppercase; color: var(--aw-accent); }
  
  .genre-pill { 
    display: inline-flex; align-items: center; gap: 6px; 
    background: var(--aw-s2); border: 1px solid var(--aw-border); 
    color: rgba(255,255,255,0.6); font-family: var(--aw-font-display); 
    font-size: 11px; font-weight: 600; padding: 6px 14px; 
    border-radius: 100px; transition: transform 0.15s, border-color 0.15s, color 0.15s, background 0.15s; text-transform: uppercase; letter-spacing: 0.1em;
    will-change: transform;
  }
  .genre-pill:hover { 
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--aw-accent), transparent 40%); 
    color: white; 
    background: color-mix(in srgb, var(--aw-accent), transparent 85%);
  }
  .genre-pill:active {
    transform: scale(0.95);
  }

  .source-option {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    padding: 12px 16px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(255,255,255,0.58);
    font-family: var(--aw-font-display);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    line-height: 1;
    text-transform: uppercase;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s, color 0.15s, background 0.15s;
  }
  .source-option:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--aw-accent), transparent 55%);
    background: color-mix(in srgb, var(--aw-accent), transparent 88%);
    color: white;
  }
  .source-option:active {
    transform: scale(0.96);
  }
  .source-option[data-selected="true"] {
    border-color: color-mix(in srgb, var(--aw-accent), transparent 45%);
    background: color-mix(in srgb, var(--aw-accent), transparent 85%);
    color: var(--aw-accent);
  }

  .aw-noise::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E"); background-repeat: repeat; background-size: 180px; }

  .aw-segment-btn { transition: background 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s, filter 0.2s; }
  .aw-segment-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .aw-segment-btn[data-active='false']:hover { background: rgba(255,255,255,0.08) !important; color: var(--aw-text) !important; }
  .aw-segment-btn[data-active='true'] { 
    background: color-mix(in srgb, var(--aw-accent) 18%, transparent) !important; 
    color: var(--aw-accent) !important; 
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--aw-accent) 50%, transparent), 0 4px 20px -8px color-mix(in srgb, var(--aw-accent) 30%, transparent); 
  }
  .aw-segment-btn[data-active='true']:hover { 
    background: color-mix(in srgb, var(--aw-accent) 25%, transparent) !important; 
    color: var(--aw-text) !important; 
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--aw-accent) 60%, transparent), 0 8px 22px -8px color-mix(in srgb, var(--aw-accent) 40%, transparent); 
    filter: brightness(1.08); 
  }
  .aw-segment-btn:active { transform: scale(0.95); }

  .ep-item { transition: background 0.18s, border-color 0.18s, transform 0.2s; }
  .ep-item:hover .ep-thumb { transform: scale(1.08); }
  .ep-thumb { transition: transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.3s; }

  .ep-item-hover:hover .ep-number {
    color: var(--aw-accent) !important;
    transform: scale(1.1);
  }
  .ep-active-hover:hover {
    background: color-mix(in srgb, var(--aw-accent) 22%, transparent) !important;
  }
  .ep-active-hover:hover .ep-playing-eq span {
    filter: brightness(1.5);
  }
  .ep-number { transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .ep-search-input::placeholder {
    color: var(--aw-muted);
    opacity: 1;
  }
  .input-glow {
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.3s, background 0.3s !important;
  }
  .input-glow:hover {
    transform: scale(1.015);
    background: rgba(255,255,255,0.05) !important;
    border-color: rgba(255,255,255,0.12) !important;
  }
  .input-glow:focus {
    border-color: color-mix(in srgb, var(--aw-accent) 40%, transparent) !important;
    transform: scale(1.02);
    background: rgba(255,255,255,0.06) !important;
  }
  
  @keyframes eq-play {
    0%, 100% { height: 4px; }
    50% { height: 14px; }
  }
  .ep-playing-eq {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 3px;
    height: 14px;
    width: 24px;
  }
  .ep-playing-eq span {
    display: block;
    width: 3px;
    background: var(--aw-accent);
    border-radius: 2px;
    animation: eq-play 0.9s ease-in-out infinite;
    will-change: height;
  }
  .ep-playing-eq span:nth-child(1) { animation-delay: 0.0s; }
  .ep-playing-eq span:nth-child(2) { animation-delay: 0.3s; }
  .ep-playing-eq span:nth-child(3) { animation-delay: 0.6s; }
  
  .aw-action-hover { transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .aw-action-hover:hover:not(:disabled) {
    filter: brightness(1.2);
    background: rgba(255,255,255,0.08) !important;
  }
  .aw-action-hover:active:not(:disabled) {
  }

  .sort-btn-hover { transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .sort-btn-hover:hover {
    transform: scale(1.05);
    background: rgba(255,255,255,0.06) !important;
    border-color: rgba(255,255,255,0.12) !important;
    color: white !important;
  }
  .sort-btn-hover:active {
    transform: scale(0.92);
  }

  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes epSlideIn { from { opacity: 0; transform: translateX(16px) scale(0.98); } to { opacity: 1; transform: translateX(0) scale(1); } }
  @keyframes skeletonWave { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  .anim-fade-in-down { animation: fadeInDown 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  .anim-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  .ep-slide-in { animation: epSlideIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) both; }
  
  .hover-lift { transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .hover-lift:hover { box-shadow: 0 20px 40px -15px rgba(0,0,0,0.6); }
  .anim-delay-1 { animation-delay: 0.1s; }

  .skeleton-wave {
    background: linear-gradient(110deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.07) 75%, rgba(255,255,255,0.03) 100%);
    background-size: 300% 100%;
    animation: skeletonWave 2s ease-in-out infinite;
    position: relative;
    overflow: hidden;
  }

  /* ── View Mode Toggle Buttons ───────────────────────────────────── */
  .view-mode-btn {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; border: none; border-radius: 8px;
    background: transparent; cursor: pointer; color: rgba(255,255,255,0.35);
    transition: all 0.18s cubic-bezier(0.16,1,0.3,1);
  }
  .view-mode-btn:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); transform: translateY(-1px); }
  .view-mode-btn.active { background: color-mix(in srgb, var(--aw-accent) 16%, transparent); color: var(--aw-accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--aw-accent) 45%, transparent); }
  .view-mode-btn:active { transform: scale(0.9); }

  /* ── List View ──────────────────────────────────────────────────── */
  .ep-list-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.04);
    cursor: pointer; position: relative; overflow: hidden;
    transition: background 0.15s, transform 0.15s;
  }
  .ep-list-item:hover { background: rgba(255,255,255,0.035); transform: translateX(3px); }
  .ep-list-item.active { background: color-mix(in srgb, var(--aw-accent) 8%, rgba(255,255,255,0.02)); }

  /* ── Grid View ──────────────────────────────────────────────────── */
  .ep-grid-wrap { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; padding: 12px 14px; }
  @media (max-width: 400px) { .ep-grid-wrap { grid-template-columns: repeat(4, 1fr); } }
  .ep-grid-cell {
    display: flex; align-items: center; justify-content: center;
    aspect-ratio: 1; border-radius: 10px; cursor: pointer;
    font-family: var(--aw-font-display); font-size: 13px; font-weight: 600;
    border: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.025);
    color: rgba(255,255,255,0.55);
    transition: all 0.18s cubic-bezier(0.16,1,0.3,1);
    position: relative; overflow: hidden;
  }
  .ep-grid-cell:hover { background: rgba(255,255,255,0.07); color: white; transform: scale(1.07); border-color: rgba(255,255,255,0.18); }
  .ep-grid-cell.active {
    background: color-mix(in srgb, var(--aw-accent) 18%, transparent);
    border-color: color-mix(in srgb, var(--aw-accent) 55%, transparent);
    color: var(--aw-accent);
    box-shadow: 0 0 14px -4px color-mix(in srgb, var(--aw-accent) 40%, transparent);
  }
  .ep-grid-cell:active { transform: scale(0.93); }

  /* ── Range Picker ───────────────────────────────────────────────── */
  .ep-range-wrap { display: flex; gap: 5px; flex-wrap: wrap; padding: 10px 14px 6px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .ep-range-btn {
    font-family: var(--aw-font-display); font-size: 10px; font-weight: 700;
    letter-spacing: 0.06em; padding: 5px 10px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.025); color: rgba(255,255,255,0.45); cursor: pointer;
    transition: all 0.15s cubic-bezier(0.16,1,0.3,1);
  }
  .ep-range-btn:hover { background: rgba(255,255,255,0.07); color: white; border-color: rgba(255,255,255,0.18); }
  .ep-range-btn.active { background: color-mix(in srgb, var(--aw-accent) 16%, transparent); color: var(--aw-accent); border-color: color-mix(in srgb, var(--aw-accent) 45%, transparent); }

  /* ── Next Episode Bar ───────────────────────────────────────────── */
  .next-ep-bar {
    flex-shrink: 0;
    position: relative;
    padding: 14px 20px;
    display: flex; align-items: center; gap: 12px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .next-ep-icon {
    width: 32px; height: 32px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 10px;
    background: color-mix(in srgb, var(--aw-accent), transparent 85%);
    color: var(--aw-accent);
  }
  .next-ep-bar::after {
    content: '';
    position: absolute;
    top: 0; left: 24px; right: 24px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--aw-accent), transparent);
    opacity: 0.08;
  }

/* ══════════════════════════════════════════════════════════════
   VIDSTACK PLAYER — REDESIGNED
   ══════════════════════════════════════════════════════════════ */

  media-player[data-view-type="video"] {
    --media-brand:      var(--aw-accent);
    --media-focus-ring: 0 0 0 3px color-mix(in srgb, var(--aw-accent) 35%, transparent);
  }

  .vds-video-layout {
    --video-controls-bg: transparent !important;
  }

  .vds-controls {
    transition: opacity 0.35s ease !important;
  }

  .vds-controls-group:last-child {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0 !important;
    padding: 0 14px 14px !important;
    background: linear-gradient(
      to top,
      rgba(4, 4, 10, 0.93) 0%,
      rgba(4, 4, 10, 0.60) 55%,
      transparent 100%
    ) !important;
    backdrop-filter: blur(14px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(14px) saturate(160%) !important;
    animation: vds-bar-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }

  @keyframes vds-bar-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .vds-controls-group:last-child .vds-time-slider,
  .vds-controls-group:last-child media-time-slider {
    order: -1 !important;
    width: 100% !important;
    flex-shrink: 0 !important;
    padding: 10px 0 4px !important;
    margin: 0 !important;
    cursor: pointer !important;
  }

  .vds-controls-group:last-child > *:not(.vds-time-slider):not(media-time-slider) {
    order: 1 !important;
    display: flex !important;
    align-items: center !important;
    width: 100% !important;
    justify-content: space-between !important;
  }

  .vds-slider-track {
    height: 3px !important;
    background: rgba(255, 255, 255, 0.15) !important;
    border-radius: 999px !important;
    transition: height 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }

  .vds-time-slider:hover .vds-slider-track,
  .vds-time-slider[data-dragging] .vds-slider-track {
    height: 5px !important;
  }

  .vds-slider-track-fill {
    background: var(--aw-accent) !important;
    border-radius: 999px !important;
  }

  .vds-slider-thumb {
    width: 14px !important;
    height: 14px !important;
    background: #ffffff !important;
    border-radius: 50% !important;
    top: 50% !important;
    margin: 0 !important;
    transform: translate(-50%, -50%) scale(0) !important;
    opacity: 0 !important;
    transition:
      transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
      opacity   0.22s ease !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.55) !important;
  }

  .vds-time-slider:hover .vds-slider-thumb,
  .vds-time-slider[data-dragging] .vds-slider-thumb {
    transform: translate(-50%, -50%) scale(1) !important;
    opacity: 1 !important;
  }

  .vds-tooltip-content {
    background: rgba(6, 6, 14, 0.88) !important;
    backdrop-filter: blur(12px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 9px !important;
    font-family: var(--aw-font-display) !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    letter-spacing: 0.1em !important;
    text-transform: uppercase !important;
    padding: 6px 11px !important;
    color: rgba(255, 255, 255, 0.88) !important;
    box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.7) !important;
    opacity: 0 !important;
    transform: translateY(4px) scale(0.96) !important;
    transition:
      opacity   0.2s ease,
      transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
    pointer-events: none !important;
  }

  .vds-tooltip-content[data-visible] {
    opacity: 1 !important;
    transform: translateY(0) scale(1) !important;
  }

  .vds-button {
    border-radius: 8px !important;
    color: rgba(255, 255, 255, 0.78) !important;
    transition:
      transform  0.18s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.18s ease,
      color      0.18s ease !important;
  }

  .vds-button:hover {
    transform: scale(1.1) !important;
    background: rgba(255, 255, 255, 0.1) !important;
    color: #ffffff !important;
  }

  .vds-button:active {
    transform: scale(0.92) !important;
    background: rgba(255, 255, 255, 0.06) !important;
  }

  .vds-play-button:hover {
    background: color-mix(in srgb, var(--aw-accent) 18%, transparent) !important;
    color: var(--aw-accent) !important;
  }

  .vds-time {
    font-family: var(--aw-font-display) !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    letter-spacing: 0.06em !important;
    color: rgba(255, 255, 255, 0.72) !important;
  }

  .vds-volume-slider .vds-slider-track-fill {
    background: rgba(255, 255, 255, 0.85) !important;
  }

  .vds-menu-items {
    background: rgba(6, 6, 16, 0.94) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.09) !important;
    border-radius: 14px !important;
    box-shadow:
      0 24px 60px -15px rgba(0, 0, 0, 0.85),
      0 0 0 1px color-mix(in srgb, var(--aw-accent), transparent 90%) !important;
    overflow: hidden !important;
    animation: menuPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }

  @keyframes menuPop {
    from { opacity: 0; transform: scale(0.95) translateY(6px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }

  .vds-menu-item {
    font-family: var(--aw-font-display) !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    letter-spacing: 0.08em !important;
    color: rgba(255, 255, 255, 0.72) !important;
    border-radius: 8px !important;
    transition: background 0.15s, color 0.15s !important;
  }

  .vds-menu-item:hover,
  .vds-menu-item[aria-checked="true"] {
    background: color-mix(in srgb, var(--aw-accent) 14%, transparent) !important;
    color: var(--aw-accent) !important;
  }

  ::cue {
    text-align: center !important;
  }
  
  .vds-captions {
    position: absolute !important;
    inset: 0 !important;
    bottom: 70px !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: flex-end !important;
    align-items: center !important;
    pointer-events: none !important;
    z-index: 90 !important;
  }

  .vds-captions-cue {
    text-align: center !important;
    background-color: rgba(0, 0, 0, 0.75) !important;
    color: white !important;
    padding: 6px 12px !important;
    border-radius: 6px !important;
    font-family: var(--aw-font-body), sans-serif !important;
    font-size: clamp(12px, 3.5vw, 18px) !important; /* Scaled down for mobile */
    line-height: 1.4 !important;
    max-width: 85% !important;
    margin: 0 auto !important;
  }

  .vds-buffering-icon {
    color: var(--aw-accent) !important;
    filter: drop-shadow(0 0 10px var(--aw-accent)) !important;
  }

  .vds-button:focus-visible,
  .vds-slider:focus-visible {
    outline: 2px solid var(--aw-accent) !important;
    outline-offset: 3px !important;
  }
`;

// ─── Animation Variants ────────────────────────────────────────────────────────
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

const scaleInItem: Variants = {
  hidden: { opacity: 0, scale: 0.95, filter: 'blur(8px)' },
  show: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 350, damping: 30 } }
};

// ─── Interfaces ────────────────────────────────────────────────────────
interface ProgressData {
  animeId: string;
  episodeId: string;
  animeTitle: string;
  animeCover?: string | null;
  episodeTitle: string;
  episodeNumber: number;
  episodeImage?: string | null;
  href: string;
}

interface StreamSource {
  url: string;
  type: string;
  quality: string;
  referer?: string;
}

interface StreamSubtitle {
  file: string;
  label: string;
}

interface StreamThumbnail {
  url?: string;
  file?: string;
}

interface StreamData {
  streams: StreamSource[];
  subtitles?: StreamSubtitle[];
  thumbnails?: string | StreamThumbnail[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

interface StreamCandidate {
  provider: string;
  category: 'sub' | 'dub';
  episodeId: string;
}

interface AnimeTitle {
  english?: string | null;
  romaji?: string | null;
  native?: string | null;
  userPreferred?: string | null;
}

interface AnimeInfo {
  id: number;
  title?: AnimeTitle;
  description?: string;
  synopsis?: string;
  image?: string;
  coverImage?: { large?: string; extraLarge?: string };
  bannerImage?: string;
  images?: { jpg?: { large_image_url?: string } };
  genres?: string[];
  studios?: string[] | { edges?: Array<{ isMain?: boolean; node?: { name?: string } }> } | null;
  status?: string;
  format?: string;
  averageScore?: number | null;
  idMal?: number | null;
  nextAiringEpisode?: { airingAt?: number; airingTime?: number; timeUntilAiring?: number; episode?: number };
  relations?: { edges?: Array<{ relationType: string; node: any }> };
  parsedSeason?: { season: number; part: number; parsedString: string; isParsed: boolean; } | null;
}

/* ─── Timeline / Slug Helpers ────────────────────────────────────── */

const formatTime = (secs: number) => {
  if (!secs || isNaN(secs)) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const NextAiringTimer: React.FC<{ data: any; compact?: boolean }> = ({ data, compact }) => {
  const { airingAt, airingTime, timeUntilAiring, episode } = data;

  const targetTime = timeUntilAiring
    ? Date.now() + timeUntilAiring * 1000
    : airingAt
      ? airingAt * 1000
      : airingTime
        ? airingTime * 1000
        : 0;

  const [timeLeft, setTimeLeft] = useState(targetTime - Date.now());

  useEffect(() => {
    if (!targetTime) return;
    setTimeLeft(targetTime - Date.now());
    const interval = setInterval(() => {
      setTimeLeft(targetTime - Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (!targetTime || timeLeft <= 0) return <span>Airing Now / Aired</span>;

  const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const h = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const m = Math.floor((timeLeft / 1000 / 60) % 60);

  let timeString = '';
  if (d > 0) timeString = `${d}d ${h}h`;
  else if (h > 0) timeString = `${h}h ${m}m`;
  else timeString = `${m}m`;

  return (
    <span>
      {compact ? `Ep ${episode || '?'}: ` : `Episode ${episode || '?'} in `}
      {timeString}
    </span>
  );
};

export const createSlug = (title: string) => {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const extractSlug = (id: string | undefined): string => {
  if (!id) return '1';
  return id.split('/').pop() || id;
};

const genreToParam = (genre: string) => genre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const getEpisodeHref = (animeSlug: string, provider: string, category: 'sub' | 'dub', episodeId: string) =>
  `/watch/${animeSlug}/${encodeURIComponent(provider)}/${category}/${encodeURIComponent(extractSlug(episodeId))}`;

const formatEpisodeDate = (isoDate?: string) => {
  if (!isoDate) return '?';
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) return '?';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsedDate);
};

const PREFERRED_SERVERS = ['kiwi', 'animepahe', 'hd-1', 'vidstreaming', 'megacloud', 'hd-2', 'zoro', 'gogoanime', 'kai', 'hanime', 'hentaihaven'];

const rankProviders = (providers: string[]) =>
  [...providers].sort((a, b) => {
    const ra = PREFERRED_SERVERS.findIndex(p => a.toLowerCase().includes(p));
    const rb = PREFERRED_SERVERS.findIndex(p => b.toLowerCase().includes(p));
    return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
  });

/* ─── CUSTOM SCROLL AREA COMPONENT ─────────────────────────────── */
interface CustomScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  innerRef?: React.RefObject<HTMLDivElement>;
}

const CustomScrollArea: React.FC<CustomScrollAreaProps> = ({ children, className, style, innerRef }) => {
  const fallbackRef = useRef<HTMLDivElement>(null);
  const scrollRef = innerRef || fallbackRef;

  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  const updateScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

    if (scrollHeight <= clientHeight || clientHeight === 0) {
      setThumbHeight(0);
      return;
    }

    const h = Math.max(36, (clientHeight / scrollHeight) * clientHeight);
    const maxScrollTop = scrollHeight - clientHeight;
    const scrollPct = scrollTop / maxScrollTop;
    const maxThumbTop = clientHeight - h;

    setThumbTop(scrollPct * maxThumbTop);
    setThumbHeight(h);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScroll();

    el.addEventListener('scroll', updateScroll);

    const resizeObserver = new ResizeObserver(() => updateScroll());
    resizeObserver.observe(el);
    if (el.firstElementChild) resizeObserver.observe(el.firstElementChild);

    return () => {
      el.removeEventListener('scroll', updateScroll);
      resizeObserver.disconnect();
    };
  }, [updateScroll, scrollRef, children]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    if (scrollRef.current) dragStartScrollTop.current = scrollRef.current.scrollTop;
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !scrollRef.current) return;
      const { scrollHeight, clientHeight } = scrollRef.current;
      const deltaY = e.clientY - dragStartY.current;
      const scrollableRatio = (scrollHeight - clientHeight) / (clientHeight - thumbHeight);
      scrollRef.current.scrollTop = dragStartScrollTop.current + deltaY * scrollableRatio;
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, thumbHeight, scrollRef]);

  return (
    <div
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={scrollRef}
        className="hide-scroll-native"
        style={{
          height: '100%',
          width: '100%',
          overflowY: 'scroll',
          overflowX: 'hidden',
          paddingRight: 16,
          marginRight: -16,
        }}
      >
        {children}
      </div>
      <div className="custom-scroll-thumb-container" style={{ position: 'absolute', top: 0, right: 4, bottom: 0, width: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 100, pointerEvents: 'none' }}>
        <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, color: 'white' }}><ChevronUp size={10} /></div>
        <div style={{ flex: 1, width: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 10, position: 'relative', margin: '2px 0' }}>
          <AnimatePresence>
            {thumbHeight > 0 && (
              <motion.div
                onPointerDown={handlePointerDown}
                animate={{
                  y: thumbTop,
                  height: thumbHeight,
                }}
                transition={{
                  y: { type: 'tween', ease: 'linear', duration: 0 },
                  height: { type: 'tween', ease: 'linear', duration: 0 }
                }}
                style={{
                  position: 'absolute', left: -0.5, width: 3, background: 'var(--aw-accent)', borderRadius: 10, pointerEvents: 'auto', cursor: isDragging ? 'grabbing' : 'grab'
                }}
              />
            )}
          </AnimatePresence>
        </div>
        <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, color: 'white' }}><ChevronDown size={10} /></div>
      </div>
    </div>
  );
};


/* ─── Toggle Component ──────────────────────────────────────────── */
const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label
    className="flex items-center gap-2.5 cursor-pointer select-none group"
    onClick={(e) => { e.preventDefault(); onChange(!checked); }}
    style={{ fontFamily: 'var(--aw-font-display)' }}
  >
    <motion.div
      animate={{
        backgroundColor: checked ? 'var(--aw-accent)' : 'rgba(255,255,255,0.1)',
        borderColor: checked ? 'transparent' : 'rgba(255,255,255,0.05)'
      }}
      transition={{ duration: 0.2 }}
      className="relative flex items-center rounded-full"
      style={{
        width: 34,
        height: 20,
        padding: 2,
        boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.3)',
        border: '1px solid transparent'
      }}
    >
      <motion.span
        animate={{ x: checked ? 14 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 1 }}
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.3)'
        }}
      />
    </motion.div>
    <span
      className="text-[10px] tracking-[0.14em] font-bold uppercase transition-colors duration-300"
      style={{ color: checked ? 'white' : 'rgba(255,255,255,0.4)', marginTop: '1px' }}
    >
      {label}
    </span>
  </label>
);

/* ─── Share Modal Component ───────────────────────────────────── */
const ShareModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  coverImage: string;
  episodeInfo: string;
  studioName: string | null;
}> = ({ open, onClose, title, coverImage, episodeInfo, studioName }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) {
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
      } catch (e: any) { /* cancelled */ }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0, rotateX: 5 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.95, y: 20, opacity: 0, rotateX: -5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-full max-w-[420px] overflow-hidden"
            style={{
              background: 'var(--aw-bg)', border: '1px solid var(--aw-border)', borderRadius: 20,
              boxShadow: '0 40px 100px -20px rgba(0,0,0,0.9)',
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
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <X size={16} />
              </motion.button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 16px', fontFamily: 'var(--aw-font-display)', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-muted)' }}>Share Link</p>

              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <div style={{
                  flex: 1, background: 'var(--aw-s2)', border: '1px solid var(--aw-border)', borderRadius: 10,
                  padding: '10px 14px', fontSize: 12, color: 'var(--aw-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'var(--aw-font-body)', transition: 'all 0.15s cubic-bezier(0.2, 0, 0, 1)'
                }}>
                  {shareUrl}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '0 18px', borderRadius: 10, border: `1px solid ${copied ? 'var(--aw-accent)' : 'var(--aw-border)'}`,
                    background: copied ? 'var(--aw-accent-dim)' : 'var(--aw-bg)', color: copied ? 'var(--aw-accent)' : 'var(--aw-text)',
                    fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    cursor: 'pointer', flexShrink: 0, minWidth: 100
                  }}
                >
                  {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </motion.button>
              </div>

              {navigator.share && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNativeShare}
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
                </motion.button>
              )}

              <motion.button
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', borderColor: 'var(--aw-border-hi)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.open(shareUrl, '_blank')}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10,
                  background: 'transparent', border: '1px solid var(--aw-border)',
                  color: 'var(--aw-muted)', fontSize: 11, fontFamily: 'var(--aw-font-display)',
                  fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <ExternalLink size={14} /> Open in New Tab
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Main Component ──────────────────────────────────────────────── */
const AnimeWatch: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).MediaSource) {
      const MS = (window as any).MediaSource;
      const original = MS.prototype.addSourceBuffer;
      MS.prototype.addSourceBuffer = function (this: MediaSource, mimeType: string) {
        const fixed = mimeType.replace('mp4a.40.1', 'mp4a.40.2');
        if (fixed !== mimeType) console.log('[codec-fix] Remapped:', mimeType, '->', fixed);
        return original.call(this, fixed);
      };
      return () => { MS.prototype.addSourceBuffer = original; };
    }
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
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const pendingFullscreenRestoreRef = useRef(false);

  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [episodesData, setEpisodesData] = useState<Record<string, AnimeWatchProviderPayload>>({});
  const [resolvedId, setResolvedId] = useState<number | string | null>(null);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);
  const [descHeight, setDescHeight] = useState(5000);
  const measureDesc = useCallback(() => {
    if (descRef.current) {
      const sh = descRef.current.scrollHeight;
      if (sh > 80) setDescHeight(sh);
    }
  }, []);
  const [activeTab, setActiveTab] = useState<'episodes' | 'comments'>('episodes');

  const [streamLoading, setStreamLoading] = useState(false);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamAttemptedProviders, setStreamAttemptedProviders] = useState<string[]>([]);
  const [streamRetryNonce, setStreamRetryNonce] = useState(0);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [isSeasonsDropdownOpen, setIsSeasonsDropdownOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [episodeViewMode, setEpisodeViewMode] = useState<'thumbnail' | 'list' | 'grid'>(() =>
    (localStorage.getItem('episodeViewMode') as any) || 'thumbnail'
  );
  const [episodeRangeIndex, setEpisodeRangeIndex] = useState(0);
  const [isRangeDropdownOpen, setIsRangeDropdownOpen] = useState(false);
  const rangeDropdownRef = useRef<HTMLDivElement>(null);
  const mainColRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const EP_RANGE_SIZE = 100;
  const [navTabs, setNavTabs] = useState<any[]>([]);
  const seasonsDropdownRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const [epSearchQuery, setEpSearchQuery] = useState('');
  const [episodeSortOrder, setEpisodeSortOrder] = useState<'asc' | 'desc'>(() =>
    (localStorage.getItem('watchEpisodeSortOrder') as 'asc' | 'desc') || 'asc'
  );

  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('watchAutoPlay') !== 'false');
  const [autoNext, setAutoNext] = useState(() => localStorage.getItem('watchAutoNext') !== 'false');
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [autoSkip, setAutoSkip] = useState(() => localStorage.getItem('watchAutoSkip') !== 'false');
  const [playerVolume, setPlayerVolume] = useState(() => {
    const vol = localStorage.getItem('watchVolume');
    return vol ? parseInt(vol.replace('%', '')) / 100 : 1;
  });
  const [preferredSource] = useState(() => localStorage.getItem('watchPreferredSource') || '');
  const [lightsOff, setLightsOff] = useState(false);
  const [useHybridAudio, setUseHybridAudio] = useState(() => localStorage.getItem('watchHybridAudio') === 'true');

  const [playerMode, setPlayerMode] = useState<'internal' | 'external'>('internal');

  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const outroDismissedRef = useRef(false); // true while user has dismissed countdown within current outro window
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<(() => void) | null>(null);
  const [toastActionLabel, setToastActionLabel] = useState<string | null>(null);

  const [proxifiedStreamUrl, setProxifiedStreamUrl] = useState<string | null>(null);
  const prevProxifiedUrlRef = useRef<string | null>(null);

  const [isSpeeding, setIsSpeeding] = useState(false);
  const [useYouTubeStylePlayer] = useState(() => localStorage.getItem('watchNetflixPlayer') !== 'false');
  const [ytControlsVisible, setYtControlsVisible] = useState(true);
  const [ytHideTimeout, setYtHideTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [ytIsMuted, setYtIsMuted] = useState(false);
  const [ytShowCaptions, setYtShowCaptions] = useState(false);
  const [ytVolume, setYtVolume] = useState(() => {
    const vol = localStorage.getItem('watchVolume');
    return vol ? parseInt(vol.replace('%', '')) : 100;
  });
  const [ytShowSpeedMenu, setYtShowSpeedMenu] = useState(false);
  const [ytShowSettingsMenu, setYtShowSettingsMenu] = useState(false);
  const [ytSettingsPage, setYtSettingsPage] = useState<'main' | 'playback' | 'accessibility'>('main');
  const [ytSkipFillers, setYtSkipFillers] = useState(() => localStorage.getItem('watchYtSkipFillers') === 'true');
  const [ytAmbientMode, setYtAmbientMode] = useState(() => localStorage.getItem('watchYtAmbientMode') === 'true');

  // Ambient Opacity Control
  const [ytAmbientOpacity, setYtAmbientOpacity] = useState(() => {
    const stored = localStorage.getItem('watchYtAmbientOpacity');
    return stored !== null ? Number(stored) : 75; // Default to 75%
  });

  const [ytVolumeBoost, setYtVolumeBoost] = useState(() => Number(localStorage.getItem('watchYtVolumeBoost')) || 0);
  const [ytPlaybackSpeed, setYtPlaybackSpeed] = useState(() => Number(localStorage.getItem('watchYtPlaybackSpeed')) || 1);
  const [ytIsFullscreen, setYtIsFullscreen] = useState(false);
  const [ytIsPiP, setYtIsPiP] = useState(false);
  const [ytShowTimeLeft, setYtShowTimeLeft] = useState(0);
  const [ytPlayIndicator, setYtPlayIndicator] = useState<'play' | 'pause' | null>(null);
  const [ytIsPlayerPaused, setYtIsPlayerPaused] = useState(true);
  const [playPauseTrigger, setPlayPauseTrigger] = useState(0);
  const [ytLoopVideo, setYtLoopVideo] = useState(() => localStorage.getItem('watchYtLoop') === 'true');
  const [ytAutoQuality, setYtAutoQuality] = useState(() => localStorage.getItem('watchYtAutoQuality') !== 'false');
  const [ytScreenshotMode, setYtScreenshotMode] = useState(false);
  const [ytTooltip, setYtTooltip] = useState<string | null>(null);
  const [ytVolumeHover, setYtVolumeHover] = useState(false);
  const [ytProgressHover, setYtProgressHover] = useState(false);
  const [ytProgressHoverPct, setYtProgressHoverPct] = useState(0);
  const ytTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ytDragStateRef = useRef({ isDragging: false, hasDragged: false });
  const ytProgressRef = useRef<HTMLDivElement>(null);

  const isSpeedingRef = useRef(false);
  const normalSpeedRef = useRef(1);
  const wasPausedRef = useRef(false);
  const preventClickRef = useRef(false);
  const lastRecordedWatchEventRef = useRef<string | null>(null);

  const speedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekIndicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  const [visualDragPct, setVisualDragPct] = useState(null);

  const [seekIndicator, setSeekIndicator] = useState<'rewind' | 'forward' | null>(null);
  const pointerStateRef = useRef({
    downTime: 0, downX: 0, downY: 0, lastTapTime: 0, lastTapX: 0, lastTapY: 0, clickTimeout: null as ReturnType<typeof setTimeout> | null
  });

  useEffect(() => { localStorage.setItem('watchAutoPlay', String(autoPlay)); }, [autoPlay]);
  useEffect(() => { localStorage.setItem('watchAutoNext', String(autoNext)); }, [autoNext]);
  useEffect(() => { localStorage.setItem('watchAutoSkip', String(autoSkip)); }, [autoSkip]);
  useEffect(() => { localStorage.setItem('watchEpisodeSortOrder', episodeSortOrder); }, [episodeSortOrder]);
  useEffect(() => { localStorage.setItem('episodeViewMode', episodeViewMode); }, [episodeViewMode]);

  // Sync sidebar height with main column height
  useEffect(() => {
    const mainEl = mainColRef.current;
    const sideEl = sidebarRef.current;
    if (!mainEl || !sideEl) return;
    const ro = new ResizeObserver(() => {
      const h = mainEl.getBoundingClientRect().height;
      if (h > 100) sideEl.style.maxHeight = `${h}px`;
    });
    ro.observe(mainEl);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { localStorage.setItem('watchYtLoop', String(ytLoopVideo)); }, [ytLoopVideo]);
  useEffect(() => { localStorage.setItem('watchYtSkipFillers', String(ytSkipFillers)); }, [ytSkipFillers]);
  useEffect(() => { localStorage.setItem('watchYtAmbientMode', String(ytAmbientMode)); }, [ytAmbientMode]);
  useEffect(() => { localStorage.setItem('watchYtAmbientOpacity', String(ytAmbientOpacity)); }, [ytAmbientOpacity]);
  useEffect(() => { localStorage.setItem('watchYtVolumeBoost', String(ytVolumeBoost)); }, [ytVolumeBoost]);
  useEffect(() => { localStorage.setItem('watchYtPlaybackSpeed', String(ytPlaybackSpeed)); }, [ytPlaybackSpeed]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!ytShowSettingsMenu) {
      setTimeout(() => setYtSettingsPage('main'), 200);
    } else {
      setYtControlsVisible(true);
      if (ytHideTimeout) clearTimeout(ytHideTimeout);
    }
  }, [ytShowSettingsMenu]);
  useEffect(() => { localStorage.setItem('watchYtAutoQuality', String(ytAutoQuality)); }, [ytAutoQuality]);

  const ytLoopEnabledRef = useRef(ytLoopVideo);
  ytLoopEnabledRef.current = ytLoopVideo;
  const ytAutoQualityRef = useRef(ytAutoQuality);
  ytAutoQualityRef.current = ytAutoQuality;

  const handleYtProgressDrag = useCallback((clientX: number) => {
    const progressEl = ytProgressRef.current;
    if (!progressEl) return;
    const rect = progressEl.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const duration = playerRef.current?.state?.duration || videoDuration || 0;
    if (duration > 0 && playerRef.current) {
      playerRef.current.currentTime = pct * duration;
    }
  }, [videoDuration]);

  const captureYtDragMove = useCallback((e: PointerEvent) => {
    if (!ytDragStateRef.current.isDragging) return;
    ytDragStateRef.current.hasDragged = true;
    handleYtProgressDrag(e.clientX);
  }, [handleYtProgressDrag]);

  const captureYtDragEnd = useCallback(() => {
    if (!ytDragStateRef.current.isDragging) return;
    ytDragStateRef.current.isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('pointermove', captureYtDragMove);
    document.addEventListener('pointerup', captureYtDragEnd);
    return () => {
      document.removeEventListener('pointermove', captureYtDragMove);
      document.removeEventListener('pointerup', captureYtDragEnd);
    };
  }, [captureYtDragMove, captureYtDragEnd]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.loop = ytLoopVideo;
    }
  }, [ytLoopVideo]);

  useEffect(() => {
    const handleSettingsChange = () => {
      setAutoPlay(localStorage.getItem('watchAutoPlay') !== 'false');
      setAutoSkip(localStorage.getItem('watchAutoSkip') !== 'false');
      const vol = localStorage.getItem('watchVolume');
      setPlayerVolume(vol ? parseInt(vol.replace('%', '')) / 100 : 1);
      setYtVolume(vol ? parseInt(vol.replace('%', '')) : 100);
      setUseHybridAudio(localStorage.getItem('watchHybridAudio') === 'true');
    };
    window.addEventListener('player-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('player-settings-changed', handleSettingsChange);
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume = playerVolume;
    }
  }, [playerVolume]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (isSourceDropdownOpen && !sourceDropdownRef.current?.contains(event.target as Node)) {
        setIsSourceDropdownOpen(false);
      }
      if (isSeasonsDropdownOpen && !seasonsDropdownRef.current?.contains(event.target as Node)) {
        setIsSeasonsDropdownOpen(false);
      }
      if (isRangeDropdownOpen && !rangeDropdownRef.current?.contains(event.target as Node)) {
        setIsRangeDropdownOpen(false);
      }
      if (ytShowSettingsMenu && !event.target?.closest('.yt-settings-menu') && !event.target?.closest('.yt-settings-btn')) {
        setYtShowSettingsMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSourceDropdownOpen(false);
        setIsSeasonsDropdownOpen(false);
        setIsRangeDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSourceDropdownOpen, isSeasonsDropdownOpen]);

  // Build Seasons Dropdown Logic
  useEffect(() => {
    if (!animeInfo) return;
    let isMounted = true;
    const buildSeasons = async () => {
      const data = animeInfo;
      const resolvedSlug = String(data.id);
      const excludedFormats = ['SPECIAL', 'MUSIC', 'TV_SHORT', 'OVA', 'ONA', 'MOVIE'];
      const currentTitle = data.title?.english || data.title?.romaji || data.title?.native || '?';
      const seenIds = new Set<number>([data.id]);
      const tabs: any[] = [{
        id: data.id,
        title: currentTitle,
        format: data.format,
        active: true,
        slug: resolvedSlug,
        displayLabel: data.parsedSeason?.isParsed ? data.parsedSeason.parsedString : ''
      }];

      let queue = [data]; let depth = 0; const MAX_DEPTH = 6; const MAX_TOTAL = 15;

      while (queue.length > 0 && depth < MAX_DEPTH && tabs.length < MAX_TOTAL) {
        const nextQueue: any[] = []; const idsToFetch: number[] = [];
        for (const item of queue) {
          const edges = item.relations?.edges || [];
          for (const edge of edges) {
            if (['SEQUEL', 'PREQUEL', 'ALTERNATIVE', 'PARENT', 'SIDE_STORY'].includes(edge.relationType) && edge.node?.id && !seenIds.has(edge.node.id)) {
              if (!excludedFormats.includes(edge.node.format)) {
                seenIds.add(edge.node.id);
                idsToFetch.push(edge.node.id);
              }
            }
          }
        }
        if (idsToFetch.length === 0) break;
        const results = await Promise.allSettled(idsToFetch.slice(0, 5).map(id => fetchAnimeInfo(id)));
        results.forEach(res => {
          if (res.status === 'fulfilled' && res.value) {
            tabs.push({
              id: res.value.id,
              title: res.value.title?.english || res.value.title?.romaji || res.value.title?.native || '',
              format: res.value.format,
              active: false,
              slug: String(res.value.id),
              displayLabel: res.value.parsedSeason?.isParsed ? res.value.parsedSeason.parsedString : ''
            });
            nextQueue.push(res.value);
          }
        });
        queue = nextQueue; depth++;
      }

      if (!isMounted) return;
      tabs.sort((a, b) => a.id - b.id);
      tabs.forEach((tab, idx) => {
        if (!tab.displayLabel) tab.displayLabel = `Season ${idx + 1}`;
      });
      setNavTabs(tabs);
    };
    buildSeasons();
    return () => { isMounted = false; };
  }, [animeInfo]);

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
      } catch (e: any) {
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

  const showToast = useCallback((msg: string, action?: () => void, actionLabel?: string) => {
    setToastMessage(msg);
    setToastAction(action || null);
    setToastActionLabel(actionLabel || null);
    setTimeout(() => {
      setToastMessage(null);
      setToastAction(null);
      setToastActionLabel(null);
    }, 3500);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === ' ') {
        e.preventDefault();
        if (playerRef.current) {
          setYtIsPlayerPaused(prev => {
            const wasPaused = prev;
            if (wasPaused) {
              playerRef.current!.play();
              setYtPlayIndicator('play');
            } else {
              playerRef.current!.pause();
              setYtPlayIndicator('pause');
            }
            if (playIndicatorTimeoutRef.current) clearTimeout(playIndicatorTimeoutRef.current);
            playIndicatorTimeoutRef.current = setTimeout(() => setYtPlayIndicator(null), 600);
            return !wasPaused;
          });
          setPlayPauseTrigger(t => t + 1);
        }
      }

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
  }, [ytIsPlayerPaused]);

  const availableProviders = useMemo(() => Object.keys(episodesData), [episodesData]);
  const rankedProviders = useMemo(() =>
    rankProviders(availableProviders),
    [availableProviders]
  );

  const [animeLogo, setAnimeLogo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

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

        if (!mounted) return;
        setResolvedId(anilistId);

        const [info, epsPayload] = await Promise.all([
          fetchAnimeInfo(anilistId),
          fetchAnimeEpisodes(anilistId)
        ]);

        if (!mounted) return;

        setAnimeInfo(info);
        const titleText = info.title?.english || info.title?.romaji || info.title?.native || 'Watching';
        const epText = episodeId ? ` Episode ${extractSlug(episodeId)}` : '';
        document.title = `Watching ${titleText}${epText}`;
        setEpisodesData(epsPayload?.providers || {});

        fetch(`https://api.ani.zip/mappings?anilist_id=${anilistId}`)
          .then(res => { if (res.ok) return res.json(); throw new Error(); })
          .then(async (mappingData) => {
            let logoUrl = '';

            if (mappingData.images && Array.isArray(mappingData.images)) {
              const logoArt = mappingData.images.find((img: any) => img.coverType === 'Clearlogo');
              if (logoArt) logoUrl = logoArt.url;
            }

            if (!logoUrl && mappingData?.mappings?.thetvdb_id) {
              const tvdbId = mappingData.mappings.thetvdb_id;
              const tvdbRes = await fetch("https://api4.thetvdb.com/v4/login", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apikey: "8d5ef3e7-1b6c-4474-ab39-ad6610bd4b80" })
              }).then(r => r.json()).catch(() => null);

              if (tvdbRes?.data?.token) {
                const token = tvdbRes.data.token;
                const extRes = await fetch(`https://api4.thetvdb.com/v4/series/${tvdbId}/extended`, {
                  headers: { Authorization: `Bearer ${token}` }
                }).then(r => r.json()).catch(() => null);

                if (extRes?.data?.artworks) {
                  const logoArt = extRes.data.artworks.find((art: any) => art.type === 23 || art.type === 24);
                  if (logoArt) logoUrl = logoArt.image;
                }
              }
            }

            if (logoUrl && mounted) {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return setAnimeLogo(logoUrl);
                  ctx.drawImage(img, 0, 0);
                  const { data: idata, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  let top = height, left = width, right = 0, bottom = 0;
                  for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                      if (idata[(y * width + x) * 4 + 3] > 10) {
                        if (y < top) top = y; if (y > bottom) bottom = y;
                        if (x < left) left = x; if (x > right) right = x;
                      }
                    }
                  }
                  if (top >= bottom || left >= right) return setAnimeLogo(logoUrl);
                  top = Math.max(0, top - 2); left = Math.max(0, left - 2);
                  right = Math.min(width - 1, right + 2); bottom = Math.min(height - 1, bottom + 2);
                  const trimW = right - left + 1, trimH = bottom - top + 1;
                  const trimCanvas = document.createElement('canvas');
                  trimCanvas.width = trimW; trimCanvas.height = trimH;
                  const trimCtx = trimCanvas.getContext('2d');
                  if (!trimCtx) return setAnimeLogo(logoUrl);
                  trimCtx.drawImage(canvas, left, top, trimW, trimH, 0, 0, trimW, trimH);
                  if (mounted) setAnimeLogo(trimCanvas.toDataURL('image/png'));
                } catch { if (mounted) setAnimeLogo(logoUrl); }
              };
              img.onerror = () => mounted && setAnimeLogo(logoUrl);
              img.src = logoUrl;
            }
          }).catch(() => { });

      } catch (err: any) {
        console.error("Watch Page Load Error:", err);
        if (mounted) setEpisodesData({});
      } finally {
        if (mounted) setLoadingEpisodes(false);
      }
    };

    loadAnimeData();
    return () => { mounted = false; };
  }, [urlSlug, episodeId]);

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

  // Ranges are anchored to episode NUMBERS, not array positions — so sort order never shifts which range you're on
  const totalEpisodes = providerEpisodes.length;
  const maxEpNumber = useMemo(() => providerEpisodes.reduce((m, ep) => Math.max(m, ep.number || 0), 0), [providerEpisodes]);
  const needsRangePicker = totalEpisodes > EP_RANGE_SIZE && !epSearchQuery.trim();
  const totalRanges = needsRangePicker ? Math.ceil(maxEpNumber / EP_RANGE_SIZE) : 1;

  const rangedEpisodes = useMemo(() => {
    let eps = !needsRangePicker ? visibleEpisodes : visibleEpisodes.filter(ep => (ep.number ?? 0) >= (episodeRangeIndex * EP_RANGE_SIZE + 1) && (ep.number ?? 0) <= ((episodeRangeIndex + 1) * EP_RANGE_SIZE));

    const nextAir = animeInfo?.nextAiringEpisode;
    if (nextAir && !epSearchQuery.trim() && eps.length > 0) {
      const epNum = nextAir.episode;
      const inRange = !needsRangePicker || (epNum >= episodeRangeIndex * EP_RANGE_SIZE + 1 && epNum <= (episodeRangeIndex + 1) * EP_RANGE_SIZE);
      if (inRange && !eps.some((ep: any) => ep.number === epNum)) {
        const unreleasedEp = { id: `upcoming-${epNum}`, number: epNum, title: undefined, image: undefined, description: undefined, _unreleased: true };
        // visibleEpisodes is already sorted; prepend for desc (newest first), append for asc
        eps = episodeSortOrder === 'desc' ? [unreleasedEp, ...eps] : [...eps, unreleasedEp];
      }
    }

    return eps;
  }, [visibleEpisodes, episodeRangeIndex, needsRangePicker, EP_RANGE_SIZE, animeInfo?.nextAiringEpisode, epSearchQuery, episodeSortOrder]);

  const currentIndex = useMemo(() => {
    if (!episodeId) return -1;
    let idx = providerEpisodes.findIndex(ep => extractSlug(ep.id) === episodeId);
    if (idx === -1) {
      const epNumMatch = episodeId.match(/\d+$/);
      if (epNumMatch) idx = providerEpisodes.findIndex(ep => String(ep.number) === epNumMatch[0]);
    }
    return idx;
  }, [providerEpisodes, episodeId]);

  // Auto-jump range when episode changes (uses episode number — sort-order-safe)
  const prevEpIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!needsRangePicker || currentIndex === -1) return;
    const epId = episodeId;
    if (epId === prevEpIdRef.current) return; // not a real navigation
    prevEpIdRef.current = epId;
    const epNum = providerEpisodes[currentIndex]?.number ?? 0;
    setEpisodeRangeIndex(Math.floor((epNum - 1) / EP_RANGE_SIZE));
  }, [currentIndex, episodeId, needsRangePicker, providerEpisodes, EP_RANGE_SIZE]);

  const currentEpData = currentIndex !== -1 ? providerEpisodes[currentIndex] : providerEpisodes[0];

  const streamCandidates = useMemo<StreamCandidate[]>(() => {
    if (!currentEpData?.number || !currentProvider) return [];

    const seen = new Set<string>();
    const candidates: StreamCandidate[] = [];
    const providerOrder = [currentProvider, ...rankedProviders.filter(p => p !== currentProvider)];

    for (const providerName of providerOrder) {
      const eps = getProviderEpisodes({ providers: episodesData }, providerName, currentCategory);
      const match = providerName === currentProvider
        ? currentEpData
        : eps.find(ep => ep.number === currentEpData.number);
      if (!match?.id) continue;

      const key = `${providerName.toLowerCase()}-${currentCategory}-${extractSlug(match.id)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        provider: providerName,
        category: currentCategory,
        episodeId: providerName === currentProvider ? episodeId || extractSlug(match.id) : extractSlug(match.id),
      });
    }

    return candidates;
  }, [currentEpData, currentProvider, currentCategory, rankedProviders, episodesData, episodeId]);

  const sourceOptions = useMemo(() =>
    streamCandidates.filter(candidate => {
      if (candidate.provider === currentProvider) return true;
      const providerPayload = episodesData[candidate.provider];
      const hasSameCategory = (providerPayload?.episodes?.[currentCategory]?.length ?? 0) > 0;
      return hasSameCategory;
    }),
    [streamCandidates, episodesData, currentProvider, currentCategory]
  );

  // Scroll auto-scroll removed — was forcing sidebar to bottom

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < providerEpisodes.length - 1 && currentIndex !== -1;

  useEffect(() => {
    if (!currentEpData?.id || !resolvedId || !currentProvider || !episodeId) return;
    let mounted = true;
    const load = async () => {
      if (playerRef.current) {
        playerRef.current.pause();
      }
      setStreamLoading(true);
      setStreamError(null);
      setStreamAttemptedProviders([currentProvider]);
      setShowSkipIntro(false); setShowSkipOutro(false);
      try {
        let data: any;

        if (useHybridAudio && currentCategory === 'dub') {
          try {
            const [subData, dubData] = await Promise.all([
              fetchAnimeStreams(currentProvider.toLowerCase(), resolvedId, 'sub', episodeId),
              fetchAnimeStreams(currentProvider.toLowerCase(), resolvedId, 'dub', episodeId)
            ]);

            const subUrl = subData?.streams?.[0]?.url || subData?.sources?.[0]?.url;
            const dubUrl = dubData?.streams?.[0]?.url || dubData?.sources?.[0]?.url;

            if (subUrl && dubUrl) {
              try {
                const remuxedUrl = await fetchRemuxStream(subUrl, dubUrl, WORKER_PROXY_URL);
                data = {
                  sources: [{ url: remuxedUrl }],
                  subtitles: subData.subtitles || [],
                  intro: subData.intro,
                  outro: subData.outro,
                  _useHybrid: true,
                  _hybridType: 'ffmpeg',
                };
              } catch (e) {
                data = {
                  ...subData,
                  _useHybrid: true,
                  _hybridNote: 'ffmpeg failed',
                };
              }
            }
          } catch (e) {
            console.error('Hybrid failed:', e);
          }
        }

        if (!data?.streams?.length && !data?.sources?.length) {
          data = await fetchAnimeStreams(currentProvider.toLowerCase(), resolvedId, currentCategory as 'sub' | 'dub', episodeId);
        }

        if (!data.streams?.length && !data.sources?.length) throw new Error('Server is not responding.');

        let finalData = data;
        if (currentCategory === 'dub' && !useHybridAudio) {
          try {
            const subData = await fetchAnimeStreams(currentProvider.toLowerCase(), resolvedId, 'sub', episodeId);
            if (subData?.subtitles?.length) {
              finalData = {
                ...data,
                subtitles: subData.subtitles,
                _externalSubs: true
              };
            }
          } catch (e) { /* use dub data only */ }
        }

        if (mounted) setStreamData(finalData as any);

        const targetAniskipId = animeInfo?.idMal || resolvedId;
        if (mounted && targetAniskipId && currentEpData?.number) {
          try {
            const aniskipUrl = `https://api.aniskip.com/v2/skip-times/${targetAniskipId}/${currentEpData.number}?types[]=ed&types[]=mixed-ed&types[]=mixed-op&types[]=op&types[]=recap&episodeLength=`;
            const aniskipRes = await fetch(aniskipUrl);
            const aniskipData = await aniskipRes.json();

            if (aniskipData.found && aniskipData.results && mounted) {
              let intro: { start: number; end: number } | undefined;
              let outro: { start: number; end: number } | undefined;

              for (const result of aniskipData.results) {
                if (result.skipType === 'op' || result.skipType === 'mixed-op') {
                  intro = { start: result.interval.startTime, end: result.interval.endTime };
                } else if (result.skipType === 'ed' || result.skipType === 'mixed-ed') {
                  outro = { start: result.interval.startTime, end: result.interval.endTime };
                }
              }

              if (intro || outro) {
                setStreamData((prev: any) => ({
                  ...prev,
                  intro: intro || prev?.intro,
                  outro: outro || prev?.outro
                }));
              }
            }
          } catch (e: any) {
            console.warn('AniSkip fetch failed:', e);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setStreamError(err.message || 'Failed to load media.');
          setStreamData(null);
        }
      } finally {
        if (mounted) setStreamLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentEpData?.id, currentEpData?.number, resolvedId, currentProvider, currentCategory, episodeId, episodesData, rankedProviders, streamRetryNonce, animeInfo?.idMal]);

  const [selectedStreamIndex, setSelectedStreamIndex] = useState<number>(-1);

  useEffect(() => {
    if (!streamData?.streams || streamData.streams.length === 0) return;

    const hlsStreams = streamData.streams.filter(s => s.type === 'hls' || s.url.includes('.m3u8'));
    const embedStreams = streamData.streams.filter(s => s.type === 'embed' || (!s.url.includes('.m3u8') && (s.url.includes('iframe') || s.url.includes('/embed/'))));

    const getQualityScore = (q: string) => {
      const lq = (q || '').toLowerCase();
      if (lq.includes('1080')) return 1080;
      if (lq.includes('720')) return 720;
      if (lq.includes('480')) return 480;
      if (lq.includes('360')) return 360;
      if (lq.includes('auto')) return 9999;
      if (lq.includes('default')) return 9000;
      return parseInt(lq) || 0;
    };

    const getBestStream = (list: StreamSource[]) => {
      return [...list].sort((a, b) => getQualityScore(b.quality) - getQualityScore(a.quality))[0];
    };

    if (playerMode === 'internal' && hlsStreams.length > 0) {
      const best = getBestStream(hlsStreams);
      setSelectedStreamIndex(streamData.streams.indexOf(best));
    } else if (playerMode === 'external' && embedStreams.length > 0) {
      const best = getBestStream(embedStreams);
      setSelectedStreamIndex(streamData.streams.indexOf(best));
    } else {
      if (hlsStreams.length > 0) {
        setSelectedStreamIndex(streamData.streams.indexOf(getBestStream(hlsStreams)));
      } else if (embedStreams.length > 0) {
        setSelectedStreamIndex(streamData.streams.indexOf(getBestStream(embedStreams)));
      }
    }
  }, [streamData, playerMode]);

  const NSFW_EMBED_HOSTS = ['hanime.tv', 'hanime1.me', 'hanime3.me', 'hentaihaven.xxx', 'hentaihaven.to', 'hentaicasts.com'];

  const getEmbedSrc = (url: string): string => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (NSFW_EMBED_HOSTS.some(h => host.includes(h))) {
        return `/api/embed-proxy?url=${encodeURIComponent(url)}`;
      }
    } catch { }
    return url;
  };

  const activeStream = useMemo<StreamSource | null>(() => {
    if (!streamData?.streams) return null;
    const stream = streamData.streams[selectedStreamIndex] || streamData.streams[0];
    if (!stream) return null;
    if ((stream.type === 'embed' || stream.url.includes('iframe') || stream.url.includes('/embed/')) && !stream.url.includes('.m3u8')) {
      return { ...stream, type: 'embed' } as StreamSource & { type: 'embed' };
    }
    return { ...stream, type: 'hls' } as StreamSource & { type: 'hls' };
  }, [streamData, selectedStreamIndex]);

  useEffect(() => {
    let mounted = true;

    if (!activeStream?.url?.includes('.m3u8') || !activeStream?.url) {
      if (prevProxifiedUrlRef.current) {
        URL.revokeObjectURL(prevProxifiedUrlRef.current);
        prevProxifiedUrlRef.current = null;
      }
      setProxifiedStreamUrl(null);
      return;
    }

    try {
      const b64 = btoa(activeStream.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const url = `${WORKER_PROXY_URL}proxy/${b64}`;
      if (mounted) {
        if (prevProxifiedUrlRef.current) {
          URL.revokeObjectURL(prevProxifiedUrlRef.current);
        }
        prevProxifiedUrlRef.current = url;
        setProxifiedStreamUrl(url);
      }
    } catch (e: any) {
      console.warn('Failed to encode stream URL for proxy:', e);
      if (mounted) {
        setProxifiedStreamUrl(null);
      }
    }
    return () => {
      mounted = false;
      if (prevProxifiedUrlRef.current) {
        URL.revokeObjectURL(prevProxifiedUrlRef.current);
        prevProxifiedUrlRef.current = null;
      }
    };
  }, [activeStream]);

  const derivedTitle = typeof animeInfo?.title === 'string'
    ? animeInfo.title
    : animeInfo?.title?.english || animeInfo?.title?.romaji || animeInfo?.title?.userPreferred;
  const displayTitle = derivedTitle || (!/^\d+$/.test(String(urlSlug)) ? String(urlSlug).replace(/-/g, ' ') : 'Anime Details');
  const displayTitleWithEpisode = currentEpData?.number ? `${displayTitle}` : displayTitle;

  const progressDataRef = useRef<ProgressData | null>(null);
  const playingEpisodeRef = useRef<string>('');
  const videoStateRef = useRef({ episodeId: '', currentTime: 0, duration: 0 });
  const lastSavedTime = useRef<number>(-1);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    if (ytVolumeBoost === 0) {
      if (gainNodeRef.current) gainNodeRef.current.gain.value = 1;
      return;
    }

    const video = videoContainerRef.current?.querySelector('video');
    if (!video) return;

    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        try {
          audioCtxRef.current = new AudioContext();
          gainNodeRef.current = audioCtxRef.current.createGain();
          const source = audioCtxRef.current.createMediaElementSource(video);
          source.connect(gainNodeRef.current);
          gainNodeRef.current.connect(audioCtxRef.current.destination);
        } catch (e) { }
      }
    }

    if (gainNodeRef.current && audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => { });
      }
      gainNodeRef.current.gain.value = 1 + (ytVolumeBoost / 33.3);
    }
  }, [ytVolumeBoost, isVideoReady]);

  /* ─── TEMPORAL SMOOTHING CANVAS AMBIENT MODE ─────────────────────────
     This replaces the raw <video> with a tiny <canvas> that draws frames
     at low opacity over time. This completely eliminates flickering and
     naturally blends/fades colors seamlessly.
  ────────────────────────────────────────────────────────────────────────*/
  useEffect(() => {
    if (!ytAmbientMode) return;

    let animationFrameId: number;
    let lastDrawTime = 0;

    const drawFrame = (time: number) => {
      animationFrameId = requestAnimationFrame(drawFrame);

      // Limit to ~24fps (approx every 40ms) to save CPU resources
      if (time - lastDrawTime < 40) return;
      lastDrawTime = time;

      const mainVideo =
        videoContainerRef.current?.querySelector('video') ??
        document.querySelector('media-player video') ??
        (document.querySelector('video') as HTMLVideoElement | null);

      const canvas = ambientCanvasRef.current;

      if (!mainVideo || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Small 128x72 canvas is lightning fast to draw and perfectly fine for blurring
      if (canvas.width !== 128) {
        canvas.width = 128;
        canvas.height = 72;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 128, 72);
      }

      // 0.06 opacity per frame creates a buttery 300-500ms fade transition
      ctx.globalAlpha = 0.06;
      ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height);
    };

    // Start the loop after a small delay to let the video load
    const startTimer = setTimeout(() => {
      animationFrameId = requestAnimationFrame(drawFrame);
    }, 500);

    return () => {
      clearTimeout(startTimer);
      cancelAnimationFrame(animationFrameId);
    };
  }, [ytAmbientMode, streamData]);

  useEffect(() => {
    setIsVideoReady(false);
    setVideoDuration(0);
    videoStateRef.current = { episodeId: '', currentTime: 0, duration: 0 };
    lastSavedTime.current = -1;
    if (streamData && episodeId) { playingEpisodeRef.current = episodeId; }
  }, [episodeId, streamData]);

  useEffect(() => {
    if (!useYouTubeStylePlayer || !isVideoReady) return;
    const timer = setTimeout(() => setYtControlsVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [useYouTubeStylePlayer, isVideoReady]);

  progressDataRef.current = {
    animeId: String(resolvedId || urlSlug), episodeId: episodeId || '', animeTitle: displayTitle,
    animeCover: animeInfo?.image || animeInfo?.coverImage?.large || animeInfo?.images?.jpg?.large_image_url || undefined,
    episodeTitle: currentEpData?.title || `Episode ${currentEpData?.number || '?'}`,
    episodeNumber: currentEpData?.number || 0,
    episodeImage: currentEpData?.image || null,
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
    const safeTime = (Number.isFinite(currentTime) && currentTime > 0) ? currentTime : 0;

    if (safeDuration > 0 && (safeTime > safeDuration - 15 || safeTime > safeDuration * 0.95)) {
      return;
    }

    if (safeTime < 3) return;

    try {
      if (user) {
        const { error } = await supabase.from('anime_watch_history').upsert({
          user_id: user.id, anime_id: String(payload.animeId), episode_id: String(payload.episodeId),
          anime_title: payload.animeTitle, anime_cover: payload.animeCover, episode_title: payload.episodeTitle,
          episode_number: payload.episodeNumber, href: payload.href, duration: safeDuration,
          progress_time: safeTime, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, anime_id' });
        if (error) console.warn('Failed to save progress to Supabase:', error.message);

        const watchEventKey = `${payload.animeId}:${payload.episodeId}`;
        if (safeTime >= 10 && lastRecordedWatchEventRef.current !== watchEventKey) {
          lastRecordedWatchEventRef.current = watchEventKey;
          recordWatchEvent({
            user_id: user.id,
            anime_id: String(payload.animeId),
            episode_id: String(payload.episodeId),
            anime_title: payload.animeTitle,
            anime_cover: payload.animeCover,
            episode_title: payload.episodeTitle,
            episode_number: payload.episodeNumber,
            episode_image: payload.episodeImage,
            href: payload.href,
            progress_time: safeTime,
            duration: safeDuration,
          });
        }

        updateWatchingPresence(user.id, `${payload.animeTitle} - Ep ${payload.episodeNumber || '?'}`);
      }

      const progressKey = `progress-${payload.animeId}-${payload.episodeId}`;
      localStorage.setItem(progressKey, safeTime.toString());

      const raw = localStorage.getItem('anime-continue-watching');
      const entries = raw ? JSON.parse(raw) : [];
      const filtered = (Array.isArray(entries) ? entries : []).filter((e: any) => String(e.animeId) !== String(payload.animeId));

      filtered.unshift({ kind: 'anime', ...payload, duration: safeDuration, currentTime: safeTime, updatedAt: Date.now() });
      localStorage.setItem('anime-continue-watching', JSON.stringify(filtered.slice(0, 40)));
      window.dispatchEvent(new Event('storage'));
    } catch (e: any) { console.warn('Failed to save progress', e); }
  }, [user]);

  useEffect(() => {
    const onSave = () => forceSaveProgress();
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') forceSaveProgress(); };
    window.addEventListener('beforeunload', onSave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', onSave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      onSave();
      if (speedTimeoutRef.current) { clearTimeout(speedTimeoutRef.current); speedTimeoutRef.current = null; }
      if (seekIndicatorTimeout.current) { clearTimeout(seekIndicatorTimeout.current); seekIndicatorTimeout.current = null; }
    };
  }, [forceSaveProgress]);

  useEffect(() => {
    return () => {
      if (speedTimeoutRef.current) { clearTimeout(speedTimeoutRef.current); speedTimeoutRef.current = null; }
      if (seekIndicatorTimeout.current) { clearTimeout(seekIndicatorTimeout.current); seekIndicatorTimeout.current = null; }
      if (prevProxifiedUrlRef.current) {
        URL.revokeObjectURL(prevProxifiedUrlRef.current);
        prevProxifiedUrlRef.current = null;
      }
    };
  }, []);

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
    if (wasSpeeding) {
      pointerStateRef.current.lastTapTime = 0;
      return;
    }
    if (e.pointerType !== 'touch') return;

    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], [role="slider"], [role="menu"], input, .vds-controls-group')) return;

    const upTime = Date.now();
    const upX = e.clientX; const upY = e.clientY;
    const pState = pointerStateRef.current;
    const isTap = (upTime - pState.downTime < 300) && Math.abs(upX - pState.downX) < 15 && Math.abs(upY - pState.downY) < 15;

    if (!isTap) {
      pState.lastTapTime = 0;
      pState.lastTapX = 0;
      pState.lastTapY = 0;
      return;
    }

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

    if (preventClickRef.current && !isControl) {
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
    if (proxifiedStreamUrl) return proxifiedStreamUrl;
    return activeStream.url || null;
  }, [activeStream, proxifiedStreamUrl]);

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
      if (isWithinOutro) { if (autoSkip) skipTo(end); else if (!outroDismissedRef.current) setAutoNextCountdown(c => c === null ? 10 : c); } else { if (autoNextCountdown !== null && currentTime < start) setAutoNextCountdown(null); outroDismissedRef.current = false; }
    }
  }, [streamData, autoSkip, autoNextCountdown]);

  const skipTo = (t: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = t;
    }
  };

  const handleEpisodeClick = useCallback((targetId: string) => {
    forceSaveProgress();
    if (!urlSlug || !currentProvider) return;

    if (document.fullscreenElement && videoContainerRef.current) {
      pendingFullscreenRestoreRef.current = true;
    }

    let finalTargetId = extractSlug(targetId);
    const targetEp = providerEpisodes.find(e => e.id === targetId);

    const customPrefixes = ['animepahe', 'animekai', 'animedunya', 'anikoto'];
    const activePrefix = customPrefixes.find(p => episodeId?.toLowerCase().startsWith(p));

    if (activePrefix) {
      const epNum = targetEp?.number || finalTargetId.match(/\d+$/)?.[0] || '1';
      finalTargetId = `${activePrefix}-${epNum}`;
    }

    const href = getEpisodeHref(urlSlug, currentProvider, currentCategory, finalTargetId);
    navigate(href);
  }, [urlSlug, currentProvider, currentCategory, navigate, forceSaveProgress, episodeId, providerEpisodes]);

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
      finalTargetId = `${activePrefix}-${match.number}`;
    }

    const href = getEpisodeHref(urlSlug, currentProvider, newCat, finalTargetId);
    navigate(href, { replace: true });
  }, [urlSlug, currentProvider, currentCategory, episodesData, currentEpData, navigate, showToast, forceSaveProgress, episodeId]);

  const handleSourceSwitch = useCallback((targetProvider: string) => {
    forceSaveProgress();
    if (!urlSlug) return;
    if (targetProvider === currentProvider) {
      setStreamRetryNonce(current => current + 1);
      return;
    }

    const candidate = streamCandidates.find(c => c.provider === targetProvider);
    if (!candidate) return showToast(`No matching episode on ${targetProvider}.`);

    navigate(getEpisodeHref(urlSlug, candidate.provider, candidate.category, candidate.episodeId));
  }, [urlSlug, currentProvider, streamCandidates, navigate, showToast, forceSaveProgress]);

  const sourceSelect = sourceOptions.length > 0 ? (
    <div className="relative z-[120] flex-shrink-0" ref={sourceDropdownRef} style={{ height: '100%' }}>
      <motion.button
        type="button"
        whileHover={{}}
        whileTap={{}}
        onClick={(e) => {
          if (!streamLoading) {
            e.stopPropagation();
            setIsSourceDropdownOpen(current => !current);
          }
        }}
        disabled={streamLoading}
        style={{
          display: 'flex',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          minWidth: 100,
          borderRadius: 10,
          border: 'none',
          background: 'transparent',
          color: 'white',
          padding: '0 12px',
          fontSize: 14,
          fontFamily: 'var(--aw-font-display)',
          fontWeight: 700,
          cursor: streamLoading ? 'wait' : 'pointer',
          opacity: streamLoading ? 0.55 : 1,
          transition: 'none'
        }}
        aria-label="Select stream source"
        aria-expanded={isSourceDropdownOpen}
        aria-controls="source-dropdown-menu"
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 85, color: 'rgba(255,255,255,0.9)' }}>
          {currentProvider || 'Source'}
        </span>
        <motion.div
          animate={{ rotate: isSourceDropdownOpen ? 180 : 0 }}
          style={{ display: 'flex', opacity: 0.4 }}
        >
          <ChevronDown size={14} strokeWidth={3} />
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {isSourceDropdownOpen && (
          <div
            id="source-dropdown-menu"
            className="absolute left-1/2 top-[calc(100%+12px)] min-w-[180px] -translate-x-1/2"
            style={{ zIndex: 9999, pointerEvents: 'auto' }}
          >
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full rounded-[16px] border border-[var(--aw-border)] bg-[var(--aw-s1)] p-1.5 shadow-2xl backdrop-blur-xl"
              style={{
                boxShadow: '0 18px 42px -12px rgba(0,0,0,0.85), 0 0 0 1px color-mix(in srgb, var(--aw-accent), transparent 92%)',
                pointerEvents: 'auto'
              }}
            >
              <CustomScrollArea style={{ maxHeight: 260 }} className="flex flex-col gap-1">
                {sourceOptions.map(candidate => {
                  const isSelected = currentProvider === candidate.provider;
                  return (
                    <button
                      key={`${candidate.provider}-${candidate.episodeId}`}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => {
                        setIsSourceDropdownOpen(false);
                        handleSourceSwitch(candidate.provider);
                      }}
                      className="source-option"
                    >
                      {candidate.provider}
                    </button>
                  );
                })}
              </CustomScrollArea>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  ) : null;

  const getNextEpisode = useCallback(() => {
    for (let i = currentIndex + 1; i < providerEpisodes.length; i++) {
      if (ytSkipFillers && providerEpisodes[i].filler) continue;
      return providerEpisodes[i];
    }
    return null;
  }, [currentIndex, providerEpisodes, ytSkipFillers]);

  const handleVideoEnd = useCallback(() => {
    if (autoNext && getNextEpisode()) {
      setAutoNextCountdown(10);
    }
  }, [autoNext, getNextEpisode]);

  const playNextEpisode = useCallback(() => {
    const nextEpisode = getNextEpisode();
    if (!nextEpisode) return;
    setAutoNextCountdown(null);
    handleEpisodeClick(nextEpisode.id);
  }, [getNextEpisode, handleEpisodeClick]);

  useEffect(() => {
    setAutoNextCountdown(null);
  }, [episodeId]);

  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (!autoNext || !getNextEpisode()) {
      setAutoNextCountdown(null);
      return;
    }
    if (autoNextCountdown <= 0) {
      playNextEpisode();
      return;
    }

    const timer = window.setTimeout(() => {
      setAutoNextCountdown((current) => current === null ? null : Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [autoNextCountdown, autoNext, getNextEpisode, playNextEpisode]);

  useEffect(() => {
    if (isVideoReady && !streamLoading && pendingFullscreenRestoreRef.current) {
      pendingFullscreenRestoreRef.current = false;
      if (!document.fullscreenElement && videoContainerRef.current) {
        videoContainerRef.current.requestFullscreen().catch(() => { });
      }
    }
  }, [isVideoReady, streamLoading]);

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

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="aw-root aw-noise min-h-screen flex flex-col relative">
      <AnimatePresence>
        {lightsOff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setLightsOff(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(2px)', cursor: 'pointer' }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="aw-layout"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <div className="aw-main">
          <div style={{
            position: 'relative',
            borderRadius: 24,
            background: 'rgba(10, 10, 15, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 40px 100px -30px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px) saturate(180%)',
          }}>

            <AnimatePresence>
              {ytAmbientMode && !lightsOff && !ytIsFullscreen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 5,
                  }}
                >
                  <canvas
                    ref={ambientCanvasRef}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      borderRadius: '16px',
                      filter: 'blur(40px) saturate(200%) brightness(1.2)',
                      opacity: ytAmbientOpacity / 100, // Tied to the UI slider
                      transform: 'scale(1.03)',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* The actual video player — z-index 10 sits above the ambient layer */}
            <motion.div
              ref={videoContainerRef}
              variants={scaleInItem}
              style={{
                position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000',
                borderRadius: 24, overflow: 'hidden', zIndex: 10, transition: 'box-shadow 0.5s',
                boxShadow: lightsOff
                  ? '0 0 0 2px var(--aw-accent), 0 0 80px 8px var(--aw-accent), 0 30px 80px -20px rgba(0,0,0,0.9)'
                  : 'none',
                userSelect: 'none'
              }}
              onPointerDownCapture={handleVideoPointerDown}
              onPointerUpCapture={handleVideoPointerUp}
              onPointerLeave={handleVideoPointerLeave}
              onClickCapture={handleVideoClickCapture}
              onContextMenu={(e) => { if (isSpeeding) e.preventDefault(); }}
            >
              {streamError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring' }}
                  style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,7,13,0.95)', padding: 32, textAlign: 'center', gap: 16, zIndex: 50 }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(232,54,93,0.1)', border: '1px solid rgba(232,54,93,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4, animation: 'pulse 2s ease-in-out infinite' }}>
                    <AlertCircle style={{ color: 'var(--aw-accent)', width: 24, height: 24 }} />
                  </div>
                  <p style={{ fontFamily: 'var(--aw-font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-accent)' }}>Stream Failed</p>
                  <p style={{ fontSize: 13, color: 'var(--aw-muted)', maxWidth: 320, lineHeight: 1.6, fontWeight: 300 }}>{streamError}</p>
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStreamRetryNonce(current => current + 1)}
                    style={{ marginTop: 8, padding: '10px 28px', background: 'var(--aw-card)', border: '1px solid var(--aw-border-hi)', borderRadius: 100, color: 'var(--aw-text)', fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    Retry Sources
                  </motion.button>
                </motion.div>
              )}

              {streamLoading && !streamError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', pointerEvents: 'none' }}
                >
                  <Loader2 className="animate-spin" size={24} style={{ color: 'var(--aw-accent)' }} />
                  <p style={{ margin: 0, fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
                    {streamAttemptedProviders.length > 0 ? `Trying ${streamAttemptedProviders[streamAttemptedProviders.length - 1]}` : 'Finding Source'}
                  </p>
                </motion.div>
              )}

              <AnimatePresence>
                {showSkipIntro && (
                  <motion.div
                    key="skip-intro"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    style={{ position: 'absolute', right: 28, bottom: ytControlsVisible ? 104 : 28, zIndex: 120, transition: 'bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)', willChange: 'transform' }}
                  >
                    {/* Scale wrapper isolated from backdropFilter element to prevent repaint flicker */}
                    <motion.div
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.93 }}
                      transition={{ type: 'spring', damping: 18, stiffness: 380 }}
                      style={{ willChange: 'transform' }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (showSkipIntro && streamData?.intro?.end) skipTo(streamData.intro.end);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '11px 22px', borderRadius: 100,
                          border: '1px solid rgba(255,255,255,0.18)',
                          background: 'rgba(8, 8, 14, 0.88)',
                          backdropFilter: 'blur(20px) saturate(180%)',
                          color: 'white', fontFamily: 'var(--aw-font-display)',
                          fontSize: 13, fontWeight: 700, letterSpacing: '0.05em',
                          cursor: 'pointer',
                          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                          outline: 'none', position: 'relative', overflow: 'hidden',
                          transition: 'box-shadow 0.2s ease',
                        }}
                      >
                        {/* Inner shimmer line */}
                        <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)', borderRadius: 100, pointerEvents: 'none' }} />
                        <motion.span
                          animate={{ rotate: [0, 0, 15, 0] }}
                          transition={{ duration: 0.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2.5 }}
                          style={{ display: 'flex', alignItems: 'center', color: 'var(--aw-accent)' }}
                        >
                          <FastForward size={15} fill="currentColor" strokeWidth={0} />
                        </motion.span>
                        {showSkipIntro ? 'Skip Intro' : 'Skip Outro'}
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {autoNextCountdown !== null && hasNext && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                    style={{
                      position: 'absolute',
                      right: 28,
                      bottom: ytControlsVisible ? 104 : 28,
                      zIndex: 120,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      transition: 'bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    {/* Watch Credits — dark glass pill */}
                    <motion.button
                      type="button"
                      onClick={() => { outroDismissedRef.current = true; setAutoNextCountdown(null); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                      style={{
                        height: 44, padding: '0 20px', borderRadius: 100,
                        background: 'rgba(8,8,14,0.82)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--aw-font-display)',
                        fontSize: 13, fontWeight: 700, letterSpacing: '0.03em',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        boxShadow: '0 8px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
                      }}
                    >
                      Watch Credits
                    </motion.button>

                    {/* Next Episode — accent pill with visible countdown */}
                    <motion.button
                      type="button"
                      onClick={playNextEpisode}
                      onPointerDown={(e) => e.stopPropagation()}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                      style={{
                        position: 'relative', overflow: 'hidden',
                        height: 44, padding: '0 20px', borderRadius: 100,
                        background: 'rgba(8,8,14,0.88)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid var(--aw-accent)',
                        color: 'white', fontFamily: 'var(--aw-font-display)',
                        fontSize: 13, fontWeight: 700, letterSpacing: '0.03em',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 8,
                        boxShadow: '0 8px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
                      }}
                    >
                      {/* Accent fill drains left→right in sync with countdown, no CSS delay */}
                      <motion.span
                        animate={{ width: `${((autoNextCountdown ?? 0) / 10) * 100}%` }}
                        transition={{ duration: 0.95, ease: 'linear' }}
                        style={{
                          position: 'absolute', top: 0, left: 0, bottom: 0,
                          background: 'color-mix(in srgb, var(--aw-accent) 32%, transparent)',
                          pointerEvents: 'none',
                          borderRadius: 'inherit',
                        }}
                      />
                      <Play size={14} fill="var(--aw-accent)" strokeWidth={0} style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} />
                      <span style={{ position: 'relative', zIndex: 1 }}>
                        Next Episode{autoNextCountdown !== null ? ` - ${autoNextCountdown}s` : ''}
                      </span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {activeStream?.type === 'embed' && activeStream?.url ? (
                <iframe src={getEmbedSrc(activeStream.url)} style={{ width: '100%', height: '100%', border: 'none', position: 'relative', zIndex: 10 }} allowFullScreen allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
              ) : (
                <MediaPlayer
                  ref={playerRef}
                  crossOrigin="anonymous"
                  autoplay={autoPlay}
                  volume={playerVolume}
                  title={displayTitleWithEpisode}
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
                  onTimeUpdate={(e: number | { detail?: { currentTime?: number }; currentTime?: number }) => {
                    const time = typeof e === 'number' ? e : e?.detail?.currentTime || e?.currentTime || 0;
                    const duration = playerRef.current?.state?.duration || videoStateRef.current.duration || 0;

                    if (duration > 0 && videoDuration === 0) {
                      setVideoDuration(duration);
                    }

                    handleTimeUpdate({ currentTime: time, duration });
                  }}
                  onEnded={handleVideoEnd}
                  onPlay={() => { setYtIsPlayerPaused(false); }}
                  onPause={() => { setYtIsPlayerPaused(true); }}
                  onCanPlay={() => {
                    setIsVideoReady(true);
                    if (!playerRef.current) return;
                    const epId = progressDataRef.current?.episodeId || episodeId;
                    const aId = progressDataRef.current?.animeId || urlSlug;
                    if (autoPlay && playerRef.current.state?.paused) playerRef.current.play().catch(() => { });

                    const hasSubtitles = streamData?.subtitles?.length > 0;
                    const preferredLang = localStorage.getItem('watchAudioLang');
                    if (currentCategory === 'dub' && !hasSubtitles && preferredLang === 'sub') {
                      showToast(
                        'This dub has no subs',
                        () => navigate(getEpisodeHref(urlSlug, provider, 'sub', episodeId)),
                        'Switch to Sub'
                      );
                    }

                    if (!epId || !aId) return;
                    const savedTimeRaw = localStorage.getItem(`progress-${aId}-${epId}`);
                    if (savedTimeRaw) {
                      const parsedTime = parseFloat(savedTimeRaw);
                      const currentTime = playerRef.current.currentTime || 0;
                      const duration = playerRef.current.state?.duration || 0;
                      if (parsedTime > 10 && currentTime < 5 && duration > 0) {
                        const timeDiff = Math.abs(parsedTime - currentTime);
                        if (parsedTime < duration - 20 && parsedTime < duration * 0.92 && timeDiff > 10) {
                          playerRef.current.currentTime = parsedTime;
                          showToast(`Resumed playback at ${Math.floor(parsedTime)}s`);
                        }
                      }
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', outline: 'none', position: 'relative', zIndex: 10 }}
                >
                  <MediaProvider>
                    {chapterTrackUrl && <Track key={chapterTrackUrl} src={chapterTrackUrl} kind="chapters" label="Chapters" type="vtt" srcLang="en-US" default />}

                    {streamData?.subtitles?.find((s: any) => s.label?.toLowerCase() === 'thumbnails' || s.kind === 'thumbnails') && (
                      <Track
                        src={streamData.subtitles.find((s: any) => s.label?.toLowerCase() === 'thumbnails' || s.kind === 'thumbnails')!.file}
                        kind="thumbnails"
                        label="Thumbnails"
                        default
                      />
                    )}

                    {streamData?.subtitles
                      ?.filter((sub: any) => sub.label?.toLowerCase() !== 'thumbnails' && sub.kind !== 'thumbnails')
                      .map((sub: any, i: number) => (
                        <Track
                          key={sub.file || String(i)}
                          src={sub.file}
                          kind="subtitles"
                          label={sub.label}
                          srcLang={sub.label.substring(0, 2).toLowerCase()}
                          default={sub.label.toLowerCase().includes('english')}
                        />
                      ))}
                  </MediaProvider>

                  <DefaultVideoLayout
                    icons={defaultLayoutIcons}
                    className={useYouTubeStylePlayer ? '!hidden' : ''}
                  />

                  {/* YouTube-Style Player Overlay */}
                  {useYouTubeStylePlayer && (
                    <div
                      className="yt-player-controls"
                      style={{ position: 'absolute', inset: 0, zIndex: 100 }}
                      onMouseEnter={() => { setYtControlsVisible(true); if (ytHideTimeout) clearTimeout(ytHideTimeout); }}
                      onMouseLeave={() => {
                        if (!ytShowSettingsMenu && !ytShowSpeedMenu) {
                          if (ytHideTimeout) clearTimeout(ytHideTimeout);
                          setYtHideTimeout(setTimeout(() => setYtControlsVisible(false), 2000));
                        }
                      }}
                      onMouseMove={(e) => {
                        setYtControlsVisible(true);
                        if (ytHideTimeout) clearTimeout(ytHideTimeout);
                        if (!ytShowSettingsMenu && !ytShowSpeedMenu) {
                          setYtHideTimeout(setTimeout(() => setYtControlsVisible(false), 2000));
                        }
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('.yt-btn') || target.closest('.yt-volume-container') || target.closest('.yt-time-display') || target.closest('.yt-progress-container') || target.closest('.yt-settings-menu')) return;

                        // Mobile tap interaction handler
                        const isTouch = window.matchMedia("(hover: none)").matches;
                        if (isTouch && !ytControlsVisible) {
                          setYtControlsVisible(true);
                          if (ytHideTimeout) clearTimeout(ytHideTimeout);
                          setYtHideTimeout(setTimeout(() => setYtControlsVisible(false), 3500));
                          return;
                        }

                        if (ytIsPlayerPaused) {
                          playerRef.current?.play();
                          setYtIsPlayerPaused(false);
                          setYtPlayIndicator('play');
                        } else {
                          playerRef.current?.pause();
                          setYtIsPlayerPaused(true);
                          setYtPlayIndicator('pause');
                        }
                        if (playIndicatorTimeoutRef.current) clearTimeout(playIndicatorTimeoutRef.current);
                        playIndicatorTimeoutRef.current = setTimeout(() => setYtPlayIndicator(null), 600);
                        setPlayPauseTrigger(t => t + 1);
                      }}
                    >
                      <AnimatePresence>
                        {ytControlsVisible && (
                          <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)', padding: '40px 24px 24px', zIndex: 105 }}
                          >
                            {(() => {
                              const rawTime = playerRef.current?.state?.currentTime || videoStateRef.current.currentTime || 0;
                              const rawDur = playerRef.current?.state?.duration || videoDuration || 1;
                              const bufferedEnd = playerRef.current?.state?.bufferedEnd || 0;
                              const currentPct = visualDragPct !== null ? visualDragPct : Math.min((rawTime / rawDur) * 100, 100);
                              const bufferedPct = Math.min((bufferedEnd / rawDur) * 100, 100);
                              const hoverSecs = (ytProgressHoverPct / 100) * rawDur;

                              const fmtT = (s: number) => {
                                const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
                                return h > 0
                                  ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
                                  : `${m}:${String(sec).padStart(2, '0')}`;
                              };

                              const dur = rawDur > 1 ? rawDur : 0;
                              const rawBreaks: number[] = [];
                              if (dur > 0) {
                                if ((streamData?.intro?.start ?? 0) > 0) rawBreaks.push(streamData!.intro!.start / dur * 100);
                                if ((streamData?.intro?.end ?? 0) > 0) rawBreaks.push(streamData!.intro!.end / dur * 100);
                                if ((streamData?.outro?.start ?? 0) > 0) rawBreaks.push(streamData!.outro!.start / dur * 100);
                              }

                              const allBreaks = [0, ...rawBreaks.filter(p => p > 0.5 && p < 99.5).sort((a, b) => a - b), 100];
                              const GAP = 0.25;
                              const segments = allBreaks.slice(0, -1).map((brk, i) => ({
                                start: brk === 0 ? 0 : brk + GAP,
                                end: allBreaks[i + 1] === 100 ? 100 : allBreaks[i + 1] - GAP,
                              })).filter(s => s.end > s.start);

                              const isActive = ytProgressHover || ytDragStateRef.current.isDragging;
                              const chapterLabel = ytProgressHover ? (
                                (() => {
                                  if (!dur) return null;
                                  const t = (ytProgressHoverPct / 100) * dur;
                                  if (streamData?.intro && t >= streamData.intro.start && t <= streamData.intro.end) return 'Intro';
                                  if (streamData?.outro && t >= streamData.outro.start && t <= streamData.outro.end) return 'Outro';
                                  return null;
                                })()
                              ) : null;

                              return (
                                <div
                                  ref={ytProgressRef}
                                  className="yt-progress-container"
                                  style={{ padding: '24px 0 8px', margin: '-10px 0 0', cursor: 'pointer', position: 'relative', touchAction: 'none' }}
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    ytDragStateRef.current.isDragging = true;
                                    ytDragStateRef.current.hasDragged = false;
                                    document.body.style.cursor = 'grabbing';
                                    document.body.style.userSelect = 'none';
                                    (e.target as Element).setPointerCapture(e.pointerId);
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setVisualDragPct(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100);
                                  }}
                                  onPointerMove={(e) => {
                                    e.stopPropagation();
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                    setYtProgressHoverPct(pct * 100);
                                    if (!ytDragStateRef.current.isDragging) return;
                                    ytDragStateRef.current.hasDragged = true;
                                    setVisualDragPct(pct * 100);
                                  }}
                                  onPointerUp={(e) => {
                                    e.stopPropagation();
                                    ytDragStateRef.current.isDragging = false;
                                    document.body.style.cursor = '';
                                    document.body.style.userSelect = '';
                                    (e.target as Element).releasePointerCapture(e.pointerId);
                                    const d = playerRef.current?.state?.duration || videoDuration || 0;
                                    if (d) {
                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                      if (playerRef.current)
                                        playerRef.current.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * d;
                                    }
                                    setVisualDragPct(null);
                                    ytDragStateRef.current.hasDragged = false;
                                  }}
                                  onPointerEnter={() => setYtProgressHover(true)}
                                  onPointerLeave={() => {
                                    if (!ytDragStateRef.current.isDragging) {
                                      setYtProgressHover(false);
                                      setYtProgressHoverPct(0);
                                    }
                                  }}
                                >
                                  <AnimatePresence>
                                    {ytProgressHover && (
                                      <div style={{ position: 'absolute', bottom: 'calc(100% - 14px + 10px)', left: `clamp(28px, ${ytProgressHoverPct}%, calc(100% - 28px))`, transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 130 }}>
                                        <motion.div
                                          key="yt-seek-tip"
                                          initial={{ opacity: 0, y: 8, scale: 0.82 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: 6, scale: 0.88 }}
                                          transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
                                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                        >
                                          <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', padding: chapterLabel ? '7px 13px 6px' : '6px 12px', borderRadius: 8, color: 'white', fontSize: 12, fontFamily: 'var(--aw-font-display)', fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', textAlign: 'center', lineHeight: 1.2 }}>
                                            {chapterLabel && (
                                              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-accent)', marginBottom: 3 }}>
                                                {chapterLabel}
                                              </div>
                                            )}
                                            {fmtT(hoverSecs)}
                                          </div>
                                        </motion.div>
                                      </div>
                                    )}
                                  </AnimatePresence>

                                  <div style={{ position: 'relative', height: 4, background: 'transparent', transformOrigin: 'center bottom', overflow: 'visible' }}>
                                    {segments.map(({ start, end }, i) => {
                                      const segW = end - start;

                                      const filled = Math.min(Math.max(currentPct - start, 0), segW);
                                      const fillPct = segW > 0 ? (filled / segW) * 100 : 0;

                                      const bufferedFilled = Math.min(Math.max(bufferedPct - start, 0), segW);
                                      const bufferedFillPct = segW > 0 ? (bufferedFilled / segW) * 100 : 0;

                                      return (
                                        <div key={i} style={{ position: 'absolute', top: 0, height: '100%', left: `${start}%`, width: `${segW}%`, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                                          {bufferedFillPct > 0 && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, width: `${bufferedFillPct}%`, height: '100%', background: 'rgba(255,255,255,0.4)', borderRadius: 2, willChange: 'width' }} />
                                          )}
                                          {fillPct > 0 && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, width: `${fillPct}%`, height: '100%', background: 'var(--aw-accent)', borderRadius: 2, willChange: 'width' }} />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div style={{ position: 'absolute', top: 26, left: `${currentPct}%`, width: 14, height: 14, borderRadius: '50%', background: 'var(--aw-accent)', transform: 'translate3d(-50%, -50%, 0)', transition: 'width 0.15s, height 0.15s', boxShadow: '0 2px 10px rgba(0,0,0,0.5)', zIndex: 20, willChange: 'left', pointerEvents: 'none' }} />                                </div>
                              );
                            })()}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {[
                                  { label: 'Play', tip: 'Play', icon: ytIsPlayerPaused ? <Play size={24} fill="white" strokeWidth={1.5} /> : <Pause size={24} fill="white" strokeWidth={1.5} />, action: (e: React.MouseEvent) => { e.stopPropagation(); if (ytIsPlayerPaused) { playerRef.current?.play(); setYtIsPlayerPaused(false); setYtPlayIndicator('play'); } else { playerRef.current?.pause(); setYtIsPlayerPaused(true); setYtPlayIndicator('pause'); } if (playIndicatorTimeoutRef.current) clearTimeout(playIndicatorTimeoutRef.current); playIndicatorTimeoutRef.current = setTimeout(() => setYtPlayIndicator(null), 600); } },
                                  { label: 'Next', tip: 'Next Episode', icon: <SkipForward size={24} fill="white" strokeWidth={1.5} />, action: (e: React.MouseEvent) => { e.stopPropagation(); playNextEpisode(); } },
                                ].map(({ label, tip, icon, action }) => (
                                  <div key={label} style={{ position: 'relative' }}>
                                    <motion.button
                                      className="yt-btn"
                                      onMouseEnter={() => { if (ytTooltipTimerRef.current) clearTimeout(ytTooltipTimerRef.current); setYtTooltip(tip); }}
                                      onMouseLeave={() => { ytTooltipTimerRef.current = setTimeout(() => setYtTooltip(null), 50); }}
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={action}
                                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.95)', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      {icon}
                                    </motion.button>
                                  </div>
                                ))}

                                <div className="yt-volume-container" onMouseEnter={() => setYtVolumeHover(true)} onMouseLeave={() => setYtVolumeHover(false)} style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                                  <motion.div
                                    animate={{ width: ytVolumeHover ? 120 : 44, opacity: 1 }}
                                    style={{ overflow: ytVolumeHover ? 'visible' : 'hidden', display: 'flex', alignItems: 'center', background: 'transparent', borderRadius: 8, padding: ytVolumeHover ? '4px 6px' : '4px 10px', cursor: 'pointer', height: 44, position: 'relative' }}
                                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                  >
                                    <motion.button
                                      className="yt-btn"
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => { setYtIsMuted(!ytIsMuted); if (playerRef.current) playerRef.current.muted = !ytIsMuted; }}
                                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.95)', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                    >
                                      {ytIsMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                                    </motion.button>
                                    {ytVolumeHover && (
                                      <div className="yt-volume-slider" style={{ position: 'relative', width: 60, height: 20, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <div style={{ position: 'absolute', width: '100%', height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
                                        <div style={{ position: 'absolute', width: `${ytVolume}%`, height: 4, background: 'var(--aw-accent)', borderRadius: 2 }} />
                                        <input
                                          type="range"
                                          min="0"
                                          max="100"
                                          value={ytVolume}
                                          onChange={(e) => { const vol = parseInt(e.target.value) / 100; setYtVolume(parseInt(e.target.value)); if (playerRef.current) playerRef.current.volume = vol; setYtIsMuted(vol === 0); }}
                                          style={{ width: '100%', height: 20, opacity: 0, cursor: 'pointer', position: 'relative', zIndex: 1 }}
                                        />
                                      </div>
                                    )}
                                  </motion.div>
                                </div>

                                <motion.button
                                  type="button"
                                  className="yt-time-display"
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setYtShowTimeLeft(v => (v + 1) % 2); }}
                                  style={{ color: 'white', fontSize: 14, fontFamily: 'var(--aw-font-display)', marginLeft: 12, fontWeight: 600, cursor: 'pointer', userSelect: 'none', padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', position: 'relative' }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <AnimatePresence>
                                    <motion.span
                                      key={ytShowTimeLeft}
                                      initial={{ y: 10, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      exit={{ y: -10, opacity: 0, position: 'absolute' }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      {ytShowTimeLeft === 0 ? (
                                        <>{formatTime(playerRef.current?.state?.currentTime || videoStateRef.current.currentTime)} / {formatTime(playerRef.current?.state?.duration || videoDuration)}</>
                                      ) : (
                                        <>-{formatTime((playerRef.current?.state?.duration || videoDuration) - (playerRef.current?.state?.currentTime || videoStateRef.current.currentTime))} / {formatTime(playerRef.current?.state?.duration || videoDuration)}</>
                                      )}
                                    </motion.span>
                                  </AnimatePresence>
                                </motion.button>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
                                {[
                                  { label: 'Settings', tip: 'Settings', icon: (active: boolean) => active ? <X size={26} strokeWidth={2.1} /> : <Settings size={26} strokeWidth={2.1} />, active: ytShowSettingsMenu, action: (e: React.MouseEvent) => { e.stopPropagation(); setYtShowSettingsMenu(!ytShowSettingsMenu); } },
                                  {
                                    label: 'Captions', tip: ytShowCaptions ? 'Captions On' : 'Captions', icon: (active: boolean) => active ? (
                                      <svg width={26} height={26} viewBox="0 0 24 24" fill="white"><rect x="3" y="5" width="18" height="14" rx="2" fill="white" /><path d="M7 15h4M15 15h2M7 11h2M13 11h4" stroke="black" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>
                                    ) : (
                                      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="2.1" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 15h4M15 15h2M7 11h2M13 11h4" /></svg>
                                    ), active: ytShowCaptions, action: (e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      const nextState = !ytShowCaptions;
                                      setYtShowCaptions(nextState);
                                      if (playerRef.current) {
                                        for (const track of playerRef.current.textTracks) {
                                          if (track.kind === 'subtitles' || track.kind === 'captions') {
                                            track.mode = nextState ? 'showing' : 'disabled';
                                          }
                                        }
                                      }
                                    }
                                  },
                                  { label: 'PiP', tip: 'Picture-in-Picture', icon: (active: boolean) => active ? <PictureInPicture2 size={26} strokeWidth={2.1} /> : <PictureInPicture size={26} strokeWidth={2.1} />, active: ytIsPiP, action: (e: React.MouseEvent) => { e.stopPropagation(); const videoEl = document.querySelector('video'); if (document.pictureInPictureElement) { document.exitPictureInPicture(); setYtIsPiP(false); } else if (document.pictureInPictureEnabled && videoEl) { videoEl.style.objectFit = 'contain'; videoEl.requestPictureInPicture().then(() => setYtIsPiP(true)).catch(() => { }); } } },
                                  { label: 'Fullscreen', tip: 'Fullscreen', icon: (active: boolean) => active ? <Minimize size={26} strokeWidth={2.1} /> : <Maximize size={26} strokeWidth={2.1} />, active: ytIsFullscreen, action: (e: React.MouseEvent) => { e.stopPropagation(); if (document.fullscreenElement) { document.exitFullscreen(); setYtIsFullscreen(false); } else if (videoContainerRef.current) { videoContainerRef.current.requestFullscreen(); setYtIsFullscreen(true); } } },
                                ].map(({ label, tip, icon, active, action }) => (
                                  <div key={label} style={{ position: 'relative' }}>
                                    <motion.button
                                      className={`yt-btn ${label === 'Settings' ? 'yt-settings-btn' : ''}`}
                                      onMouseEnter={() => {
                                        if (ytTooltipTimerRef.current) clearTimeout(ytTooltipTimerRef.current);
                                        if (label === 'Settings' && ytShowSettingsMenu) return;
                                        setYtTooltip(tip);
                                      }}
                                      onMouseLeave={() => { ytTooltipTimerRef.current = setTimeout(() => setYtTooltip(null), 50); }}
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={action}
                                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.95)', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      {icon(active)}
                                    </motion.button>
                                  </div>
                                ))}

                                <AnimatePresence>
                                  {ytShowSettingsMenu && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                                      className="yt-settings-menu"
                                      style={{ position: 'absolute', bottom: 'calc(100% + 16px)', right: 8, background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(16px) saturate(120%)', border: '1px solid var(--aw-border)', borderRadius: 12, width: 280, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <style>{`
                                        .yt-settings-slider::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; background: white; border-radius: 50%; cursor: pointer; }
                                        .yt-settings-slider::-moz-range-thumb { width: 12px; height: 12px; background: white; border-radius: 50%; cursor: pointer; border: none; }
                                      `}</style>
                                      <AnimatePresence mode="wait">
                                        {ytSettingsPage === 'main' && (
                                          <motion.div key="main" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.1, ease: 'easeOut' }} style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
                                            <motion.button onClick={() => setYtSettingsPage('playback')} whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><PlayCircle size={16} style={{ color: 'rgba(255,255,255,0.7)' }} /> Playback</div>
                                              <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                                            </motion.button>
                                            <motion.button onClick={() => setYtSettingsPage('visuals')} whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><MonitorPlay size={16} style={{ color: 'rgba(255,255,255,0.7)' }} /> Visual Experience</div>
                                              <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                                            </motion.button>
                                            <motion.button onClick={() => setYtSettingsPage('accessibility')} whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Accessibility size={16} style={{ color: 'rgba(255,255,255,0.7)' }} /> Accessibility</div>
                                              <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                                            </motion.button>
                                          </motion.div>
                                        )}

                                        {ytSettingsPage === 'playback' && (
                                          <motion.div key="playback" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.1, ease: 'easeOut' }} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 4px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                                              <motion.button whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }} onClick={() => setYtSettingsPage('main')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} /></motion.button>
                                              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--aw-font-display)', letterSpacing: '0.02em' }}>Playback Automation</span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden' }}>
                                              {[
                                                { label: 'Auto-Play', state: autoPlay, setter: setAutoPlay },
                                                { label: 'Auto-Next', state: autoNext, setter: setAutoNext },
                                                { label: 'Auto-Skip', state: autoSkip, setter: setAutoSkip },
                                                { label: 'Skip Filler Episodes', state: ytSkipFillers, setter: setYtSkipFillers },
                                              ].map((item, idx) => (
                                                <motion.div
                                                  key={item.label}
                                                  role="button"
                                                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '12px 16px',
                                                    fontSize: 13,
                                                    fontWeight: 500,
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                                                  }}
                                                  onClick={() => item.setter(!item.state)}
                                                >
                                                  <span style={{ opacity: 0.85 }}>{item.label}</span>
                                                  <div style={{ width: 36, height: 20, background: item.state ? 'var(--aw-accent)' : 'rgba(255,255,255,0.15)', borderRadius: 20, position: 'relative', transition: 'background 0.3s' }}>
                                                    <div style={{ position: 'absolute', top: 2, left: item.state ? 18 : 2, width: 16, height: 16, background: 'white', borderRadius: '50%', transition: 'left 0.3s, transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transform: item.state ? 'scale(1.1)' : 'scale(1)' }} />
                                                  </div>
                                                </motion.div>
                                              ))}
                                            </div>
                                          </motion.div>
                                        )}

                                        {ytSettingsPage === 'visuals' && (
                                          <motion.div key="visuals" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.1, ease: 'easeOut' }} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 4px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                                              <motion.button whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }} onClick={() => setYtSettingsPage('main')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} /></motion.button>
                                              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--aw-font-display)', letterSpacing: '0.02em' }}>Visual Experience</span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden' }}>
                                              <motion.div
                                                role="button"
                                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  padding: '12px 16px',
                                                  fontSize: 13,
                                                  fontWeight: 500,
                                                  color: 'white',
                                                  cursor: 'pointer',
                                                  borderBottom: ytAmbientMode ? '1px solid rgba(255,255,255,0.04)' : 'none'
                                                }}
                                                onClick={() => setYtAmbientMode(!ytAmbientMode)}
                                              >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                  <MonitorPlay size={16} style={{ color: ytAmbientMode ? 'var(--aw-accent)' : 'rgba(255,255,255,0.4)' }} />
                                                  <span style={{ opacity: 0.85 }}>Ambient Mode</span>
                                                </div>
                                                <div style={{ width: 36, height: 20, background: ytAmbientMode ? 'var(--aw-accent)' : 'rgba(255,255,255,0.15)', borderRadius: 20, position: 'relative', transition: 'background 0.3s' }}>
                                                  <div style={{ position: 'absolute', top: 2, left: ytAmbientMode ? 18 : 2, width: 16, height: 16, background: 'white', borderRadius: '50%', transition: 'left 0.3s, transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transform: ytAmbientMode ? 'scale(1.1)' : 'scale(1)' }} />
                                                </div>
                                              </motion.div>

                                              {ytAmbientMode && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ padding: '16px' }}>
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 11, fontWeight: 700, fontFamily: 'var(--aw-font-display)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                                                    <span>Glow Intensity</span>
                                                    <span style={{ color: 'var(--aw-accent)' }}>{ytAmbientOpacity}%</span>
                                                  </div>
                                                  <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={ytAmbientOpacity}
                                                    onChange={e => setYtAmbientOpacity(Number(e.target.value))}
                                                    style={{
                                                      width: '100%',
                                                      height: 4,
                                                      appearance: 'none',
                                                      background: `linear-gradient(to right, var(--aw-accent) ${ytAmbientOpacity}%, rgba(255,255,255,0.1) ${ytAmbientOpacity}%)`,
                                                      borderRadius: 2,
                                                      outline: 'none',
                                                      cursor: 'pointer'
                                                    }}
                                                    className="yt-settings-slider"
                                                  />
                                                </motion.div>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}

                                        {ytSettingsPage === 'accessibility' && (
                                          <motion.div key="accessibility" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.1, ease: 'easeOut' }} style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px 12px', borderBottom: '1px solid var(--aw-border)', marginBottom: 8 }}>
                                              <motion.button whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }} onClick={() => setYtSettingsPage('main')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} /></motion.button>
                                              <span style={{ fontSize: 14, fontWeight: 600 }}>Accessibility</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', margin: '0 12px' }}>
                                              <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, fontWeight: 700, fontFamily: 'var(--aw-font-display)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                                                  <span>Volume Boost</span>
                                                  <span style={{ color: 'var(--aw-accent)' }}>{ytVolumeBoost}%</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                  <VolumeX size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                                  <input type="range" min="0" max="100" value={ytVolumeBoost} onChange={e => setYtVolumeBoost(Number(e.target.value))} style={{ flex: 1, height: 4, appearance: 'none', background: `linear-gradient(to right, var(--aw-accent) ${ytVolumeBoost}%, rgba(255,255,255,0.1) ${ytVolumeBoost}%)`, borderRadius: 2, outline: 'none', cursor: 'pointer' }} className="yt-settings-slider" />
                                                  <Volume2 size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                                </div>
                                              </div>
                                              <div style={{ padding: '12px 16px 16px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, fontWeight: 700, fontFamily: 'var(--aw-font-display)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                                                  <span>Playback Speed</span>
                                                  <span style={{ color: 'var(--aw-accent)' }}>{ytPlaybackSpeed.toFixed(2)}x</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                  <Rewind size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                                  <input type="range" min="0.25" max="2" step="0.25" value={ytPlaybackSpeed} onChange={e => {
                                                    const newSpeed = Number(e.target.value);
                                                    setYtPlaybackSpeed(newSpeed);
                                                    if (playerRef.current) {
                                                      playerRef.current.playbackRate = newSpeed;
                                                      normalSpeedRef.current = newSpeed;
                                                    }
                                                  }} style={{ flex: 1, height: 4, appearance: 'none', background: `linear-gradient(to right, var(--aw-accent) ${((ytPlaybackSpeed - 0.25) / 1.75) * 100}%, rgba(255,255,255,0.1) ${((ytPlaybackSpeed - 0.25) / 1.75) * 100}%)`, borderRadius: 2, outline: 'none', cursor: 'pointer' }} className="yt-settings-slider" />
                                                  <FastForward size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                                </div>
                                              </div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <style>{`
                    .yt-volume-slider input::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--aw-accent); cursor: pointer; }
                    .yt-volume-slider input::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--aw-accent); cursor: pointer; border: none; }
                  `}</style>

                  <AnimatePresence>
                    {isSpeeding && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        style={{ position: 'absolute', top: 56, left: 0, right: 0, margin: '0 auto', width: 'fit-content', zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'var(--aw-font-display)', pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <Zap size={16} fill="var(--aw-accent)" color="var(--aw-accent)" />
                        <span>2x Speed</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {ytPlayIndicator && (
                      <motion.div
                        key={`center-${playPauseTrigger}-${ytPlayIndicator}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.15 }}
                        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, pointerEvents: 'none' }}
                      >
                        <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 50, width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {ytPlayIndicator === 'play' ? <Play size={32} fill="white" color="white" /> : <Pause size={32} fill="white" color="white" />}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {seekIndicator && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: seekIndicator === 'rewind' ? -20 : 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        style={{ position: 'absolute', top: '50%', marginTop: -40, left: seekIndicator === 'rewind' ? '10%' : 'auto', right: seekIndicator === 'forward' ? '10%' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'white', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '14px 18px', zIndex: 150, pointerEvents: 'none' }}
                      >
                        {currentEpData?.image && (
                          <div style={{ width: 80, height: 45, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
                            <img src={currentEpData.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {seekIndicator === 'rewind' ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
                          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>{seekIndicator === 'rewind' ? '-10s' : '+10s'}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {toastMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        style={{ position: 'absolute', top: 56, left: 0, right: 0, margin: '0 auto', width: 'fit-content', zIndex: 60, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 8, padding: toastAction ? '8px 12px' : '8px 16px', fontSize: 14, fontWeight: 600, fontFamily: 'var(--aw-font-display)', pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <Play size={14} fill="var(--aw-accent)" color="var(--aw-accent)" />
                        <span>{toastMessage}</span>
                        {toastAction && toastActionLabel && (
                          <button onClick={toastAction} style={{ background: 'var(--aw-accent)', color: '#04110d', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {toastActionLabel}
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                </MediaPlayer>
              )}
            </motion.div>
          </div>

          <div className="modern-card watch-description-frame" style={{ position: 'relative', zIndex: 100, padding: '24px 28px' }}>
            <div className="watch-desc-header" style={{ position: 'relative', zIndex: 100 }}>
              <h1 className="aw-title-text">
                <span className="aw-title-text-main">{currentEpData?.title || 'Loading...'}</span>
                <span style={{ color: 'var(--aw-accent)', opacity: 0.6, fontSize: '0.8em' }}>•</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: '0.85em', whiteSpace: 'nowrap' }}>Episode {currentEpData?.number || '?'}</span>
              </h1>
              <div className="watch-controls">

                {/* Group 1: Action Tools */}
                <motion.div className="watch-control-group">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    title="Report Issue"
                    className="watch-icon-button"
                    onClick={() => window.open('https://github.com/anomalyco/opencode/issues', '_blank')}
                  >
                    <Flag className="watch-control-icon" size={16} />
                  </motion.button>
                  <div className="watch-control-divider" />
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    title="Download Episode"
                    className="watch-icon-button"
                    onClick={() => { if (activeStream?.url) window.open(activeStream.url, '_blank'); }}
                  >
                    <Download className="watch-control-icon" size={16} />
                  </motion.button>
                </motion.div>

                {/* Group 2: Playback Settings */}
                <motion.div className="watch-control-group playback">
                  <motion.div
                    onClick={() => setPlayerMode(p => p === 'internal' ? 'external' : 'internal')}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    className="watch-control-segment"
                  >
                    <MonitorPlay className="watch-control-icon" size={14} />
                    <span className="watch-control-label">{playerMode}</span>
                    <motion.div
                      className="watch-control-chevrons"
                      animate={{ rotate: playerMode === 'internal' ? 0 : 180 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    >
                      <ChevronUp size={8} strokeWidth={3} />
                      <ChevronDown size={8} strokeWidth={3} />
                    </motion.div>
                  </motion.div>
                  <div className="watch-control-divider" />
                  <motion.div
                    onClick={() => { const nextLang = (category || 'sub') === 'sub' ? 'dub' : 'sub'; const isAvailable = streamData?.sources?.some(s => s.type === nextLang) || (nextLang === 'sub'); if (isAvailable) navigate(`/watch/${urlSlug}/${provider || 'default'}/${nextLang}/${episodeId}`); }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    className="watch-control-segment"
                  >
                    <Languages className="watch-control-icon" size={14} />
                    <span className="watch-control-label">{category || 'sub'}</span>
                    <motion.div
                      className="watch-control-chevrons"
                      animate={{ rotate: (category || 'sub') === 'sub' ? 0 : 180 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    >
                      <ChevronUp size={8} strokeWidth={3} />
                      <ChevronDown size={8} strokeWidth={3} />
                    </motion.div>
                  </motion.div>
                </motion.div>

              </div>
            </div>
            {/* Synopsis */}
            <div style={{ position: 'relative' }}>
              <motion.div
                initial={false}
                animate={{ height: isDescExpanded ? 'auto' : 80 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <p className="watch-description-copy" style={{ margin: 0, fontSize: 15, lineHeight: '1.8', color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
                  {(currentEpData?.description || animeInfo?.description)?.replace(/<[^>]*>/g, '') || 'No description available.'}
                </p>
                {animeInfo && (
                  <motion.div
                    initial={false}
                    animate={{ opacity: isDescExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2, delay: isDescExpanded ? 0.2 : 0 }}
                    style={{ display: 'flex', gap: 14, marginTop: 18, marginBottom: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}
                  >
                    <img src={animeInfo.image || animeInfo.coverImage?.large || ''} alt="" style={{ width: 50, height: 70, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: 'rgba(255,255,255,0.03)' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontFamily: 'var(--aw-font-display)', fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</p>
                      {animeInfo.format && <p style={{ margin: '3px 0 0', fontSize: 12, fontFamily: 'var(--aw-font-display)', fontWeight: 500, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>{animeInfo.format}</p>}
                    </div>
                  </motion.div>
                )}
              </motion.div>
              <motion.button whileHover={{ color: 'var(--aw-accent)' }} onClick={() => setIsDescExpanded(v => !v)} className="watch-description-toggle" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: '14px 0 0', display: 'block', transition: 'color 0.2s', fontFamily: 'var(--aw-font-display)' }}>
                {isDescExpanded ? 'Show less' : 'Show more'}
              </motion.button>
            </div>
          </div>
        </div>


        <aside ref={sidebarRef} className={`aw-sidebar sidebar-enter ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ zIndex: 40 }}>
          <div style={{ position: 'relative', zIndex: 50, padding: '18px 20px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--aw-border)', flexShrink: 0, overflow: 'visible' }}>
            <div className="anim-fade-in-down" style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ position: 'relative' }} ref={seasonsDropdownRef}>
                <button onClick={() => { if (navTabs.length > 1) { setIsSeasonsDropdownOpen(p => !p); setIsOptionsMenuOpen(false); } }} className={navTabs.length > 1 ? "aw-action-hover" : ""} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: '4px 8px', marginLeft: '-8px', borderRadius: 8, color: 'white', cursor: navTabs.length > 1 ? 'pointer' : 'default', outline: 'none' }}>
                  <h3 style={{ fontFamily: 'var(--aw-font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '0.02em', margin: 0, lineHeight: 1 }}>
                    {navTabs.length > 1 ? (navTabs.find(t => t.active)?.displayLabel || 'Season') : 'Episodes'}
                    {navTabs.length <= 1 && totalEpisodes > 0 && (
                      <span style={{ fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>({totalEpisodes})</span>
                    )}
                  </h3>
                  {navTabs.length > 1 && <ChevronDown size={18} style={{ opacity: 0.8, transform: isSeasonsDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />}
                </button>
                <AnimatePresence>
                  {isSeasonsDropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: -10, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }} transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }} style={{ position: 'absolute', top: '100%', left: 0, marginTop: 12, width: 280, background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(20px)', borderRadius: 12, padding: 8, zIndex: 100, boxShadow: '0 20px 40px -8px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {navTabs.map((tab, i) => (
                        <motion.button key={tab.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }} onClick={() => { setIsSeasonsDropdownOpen(false); navigate(`/watch/${tab.slug}/${provider || 'default'}/${category || 'sub'}/1`); }} style={{ position: 'relative', width: '100%', textAlign: 'left', padding: '12px 14px', background: tab.active ? 'color-mix(in srgb, var(--aw-accent) 15%, transparent)' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, transition: 'background 0.2s', overflow: 'visible' }} onMouseEnter={e => !tab.active && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')} onMouseLeave={e => !tab.active && (e.currentTarget.style.background = 'transparent')}>
                          <span style={{ fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: tab.active ? 'var(--aw-accent)' : 'rgba(255,255,255,0.5)' }}>{tab.displayLabel}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: tab.active ? 'white' : 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%' }}>{tab.title}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.6)', position: 'relative' }} ref={optionsMenuRef}>
                <button title="Options" onClick={() => { setIsOptionsMenuOpen(o => !o); setIsSeasonsDropdownOpen(false); }} className="aw-action-hover" style={{ background: isOptionsMenuOpen ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isOptionsMenuOpen ? 'white' : 'inherit', transition: 'all 0.2s' }}><MoreVertical size={16} /></button>
                <button title={isSidebarCollapsed ? 'Show episodes' : 'Hide episodes'} onClick={() => setIsSidebarCollapsed(p => !p)} className="aw-action-hover" style={{ background: 'transparent', border: 'none', padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'inherit' }}><ChevronDown size={16} style={{ transform: isSidebarCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }} /></button>
                <AnimatePresence>
                  {isOptionsMenuOpen && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -5 }} transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }} style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 200, background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 6, zIndex: 200, boxShadow: '0 20px 40px -8px rgba(0,0,0,0.8)' }}>
                      {[
                        { label: episodeSortOrder === 'asc' ? 'Sort: Newest first' : 'Sort: Oldest first', action: () => setEpisodeSortOrder(o => o === 'asc' ? 'desc' : 'asc') },
                        { label: 'Clear search', action: () => setEpSearchQuery('') },
                      ].map(item => (
                        <button key={item.label} onClick={() => { item.action(); setIsOptionsMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'var(--aw-font-display)', fontWeight: 600, letterSpacing: '0.03em', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}>{item.label}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="anim-fade-in-up anim-delay-1" style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 10, alignItems: 'center' }}>
              <motion.div style={{ position: 'relative', flex: 1 }}>
                {needsRangePicker && (
                  <div ref={rangeDropdownRef} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => setIsRangeDropdownOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: isRangeDropdownOpen ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: isRangeDropdownOpen ? 'white' : 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s', lineHeight: 1, letterSpacing: '0.03em' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={e => { if (!isRangeDropdownOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; } }}>
                      {episodeRangeIndex * EP_RANGE_SIZE + 1}–{Math.min((episodeRangeIndex + 1) * EP_RANGE_SIZE, maxEpNumber)}
                      <motion.span animate={{ rotate: isRangeDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex', opacity: 0.55 }}><ChevronDown size={11} /></motion.span>
                    </button>
                    <AnimatePresence>
                      {isRangeDropdownOpen && (
                        <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.15 }} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, marginTop: 4, minWidth: 160, background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.8)' }}>
                          <div className="hide-scroll-native" style={{ maxHeight: 240, overflowY: 'auto', padding: 4 }}>
                            {Array.from({ length: totalRanges }, (_, i) => {
                              const startNum = i * EP_RANGE_SIZE + 1;
                              const endNum = Math.min((i + 1) * EP_RANGE_SIZE, maxEpNumber);
                              const isActive = episodeRangeIndex === i;
                              return (
                                <button key={i} onClick={() => { setEpisodeRangeIndex(i); setIsRangeDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: isActive ? 'white' : 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'var(--aw-font-display)', fontWeight: isActive ? 700 : 500, textAlign: 'left', whiteSpace: 'nowrap', transition: 'all 0.15s' }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                                  {startNum}–{endNum}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 2, display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--aw-muted)' }}>
                  <Search size={14} />
                </div>
                <motion.input type="text" className="ep-search-input" placeholder="Search" value={epSearchQuery} onChange={e => setEpSearchQuery(e.target.value)} whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.18)', boxShadow: '0 8px 25px -8px rgba(0,0,0,0.5)' }} whileFocus={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)', boxShadow: '0 8px 25px -8px rgba(0,0,0,0.5)' }} transition={{ duration: 0.2, ease: 'easeOut' }} style={{ width: '100%', height: 38, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: needsRangePicker ? '0 90px 0 32px' : '0 14px 0 32px', color: 'var(--aw-text)', fontSize: 12, fontFamily: 'var(--aw-font-body)', fontWeight: 400, outline: 'none', boxSizing: 'border-box' }} />
              </motion.div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
                <motion.button onClick={() => setEpisodeViewMode(m => m === 'thumbnail' ? 'list' : m === 'list' ? 'grid' : 'thumbnail')} title={`View: ${episodeViewMode} (click to cycle)`} whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.18)', boxShadow: '0 8px 25px -8px rgba(0,0,0,0.5)', color: '#fff', y: -1 }} whileTap={{ scale: 0.92, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, flexShrink: 0, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: 'var(--aw-muted)', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={episodeViewMode} initial={{ opacity: 0, scale: 0.6, rotate: -15 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.6, rotate: 15 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                      {episodeViewMode === 'thumbnail' ? <Image size={14} /> : episodeViewMode === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
                <motion.button onClick={() => setEpisodeSortOrder((current) => current === 'desc' ? 'asc' : 'desc')} title="Sort Episodes" whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.18)', boxShadow: '0 8px 25px -8px rgba(0,0,0,0.5)', color: '#fff', y: -1 }} whileTap={{ scale: 0.92, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, flexShrink: 0, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: 'var(--aw-muted)', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={episodeSortOrder} initial={{ opacity: 0, rotate: -15, scale: 0.6 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 15, scale: 0.6 }} transition={{ duration: 0.15 }}>
                      {episodeSortOrder === 'desc' ? <ArrowDown01 size={14} /> : <ArrowUp01 size={14} />}
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateRows: isSidebarCollapsed ? '0fr' : '1fr', transition: 'grid-template-rows 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease', opacity: isSidebarCollapsed ? 0 : 1, flex: 1, minHeight: 0 }}>
            <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, height: '100%' }}>

              {/* ── EPISODE LIST ─────────────────────────────── */}
              <CustomScrollArea innerRef={epListScrollRef} style={{ flex: 1, height: '100%' }}>
                <AnimatePresence mode="wait">
                  {loadingEpisodes ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: 'flex', flexDirection: 'column', padding: '6px 10px', gap: 8 }}
                    >
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0.6 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: i * 0.1 }}
                          style={{
                            display: 'flex',
                            gap: 12,
                            padding: 10,
                            borderRadius: 12,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            alignItems: 'center',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, minWidth: 24, height: 64, flexShrink: 0 }}>
                            <div className="skeleton-wave" style={{ width: 14, height: 12, borderRadius: 3 }} />
                          </div>
                          <div style={{ width: 110, height: 64, borderRadius: 10, flexShrink: 0, background: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
                            <motion.div
                              animate={{ x: ['-100%', '100%'] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
                              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
                            />
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                            <div style={{ height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.05)', width: '65%', position: 'relative', overflow: 'hidden' }}>
                              <motion.div
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 + 0.05 }}
                                style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }}
                              />
                            </div>
                            <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.035)', width: '90%', position: 'relative', overflow: 'hidden' }}>
                              <motion.div
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 + 0.1 }}
                                style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : rangedEpisodes.length > 0 ? (
                    <motion.div
                      key="loaded"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* ── GRID VIEW ─────────────────────────────── */}
                      {episodeViewMode === 'grid' && (
                        <div className="ep-grid-wrap">
                          {rangedEpisodes.map((ep, idx) => {
                            if (ep._unreleased) {
                              return (
                                <div key={`grid-${ep.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--aw-font-display)', fontSize: 13, fontWeight: 600, opacity: 0.8, cursor: 'default' }} title={`Episode ${ep.number} - Unreleased`}>
                                  {ep.number || '?'}
                                </div>
                              );
                            }
                            const isActive = (extractSlug(ep.id) === episodeId || String(ep.number) === episodeId?.match(/\d+$/)?.[0]);
                            return (
                              <motion.button
                                key={`grid-${ep.id}`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.25, delay: Math.min(idx * 0.015, 0.4), ease: [0.23, 1, 0.32, 1] }}
                                ref={isActive ? (activeEpRef as any) : null}
                                onClick={() => handleEpisodeClick(ep.id)}
                                title={ep.title || `Episode ${ep.number}`}
                                className={`ep-grid-cell${isActive ? ' active' : ''}`}
                              >
                                {isActive ? (
                                  <div className="ep-playing-eq" style={{ scale: 0.9 }}><span></span><span></span><span></span></div>
                                ) : (
                                  ep.number || '?'
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}

                      {/* ── LIST VIEW ─────────────────────────────── */}
                      {episodeViewMode === 'list' && (
                        <div style={{ paddingBottom: 8 }}>
                          {rangedEpisodes.map((ep, idx) => {
                            if (ep._unreleased) {
                              const nextAirDate = animeInfo?.nextAiringEpisode;
                              if (!nextAirDate) return null;
                              const t = nextAirDate.timeUntilAiring;
                              const d = Math.floor(t / 86400);
                              const h = Math.floor((t % 86400) / 3600);
                              const m = Math.floor((t % 3600) / 60);
                              let countdown = '';
                              if (d > 0) countdown += `${d}d `;
                              if (h > 0 || d > 0) countdown += `${h}h `;
                              countdown += `${m}m`;
                              const dateStr = nextAirDate.airingAt ? new Date(nextAirDate.airingAt * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                              return (
                                <div key={`list-${ep.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: 0.75, cursor: 'default' }}>
                                  <div style={{ width: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: 'var(--aw-font-display)', fontWeight: 500, color: 'rgba(255,255,255,0.2)' }}>
                                    {nextAirDate.episode || '–'}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 13, fontFamily: 'var(--aw-font-display)', fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>
                                      Episode {nextAirDate.episode} — Unreleased
                                    </p>
                                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--aw-font-body)' }}>
                                      {t ? `Airing in ${countdown}` : 'Airing soon'}{dateStr ? ` · ${dateStr}` : ''}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            const isActive = (extractSlug(ep.id) === episodeId || String(ep.number) === episodeId?.match(/\d+$/)?.[0]);
                            return (
                              <div
                                key={`list-${ep.id}`}
                                ref={isActive ? activeEpRef : null}
                                onClick={() => handleEpisodeClick(ep.id)}
                                className={`ep-list-item${isActive ? ' active' : ''}`}
                              >
                                {isActive && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, background: 'linear-gradient(180deg, var(--aw-accent), var(--aw-accent-2))', borderRadius: '0 3px 3px 0', boxShadow: '0 0 10px var(--aw-accent)' }} />}
                                <div style={{ width: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: 'var(--aw-font-display)', fontWeight: isActive ? 800 : 500, color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.22)' }}>
                                  {isActive ? <div className="ep-playing-eq" style={{ scale: 0.9 }}><span></span><span></span><span></span></div> : (ep.number || '–')}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: 13, fontFamily: 'var(--aw-font-display)', fontWeight: isActive ? 700 : 500, color: isActive ? 'white' : 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ep.title || `Episode ${ep.number}`}
                                  </p>
                                  {ep.airDate && (
                                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.32)', fontFamily: 'var(--aw-font-body)' }}>{formatEpisodeDate(ep.airDate)}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── THUMBNAIL VIEW (original) ──────────────── */}
                      {episodeViewMode === 'thumbnail' && (
                        <div style={{ paddingBottom: 20 }}>
                          {rangedEpisodes.map((ep, idx) => {
                            if (ep._unreleased) {
                              const nextAirDate = animeInfo?.nextAiringEpisode;
                              if (!nextAirDate) return null;
                              const t = nextAirDate.timeUntilAiring;
                              const d = Math.floor(t / 86400);
                              const h = Math.floor((t % 86400) / 3600);
                              const m = Math.floor((t % 3600) / 60);
                              let countdown = '';
                              if (d > 0) countdown += `${d}d `;
                              if (h > 0 || d > 0) countdown += `${h}h `;
                              countdown += `${m}m`;
                              const dateStr = nextAirDate.airingAt ? new Date(nextAirDate.airingAt * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                              return (
                                <div key={`${episodeSortOrder}-${ep.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: 0.75, cursor: 'default' }}>
                                  <div style={{ width: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: 'var(--aw-font-display)', fontWeight: 500, color: 'rgba(255,255,255,0.2)' }}>
                                    {nextAirDate.episode || '?'}
                                  </div>
                                  <div style={{ width: 110, height: 64, flexShrink: 0, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock size={18} style={{ color: 'rgba(255,255,255,0.08)' }} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 14, fontFamily: 'var(--aw-font-display)', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
                                      Episode {nextAirDate.episode} — Unreleased
                                    </p>
                                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--aw-font-body)' }}>
                                      {t ? `Airing in ${countdown}` : 'Airing soon'}{dateStr ? ` · ${dateStr}` : ''}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            const isActive = (extractSlug(ep.id) === episodeId || String(ep.number) === episodeId?.match(/\d+$/)?.[0]);
                            return (
                              <div
                                key={`${episodeSortOrder}-${ep.id}`}
                                ref={isActive ? activeEpRef : null}
                                onClick={() => handleEpisodeClick(ep.id)}
                                className={`ep-item ${isActive ? 'ep-active-hover' : 'ep-item-hover'}`}
                                style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                              >
                                {isActive && <div className="ep-active-marker" style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 4, background: 'linear-gradient(180deg, var(--aw-accent), var(--aw-accent-2))', borderRadius: '0 4px 4px 0', boxShadow: '0 0 15px var(--aw-accent)' }} />}
                                <div style={{ width: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: 'var(--aw-font-display)', fontWeight: isActive ? 800 : 500, color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }}>
                                  {isActive ? (
                                    <div className="ep-playing-eq" style={{ scale: 1.2 }}><span></span><span></span><span></span></div>
                                  ) : (
                                    ep.number || '–'
                                  )}
                                </div>
                                <div className="ep-thumb-container">
                                  <img src={ep.image || 'https://via.placeholder.com/128x72/0d0d1a/3f3f56?text=–'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isActive ? 1 : 0.8, transition: 'opacity 0.3s' }} onError={(e: any) => { e.currentTarget.src = 'https://via.placeholder.com/128x72/0d0d1a/3f3f56?text=–'; }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                    <h4 style={{ margin: 0, fontSize: 14, fontFamily: 'var(--aw-font-display)', fontWeight: isActive ? 700 : 600, color: isActive ? 'white' : 'rgba(255,255,255,0.85)', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.3s' }}>{ep.title || `Episode ${ep.number || '?'}`}</h4>
                                  </div>
                                  <p style={{ margin: 0, fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'color 0.3s' }}>{ep.description || `Episode ${ep.number}. ${ep.airDate ? `Aired ${formatEpisodeDate(ep.airDate)}.` : 'No synopsis available.'}`}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="anim-fade-in-up" style={{ padding: '48px 0', textAlign: 'center' }}>
                        <AlertCircle size={22} style={{ color: 'var(--aw-muted)', margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                        <p style={{ fontFamily: 'var(--aw-font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--aw-muted)' }}>No Matches</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CustomScrollArea>
            </div>
          </div>

        </aside>
      </motion.div>
    </div>
  );
};

export default AnimeWatch;