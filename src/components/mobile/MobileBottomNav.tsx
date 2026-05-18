import React, { useState } from 'react';
import { Home, Compass, Calendar, Bookmark, User } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from '../shared/AuthModal';

const NAV_ITEMS = [
    { label: 'Home', to: '/home', icon: Home },
    { label: 'Discover', to: '/browse', icon: Compass },
    { label: 'Schedule', to: '/schedule', icon: Calendar },
    { label: 'My List', to: '/bookmarks', icon: Bookmark },
    { label: 'Profile', to: '', icon: User, isProfile: true },
];

const MobileBottomNav: React.FC = () => {
    const { user, profile } = useAuth();
    const location = useLocation();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    return (
        <>
            <div className="fixed bottom-[calc(20px+env(safe-area-inset-bottom))] inset-x-0 z-[990] flex justify-center px-6 lg:hidden pointer-events-none">
                <motion.nav
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28, delay: 0.08 }}
                    className="pointer-events-auto flex items-center gap-1 px-3 py-2.5 rounded-[28px]"
                    style={{
                        background: 'color-mix(in srgb, var(--app-surface-1) 70%, transparent)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset',
                    }}
                >
                    {NAV_ITEMS.map((item) => {
                        const to = item.isProfile ? (user ? `/profile/${user.id}` : '#') : item.to;
                        const isActive = to !== '#' && location.pathname.startsWith(item.to);

                        return (
                            <NavLink
                                key={item.label}
                                to={to}
                                onClick={(e) => {
                                    if (!user && item.isProfile) {
                                        e.preventDefault();
                                        setIsAuthModalOpen(true);
                                    }
                                }}
                                className="relative flex items-center justify-center w-12 h-11 rounded-[20px] outline-none select-none"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {/* Active pill background */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.span
                                            layoutId="navPill"
                                            className="absolute inset-0 rounded-[20px]"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                            style={{
                                                background: 'color-mix(in srgb, var(--app-accent) 15%, transparent)',
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Icon / avatar */}
                                <motion.div
                                    whileTap={{ scale: 0.82 }}
                                    transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                                    className="relative z-10"
                                >
                                    {item.isProfile && profile?.avatar_url ? (
                                        <img
                                            src={profile.avatar_url}
                                            alt="Profile"
                                            className="w-7 h-7 rounded-full object-cover transition-opacity duration-200"
                                            style={{
                                                opacity: isActive ? 1 : 0.5,
                                                outline: isActive ? '2px solid var(--app-accent)' : '2px solid transparent',
                                                outlineOffset: '1px',
                                            }}
                                        />
                                    ) : (
                                        <item.icon
                                            size={20}
                                            strokeWidth={isActive ? 2.2 : 1.8}
                                            style={{
                                                color: isActive ? 'var(--app-accent)' : 'rgba(255,255,255,0.35)',
                                                transition: 'color 0.2s, filter 0.2s',
                                                filter: isActive
                                                    ? 'drop-shadow(0 0 6px color-mix(in srgb, var(--app-accent) 60%, transparent))'
                                                    : 'none',
                                            }}
                                        />
                                    )}
                                </motion.div>
                            </NavLink>
                        );
                    })}
                </motion.nav>
            </div>

            <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </>
    );
};

export default MobileBottomNav;