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
  typeFilter: string;
  genreFilter: string;
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
      [genreFilter, genreOptions],
      [statusFilter, statusOptions],
      [languageFilter, languageOptions],
      [yearFilter, yearOptions],
      [lengthFilter, lengthOptions],
      [releaseFilter, releaseOptions],
    ] as const;

    return groups
      .map(([value, options]) => options.find((option) => option.value === value)?.label || '')
      .filter(Boolean);
  }, [genreFilter, genreOptions, languageFilter, languageOptions, lengthFilter, lengthOptions, releaseFilter, releaseOptions, statusFilter, statusOptions, typeFilter, typeOptions, yearFilter, yearOptions]);

  const FilterSection: React.FC<{
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
    columns?: string;
  }> = ({ label, value, options, onChange, columns = 'grid-cols-2' }) => (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
          {options.find((option) => option.value === value)?.label || 'Any'}
        </span>
      </div>
      <div className={`grid gap-2 ${columns}`}>
        {options.filter((option) => option.value !== '').map((option) => {
          const isSelected = option.value === value;

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
                    ? 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300'
                    : 'border-white/[0.06] bg-[#15171a] text-zinc-300'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="space-y-3 lg:hidden">
      <div className="relative flex items-center overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f11]/98 shadow-[0_20px_55px_-34px_rgba(0,0,0,0.95)]">
        <Search
          className={`absolute left-4 transition-all duration-300 ${
            searchQuery.trim() ? 'text-emerald-400' : 'text-zinc-600'
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
          className="w-full bg-transparent py-3 pl-11 pr-4 text-[11px] font-black uppercase tracking-[0.18em] text-gray-200 outline-none placeholder:text-zinc-600"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          onPointerDown={handleRippleMouseDown}
          className="ripple-button inline-flex h-11 items-center gap-2 rounded-2xl border border-white/[0.06] bg-[#15171a] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:border-white/[0.1] hover:bg-[#181a1d] hover:text-white"
        >
          <SlidersHorizontal size={14} />
          Filters
        </button>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            onPointerDown={handleRippleMouseDown}
            className="ripple-button inline-flex h-11 items-center rounded-2xl border border-white/[0.06] bg-[#15171a] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:border-white/[0.1] hover:bg-[#181a1d] hover:text-white"
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
              className="whitespace-nowrap rounded-full border border-emerald-400/10 bg-emerald-400/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300"
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
            className={`absolute inset-x-3 bottom-3 overflow-hidden rounded-[1.8rem] border border-white/[0.06] bg-[#111214] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.96)] transition-all duration-300 ${
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
                className="ripple-button flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/[0.06] bg-[#15171a] text-zinc-300"
              >
                <X size={14} />
              </button>
            </div>

            <div className="no-scrollbar max-h-[70vh] space-y-5 overflow-y-auto px-4 py-4">
              <FilterSection label="Type" value={typeFilter} options={typeOptions} onChange={updateTypeFilter} />
              <FilterSection label="Genre" value={genreFilter} options={genreOptions} onChange={updateGenreFilter} columns="grid-cols-2" />
              <FilterSection label="Status" value={statusFilter} options={statusOptions} onChange={updateStatusFilter} />
              <FilterSection label="Language" value={languageFilter} options={languageOptions} onChange={updateLanguageFilter} />
              <FilterSection label="Year" value={yearFilter} options={yearOptions} onChange={updateYearFilter} columns="grid-cols-3" />
              <FilterSection label="Length" value={lengthFilter} options={lengthOptions} onChange={updateLengthFilter} />
              <FilterSection label="Release" value={releaseFilter} options={releaseOptions} onChange={updateReleaseFilter} />
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.06] p-4">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                onPointerDown={handleRippleMouseDown}
                className="ripple-button flex-1 rounded-[1rem] bg-emerald-400 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#04110d]"
              >
                Apply
              </button>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  onPointerDown={handleRippleMouseDown}
                  className="ripple-button rounded-[1rem] border border-white/[0.06] bg-[#15171a] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-300"
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
