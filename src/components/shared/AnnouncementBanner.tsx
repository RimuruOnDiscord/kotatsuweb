import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Pause } from 'lucide-react';

const DISMISS_KEY = 'kotatsu:announcement-dismissed';
const ANNOUNCEMENT_ID = 'postpone-2026-05';

const AnnouncementBanner = () => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
      if (dismissed[ANNOUNCEMENT_ID]) return;
    } catch { /* noop */ }
    const timer = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setMounted(true), 50);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setMounted(false);
    setTimeout(() => setVisible(false), 500);
    try {
      const dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
      dismissed[ANNOUNCEMENT_ID] = Date.now();
      localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
    } catch { /* noop */ }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="relative z-[50] w-full"
        >
          <div className="relative px-4 py-3 sm:px-6 sm:py-4">


            {/* The glass card */}
            <motion.div
              className="relative mx-auto max-w-[1460px] overflow-hidden rounded-2xl"
              initial={{ scale: 0.96, filter: 'blur(8px)' }}
              animate={{ scale: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.96, filter: 'blur(6px)' }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.45) 0%, rgba(10, 10, 15, 0.3) 100%)',
                backdropFilter: 'blur(30px) saturate(160%)',
                WebkitBackdropFilter: 'blur(30px) saturate(160%)',
                border: '1px solid color-mix(in srgb, var(--app-accent) 12%, transparent)',
                boxShadow: '0 40px 100px -30px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.03)',
                isolation: 'isolate',
              }}
            >
              {/* Ambient inner glow */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse at 10% 50%, color-mix(in srgb, var(--app-accent) 8%, transparent) 0%, transparent 60%)',
                }}
              />

              {/* Shimmer sweep */}
              <motion.div
                className="pointer-events-none absolute inset-0"
                initial={{ x: '-100%' }}
                animate={{ x: '300%' }}
                transition={{ duration: 2.5, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 65%)',
                  width: '40%',
                }}
              />


              {/* Content */}
              <div className="relative z-10 flex items-center gap-4 py-3 pl-5 pr-4 sm:py-3.5 sm:pl-6 sm:pr-5">


                {/* Text block */}
                <motion.div
                  className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
                  initial={{ opacity: 0, x: -16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.45, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="rounded-full px-2.5 py-[3px] text-[9px] font-semibold uppercase tracking-[0.2em]"
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        background: 'color-mix(in srgb, var(--app-accent) 14%, transparent)',
                        color: 'var(--app-accent)',
                        border: '1px solid color-mix(in srgb, var(--app-accent) 20%, transparent)',
                      }}
                    >
                      Notice
                    </span>
                    <span
                      className="hidden text-[13px] font-bold text-white/90 sm:inline"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      Kotatsutv will be back soon.
                    </span>
                  </div>

                  <p
                    className="truncate text-[12px] text-white/45 sm:text-[12.5px]"
                    style={{ fontFamily: "'Onest', sans-serif" }}
                  >
                    Development is paused for a while — we'll be back with updates soon.
                  </p>
                </motion.div>

                {/* Right side: date + close */}
                <motion.div
                  className="flex shrink-0 items-center gap-3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65, duration: 0.4, ease: 'easeOut' }}
                >
                  <span
                    className="hidden items-center gap-1.5 rounded-full border border-white/[0.05] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/25 sm:flex"
                    style={{ fontFamily: "'Onest', sans-serif" }}
                  >
                    <Clock size={10} />
                    May 2026
                  </span>

                  <motion.button
                    type="button"
                    onClick={dismiss}
                    whileHover={{
                      scale: 1.15,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderColor: 'rgba(255,255,255,0.12)',
                    }}
                    whileTap={{ scale: 0.85 }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white/25 transition-colors hover:text-white/70"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    aria-label="Dismiss"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
