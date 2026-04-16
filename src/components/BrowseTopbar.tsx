import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DesktopTopbar from './desktop/DesktopTopbar';
import MobileTopbar from './mobile/MobileTopbar';
import { SearchResult } from './shared/topbarShared';
import { isAllowedSeriesType } from '../utils/contentFilters';

interface AppTopbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit?: (query: string) => void;
}

const AppTopbar: React.FC<AppTopbarProps> = ({ searchQuery, onSearchQueryChange, onSearchSubmit }) => {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);
  
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);

  // Close search when clicking outside the topbar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // API Fetch with AbortController to prevent race conditions
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
        const response = await fetch(
          `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(trimmedQuery)}&limit=6`,
          { signal: abortController.signal }
        );
        
        const data = await response.json();
        
        setSearchResults(
          Array.isArray(data.data)
            ? data.data.filter((entry: SearchResult) => isAllowedSeriesType(entry.type))
            : []
        );
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
  }, [searchQuery]);

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

  const openManga = (mangaId: number) => {
    setShowSearch(false);
    navigate(`/read/${mangaId}`);
  };

  return (
    <header 
      ref={headerRef}
      className="sticky top-0 z-[100] w-full border-b border-white/5 bg-[var(--app-bg)] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)]"
    >
      <MobileTopbar
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        clearSearch={clearSearch}
        submitSearch={submitSearch}
        openManga={openManga}
        isSearching={isSearching}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        searchMounted={searchMounted}
        searchResults={searchResults}
      />

      <DesktopTopbar
      />
    </header>
  );
};

export default AppTopbar;