import React, { useEffect, useState } from 'react';
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
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);

  useEffect(() => {
    let active = true;
    const trimmedQuery = searchQuery.trim();
    const timeoutId = window.setTimeout(async () => {
      if (!trimmedQuery) {
        if (!active) return;
        setSearchResults([]);
        setShowSearch(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(trimmedQuery)}&limit=6`);
        const data = await response.json();
        if (!active) return;
        setSearchResults(
          Array.isArray(data.data)
            ? data.data.filter((entry: SearchResult) => isAllowedSeriesType(entry.type))
            : []
        );
        setShowSearch(true);
      } catch {
        if (!active) return;
        setSearchResults([]);
        setShowSearch(false);
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
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
    <header className="sticky top-0 z-[100] w-full border-b border-white/5 bg-[#111214] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)]">
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
    </header>
  );
};

export default AppTopbar;
