import React from 'react';
import { Bookmark, ChevronRight, Clock, Dices, Folder, Home, Layers, Star } from 'lucide-react';
import { createSlug } from '../../utils/slug'; 

export interface SearchResult {
  id?: number;
  mal_id?: number;
  title?: string;
  score?: number;
  type?: string;
  status?: string;
  images?: {
    jpg?: { image_url?: string; };
  };
}

export const topbarNavItems = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: Folder, label: 'Browse', to: '/browse' },
  { icon: Bookmark, label: 'Bookmarks', to: '/bookmarks' },
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

export const TopbarSearchResultsContent: React.FC<{
  isSearching: boolean;
  searchQuery: string;
  searchResults?: SearchResult[] | null; 
  onOpenResult: (slug: string) => void; 
  onSubmitSearch: () => void;
  isAnimeMode: boolean;
}> = ({ 
  isSearching, 
  searchQuery, 
  searchResults, 
  onOpenResult, 
  onSubmitSearch, 
  isAnimeMode 
}) => {
  // Hard fallback ensures we ALWAYS have an array to map over, even if the API passes null
  const safeResults = searchResults || [];

  return (
    <>
      <div className="relative border-b border-[var(--app-border)] bg-[var(--app-surface-2)] px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
              {isAnimeMode ? 'KotatsuTV' : 'Library'}
            </span>
            <p className="text-[11px] font-black uppercase text-zinc-300">
              {isSearching ? `Scanning for "${searchQuery}"` : 'Results'}
            </p>
          </div>
          <span className="rounded-full border border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] px-3 py-1 text-[8px] font-black text-[var(--app-accent)]">
            {safeResults.length} Hits
          </span>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
        {safeResults.length === 0 && !isSearching && (
          <div className="py-10 text-center">
            <p className="text-[10px] font-bold uppercase text-zinc-500">Search returned no results.</p>
          </div>
        )}
        
        {safeResults.map((item, index) => {
          // If the API returns an array with empty slots, skip rendering them
          if (!item) return null;

          return (
            <button
              key={item?.mal_id || item?.id || index}
              type="button"
              onMouseDown={(e) => { 
                e.preventDefault(); 
                onOpenResult(createSlug(item?.title || 'unknown')); 
              }}
              className="flex w-full items-center gap-4 rounded-[1.2rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-3 text-left transition-all hover:bg-[var(--app-surface-2)] group"
            >
              {item?.images?.jpg?.image_url ? (
                <img 
                  src={item.images.jpg.image_url} 
                  className="h-14 w-10 shrink-0 rounded-lg object-cover shadow-lg transition-transform group-hover:scale-105" 
                  alt={item?.title || 'Artwork'} 
                />
              ) : (
                <div className="h-14 w-10 shrink-0 rounded-lg bg-zinc-800" />
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="truncate text-[11px] font-black uppercase text-white/90">
                  {item?.title || 'Unknown Title'}
                </h4>
                <div className="mt-1 flex items-center gap-2 text-[9px] font-bold text-zinc-500">
                  {item?.type || (isAnimeMode ? 'TV' : 'Manga')}
                </div>
              </div>
              <ChevronRight size={14} className="text-zinc-600 transition-transform group-hover:translate-x-1" />
            </button>
          );
        })}
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); onSubmitSearch(); }}
        className="group flex items-center justify-center gap-2 w-full py-4 text-[9px] font-black uppercase tracking-[0.3em] text-[var(--app-accent)] bg-[var(--app-accent-muted)] border-t border-[var(--app-border)] hover:bg-[var(--app-accent-soft)] transition-colors"
      >
        View All Results
        <ChevronRight size={12} className="transition-transform group-hover:translate-x-1" />
      </button>
    </>
  );
};