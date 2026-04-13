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
        idMal
        format
      }
    }
  }
`;

// Only allow standard formats (filters out novels, etc.)
const ALLOWED_FORMATS = ['MANGA', 'ONE_SHOT'];

const pickRandomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const fetchAniListRandom = async (): Promise<number | null> => {
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
  const mediaList = json?.data?.Page?.media || [];

  // Because the rest of the app uses Jikan/MAL IDs, we must ensure idMal exists
  const validMedia = mediaList.filter(
    (m: any) => m.idMal != null && ALLOWED_FORMATS.includes(m.format)
  );

  if (validMedia.length > 0) {
    const selectedMedia = pickRandomItem(validMedia) as { idMal: number };
    return selectedMedia.idMal;
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
        let malId = await fetchAniListRandom();

        // If by rare chance that specific page had no valid items, try exactly one more time
        if (!malId) {
          malId = await fetchAniListRandom();
        }

        if (malId) {
          // Use replace: true so the user doesn't have to hit "back" twice
          navigate(`/read/${malId}`, { replace: true });
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