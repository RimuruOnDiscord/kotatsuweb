import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { handleRippleMouseDown } from '../../utils/ripple';

type FilterOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

interface DesktopBrowseFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  submitSearch: () => void;
  activeDropdown: string | null;
  setActiveDropdown: (value: string | null) => void;
  typeFilter: string;
  genreFilter: string[];
  statusFilter: string;
  languageFilter: string;
  yearFilter: string;
  lengthFilter: string;
  releaseFilter: string;
  typeOptions?: FilterOption[];
  genreOptions?: FilterOption[];
  statusOptions?: FilterOption[];
  languageOptions?: FilterOption[];
  yearOptions?: FilterOption[];
  lengthOptions?: FilterOption[];
  releaseOptions?: FilterOption[];
  updateTypeFilter: (value: string) => void;
  updateGenreFilter: (value: string) => void;
  updateStatusFilter: (value: string) => void;
  updateLanguageFilter: (value: string) => void;
  updateYearFilter: (value: string) => void;
  updateLengthFilter: (value: string) => void;
  updateReleaseFilter: (value: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

interface OptionButtonProps {
  option: FilterOption;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean;
}

const OptionButton: React.FC<OptionButtonProps> = ({ option, isSelected, onClick, compact = false }) => {
  // FIX 1: Stop the click event from bubbling up and causing unintended state resets
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (!option.disabled) {
      onClick();
    }
  };

  return (
    <button
      type="button"
      disabled={option.disabled}
      onClick={handleClick}
      onMouseDown={(e) => {
        if (!option.disabled) {
          e.stopPropagation(); // Prevent mousedown from triggering outside clicks
          if (typeof handleRippleMouseDown === 'function') handleRippleMouseDown(e);
        }
      }}
      className={`ripple-button group/item relative flex items-center justify-between gap-3 overflow-hidden rounded-xl text-left transition-all duration-200 ${
        compact ? 'min-h-[34px] px-2.5 py-1.5' : 'w-full px-3 py-2'
      } ${
        option.disabled
          ? 'cursor-not-allowed opacity-30'
          : isSelected
            ? 'text-[var(--app-accent)] ring-1'
            : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
      }`}
      style={
        isSelected && !option.disabled
          ? { backgroundColor: 'var(--app-accent-muted)', boxShadow: 'inset 0 0 0 1px var(--app-accent-soft)' }
          : undefined
      }
    >
      <span
        className={`text-[12px] font-medium transition-colors duration-200 ${
          option.disabled ? 'text-zinc-600' : isSelected ? 'text-[var(--app-accent)]' : ''
        }`}
      >
        {option.label}
      </span>
      <Check
        size={12}
        className={`flex-shrink-0 text-[var(--app-accent)] transition-all duration-200 ${
          isSelected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      />
    </button>
  );
};

const FilterSelect: React.FC<{
  dropdownKey: string;
  activeDropdown: string | null;
  setActiveDropdown: (key: string | null) => void;
  value: string | string[];
  options?: FilterOption[];
  onChange: (value: string) => void;
  className?: string;
}> = ({ 
  dropdownKey, 
  activeDropdown, 
  setActiveDropdown, 
  value, 
  options = [],
  onChange, 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const isOpen = activeDropdown === dropdownKey;
  const isGenreDropdown = dropdownKey === 'genre';
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const selectedOption = Array.isArray(value)
    ? null
    : options.find((option) => option.value === value) ||
      options.find((option) => option.value === '') ||
      options[0];
      
  const selectedGenreOptions = options.filter((option) => option.value && selectedValues.includes(option.value));
  
  const triggerLabel = isGenreDropdown
    ? selectedGenreOptions.length === 0
      ? 'Genre'
      : selectedGenreOptions.length === 1
        ? selectedGenreOptions[0].label
        : `${selectedGenreOptions.length} Genres`
    : selectedOption?.label || 'Select';

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      return;
    }

    if (!isMounted) return;

    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [isMounted, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // FIX 2: If the node was removed from the DOM during a React state update, ignore the click.
      if (!document.contains(target)) return;

      if (containerRef.current && !containerRef.current.contains(target)) {
        setActiveDropdown(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveDropdown(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setActiveDropdown]);

  const dropdownBase = 'absolute left-0 top-full z-30 pt-3';
  const dropdownState = isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-100';
  const panelClass = `mt-3 origin-top overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] will-change-transform transition-[transform,opacity,box-shadow,filter] ${
    isOpen
      ? 'translate-y-0 scale-100 opacity-100 blur-0 shadow-[0_24px_52px_-18px_rgba(0,0,0,0.88)] duration-350 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]'
      : '-translate-y-2 scale-[0.965] opacity-0 blur-[2px] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] duration-220 [transition-timing-function:cubic-bezier(0.4,0,1,1)]'
  }`;

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setActiveDropdown(isOpen ? null : dropdownKey)}
        onMouseDown={handleRippleMouseDown}
        style={isOpen ? { borderColor: 'var(--app-border)' } : undefined}
        className={`ripple-button group relative flex h-11 w-full items-center justify-between overflow-hidden rounded-2xl border px-4 text-left transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out ${
          isOpen
            ? 'border-[var(--app-border)] bg-[var(--app-card)] text-white shadow-[0_20px_40px_-26px_rgba(0,0,0,0.9)]'
            : 'border-[var(--app-border)] bg-[var(--app-surface-2)] text-zinc-300 hover:bg-[var(--app-card)] hover:text-white'
        }`}
      >
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-70" />
        <span className="truncate pr-3 text-[11px] font-black uppercase tracking-[0.14em]">
          {triggerLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-[transform,color] duration-300 ease-out ${
            isOpen ? 'rotate-180 text-[var(--app-accent)]' : 'text-zinc-500 group-hover:text-zinc-300'
          }`}
        />
      </button>

      {isMounted ? (
        isGenreDropdown ? (
          <div style={{ width: 'min(520px, calc(100vw - 2rem))' }} className={`${dropdownBase} ${dropdownState}`}>
            <div className={panelClass}>
              <div className={`flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-[opacity,transform] duration-300 delay-[35ms] ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">Browse Filter</p>
                  <p className="mt-0.5 text-[11px] font-black uppercase tracking-[0.08em] text-zinc-200">Select Genre</p>
                </div>
              </div>
              <div className={`no-scrollbar max-h-[280px] overflow-y-auto px-3 py-3 transition-[opacity,transform] duration-300 delay-[70ms] ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 md:grid-cols-3">
                  {options.map((option) => (
                    <OptionButton
                      key={option.value ?? option.label}
                      option={option}
                      isSelected={option.value === '' ? selectedValues.length === 0 : selectedValues.includes(option.value)}
                      onClick={() => onChange(option.value)}
                      compact
                    />
                  ))}
                </div>
              </div>
              <div className={`border-t border-white/[0.06] bg-white/[0.02] px-4 py-2.5 transition-[opacity,transform] duration-300 delay-100 ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                  {selectedGenreOptions.length ? `${selectedGenreOptions.length} genre filters active` : 'Filters apply instantly'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${dropdownBase} ${dropdownState} w-max`}>
            <div className={panelClass}>
              <div className={`no-scrollbar max-h-72 overflow-y-auto p-2 transition-[opacity,transform] duration-300 delay-[35ms] ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}>
                {options.filter((option) => option.value !== '').map((option) => (
                  <OptionButton
                    key={option.value ?? option.label}
                    option={option}
                    isSelected={option.value === value}
                    onClick={() => {
                      onChange(option.value);
                      // OPTIONAL PRO-TIP: Uncomment below if you DO want single-selects (like Year) to close automatically, but keep Genre multi-select open.
                      // setActiveDropdown(null); 
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
};

const DesktopBrowseFilters: React.FC<DesktopBrowseFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  submitSearch,
  activeDropdown,
  setActiveDropdown,
  typeFilter,
  genreFilter,
  statusFilter,
  languageFilter,
  yearFilter,
  lengthFilter,
  releaseFilter,
  typeOptions = [],
  genreOptions = [],
  statusOptions = [],
  languageOptions = [],
  yearOptions = [],
  lengthOptions = [],
  releaseOptions = [],
  updateTypeFilter,
  updateGenreFilter,
  updateStatusFilter,
  updateLanguageFilter,
  updateYearFilter,
  updateLengthFilter,
  updateReleaseFilter,
  hasActiveFilters,
  clearFilters,
}) => (
  <div className="relative z-[80] hidden pb-2 lg:block">
    <div className="flex w-full flex-wrap items-center gap-2 overflow-visible pb-2 xl:flex-nowrap">
      <div className="relative flex items-center overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-1)] shadow-[0_20px_55px_-34px_rgba(0,0,0,0.95)]">
        <Search
          className={`absolute left-4 transition-all duration-300 ${
            searchQuery.trim() ? 'text-[var(--app-accent)]' : 'text-zinc-600'
          }`}
          size={14}
        />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submitSearch();
            }
          }}
          placeholder="Search..."
          autoComplete="off"
          spellCheck={false}
          className="w-[240px] bg-transparent py-3 pl-11 pr-[7.25rem] text-[11px] font-black uppercase tracking-[0.18em] text-gray-200 outline-none transition-all duration-500 placeholder:text-zinc-600 focus:w-[320px] focus:text-white"
        />
      </div>

      <FilterSelect dropdownKey="type" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} value={typeFilter} options={typeOptions} onChange={updateTypeFilter} className="w-[120px]" />
      <FilterSelect dropdownKey="genre" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} value={genreFilter} options={genreOptions} onChange={updateGenreFilter} className="w-[120px]" />
      <FilterSelect dropdownKey="status" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} value={statusFilter} options={statusOptions} onChange={updateStatusFilter} className="w-[120px]" />
      <FilterSelect dropdownKey="language" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} value={languageFilter} options={languageOptions} onChange={updateLanguageFilter} className="w-[130px]" />
      <FilterSelect dropdownKey="year" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} value={yearFilter} options={yearOptions} onChange={updateYearFilter} className="w-[100px]" />
      <FilterSelect dropdownKey="length" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} value={lengthFilter} options={lengthOptions} onChange={updateLengthFilter} className="w-[140px]" />
      <FilterSelect dropdownKey="release" activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} value={releaseFilter} options={releaseOptions} onChange={updateReleaseFilter} className="w-[140px]" />

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          onMouseDown={handleRippleMouseDown}
          className="ripple-button inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-[var(--app-card)] hover:text-white"
        >
          Clear
        </button>
      ) : null}
    </div>
  </div>
);

export default DesktopBrowseFilters;