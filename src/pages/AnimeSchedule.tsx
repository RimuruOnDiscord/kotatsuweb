import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Star, AlertCircle, CalendarDays } from 'lucide-react';

// --- Shared Design Tokens & Animation Styles ---
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500;600;700&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-card:        var(--app-card);
    --aw-border:      var(--app-border);
    --aw-border-hi:   var(--app-border-hover);
    --aw-accent:      var(--app-accent);
    --aw-accent-2:    var(--app-accent);
    --aw-accent-dim:  var(--app-accent-muted);
    --aw-accent-glow: var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { font-family: var(--aw-font-body); background: transparent; color: var(--aw-text); }
  
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

// --- Raw API Data ---
const RAW_API_RESPONSE = {
    "page": 1, "perPage": 20, "total": 5000, "hasNextPage": true,
    "results": [
        { "id": 189046, "title": { "romaji": "Re:Zero kara Hajimeru Isekai Seikatsu 4th Season", "english": "Re:ZERO -Starting Life in Another World- Season 4" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx189046-yaHWtS5FII46.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx189046-yaHWtS5FII46.jpg" }, "bannerImage": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/189046-MDk2CaVuRWpb.jpg", "format": "TV", "averageScore": 86, "genres": ["Action", "Adventure", "Drama", "Fantasy"], "studios": { "nodes": [{ "name": "WHITE FOX" }] }, "nextAiringEpisode": { "episode": 3, "airingAt": 1776862800 } },
        { "id": 198939, "title": { "romaji": "Jidou Hanbaiki ni Umarekawatta Ore wa Meikyuu wo Samayou 3rd Season", "english": "Reborn as a Vending Machine, I Now Wander the Dungeon Season 3" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx198939-95aqzBr0Lzcv.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx198939-95aqzBr0Lzcv.jpg" }, "bannerImage": null, "format": "TV", "averageScore": 63, "genres": ["Action", "Comedy", "Fantasy"], "studios": { "nodes": [{ "name": "AXsiZ" }] }, "nextAiringEpisode": { "episode": 4, "airingAt": 1776862800 } },
        { "id": 199029, "title": { "romaji": "Kanojo, Okarishimasu 5th Season", "english": "Rent-a-Girlfriend Season 5" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx199029-8eMkhHlD62Ik.png", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199029-8eMkhHlD62Ik.png" }, "bannerImage": null, "format": "ONA", "averageScore": 57, "genres": ["Comedy", "Romance"], "studios": { "nodes": [{ "name": "TMS Entertainment" }] }, "nextAiringEpisode": { "episode": 3, "airingAt": 1776862800 } },
        { "id": 173172, "title": { "romaji": "Dorohedoro Season 2", "english": "Dorohedoro Season 2" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx173172-404XnuOS0DhR.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx173172-404XnuOS0DhR.jpg" }, "bannerImage": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/173172-tkPQqLzfnxYN.jpg", "format": "ONA", "averageScore": 79, "genres": ["Action", "Comedy", "Fantasy"], "studios": { "nodes": [{ "name": "MAPPA" }] }, "nextAiringEpisode": { "episode": 6, "airingAt": 1776866400 } },
        { "id": 194317, "title": { "romaji": "Saikyou no Ousama, Nidome no Jinsei wa Nani wo Suru? 2nd Season", "english": "The Beginning After the End Season 2" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx194317-M7t2ymBDHqyW.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx194317-M7t2ymBDHqyW.jpg" }, "bannerImage": null, "format": "TV", "averageScore": 55, "genres": ["Action", "Adventure", "Fantasy"], "studios": { "nodes": [{ "name": "studio A-CAT" }] }, "nextAiringEpisode": { "episode": 4, "airingAt": 1776868200 } },
        { "id": 199588, "title": { "romaji": "Otaku ni Yasashii Gal wa Inai!?", "english": "Gals Can't Be Kind to Otaku!?" }, "coverImage": { "large": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx199588-M2vtWicvqNbU.jpg", "extraLarge": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199588-M2vtWicvqNbU.jpg" }, "bannerImage": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/199588-I4HoR4YjnpqD.jpg", "format": "TV", "averageScore": 73, "genres": ["Comedy", "Romance"], "studios": { "nodes": [{ "name": "TMS Entertainment" }] }, "nextAiringEpisode": { "episode": 3, "airingAt": 1776869100 } },
    ]
};

// --- Framer Motion Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1, 
        transition: { staggerChildren: 0.06, delayChildren: 0.05 } 
    },
    exit: { opacity: 0, transition: { staggerChildren: 0.03, staggerDirection: -1 } }
};

const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { type: 'spring', damping: 22, stiffness: 220 }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const dayItemVariants = {
    hidden: { opacity: 0, x: -15 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const AnimeSchedule: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'weekly' | 'upcoming'>('weekly');
    const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);

    useEffect(() => {
        document.title = 'Schedule';
        const id = 'aw-schedule-styles';
        if (!document.getElementById(id)) {
            const tag = document.createElement('style');
            tag.id = id;
            tag.textContent = DESIGN_STYLES;
            document.head.appendChild(tag);
        }
    }, []);

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

    useEffect(() => {
        const todayIdx = weekDays.findIndex(d => d.isToday);
        if (todayIdx !== -1) setSelectedDayIndex(todayIdx);
    }, [weekDays]);

    useEffect(() => {
        const fetchAPI = async () => {
            setIsLoading(true);
            try {
                await new Promise(res => setTimeout(res, 400)); 

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
            <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[var(--aw-accent)]/5 blur-[120px]" />
            <div className="pointer-events-none fixed bottom-0 right-1/4 h-[400px] w-[600px] rounded-full bg-[var(--aw-accent)]/5 blur-[120px]" />

            <div style={{
                position: 'sticky', top: 0, zIndex: 60,
                borderBottom: '1px solid var(--aw-border)',
                background: 'rgba(7,7,13,0.85)',
                backdropFilter: 'blur(20px)',
            }}>
                {/* AppTopbar Goes Here */}
            </div>

            <main className="relative z-10 mx-auto w-full max-w-[1540px] space-y-6 px-4 md:px-6 lg:px-8 py-10 md:py-12">

                {/* --- Top Navigation Tabs --- */}
                <div className="flex items-center gap-6 md:gap-8 border-b border-[var(--aw-border)] pb-[1px]">
                    {['weekly', 'upcoming'].map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`group relative flex items-center gap-2 pb-3 text-[14px] md:text-[15px] font-bold tracking-wide transition-all duration-300 ${isActive ? 'text-[var(--aw-accent)]' : 'text-[var(--aw-muted)] hover:text-white'}`}
                                style={{ fontFamily: 'var(--aw-font-display)' }}
                            >
                                {tab === 'weekly' ? (
                                    <Calendar size={18} className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                                ) : (
                                    <Clock size={18} className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                                )}
                                
                                {tab === 'weekly' ? 'Weekly Schedule' : 'Upcoming Releases'}
                                
                                {tab === 'upcoming' && (
                                    <span className={`ml-0.5 flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black border transition-colors ${isActive ? 'bg-[var(--aw-accent)] text-[#04110d] border-[var(--aw-accent)] shadow-[0_0_10px_var(--aw-accent-glow)]' : 'bg-[color-mix(in_srgb,var(--aw-accent),transparent_90%)] text-[var(--aw-muted)] border-transparent group-hover:border-[var(--aw-border)]'}`}>
                                        {scheduleData.length}
                                    </span>
                                )}

                                {isActive && (
                                    <motion.div 
                                        layoutId="schedule-tab"
                                        className="absolute bottom-0 left-0 h-[2px] w-full bg-[var(--aw-accent)] shadow-[0_0_15px_var(--aw-accent-glow)] rounded-t-full"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* --- Animated Day Selector --- */}
                <AnimatePresence mode="popLayout">
                    {activeTab === 'weekly' && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <motion.div 
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="flex items-center gap-3 md:gap-4 overflow-x-auto py-4 aw-scrollbar-hide"
                            >
                                {weekDays.map((day, idx) => {
                                    const isActive = idx === selectedDayIndex;
                                    return (
                                        <motion.button
                                            key={idx}
                                            variants={dayItemVariants}
                                            onClick={() => setSelectedDayIndex(idx)}
                                            // Using theme accent mixed with transparent to guarantee a tinted bg
                                            className={`group relative flex flex-col items-center justify-center rounded-[18px] min-w-[80px] h-[92px] transition-all duration-300 border ${
                                                isActive
                                                    ? 'border-transparent text-white'
                                                    : 'border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-accent),transparent_96%)] hover:border-[var(--aw-accent-dim)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_90%)] hover:-translate-y-1'
                                            }`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeDayBg"
                                                    className="absolute inset-0 rounded-[18px] bg-[color-mix(in_srgb,var(--aw-accent),transparent_85%)] border border-[var(--aw-accent)] shadow-[0_8px_25px_-5px_rgba(var(--aw-accent-glow),0.25)]"
                                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                                />
                                            )}
                                            <span className={`relative z-10 text-[12px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-[var(--aw-accent)]' : 'text-[var(--aw-muted)] group-hover:text-white'}`} style={{ fontFamily: 'var(--aw-font-display)' }}>
                                                {day.name}
                                            </span>
                                            <span className={`relative z-10 mt-0.5 text-[26px] font-black transition-colors ${isActive ? 'text-white' : 'text-[var(--aw-muted)] group-hover:text-white'}`} style={{ fontFamily: 'var(--aw-font-display)' }}>
                                                {day.date}
                                            </span>
                                            {day.isToday && !isActive && (
                                                <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[var(--aw-accent)] shadow-[0_0_8px_var(--aw-accent)] animate-pulse" />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- Schedule Grid --- */}
                <div className="pt-2">
                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="h-[150px] w-full rounded-[20px] bg-[color-mix(in_srgb,var(--aw-accent),transparent_96%)] border border-[var(--aw-border)] animate-pulse" />
                            ))}
                        </div>
                    ) : displayedAnime.length > 0 ? (
                        <motion.div 
                            key={activeTab + selectedDayIndex}
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        >
                            {displayedAnime.map((item) => (
                                <motion.div 
                                    key={item.id} 
                                    layout
                                    variants={cardVariants}
                                    whileHover={{ 
                                        scale: 1.03, 
                                        y: -4,
                                        transition: { type: "spring", stiffness: 400, damping: 25 }
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate(`/watch/${item.id}`)}
                                    // Deep tint using global accent instead of white/opacity
                                    className="group relative flex h-[150px] w-full cursor-pointer gap-4 overflow-hidden rounded-[20px] bg-[color-mix(in_srgb,var(--aw-accent),transparent_96%)] p-3 select-none border border-[var(--aw-border)] hover:border-[var(--aw-accent)]/40 hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_90%)] transition-all duration-300 ease-out"
                                >
                                    {/* Left: Image Container */}
                                    <div className="relative h-full aspect-[3/4] flex-shrink-0 overflow-hidden rounded-[12px] bg-[color-mix(in_srgb,var(--aw-accent),transparent_94%)] shadow-sm border border-[var(--aw-border)]">
                                        <motion.img
                                            src={item.coverImage}
                                            alt={item.title}
                                            className="h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-hover:rotate-1 pointer-events-none"
                                        />
                                    </div>

                                    {/* Right: Content Layout */}
                                    <div className="flex flex-col min-w-0 flex-1 py-0.5">
                                        
                                        {/* Row 1: Badges & Score */}
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex gap-2">
                                                {/* Themed Pill Backgrounds */}
                                                <span className="rounded bg-[color-mix(in_srgb,var(--aw-accent),transparent_86%)] px-2 py-0.5 text-[11px] font-bold tracking-wide text-white shadow-sm border border-[var(--aw-border)] transition-colors group-hover:bg-[var(--aw-accent)] group-hover:text-[#04110d] group-hover:border-transparent" style={{ fontFamily: 'var(--aw-font-display)' }}>
                                                    Episode {item.episode}
                                                </span>
                                                {item.format && (
                                                    <span className="rounded bg-[color-mix(in_srgb,var(--aw-accent),transparent_92%)] px-2 py-0.5 text-[11px] font-bold tracking-wide text-[var(--aw-muted)] border border-[var(--aw-border)]" style={{ fontFamily: 'var(--aw-font-display)' }}>
                                                        {item.format}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 2: Title */}
                                        <h3 className="line-clamp-2 text-[14px] sm:text-[15px] font-bold leading-snug text-white/95 mb-1 transition-colors duration-300 group-hover:text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>
                                            {item.title}
                                        </h3>
                                        
                                        {/* Row 3: Studio & Genres */}
                                        <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--aw-muted)] opacity-80 line-clamp-1 mb-auto transition-colors duration-300 group-hover:opacity-100" style={{ fontFamily: 'var(--aw-font-body)' }}>
                                            <span className="truncate">{item.studio}</span>
                                            {item.genres.length > 0 && (
                                                <>
                                                    <span className="h-1 w-1 rounded-full bg-[var(--aw-border-hi)] flex-shrink-0"></span>
                                                    <span className="truncate">{item.genres.slice(0, 2).join(', ')}</span>
                                                </>
                                            )}
                                        </p>

                                        {/* Row 4: Bottom Time Pill */}
                                        <div className="mt-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--aw-accent),transparent_92%)] px-3 py-1 text-[11px] font-bold text-[var(--aw-muted)] border border-[var(--aw-border)] transition-colors duration-300 ease-out group-hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_88%)] group-hover:text-[var(--aw-accent)] group-hover:border-[var(--aw-accent)]/30" style={{ fontFamily: 'var(--aw-font-display)' }}>
                                                {activeTab === 'upcoming' ? <CalendarDays size={13} strokeWidth={2.5} /> : <Clock size={13} strokeWidth={2.5} />}
                                                {activeTab === 'upcoming' ? item.fullDateString : item.time}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="flex flex-col items-center justify-center py-24 px-4 text-center rounded-[24px] bg-[color-mix(in_srgb,var(--aw-accent),transparent_97%)] border border-[var(--aw-border)] shadow-inner backdrop-blur-sm"
                        >
                            <AlertCircle size={48} className="mb-4 text-[var(--aw-muted)] opacity-50" />
                            <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>No schedule found</p>
                            <p className="text-sm mt-2 font-medium text-[var(--aw-muted)] max-w-md">There are no episodes confirmed to air on this date right now. Check back later or browse upcoming releases.</p>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AnimeSchedule;