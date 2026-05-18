import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DesktopTopbar from './desktop/DesktopTopbar';
import MobileTopbar from './mobile/MobileTopbar';
import { SearchResult } from './shared/topbarShared';
import { fetchAnimeSearch, getAnimeDisplayTitle, getAnimeScore } from '../utils/animeApi';
import { isAllowedSeriesType } from '../utils/contentFilters';
import { useContentMode } from '../utils/contentMode';
import { createSlug } from '../utils/slug';

interface AppTopbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit?: (query: string) => void;
}

const AppTopbar: React.FC<AppTopbarProps> = ({ searchQuery, onSearchQueryChange, onSearchSubmit }) => {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);
  const { isAnimeMode } = useContentMode();

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setShowSearch(false);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        if (isAnimeMode) {
          const data = await fetchAnimeSearch(trimmedQuery, 6);
          if (abortController.signal.aborted) return;

          const showNSFW = localStorage.getItem('nsfwShowContent') === 'true';
          const mapped = Array.isArray(data.results)
            ? data.results
                .filter((entry: any) => showNSFW || (!entry.isAdult && !(entry.genres || []).includes('Hentai')))
                .map((entry: any) => ({
                id: entry.id,
                mal_id: entry.idMal || entry.id,
                title: getAnimeDisplayTitle(entry.title),
                score: getAnimeScore(entry),
                type: entry.format || 'ANIME',
                status: entry.status || 'UNKNOWN',
                images: {
                  jpg: {
                    image_url: entry.coverImage?.large || entry.coverImage?.extraLarge || '',
                  },
                },
              }))
            : [];

          setSearchResults(mapped);
        } else {
          const response = await fetch(
            `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(trimmedQuery)}&limit=6`,
            { signal: abortController.signal }
          );

          const data = await response.json();
          if (abortController.signal.aborted) return;

          setSearchResults(
            Array.isArray(data.data)
              ? data.data
                  .filter((entry: SearchResult) => isAllowedSeriesType(entry.type))
                  .map((entry: SearchResult) => ({
                    ...entry,
                    id: entry.mal_id,
                  }))
              : []
          );
        }

        setShowSearch(true);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setSearchResults([]);
          setShowSearch(false);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [isAnimeMode, searchQuery]);

  useEffect(() => {
    if (showSearch) {
      setSearchMounted(true);
      return;
    }
    if (!searchMounted) return;

    const timeoutId = window.setTimeout(() => setSearchMounted(false), 220);
    return () => window.clearTimeout(timeoutId);
  }, [showSearch, searchMounted]);

  const clearSearch = () => {
    onSearchQueryChange('');
    setSearchResults([]);
    setShowSearch(false);
    setIsSearching(false);
  };

  const submitSearch = (rawQuery: string) => {
    const trimmedQuery = rawQuery.trim();
    setShowSearch(false);

    if (onSearchSubmit) {
      onSearchSubmit(trimmedQuery);
      return;
    }

    if (!trimmedQuery) return;
    navigate(`/browse?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const openResult = (result: SearchResult) => {
    const title = typeof result.title === 'string' ? result.title : '';
    const slug = title
      ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : String(result.id);
    clearSearch(); // clears query → prevents debounce from reopening dropdown
    navigate(isAnimeMode ? `/watch/${slug}` : `/read/${createSlug(result.title)}`);
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-[100] w-full border-b border-white/[0.06] bg-black/60 backdrop-blur-xl saturate-[160%] shadow-[0_4px_30px_rgba(0,0,0,0.3)] transition-all duration-300"
    >
      <MobileTopbar
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        clearSearch={clearSearch}
        submitSearch={submitSearch}
        openResult={openResult}
        isSearching={isSearching}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        searchMounted={searchMounted}
        searchResults={searchResults}
      />

      <DesktopTopbar
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        clearSearch={clearSearch}
        submitSearch={submitSearch}
        openResult={openResult}
        isSearching={isSearching}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        searchResults={searchResults}
      />
    </header>
  );
};

export default AppTopbar;
