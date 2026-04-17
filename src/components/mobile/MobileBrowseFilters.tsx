import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { handleRippleMouseDown } from '../../utils/ripple';

type FilterOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

interface MobileBrowseFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  submitSearch: () => void;
  searchPlaceholder?: string;
  fieldLabels?: Partial<Record<'type' | 'genre' | 'status' | 'language' | 'year' | 'length' | 'release', string>>;
  typeFilter: string;
  genreFilter: string[];
  statusFilter: string;
  languageFilter: string;
  yearFilter: string;
  lengthFilter: string;
  releaseFilter: string;
  typeOptions: FilterOption[];
  genreOptions: FilterOption[];
  statusOptions: FilterOption[];
  languageOptions: FilterOption[];
  yearOptions: FilterOption[];
  lengthOptions: FilterOption[];
  releaseOptions: FilterOption[];
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

const MobileBrowseFilters: React.FC<MobileBrowseFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  submitSearch,
  searchPlaceholder,
  fieldLabels,
  typeFilter,
  genreFilter,
  statusFilter,
  languageFilter,
  yearFilter,
  lengthFilter,
  releaseFilter,
  typeOptions,
  genreOptions,
  statusOptions,
  languageOptions,
  yearOptions,
  lengthOptions,
  releaseOptions,
  updateTypeFilter,
  updateGenreFilter,
  updateStatusFilter,
  updateLanguageFilter,
  updateYearFilter,
  updateLengthFilter,
  updateReleaseFilter,
  hasActiveFilters,
  clearFilters,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const labels = {
    type: fieldLabels?.type || 'Type',
    genre: fieldLabels?.genre || 'Genre',
    status: fieldLabels?.status || 'Status',
    language: fieldLabels?.language || 'Language',
    year: fieldLabels?.year || 'Year',
    length: fieldLabels?.length || 'Length',
    release: fieldLabels?.release || 'Release',
  };

  useEffect(() => {
    if (sheetOpen) {
      setSheetMounted(true);
      return;
    }
    if (!sheetMounted) return;
    const timeoutId = window.setTimeout(() => setSheetMounted(false), 220);
    return () => window.clearTimeout(timeoutId);
  }, [sheetMounted, sheetOpen]);

  const activeLabels = useMemo(() => {
    const groups = [
      [typeFilter, typeOptions],
      [statusFilter, statusOptions],
      [languageFilter, languageOptions],
      [yearFilter, yearOptions],
      [lengthFilter, lengthOptions],
      [releaseFilter, releaseOptions],
    ] as const;

    const labels = groups
      .map(([value, options]) => options.find((option) => option.value === value)?.label || '')
      .filter(Boolean);

    const genreLabels = genreOptions
      .filter((option) => option.value && genreFilter.includes(option.value))
      .map((option) => option.label);

    return [...labels, ...genreLabels];
  }, [genreFilter, genreOptions, languageFilter, languageOptions, lengthFilter, lengthOptions, releaseFilter, releaseOptions, statusFilter, statusOptions, typeFilter, typeOptions, yearFilter, yearOptions]);

  const FilterSection: React.FC<{
    label: string;
    value: string | string[];
    options: FilterOption[];
    onChange: (value: string) => void;
    columns?: string;
  }> = ({ label, value, options, onChange, columns = 'grid-cols-2' }) => (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
          {Array.isArray(value)
            ? value.length === 0
              ? 'Any'
              : value.length === 1
                ? options.find((option) => option.value === value[0])?.label || 'Any'
                : `${value.length} selected`
            : options.find((option) => option.value === value)?.label || 'Any'}
        </span>
      </div>
      <div className={`grid gap-2 ${columns}`}>
        {options.filter((option) => option.value !== '').map((option) => {
          const isSelected = Array.isArray(value) ? value.includes(option.value) : option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => !option.disabled && onChange(option.value)}
              onPointerDown={option.disabled ? undefined : handleRippleMouseDown}
              className={`ripple-button overflow-hidden rounded-[1rem] border px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
                option.disabled
                  ? 'cursor-not-allowed border-white/[0.04] bg-white/[0.02] text-zinc-700'
                  : isSelected
                    ? 'border-[var(--app-border)] bg-[var(--app-accent-muted)] text-[var(--app-accent)]'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-2)] text-zinc-300'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {Array.isArray(value) && value.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange('')}
          onPointerDown={handleRippleMouseDown}
          className="ripple-button inline-flex rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-[var(--app-card)] hover:text-white"
        >
          Clear Genres
        </button>
      ) : null}
    </section>
  );

  return (
    <div className="space-y-3 lg:hidden">
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
          placeholder={searchPlaceholder || 'Search...'}
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent py-3 pl-11 pr-4 text-[11px] font-black uppercase tracking-[0.18em] text-gray-200 outline-none placeholder:text-zinc-600"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          onPointerDown={handleRippleMouseDown}
          className="ripple-button inline-flex h-11 items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-[var(--app-card)] hover:text-white"
        >
          <SlidersHorizontal size={14} />
          Filters
        </button>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            onPointerDown={handleRippleMouseDown}
            className="ripple-button inline-flex h-11 items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-[var(--app-card)] hover:text-white"
          >
            Clear
          </button>
        ) : null}
      </div>

      {activeLabels.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {activeLabels.map((label) => (
            <span
              key={label}
              className="whitespace-nowrap rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--app-accent)]"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {sheetMounted ? (
        <div className={`fixed inset-0 z-[140] lg:hidden ${sheetOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setSheetOpen(false)}
            className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${sheetOpen ? 'opacity-100' : 'opacity-0'}`}
          />

          <div
            className={`absolute inset-x-3 bottom-3 overflow-hidden rounded-[1.8rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.96)] transition-all duration-300 ${
              sheetOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Mobile Filters</p>
                <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-white">Browse Controls</h3>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                onPointerDown={handleRippleMouseDown}
                className="ripple-button flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] text-zinc-300"
              >
                <X size={14} />
              </button>
            </div>

            <div className="no-scrollbar max-h-[70vh] space-y-5 overflow-y-auto px-4 py-4">
              <FilterSection label={labels.type} value={typeFilter} options={typeOptions} onChange={updateTypeFilter} />
              <FilterSection label={labels.genre} value={genreFilter} options={genreOptions} onChange={updateGenreFilter} columns="grid-cols-2" />
              <FilterSection label={labels.status} value={statusFilter} options={statusOptions} onChange={updateStatusFilter} />
              <FilterSection label={labels.language} value={languageFilter} options={languageOptions} onChange={updateLanguageFilter} />
              <FilterSection label={labels.year} value={yearFilter} options={yearOptions} onChange={updateYearFilter} columns="grid-cols-3" />
              <FilterSection label={labels.length} value={lengthFilter} options={lengthOptions} onChange={updateLengthFilter} />
              <FilterSection label={labels.release} value={releaseFilter} options={releaseOptions} onChange={updateReleaseFilter} />
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.06] p-4">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                onPointerDown={handleRippleMouseDown}
                className="ripple-button flex-1 rounded-[1rem] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#04110d]"
                style={{ backgroundColor: 'var(--app-accent)' }}
              >
                Apply
              </button>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  onPointerDown={handleRippleMouseDown}
                  className="ripple-button rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-300"
                >
                  Reset
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MobileBrowseFilters;
