import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const FORBIDDEN_GENRE_IDS = [9, 10, 12, 14, 37, 38, 49];
const MAX_RANDOM_PAGE_ATTEMPTS = 8;
const RANDOM_PAGE_SIZE = 25;
const MAX_RANDOM_PAGE_WINDOW = 1000;

interface RandomMangaEntry {
  mal_id?: number;
  genres?: Array<{ mal_id: number }>;
  explicit_genres?: Array<{ mal_id: number }>;
}

interface RandomMangaListResponse {
  data?: RandomMangaEntry[];
  pagination?: {
    last_visible_page?: number;
  };
}

interface RandomMangaResponse {
  data?: RandomMangaEntry;
}

const isSafeRandomManga = (manga?: RandomMangaEntry) => {
  if (!manga?.mal_id) return false;

  const genreIds = [...(manga.genres || []), ...(manga.explicit_genres || [])].map((genre) => genre.mal_id);
  return !genreIds.some((genreId) => FORBIDDEN_GENRE_IDS.includes(genreId));
};

const pickRandomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const fetchCatalogPage = async (page: number) => {
  const res = await fetch(`https://api.jikan.moe/v4/manga?sfw=true&limit=${RANDOM_PAGE_SIZE}&page=${page}`);
  const data: RandomMangaListResponse = await res.json();
  return data;
};

const fetchSafeRandomFromCatalog = async () => {
  const seedData = await fetchCatalogPage(1);
  const lastVisiblePage = Math.max(1, Math.min(seedData.pagination?.last_visible_page || 1, MAX_RANDOM_PAGE_WINDOW));

  for (let attempt = 0; attempt < MAX_RANDOM_PAGE_ATTEMPTS; attempt += 1) {
    const randomPage = Math.floor(Math.random() * lastVisiblePage) + 1;
    const data = await fetchCatalogPage(randomPage);
    const safeChoices = (data.data || []).filter(isSafeRandomManga);

    if (safeChoices.length > 0) {
      return pickRandomItem(safeChoices);
    }
  }

  const firstPageChoices = (seedData.data || []).filter(isSafeRandomManga);
  return firstPageChoices.length > 0 ? pickRandomItem(firstPageChoices) : null;
};

const fetchSafeRandomFallback = async () => {
  const res = await fetch('https://api.jikan.moe/v4/random/manga');
  const data: RandomMangaResponse = await res.json();

  if (isSafeRandomManga(data.data)) {
    return data.data;
  }

  return null;
};

const Random: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRandom = async () => {
      try {
        const catalogPick = await fetchSafeRandomFromCatalog();

        if (catalogPick?.mal_id) {
          navigate(`/read/${catalogPick.mal_id}`);
          return;
        }

        const fallbackPick = await fetchSafeRandomFallback();
        if (fallbackPick?.mal_id) {
          navigate(`/read/${fallbackPick.mal_id}`);
          return;
        }
      } catch (e) {
        console.error('Safe random fetch failed:', e);
      }

      navigate('/');
    };

    fetchRandom();
  }, [navigate]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#111214]">
      <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
    </div>
  );
};

export default Random;
