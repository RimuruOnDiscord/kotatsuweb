/* --- START OF FILE DesktopBrowseFilters.tsx --- */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  Film
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
  fieldLabels?: Partial<Record<'type' | 'genre' | 'status' | 'language' | 'year' | 'length' | 'release' | 'studio', string>>;
  activeDropdown: string | null;
  setActiveDropdown: (val: string | null) => void;
  typeFilter: string;
  genreFilter: string[];
  statusFilter: string;
  languageFilter: string;
  yearFilter: string;
  lengthFilter: string;
  releaseFilter: string;
  studioFilter: string;
  typeOptions: FilterOption[];
  genreOptions: GenreFilterOption[];
  statusOptions: FilterOption[];
  languageOptions: FilterOption[];
  yearOptions: FilterOption[];
  lengthOptions: FilterOption[];
  releaseOptions: FilterOption[];
  studioOptions: FilterOption[];
  updateTypeFilter: (val: string) => void;
  updateGenreFilter: (val: string) => void;
  updateStatusFilter: (val: string) => void;
  updateLanguageFilter: (val: string) => void;
  updateYearFilter: (val: string) => void;
  updateLengthFilter: (val: string) => void;
  updateReleaseFilter: (val: string) => void;
  updateStudioFilter: (val: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

// ─────────────────────────────────────────
// FRAMER MOTION VARIANTS
// ─────────────────────────────────────────
const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.96, filter: 'blur(4px)' },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { type: 'spring', damping: 25, stiffness: 300, staggerChildren: 0.03 }
  },
  exit: {
    opacity: 0, y: -4, scale: 0.98, filter: 'blur(4px)',
    transition: { duration: 0.15, ease: 'easeIn' }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }
};

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
      <motion.button
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={toggleDropdown}
        className={`flex h-11 select-none items-center gap-2.5 rounded-[16px] border px-4 text-[13px] font-bold transition-all duration-300 outline-none backdrop-blur-md
          ${isOpen
            ? 'border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent),transparent_90%)] text-[var(--app-accent)] shadow-[0_8px_20px_-8px_rgba(var(--app-accent-rgb),0.3)]'
            : hasSelection
              ? 'border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent),transparent_95%)] text-[var(--app-accent)] hover:border-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent),transparent_92%)]'
              : 'border-white/5 bg-[color-mix(in_srgb,var(--app-accent),transparent_98%)] text-zinc-400 hover:border-white/20 hover:bg-[color-mix(in_srgb,var(--app-accent),transparent_94%)] hover:text-white'
          }
        `}
      >
        <Icon size={16} className={`transition-colors duration-500 ${hasSelection || isOpen ? 'text-[var(--app-accent)]' : 'text-zinc-500'}`} />
        <span className="max-w-[110px] truncate whitespace-nowrap" style={{ fontFamily: 'var(--aw-font-display)' }}>{displayLabel}</span>
        <ChevronDown size={14} className={`ml-0.5 transition-transform duration-500 ${isOpen ? 'rotate-180 text-[var(--app-accent)]' : 'text-zinc-500'}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50">
            <motion.div
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`max-h-[380px] overflow-y-auto rounded-[20px] border border-white/10 bg-[color-mix(in_srgb,var(--app-accent),transparent_95%)] p-2 backdrop-blur-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] origin-top
                ${options.length > 25 ? 'grid grid-cols-4 min-w-[580px] gap-1' : options.length > 15 ? 'grid grid-cols-3 min-w-[440px] gap-1' : options.length > 8 ? 'grid grid-cols-2 min-w-[320px] gap-1' : 'flex flex-col min-w-[220px] gap-1'}
              `}
            >
              {options.map((opt) => {
                if (opt.value === '') return null;

                const isSelected = isMultiple ? value.includes(opt.value) : value === opt.value;

                return (
                  <motion.button
                    variants={itemVariants}
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (isSelected && !isMultiple) {
                        onChange('');
                      } else {
                        onChange(opt.value);
                      }
                      if (!isMultiple) setActiveDropdown(null);
                    }}
                    className={`group flex w-full items-center justify-between rounded-[0.8rem] px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors duration-200
                    ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/[0.05]'}
                    ${isSelected ? 'bg-white/[0.08] text-[var(--app-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]' : 'text-zinc-400 hover:text-white'}
                  `}
                  >
                    <span className="truncate pr-4">{opt.label}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", damping: 15, stiffness: 300 }}
                      >
                        <Check size={16} strokeWidth={2.5} className="flex-shrink-0 text-[var(--app-accent)]" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
    <motion.div layout className="hidden xl:flex flex-wrap items-center gap-2.5">

      {/* Search Input - Polished Version */}
      <motion.div layout className="group relative flex min-w-[240px] max-w-[300px] flex-1 items-center">
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
          className={`peer relative h-11 w-full rounded-[16px] border pl-11 pr-10 text-[13px] font-medium text-white shadow-inner outline-none backdrop-blur-md transition-all duration-300 placeholder:text-zinc-500
            ${props.searchQuery
              ? 'border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent),transparent_95%)]'
              : 'border-white/5 bg-[color-mix(in_srgb,var(--app-accent),transparent_98%)]'
            }
            hover:bg-[color-mix(in_srgb,var(--app-accent),transparent_95%)] hover:border-white/20 
            focus:bg-[color-mix(in_srgb,var(--app-accent),transparent_92%)] focus:border-[var(--app-accent)] focus:placeholder-[var(--app-accent)]
          `}
        />

        {/* Clear Search Button - Only shows when typing */}
        <AnimatePresence>
          {props.searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={() => props.setSearchQuery('')}
              className="absolute right-3 z-10 flex h-6 w-6 items-center justify-center rounded-lg text-zinc-500 transition-all"
            >
              <X size={14} className="transition-colors duration-300 hover:text-[var(--app-accent)]" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Keyboard Hint - Subtle "Enter" badge */}
        <AnimatePresence>
          {!props.searchQuery && (
            <motion.div
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              className="pointer-events-none absolute right-4 flex items-center gap-1 rounded border border-[var(--app-accent)] bg-white/[0.02] px-1.5 py-0.5 text-[10px] font-bold text-[var(--app-accent)] opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"
            >
              <span>ENTER</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dropdowns */}
      <FilterDropdown id="genre" icon={Tags} label={labels.genre} options={props.genreOptions} value={props.genreFilter} onChange={props.updateGenreFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} isMultiple />
      <FilterDropdown id="status" icon={Activity} label={labels.status} options={props.statusOptions} value={props.statusFilter} onChange={props.updateStatusFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} />
      <FilterDropdown id="language" icon={Globe} label={labels.language} options={props.languageOptions} value={props.languageFilter} onChange={props.updateLanguageFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} />
      <FilterDropdown id="year" icon={Calendar} label={labels.year} options={props.yearOptions} value={props.yearFilter} onChange={props.updateYearFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} />
      <FilterDropdown id="length" icon={BookOpen} label={labels.length} options={props.lengthOptions} value={props.lengthFilter} onChange={props.updateLengthFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} />
      <FilterDropdown id="studio" icon={Film} label={labels.studio || 'Studio'} options={props.studioOptions} value={props.studioFilter} onChange={props.updateStudioFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} />

      {/* Clear All Filters Button */}
      <AnimatePresence>
        {props.hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)', width: 0, marginLeft: 0 }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', width: 'auto', marginLeft: 4 }}
            exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)', width: 0, marginLeft: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            onClick={props.clearFilters}
            className="flex h-11 items-center gap-2 rounded-[1.2rem] px-3.5 text-[13px] font-medium text-zinc-400 transition-colors duration-300 hover:bg-red-500/10 hover:text-red-400 overflow-hidden whitespace-nowrap"
          >
            <X size={16} />
            <span>Clear All</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* --- END OF FILE DesktopBrowseFilters.tsx --- */