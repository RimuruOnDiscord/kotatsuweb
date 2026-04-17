import React, { useRef, useEffect } from 'react';
import {
  Search,
  Tags,
  Activity,
  Globe,
  Calendar,
  BookOpen,
  Clock,
  ChevronDown,
  Check,
  X
} from 'lucide-react';

type FilterOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type GenreFilterOption = FilterOption & {
  mode?: 'genre' | 'tag';
  queryValue?: string;
};

interface DesktopBrowseFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  submitSearch: () => void;
  searchPlaceholder?: string;
  fieldLabels?: Partial<Record<'type' | 'genre' | 'status' | 'language' | 'year' | 'length' | 'release', string>>;
  activeDropdown: string | null;
  setActiveDropdown: (val: string | null) => void;
  typeFilter: string;
  genreFilter: string[];
  statusFilter: string;
  languageFilter: string;
  yearFilter: string;
  lengthFilter: string;
  releaseFilter: string;
  typeOptions: FilterOption[];
  genreOptions: GenreFilterOption[];
  statusOptions: FilterOption[];
  languageOptions: FilterOption[];
  yearOptions: FilterOption[];
  lengthOptions: FilterOption[];
  releaseOptions: FilterOption[];
  updateTypeFilter: (val: string) => void;
  updateGenreFilter: (val: string) => void;
  updateStatusFilter: (val: string) => void;
  updateLanguageFilter: (val: string) => void;
  updateYearFilter: (val: string) => void;
  updateLengthFilter: (val: string) => void;
  updateReleaseFilter: (val: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

const FilterDropdown = ({
  id,
  icon: Icon,
  label,
  options,
  value,
  onChange,
  activeDropdown,
  setActiveDropdown,
  isMultiple = false,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  options: FilterOption[];
  value: string | string[];
  onChange: (val: string) => void;
  activeDropdown: string | null;
  setActiveDropdown: (val: string | null) => void;
  isMultiple?: boolean;
}) => {
  const isOpen = activeDropdown === id;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setActiveDropdown]);

  const toggleDropdown = () => setActiveDropdown(isOpen ? null : id);

  let displayLabel = label;
  if (isMultiple && Array.isArray(value)) {
    if (value.length === 1) {
      const opt = options.find((o) => o.value === value[0]);
      displayLabel = opt ? opt.label : label;
    } else if (value.length > 1) {
      displayLabel = `${label} (${value.length})`;
    }
  } else if (!isMultiple && typeof value === 'string' && value) {
    const opt = options.find((o) => o.value === value);
    if (opt && opt.value !== '') displayLabel = opt.label;
  }

  const hasSelection = isMultiple ? value.length > 0 : !!value;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className={`flex h-11 select-none items-center gap-2.5 rounded-[1.2rem] border px-4 text-[13px] font-medium transition-all duration-300 outline-none
          ${isOpen
            ? 'border-[var(--app-accent)] bg-[var(--app-surface-2)] text-[var(--app-accent)]'
            : hasSelection
              ? 'border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-accent)] hover:border-white/20'
              : 'border-[var(--app-border)] bg-[var(--app-surface-1)] text-zinc-400 hover:bg-[var(--app-surface-2)] hover:text-zinc-300'
          }
        `}
      >
        <Icon size={16} className={`transition-colors duration-300 ${hasSelection || isOpen ? 'text-[var(--app-accent)]' : 'text-zinc-500'}`} />
        <span className="max-w-[110px] truncate whitespace-nowrap">{displayLabel}</span>
        <ChevronDown size={14} className={`ml-0.5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[var(--app-accent)]' : 'text-zinc-500'}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[200px] max-h-[320px] overflow-y-auto rounded-[1.2rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-2 shadow-2xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-1">
          {options.map((opt) => {
            if (opt.value === '' && isMultiple) return null;
            
            const isSelected = isMultiple ? value.includes(opt.value) : value === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  onChange(opt.value);
                  if (!isMultiple) setActiveDropdown(null);
                }}
                className={`group flex w-full items-center justify-between rounded-[0.8rem] px-3.5 py-2.5 text-left text-[13px] font-medium transition-all duration-200
                  ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/[0.03]'}
                  ${isSelected ? 'bg-[var(--app-surface-2)] text-[var(--app-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]' : 'text-zinc-400'}
                `}
              >
                <span className="truncate pr-4">{opt.label}</span>
                {isSelected && <Check size={16} strokeWidth={2.5} className="flex-shrink-0 text-[var(--app-accent)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function DesktopBrowseFilters(props: DesktopBrowseFiltersProps) {
  const labels = {
    type: props.fieldLabels?.type || 'Type',
    genre: props.fieldLabels?.genre || 'Genre',
    status: props.fieldLabels?.status || 'Status',
    language: props.fieldLabels?.language || 'Language',
    year: props.fieldLabels?.year || 'Year',
    length: props.fieldLabels?.length || 'Length',
    release: props.fieldLabels?.release || 'Release',
  };

  return (
    <div className="hidden xl:flex flex-wrap items-center gap-2.5">
      
      {/* Search Input - Polished Version */}
      <div className="group relative flex min-w-[240px] max-w-[300px] flex-1 items-center">
        {/* Animated Background Glow */}
        <div className="absolute -inset-[1px] rounded-[1.25rem] opacity-0 blur-[2px] transition-opacity duration-500 group-focus-within:opacity-20" />
        
        <Search 
          size={16} 
          className="absolute left-4 z-10 text-zinc-500 transition-all duration-300 group-focus-within:scale-110 group-focus-within:text-[var(--app-accent)]" 
        />
        
        <input
          type="text"
          value={props.searchQuery}
          onChange={(e) => props.setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && props.submitSearch()}
          placeholder={props.searchPlaceholder || 'Search Manga...'}
          className="peer relative h-11 w-full rounded-[1.2rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] pl-11 pr-10 text-[13px] font-medium text-white shadow-inner outline-none transition-all duration-300 placeholder:text-zinc-500 hover:bg-[var(--app-surface-2)] focus:bg-[var(--app-surface-2)] focus:border-[var(--app-accent)] focus:placeholder-[var(--app-accent)]"
        />

        {/* Clear Search Button - Only shows when typing */}
        {props.searchQuery && (
          <button
            onClick={() => props.setSearchQuery('')}
            className="absolute right-3 z-10 flex h-6 w-6 items-center justify-center rounded-lg text-zinc-500 transition-all"
          >
            <X size={14} />
          </button>
        )}

        {/* Keyboard Hint - Subtle "Enter" badge */}
        {!props.searchQuery && (
          <div className="pointer-events-none absolute right-4 flex items-center gap-1 rounded border border-[var(--app-accent)] bg-white/[0.02] px-1.5 py-0.5 text-[10px] font-bold text-[var(--app-accent)] opacity-0 transition-opacity duration-300 group-focus-within:opacity-100">
            <span>ENTER</span>
          </div>
        )}
      </div>

      {/* Dropdowns */}
      <FilterDropdown id="genre" icon={Tags} label={labels.genre} options={props.genreOptions} value={props.genreFilter} onChange={props.updateGenreFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} isMultiple />
      <FilterDropdown id="status" icon={Activity} label={labels.status} options={props.statusOptions} value={props.statusFilter} onChange={props.updateStatusFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} />
      <FilterDropdown id="language" icon={Globe} label={labels.language} options={props.languageOptions} value={props.languageFilter} onChange={props.updateLanguageFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} />
      <FilterDropdown id="year" icon={Calendar} label={labels.year} options={props.yearOptions} value={props.yearFilter} onChange={props.updateYearFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} />
      <FilterDropdown id="length" icon={BookOpen} label={labels.length} options={props.lengthOptions} value={props.lengthFilter} onChange={props.updateLengthFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} />
      <FilterDropdown id="release" icon={Clock} label={labels.release} options={props.releaseOptions} value={props.releaseFilter} onChange={props.updateReleaseFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} />

      {/* Clear Button */}
      {props.hasActiveFilters && (
        <button
          onClick={props.clearFilters}
          className="flex h-11 items-center gap-2 rounded-[1.2rem] px-3.5 text-[13px] font-medium text-zinc-400 transition-all duration-300 hover:bg-red-500/10 hover:text-red-400"
        >
          <X size={16} />
          Clear All
        </button>
      )}
    </div>
  );
}
