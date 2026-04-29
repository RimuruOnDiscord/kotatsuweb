import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLoader from '../components/shared/PageLoader';

const ANILIST_ANIME_RANDOM_QUERY = `
  query RandomSafeAnime($page: Int) {
    Page(page: $page, perPage: 25) {
      media(
        type: ANIME,
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

// Standard anime formats
const ALLOWED_ANIME_FORMATS = ['TV', 'MOVIE', 'OVA', 'SPECIAL'];

interface AniListMedia {
  title: {
    romaji: string | null;
    english: string | null;
  };
  format: string;
}

const pickRandomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const fetchAniListRandomAnimeSlug = async (): Promise<string | null> => {
  // Pick from the top ~3750 anime (150 pages * 25 items)
  const randomPage = Math.floor(Math.random() * 150) + 1;

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: ANILIST_ANIME_RANDOM_QUERY,
      variables: { page: randomPage },
    }),
  });

  const json = await res.json();
  const mediaList: AniListMedia[] = json?.data?.Page?.media || [];

  const validMedia = mediaList.filter(
    (m) => (m.title.romaji || m.title.english) && ALLOWED_ANIME_FORMATS.includes(m.format)
  );

  if (validMedia.length > 0) {
    const selectedMedia = pickRandomItem(validMedia);
    const titleToUse = selectedMedia.title.romaji || selectedMedia.title.english || '';
    return slugify(titleToUse);
  }

  return null;
};

const AniRandom: React.FC = () => {
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const executeRandom = async () => {
      try {
        let slug = await fetchAniListRandomAnimeSlug();

        if (!slug) {
          slug = await fetchAniListRandomAnimeSlug();
        }

        if (slug) {
          // Navigate to the watch route for anime
          navigate(`/watch/${slug}`, { replace: true });
          return;
        }
      } catch (e) {
        console.error('AniList anime random fetch failed:', e);
      }

      // Fallback to anime home
      navigate('/anihome', { replace: true });
    };

    executeRandom();
  }, [navigate]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center">
      <PageLoader size={40} />
    </div>
  );
};

export default AniRandom;