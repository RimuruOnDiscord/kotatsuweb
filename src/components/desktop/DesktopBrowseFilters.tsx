/* --- START OF FILE DesktopBrowseFilters.tsx --- */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Tags, Activity, Calendar,
  BookOpen, ChevronDown, X, Film,
  Check, Tv,
} from 'lucide-react';

type FilterOption = { value: string; label: string; disabled?: boolean };
type GenreFilterOption = FilterOption & { mode?: 'genre' | 'tag'; queryValue?: string };

interface DesktopBrowseFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  submitSearch: () => void;
  searchPlaceholder?: string;
  fieldLabels?: Partial<Record<'format' | 'genre' | 'status' | 'year' | 'length' | 'studio', string>>;
  activeDropdown: string | null;
  setActiveDropdown: (val: string | null) => void;

  formatFilter: string[];
  genreFilter: string[];
  statusFilter: string[];
  yearFilter: string[];
  lengthFilter: string[];
  studioFilter: string[];

  formatOptions: FilterOption[]; genreOptions: GenreFilterOption[];
  statusOptions: FilterOption[];
  yearOptions: FilterOption[]; lengthOptions: FilterOption[];
  studioOptions: FilterOption[];

  updateFormatFilter: (val: string) => void; updateGenreFilter: (val: string) => void;
  updateStatusFilter: (val: string) => void;
  updateYearFilter: (val: string) => void; updateLengthFilter: (val: string) => void;
  updateStudioFilter: (val: string) => void;

  hasActiveFilters: boolean;
  clearFilters: () => void;
}

// ─────────────────────────────────────────────────────────────
// FILTER DROPDOWN
// ─────────────────────────────────────────────────────────────
const dropdownVariants: any = {
  hidden: { opacity: 0, y: -6, scale: 0.96, filter: 'blur(3px)' },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { type: 'spring', damping: 24, stiffness: 320, mass: 0.8 },
  },
  exit: {
    opacity: 0, y: -4, scale: 0.98, filter: 'blur(2px)',
    transition: { duration: 0.1, ease: 'easeOut' },
  },
};

const checkVariants: any = {
  initial: { scale: 0, opacity: 0, rotate: -20 },
  animate: {
    scale: 1, opacity: 1, rotate: 0,
    transition: { type: 'spring', stiffness: 500, damping: 18 },
  },
  exit: {
    scale: 0, opacity: 0, rotate: 20,
    transition: { duration: 0.1 },
  },
};

const FilterDropdown = ({
  id, icon: Icon, label, options, value, onChange,
  activeDropdown, setActiveDropdown,
  isMultiple = false,
  isSingleSelect = false,
}: {
  id: string; icon: React.ElementType; label: string;
  options: FilterOption[]; value: string | string[];
  onChange: (val: string) => void;
  activeDropdown: string | null; setActiveDropdown: (val: string | null) => void;
  isMultiple?: boolean;
  /** When true, clicking a selected item calls onChange('') to deselect (used for single-value filters wrapped as arrays) */
  isSingleSelect?: boolean;
}) => {
  const isOpen = activeDropdown === id;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && isOpen)
        setActiveDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setActiveDropdown]);

  const selectedCount = isMultiple
    ? (Array.isArray(value) ? value.length : 0)
    : (value ? 1 : 0);

  const displayLabel = selectedCount > 0 ? `${label} (${selectedCount})` : label;
  const hasSelection = selectedCount > 0;
  const validOptions = (options || []).filter(o => o.value !== '');

  return (
    <div className={`relative ${isOpen ? 'z-[100]' : 'z-10'}`} ref={ref}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
        type="button"
        onClick={() => setActiveDropdown(isOpen ? null : id)}
        className={`aw-material-control group relative flex h-[45px] select-none items-center gap-2.5 rounded-[14px] px-4 text-[13.5px] font-bold outline-none overflow-hidden transition-all duration-150
          ${isOpen || hasSelection
            ? 'border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent),transparent_92%)] text-[var(--app-accent)]'
            : 'text-zinc-400 hover:text-white'
          }`}
      >
        <Icon size={14} className={`relative z-10 flex-shrink-0 transition-colors duration-150 ${hasSelection || isOpen ? 'text-[var(--app-accent)]' : 'text-zinc-500 group-hover:text-[var(--app-accent)]'}`} />
        <span className="relative z-10 truncate whitespace-nowrap tracking-wide" style={{ fontFamily: 'var(--aw-font-display)' }}>
          {displayLabel}
        </span>
        <ChevronDown size={13} strokeWidth={2.5} className={`relative z-10 ml-0.5 flex-shrink-0 transition-all duration-150 ${isOpen ? 'rotate-180 text-[var(--app-accent)]' : 'text-zinc-500 group-hover:text-[var(--app-accent)]'}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-[100] min-w-[200px]" style={{ transformOrigin: 'top center' }}>
            <motion.div
              variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
              className="aw-material-menu overflow-hidden rounded-[16px] p-1.5"
            >
              <div className="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                {validOptions.map(opt => {
                  const isSel = isMultiple
                    ? (value as string[]).includes(opt.value)
                    : value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => {
                        if (isSel) {
                          // isSingleSelect: parent expects '' to clear; otherwise parent handles toggle via value
                          onChange(isSingleSelect ? '' : opt.value);
                        } else {
                          onChange(opt.value);
                        }
                        if (!isMultiple) setActiveDropdown(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2.5 text-[13.5px] transition-all duration-150
                        ${opt.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer active:scale-[0.98]'}
                        ${isSel
                          ? 'bg-[color-mix(in_srgb,var(--app-accent),transparent_82%)] text-[var(--app-accent)] font-semibold border border-[color-mix(in_srgb,var(--app-accent),transparent_65%)]'
                          : 'bg-transparent text-zinc-300 hover:bg-[color-mix(in_srgb,var(--app-accent),transparent_92%)] hover:text-white hover:border-[color-mix(in_srgb,var(--app-accent),transparent_80%)] border border-transparent font-medium'
                        }`}
                      style={{ fontFamily: 'var(--aw-font-body, sans-serif)' }}
                    >
                      <span className="truncate">{opt.label}</span>
                      <AnimatePresence mode="wait">
                        {isSel && (
                          <motion.span
                            key="check"
                            variants={checkVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="flex-shrink-0 ml-2"
                          >
                            <Check size={14} className="text-[var(--app-accent)]" strokeWidth={3} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────
export default function DesktopBrowseFilters(props: DesktopBrowseFiltersProps) {
  const L = {
    format: props.fieldLabels?.format || 'Format',
    genre: props.fieldLabels?.genre || 'Genre',
    status: props.fieldLabels?.status || 'Status',
    year: props.fieldLabels?.year || 'Year',
    length: props.fieldLabels?.length || 'Length',
    studio: props.fieldLabels?.studio || 'Studio',
  };

  return (
    <motion.div layout className="hidden xl:flex flex-wrap items-center gap-2.5 w-full">
      <FilterDropdown id="genre" icon={Tags} label={L.genre} options={props.genreOptions} value={props.genreFilter} onChange={props.updateGenreFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} isMultiple />

      {/* Single-value filters wrapped as arrays — isSingleSelect so deselect sends '' */}
      <FilterDropdown id="format" icon={Tv} label={L.format} options={props.formatOptions} value={props.formatFilter} onChange={props.updateFormatFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} isMultiple isSingleSelect />
      <FilterDropdown id="status" icon={Activity} label={L.status} options={props.statusOptions} value={props.statusFilter} onChange={props.updateStatusFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} isMultiple isSingleSelect />
      <FilterDropdown id="year" icon={Calendar} label={L.year} options={props.yearOptions} value={props.yearFilter} onChange={props.updateYearFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} isMultiple isSingleSelect />
      <FilterDropdown id="length" icon={BookOpen} label={L.length} options={props.lengthOptions} value={props.lengthFilter} onChange={props.updateLengthFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} isMultiple isSingleSelect />
      <FilterDropdown id="studio" icon={Film} label={L.studio} options={props.studioOptions} value={props.studioFilter} onChange={props.updateStudioFilter} activeDropdown={props.activeDropdown} setActiveDropdown={props.setActiveDropdown} isMultiple isSingleSelect />

      {/* Always rendered to reserve width and entirely prevent layout shifting */}
      <motion.button
        animate={{
          opacity: props.hasActiveFilters ? 1 : 0,
          scale: props.hasActiveFilters ? 1 : 0.8,
          filter: props.hasActiveFilters ? 'blur(0px)' : 'blur(4px)',
        }}
        initial={false}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        onClick={props.clearFilters}
        disabled={!props.hasActiveFilters}
        className={`aw-material-control ml-1 flex h-[45px] shrink-0 items-center gap-2 rounded-[14px] px-4 text-[11.5px] font-bold tracking-widest text-red-400 bg-red-500/[0.08] border-red-500/20 hover:bg-red-500/[0.12] hover:border-red-500/30 hover:text-red-300 overflow-hidden whitespace-nowrap transition-all duration-150 ${props.hasActiveFilters ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        style={{ fontFamily: 'var(--aw-font-display)' }}
      >
        <X size={13} strokeWidth={2.5} />
        <span>Clear</span>
      </motion.button>

      {/* Unified Search Input on the right */}
      <motion.div
        layout
        whileHover={{ scale: 1.01 }}
        className={`aw-browse-search group relative ml-auto flex min-w-[260px] max-w-[320px] items-center h-[45px] rounded-[14px] transition-all duration-200 overflow-hidden
          ${props.searchQuery
            ? 'border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent),transparent_92%)]'
            : ''
          }
          focus-within:border-[var(--app-accent)]
        `}
      >
        <div className={`flex shrink-0 items-center justify-center h-full w-[44px] transition-colors duration-200 ${props.searchQuery ? 'text-[var(--app-accent)]' : 'text-zinc-500 group-hover:text-[var(--app-accent)]'}`}>
          <Search size={15} />
        </div>
        <input
          type="text" value={props.searchQuery}
          onChange={e => props.setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && props.submitSearch()}
          placeholder={props.searchPlaceholder || "Search..."}
          className="flex-1 bg-transparent text-[13.5px] font-bold text-white placeholder:text-zinc-500 group-hover:placeholder:text-white border-none outline-none ring-0 h-full pr-10 transition-colors duration-200"
          style={{ fontFamily: 'var(--aw-font-display)' }}
        />
        <div className="absolute right-2 top-0 bottom-0 flex items-center justify-center z-20 gap-1.5">
          <AnimatePresence>
            {props.searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                onClick={() => { props.setSearchQuery(''); props.submitSearch(); }}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] text-zinc-400 hover:bg-white/10 hover:text-white outline-none"
              >
                <X size={13} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* --- END OF FILE DesktopBrowseFilters.tsx --- */
