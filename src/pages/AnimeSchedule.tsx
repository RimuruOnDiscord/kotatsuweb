import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Star, Play, AlertCircle, CalendarDays } from 'lucide-react';
import AppTopbar from '../components/AppTopbar';

// --- Shared Design Tokens & Animation Styles ---
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500;600;700&display=swap');

  :root {
    --aw-bg:          #07070d;
    --aw-s1:          #12121a;
    --aw-s2:          #1a1a24;
    --aw-card:        #161620;
    --aw-border:      rgba(255,255,255,0.05);
    --aw-border-hi:   rgba(255,255,255,0.15);
    --aw-accent:      #8b5cf6;
    --aw-accent-glow: rgba(139, 92, 246, 0.5);
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { font-family: var(--aw-font-body); background: var(--aw-bg); color: var(--aw-text); }
  
  .aw-noise::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 180px;
  }

  .aw-scrollbar-hide::-webkit-scrollbar { display: none; }
  .aw-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

  /* --- Enhanced Animations --- */
  
  /* Container enter animation */
  @keyframes gridEnter {
    0% { opacity: 0; transform: translateY(15px); filter: blur(4px); }
    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  .animate-grid-enter {
    animation: gridEnter 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }

  /* Staggered Card Animation */
  @keyframes cardPopIn {
    0% { opacity: 0; transform: translateY(20px) scale(0.95); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .animate-card-pop {
    animation: cardPopIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0; /* Keeps hidden until delay finishes */
  }

  /* Day Selector Ripple In */
  @keyframes slideInRight {
    0% { opacity: 0; transform: translateX(20px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .animate-slide-in-right {
    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }
`;

// --- Interfaces ---
interface ScheduleItem {
    id: string;
    title: string;
    nativeTitle: string;
    coverImage: string;
    bannerImage: string | null;
    format: string;
    episode: number;
    time: string;
    fullDateString: string;
    timestamp: number;
    score: number;
    dayOfWeek: number;
    studio: string;
    genres: string[];
}

// --- Raw API Data (From your animeapi /schedule payload) ---
const RAW_API_RESPONSE = {
    "page": 1, "perPage": 20, "total": 5000, "hasNextPage": true,
    "results": [
        { "id": 189046, "title": { "romaji": "Re:Zero kara Hajimeru Isekai Seikatsu 4th Season", "english": "Re:ZERO -Starting Life in Another World- Season 4", "native": "Re:ゼロから始める異世界生活 4th season" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx189046-yaHWtS5FII46.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx189046-yaHWtS5FII46.jpg" }, "bannerImage": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/189046-MDk2CaVuRWpb.jpg", "format": "TV", "averageScore": 86, "genres": ["Action", "Adventure", "Drama", "Fantasy"], "studios": { "nodes": [{ "name": "WHITE FOX" }] }, "nextAiringEpisode": { "episode": 3, "airingAt": 1776862800 } },
        { "id": 198939, "title": { "romaji": "Jidou Hanbaiki ni Umarekawatta Ore wa Meikyuu wo Samayou 3rd Season", "english": "Reborn as a Vending Machine, I Now Wander the Dungeon Season 3", "native": "自動販売機に生まれ変わった俺は迷宮を彷徨う 3rd Season" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx198939-95aqzBr0Lzcv.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx198939-95aqzBr0Lzcv.jpg" }, "bannerImage": null, "format": "TV", "averageScore": 63, "genres": ["Action", "Comedy", "Fantasy"], "studios": { "nodes": [{ "name": "AXsiZ" }] }, "nextAiringEpisode": { "episode": 4, "airingAt": 1776862800 } },
        { "id": 199029, "title": { "romaji": "Kanojo, Okarishimasu 5th Season", "english": "Rent-a-Girlfriend Season 5", "native": "彼女、お借りします 第5期" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx199029-8eMkhHlD62Ik.png", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199029-8eMkhHlD62Ik.png" }, "bannerImage": null, "format": "ONA", "averageScore": 57, "genres": ["Comedy", "Romance"], "studios": { "nodes": [{ "name": "TMS Entertainment" }] }, "nextAiringEpisode": { "episode": 3, "airingAt": 1776862800 } },
        { "id": 173172, "title": { "romaji": "Dorohedoro Season 2", "english": "Dorohedoro Season 2", "native": "ドロヘドロ Season 2" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx173172-404XnuOS0DhR.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx173172-404XnuOS0DhR.jpg" }, "bannerImage": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/173172-tkPQqLzfnxYN.jpg", "format": "ONA", "averageScore": 79, "genres": ["Action", "Comedy", "Fantasy"], "studios": { "nodes": [{ "name": "MAPPA" }] }, "nextAiringEpisode": { "episode": 6, "airingAt": 1776866400 } },
        { "id": 194317, "title": { "romaji": "Saikyou no Ousama, Nidome no Jinsei wa Nani wo Suru? 2nd Season", "english": "The Beginning After the End Season 2", "native": "最強の王様、二度目の人生は 何をする? 第2期" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx194317-M7t2ymBDHqyW.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx194317-M7t2ymBDHqyW.jpg" }, "bannerImage": null, "format": "TV", "averageScore": 55, "genres": ["Action", "Adventure", "Fantasy"], "studios": { "nodes": [{ "name": "studio A-CAT" }] }, "nextAiringEpisode": { "episode": 4, "airingAt": 1776868200 } },
        { "id": 199588, "title": { "romaji": "Otaku ni Yasashii Gal wa Inai!?", "english": "Gals Can't Be Kind to Otaku!?", "native": "オタクに優しいギャルはいない!?" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx199588-M2vtWicvqNbU.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199588-M2vtWicvqNbU.jpg" }, "bannerImage": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/199588-I4HoR4YjnpqD.jpg", "format": "TV", "averageScore": 73, "genres": ["Comedy", "Romance"], "studios": { "nodes": [{ "name": "TMS Entertainment" }] }, "nextAiringEpisode": { "episode": 3, "airingAt": 1776869100 } },
        { "id": 180228, "title": { "romaji": "Ganbare! Nakamura-kun!!", "english": "Go For It, Nakamura-kun!!", "native": "ガンバレ！中村くん！！" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx180228-MuZ7adbGiYVj.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx180228-MuZ7adbGiYVj.jpg" }, "bannerImage": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/180228-WAvqro5AamHj.jpg", "format": "ONA", "averageScore": 75, "genres": ["Comedy", "Romance", "Slice of Life"], "studios": { "nodes": [{ "name": "Drive" }] }, "nextAiringEpisode": { "episode": 5, "airingAt": 1776871800 } },
        { "id": 199221, "title": { "romaji": "Dr. STONE: SCIENCE FUTURE Part 3", "english": "Dr. STONE SCIENCE FUTURE Cour 3", "native": "Dr.STONE SCIENCE FUTURE 3クール" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx199221-TReDQMNhslHu.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199221-TReDQMNhslHu.jpg" }, "bannerImage": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/199221-b3W0FfJd4zMy.jpg", "format": "TV", "averageScore": 81, "genres": ["Action", "Adventure", "Sci-Fi"], "studios": { "nodes": [{ "name": "TMS Entertainment" }] }, "nextAiringEpisode": { "episode": 4, "airingAt": 1776949200 } },
        { "id": 186497, "title": { "romaji": "Koori no Jouheki", "english": "The Ramparts of Ice", "native": "氷の城壁" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx186497-uwPrNPphXvjP.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx186497-uwPrNPphXvjP.jpg" }, "bannerImage": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/186497-naXtQFMHJaR1.jpg", "format": "TV", "averageScore": 76, "genres": ["Comedy", "Romance", "Slice of Life"], "studios": { "nodes": [{ "name": "Studio KAI" }] }, "nextAiringEpisode": { "episode": 4, "airingAt": 1776956160 } },
    ]
};

const AnimeSchedule: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'weekly' | 'upcoming'>('weekly');
    const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
    
    // Animation trigger state
    const [animationKey, setAnimationKey] = useState<number>(0);

    // Inject Design Styles
    useEffect(() => {
        const id = 'aw-schedule-styles';
        if (!document.getElementById(id)) {
            const tag = document.createElement('style');
            tag.id = id;
            tag.textContent = DESIGN_STYLES;
            document.head.appendChild(tag);
        }
    }, []);

    // Trigger grid re-animation whenever tab or day changes
    useEffect(() => {
        setAnimationKey(prev => prev + 1);
    }, [activeTab, selectedDayIndex]);

    // Generate Week Days (Mon-Sun) anchored to the current week
    const weekDays = useMemo(() => {
        const days = [];
        const today = new Date();
        const currentDay = today.getDay();
        const diffToMonday = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(diffToMonday + i);
            days.push({
                name: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
                date: d.getDate(),
                dayOfWeek: d.getDay(),
                isToday: d.toDateString() === today.toDateString(),
            });
        }
        return days;
    }, []);

    // Set default selected day to today
    useEffect(() => {
        const todayIdx = weekDays.findIndex(d => d.isToday);
        if (todayIdx !== -1) setSelectedDayIndex(todayIdx);
    }, [weekDays]);

    // Fetch from API & Map
    useEffect(() => {
        const fetchAPI = async () => {
            setIsLoading(true);
            try {
                // Fake network delay for smooth UX transition
                await new Promise(res => setTimeout(res, 600)); 

                const parsed: ScheduleItem[] = RAW_API_RESPONSE.results.map((item: any) => {
                    const originalDate = new Date(item.nextAiringEpisode.airingAt * 1000);
                    
                    return {
                        id: String(item.id),
                        title: item.title?.english || item.title?.romaji || 'Unknown Title',
                        nativeTitle: item.title?.native || '',
                        coverImage: item.coverImage?.extraLarge || item.coverImage?.large,
                        bannerImage: item.bannerImage || null,
                        format: item.format || 'TV',
                        episode: item.nextAiringEpisode?.episode || 1,
                        time: originalDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        fullDateString: originalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        timestamp: originalDate.getTime(),
                        dayOfWeek: originalDate.getDay(),
                        score: item.averageScore || 0,
                        studio: item.studios?.nodes?.[0]?.name || 'Unknown Studio',
                        genres: item.genres || []
                    };
                });
                
                setScheduleData(parsed);

            } catch (err) {
                console.error('API Request Failed', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAPI();
    }, []);

    // Compute exactly what to display based on the active tab and selected day
    const displayedAnime = useMemo(() => {
        if (activeTab === 'upcoming') {
            return [...scheduleData].sort((a, b) => a.timestamp - b.timestamp);
        } else {
            const activeDay = weekDays[selectedDayIndex];
            return scheduleData
                .filter(a => a.dayOfWeek === activeDay?.dayOfWeek)
                .sort((a, b) => {
                    const dateA = new Date(a.timestamp);
                    const dateB = new Date(b.timestamp);
                    return (dateA.getHours() * 60 + dateA.getMinutes()) - (dateB.getHours() * 60 + dateB.getMinutes());
                });
        }
    }, [scheduleData, activeTab, selectedDayIndex, weekDays]);

    return (
        <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden pb-12">
            
            {/* Background Accent Glows */}
            <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[var(--aw-accent)]/5 blur-[120px]" />
            <div className="pointer-events-none fixed bottom-0 right-1/4 h-[400px] w-[600px] rounded-full bg-[var(--aw-accent)]/5 blur-[120px]" />

            <div style={{
                position: 'sticky', top: 0, zIndex: 60,
                borderBottom: '1px solid var(--aw-border)',
                background: 'rgba(7,7,13,0.85)',
                backdropFilter: 'blur(20px)',
            }}>
            </div>

            <main className="relative z-10 mx-auto w-full max-w-[1460px] space-y-6 px-6 py-10 md:py-12">

                {/* --- Top Navigation Tabs --- */}
                <div className="flex items-center gap-6 md:gap-8 border-b border-white/5 pb-[1px]">
                    <button
                        onClick={() => setActiveTab('weekly')}
                        className={`group relative flex items-center gap-2 pb-3 text-[14px] md:text-[15px] font-bold tracking-wide transition-all duration-300 ${activeTab === 'weekly' ? 'text-[var(--aw-accent)]' : 'text-zinc-400 hover:text-white'}`}
                        style={{ fontFamily: 'var(--aw-font-display)' }}
                    >
                        <Calendar size={18} className={`transition-transform duration-300 ${activeTab === 'weekly' ? 'scale-110' : ''}`} />
                        Weekly Schedule
                        {activeTab === 'weekly' && (
                            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[var(--aw-accent)] shadow-[0_0_10px_var(--aw-accent-glow)] rounded-t-full transition-all" />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`group relative flex items-center gap-2 pb-3 text-[14px] md:text-[15px] font-bold tracking-wide transition-all duration-300 ${activeTab === 'upcoming' ? 'text-[var(--aw-accent)]' : 'text-zinc-400 hover:text-white'}`}
                        style={{ fontFamily: 'var(--aw-font-display)' }}
                    >
                        <Clock size={18} className={`transition-transform duration-300 ${activeTab === 'upcoming' ? 'scale-110' : ''}`} />
                        Upcoming Releases
                        <span className={`ml-0.5 flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black border transition-colors ${activeTab === 'upcoming' ? 'bg-[var(--aw-accent)] text-white border-[var(--aw-accent)]' : 'bg-[var(--aw-s2)] text-zinc-400 border-white/5 group-hover:border-white/10'}`}>
                            {scheduleData.length}
                        </span>
                        {activeTab === 'upcoming' && (
                            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[var(--aw-accent)] shadow-[0_0_10px_var(--aw-accent-glow)] rounded-t-full transition-all" />
                        )}
                    </button>
                </div>

                {/* --- Conditional Day Selector (Only in Weekly View) --- */}
                {activeTab === 'weekly' && (
                    <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pt-4 pb-6 aw-scrollbar-hide -mt-2">
                        {weekDays.map((day, idx) => {
                            const isActive = idx === selectedDayIndex;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDayIndex(idx)}
                                    className={`animate-slide-in-right group relative flex flex-col items-center justify-center rounded-[14px] min-w-[76px] h-[88px] transition-all duration-300 border ${isActive
                                        ? 'border-[var(--aw-accent)] bg-[var(--aw-s2)] shadow-[0_4px_20px_rgba(0,0,0,0.5)] transform -translate-y-1'
                                        : 'border-white/5 bg-[var(--aw-s1)] hover:border-white/10 hover:bg-[var(--aw-s2)] hover:-translate-y-1'
                                        }`}
                                    style={{ animationDelay: `${idx * 0.05}s` }}
                                >
                                    <span className={`text-[12px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-[var(--aw-accent)]' : 'text-zinc-500 group-hover:text-zinc-400'}`} style={{ fontFamily: 'var(--aw-font-display)' }}>
                                        {day.name}
                                    </span>
                                    <span className={`mt-0.5 text-[24px] font-black transition-colors ${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`} style={{ fontFamily: 'var(--aw-font-display)' }}>
                                        {day.date}
                                    </span>
                                    {day.isToday && !isActive && (
                                        <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[var(--aw-accent)] shadow-[0_0_8px_var(--aw-accent)] animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* --- Schedule Grid --- */}
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-44 w-full animate-pulse rounded-2xl bg-[var(--aw-s1)] border border-white/5" />
                        ))}
                    </div>
                ) : displayedAnime.length > 0 ? (
                    <div key={animationKey} className="animate-grid-enter grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-2">
                        {displayedAnime.map((item, i) => (
                            <div 
                                key={item.id} 
                                onClick={() => navigate(`/watch/${item.id}`)}
                                className="animate-card-pop group relative flex h-44 w-full cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-[var(--aw-s1)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--aw-accent)] hover:shadow-[0_8px_30px_-10px_var(--aw-accent-glow)]"
                                style={{ animationDelay: `${i * 0.06}s` }}
                            >
                                {/* Banner Background Mask */}
                                <div className="absolute inset-0 z-0">
                                    <img 
                                        src={item.bannerImage || item.coverImage} 
                                        alt="" 
                                        className="h-full w-full object-cover opacity-20 transition-transform duration-700 ease-out group-hover:scale-110 group-hover:opacity-30" 
                                    />
                                    {/* Clean gradient to merge poster and text area */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--aw-s1)] via-[var(--aw-s1)]/95 to-[var(--aw-s1)]/40" />
                                </div>

                                {/* Vertical Poster Cover */}
                                <div className="relative z-10 w-28 shrink-0 sm:w-32 bg-[var(--aw-s2)] border-r border-white/5 overflow-hidden">
                                    <img 
                                        src={item.coverImage} 
                                        alt={item.title} 
                                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
                                    />
                                </div>

                                {/* Detail Content */}
                                <div className="relative z-10 flex flex-1 flex-col justify-between py-3 px-4">
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            {/* Smart Date/Time Badge based on Tab - FIXED border styling here */}
                                            {activeTab === 'upcoming' ? (
                                                <span 
                                                    className="flex items-center gap-1.5 rounded-md bg-[var(--aw-accent)]/10 px-2 py-1 text-[11px] font-bold text-[var(--aw-accent)] border backdrop-blur-sm shadow-sm"
                                                    style={{ borderColor: 'var(--aw-accent)' }}
                                                >
                                                    <CalendarDays size={12} strokeWidth={2.5} />
                                                    {item.fullDateString}
                                                </span>
                                            ) : (
                                                <span 
                                                    className="flex items-center gap-1.5 rounded-md bg-[var(--aw-accent)]/10 px-2 py-1 text-[11px] font-bold text-[var(--aw-accent)] border backdrop-blur-sm shadow-sm"
                                                    style={{ borderColor: 'var(--aw-accent)' }}
                                                >
                                                    <Clock size={12} strokeWidth={2.5} />
                                                    {item.time}
                                                </span>
                                            )}
                                            
                                            <span className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/5">
                                                Ep {item.episode}
                                            </span>
                                        </div>
                                        
                                        <h3 
                                            className="line-clamp-2 text-sm sm:text-[15px] font-bold leading-snug text-white transition-all duration-300 group-hover:text-[var(--aw-accent)] group-hover:translate-x-1" 
                                            style={{ fontFamily: 'var(--aw-font-display)' }}
                                        >
                                            {item.title}
                                        </h3>
                                        
                                        <p className="mt-1.5 line-clamp-1 text-[11px] font-medium text-zinc-400 transition-all duration-300 group-hover:translate-x-1">
                                            {item.studio} <span className="opacity-40 mx-1">•</span> {item.genres.slice(0, 2).join(', ')}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                            {item.score > 0 ? (
                                                <span className="flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 text-xs font-bold text-yellow-400 backdrop-blur-md border border-white/5">
                                                    <Star size={11} className="fill-yellow-400" />
                                                    {item.score}%
                                                </span>
                                            ) : (
                                                <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 backdrop-blur-md border border-white/5">
                                                    TBA
                                                </span>
                                            )}
                                        </div>
                                        {/* Animated Play Button */}
                                        <button className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition-all duration-300 group-hover:scale-110 group-hover:bg-[var(--aw-accent)] group-hover:text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_15px_var(--aw-accent-glow)]">
                                            <Play size={12} className="ml-0.5" fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div key={`empty-${animationKey}`} className="animate-grid-enter flex flex-col items-center justify-center py-24 text-zinc-500">
                        <AlertCircle size={56} className="mb-4 opacity-20" />
                        <p className="text-xl font-bold text-zinc-300" style={{ fontFamily: 'var(--aw-font-display)' }}>No schedule found</p>
                        <p className="text-sm mt-1.5 font-medium">There are no episodes airing on this date right now.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AnimeSchedule;