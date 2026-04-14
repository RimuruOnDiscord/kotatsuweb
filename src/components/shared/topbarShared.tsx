import React from 'react';
import { Bookmark, ChevronRight, Clock, Dices, FilterX, Folder, Home, Layers, Search, Star, Zap } from 'lucide-react';
import { handleRippleMouseDown } from '../../utils/ripple';

export interface SearchResult {
  mal_id: number;
  title: string;
  score?: number;
  type?: string;
  status?: string;
  images: {
    jpg: {
      image_url: string;
    };
  };
}

export const topbarNavItems: Array<{ icon: React.ElementType; label: string; to: string }> = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: Folder, label: 'Browse', to: '/browse' },
  { icon: Bookmark, label: 'Bookmarks', to: '/bookmarks' },
  { icon: Zap, label: 'Newest', to: '/newest' },
  { icon: Clock, label: 'Updated', to: '/updated' },
  { icon: Layers, label: 'Added', to: '/added' },
  { icon: Dices, label: 'Random', to: '/random' },
];

export const BrandLogo: React.FC = () => (
  <div className="flex items-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl text-[var(--app-accent)]" style={{ backgroundColor: 'var(--app-accent-muted)' }}>
      <svg viewBox="0 0 1406.2 1406.2" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current">
        <path d="M391.7,270.7c-51.6,18.6-96.2,88.4-117.9,183.6c-7.8,34.8-15.1,93.5-15.1,121.7v19.7l-23.3,36.6 c-65,101.3-124.6,206.8-180.5,319.2C5.1,1051,0,1063.2,0,1080.9c0,7.8,2,18,4,22.2c6.6,12,22.2,24.4,39.7,31l16,6.2l651.1-0.2 c633.1,0,651.1-0.4,661.2-5.3c32.6-16.9,43-51.7,26.2-88c-63.8-139-150.5-296.8-229.6-418.5l-19.1-29.5l-2.2-33.7 c-8.7-129.4-36.1-208.6-92-266.5c-24.2-24.8-33.5-30.4-50.6-30.6c-23.9,0-39.9,10.9-75.6,52.1c-35.2,40.4-42.4,50.1-66.9,86.4 c-12,17.7-27,38.3-33.2,45.5l-11.3,13.5h-117l-117-0.2L560.2,429C515,359.2,440.7,274.5,419.6,268.7 C406.8,264.9,409,264.5,391.7,270.7z M466.2,666.4c8.9,6.2,11.3,11.8,14.4,37.7c4,30.6,7.7,34.8,27.5,32.4 c18-2.2,32.6,3.6,40.8,16.6c16,25.9-11.5,80.2-50.6,99.3c-14,7.1-19.1,7.8-42.8,7.8c-22.8,0-28.8-1.1-39.4-6.7 c-31.2-16.4-50.3-40.3-58.3-71.8c-4-16.6-4.2-21.7-1.1-36.3c4.2-21.1,11.5-35.2,24.8-50.1C404.8,669.5,449.1,654.4,466.2,666.4z M964,669c8.7,7.3,9.3,9.7,13.5,43.4c2.6,20.6,8.7,26.8,25.3,24.2c16-2.2,29.9,2.2,39.2,12.9c15.1,18.2,6.2,53.4-20.8,82.2 c-21.7,23.1-35.2,28.4-69.2,28.8c-25.9,0-29.1-0.5-42.8-8.2c-20.2-11.3-38.4-29.9-47.7-49c-6.2-12.8-8.2-20.8-8.9-39.2 c-0.9-21.1,0-25,7.7-41c14-30.4,35.5-49.2,65-57C945.2,660.2,954.7,661.1,964,669z" />
      </svg>
    </div>
  </div>
);

interface TopbarSearchResultsProps {
  isSearching: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  onOpenManga: (mangaId: number) => void;
  onSubmitSearch: () => void;
}

export const TopbarSearchResultsContent: React.FC<TopbarSearchResultsProps> = ({
  isSearching,
  searchQuery,
  searchResults,
  onOpenManga,
  onSubmitSearch,
}) => (
  <>
    <div className="relative border-b border-[var(--app-border)] bg-[var(--app-surface-2)] px-6 py-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-500">Search Library</span>
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-300">
            {isSearching ? 'Scanning' : searchQuery.trim() ? 'Results Ready' : 'Idle'}
          </p>
        </div>
        <span className="rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--app-accent)]" style={{ borderColor: 'var(--app-accent-soft)', backgroundColor: 'var(--app-accent-muted)' }}>
          {searchResults.length} hits
        </span>
      </div>
    </div>

    <div className="max-h-[62vh] space-y-2 overflow-y-auto px-3 py-3">
      {searchResults.length > 0 ? (
        searchResults.map((manga) => (
          <button
            key={manga.mal_id}
            type="button"
            onClick={() => onOpenManga(manga.mal_id)}
            onMouseDown={handleRippleMouseDown}
            className="ripple-button group/item relative flex w-full items-center gap-4 rounded-[1.4rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-3 text-left transition-all duration-300 hover:bg-[var(--app-surface-2)]"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-[1rem] bg-[var(--app-card)]">
              <img src={manga.images.jpg.image_url} className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-105" alt={manga.title} />
              <div className="absolute inset-0 rounded-[1rem] ring-1 ring-inset ring-white/[0.08] transition-all" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }} />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="truncate pr-3 text-[11px] font-black uppercase tracking-tight text-white/90 transition-colors group-hover/item:text-white">
                {manga.title}
              </h4>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] font-black text-[var(--app-accent)]">
                  <Star size={10} className="fill-current text-[var(--app-accent)]" />
                  {manga.score ? manga.score.toFixed(1) : 'N/A'}
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.24em] text-zinc-500">
                  {[manga.type || 'Manga', manga.status || 'Unknown'].join(' / ')}
                </span>
              </div>
            </div>

            <ChevronRight size={14} className="text-zinc-700 transition-all group-hover/item:translate-x-1 group-hover/item:text-[var(--app-accent)]" />
          </button>
        ))
      ) : !isSearching ? (
        <div className="flex flex-col items-center py-12 opacity-25">
          <FilterX size={32} className="mb-2" />
          <span className="text-[9px] font-black uppercase tracking-[0.32em]">No Matches</span>
        </div>
      ) : null}
    </div>

    <button
      type="button"
      onClick={onSubmitSearch}
      onMouseDown={handleRippleMouseDown}
      className="ripple-button group w-full border-t border-[var(--app-border)] py-4 transition-colors"
      style={{ backgroundColor: 'var(--app-accent-muted)' }}
    >
      <span className="text-[9px] font-black uppercase tracking-[0.32em] text-[var(--app-accent)] transition-all group-hover:tracking-[0.38em]">
        Open Browse Results
      </span>
    </button>
  </>
);
