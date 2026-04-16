import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const ANILIST_RANDOM_QUERY = `
  query RandomSafeManga($page: Int) {
    Page(page: $page, perPage: 25) {
      media(
        type: MANGA,
        sort: POPULARITY_DESC,
        isAdult: false,
        genre_not_in: ["Hentai", "Ecchi", "Boys Love", "Yuri", "Erotica", "Girls Love", "Doujinshi"]
      ) {
        title {
          romaji
          english
        }
        format
      }
    }
  }
`;

// Only allow standard formats (filters out novels, etc.)
const ALLOWED_FORMATS = ['MANGA', 'ONE_SHOT'];

interface AniListMedia {
  title: {
    romaji: string | null;
    english: string | null;
  };
  format: string;
}

const pickRandomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

// Helper to convert a title to a URL-friendly slug ("Oshi no Ko" -> "oshi-no-ko")
const slugify = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric characters with hyphens
    .replace(/(^-|-$)/g, '');    // Remove leading and trailing hyphens
};

const fetchAniListRandomSlug = async (): Promise<string | null> => {
  // Pick a random page from the top 5000 manga (200 pages * 25 items)
  const randomPage = Math.floor(Math.random() * 200) + 1;

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: ANILIST_RANDOM_QUERY,
      variables: { page: randomPage },
    }),
  });

  const json = await res.json();
  const mediaList: AniListMedia[] = json?.data?.Page?.media || [];

  // Filter for valid formats and ensure we have at least one usable title
  const validMedia = mediaList.filter(
    (m) => (m.title.romaji || m.title.english) && ALLOWED_FORMATS.includes(m.format)
  );

  if (validMedia.length > 0) {
    const selectedMedia = pickRandomItem(validMedia);
    // Prefer Romaji (standard for manga slugs like 'oshi-no-ko'), fallback to English
    const titleToUse = selectedMedia.title.romaji || selectedMedia.title.english || '';
    return slugify(titleToUse);
  }

  return null;
};

const Random: React.FC = () => {
  const navigate = useNavigate();
  // Use a ref to ensure the effect only runs exactly once, even in React Strict Mode
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const executeRandom = async () => {
      try {
        let slug = await fetchAniListRandomSlug();

        // If by rare chance that specific page had no valid items, try exactly one more time
        if (!slug) {
          slug = await fetchAniListRandomSlug();
        }

        if (slug) {
          // Navigate to the new slug-based URL system
          navigate(`/read/${slug}`, { replace: true });
          return;
        }
      } catch (e) {
        console.error('AniList random fetch failed:', e);
      }

      // Fallback if network fails completely
      navigate('/', { replace: true });
    };

    executeRandom();
  }, [navigate]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--app-bg)]">
      <div className="w-10 h-10 border-2 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default Random;