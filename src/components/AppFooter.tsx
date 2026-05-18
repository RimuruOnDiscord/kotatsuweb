import React from 'react';
import { Tv, Github, Globe, Radio, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrandLogo } from './shared/topbarShared';

const FOOTER_FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500;600;700&display=swap');
`;

type FooterLink = {
  label: string;
  action?: 'legal';
  to?: string;
  href?: string;
};

const socialLinks = [
  { icon: Github, href: 'https://github.com/RimuruOnDiscord/kotatsuweb', label: 'GitHub' },
  { icon: Globe, href: 'https://anilist.co', label: 'AniList' },
  { icon: Radio, href: 'https://api.jikan.moe/v4', label: 'Jikan API' },
  { icon: Tv, href: 'https://github.com/consumet/api.consumet.org', label: 'Provider Sources' },
  { icon: ShieldCheck, href: 'https://nohello.net/en/', label: 'Community Guidelines' },
];

const footerGroups: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'Discovery',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Browse & Filter', to: '/browse' },
      { label: 'Airing Schedule', to: '/schedule' },
      { label: 'Random Anime', to: '/random' },
    ],
  },
  {
    title: 'My Library',
    links: [
      { label: 'Continue Watching', to: '/watching' },
      { label: 'Plan to Watch', to: '/plan-to-watch' },
      { label: 'Completed', to: '/completed' },
      { label: 'Friends Activity', to: '/social' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'AniList Metadata', href: 'https://anilist.co' },
      { label: 'Jikan API', href: 'https://api.jikan.moe/v4' },
      { label: 'Video Providers', href: 'https://github.com/consumet/api.consumet.org' },
      { label: 'GitHub Repo', href: 'https://github.com/RimuruOnDiscord/kotatsuweb' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', action: 'legal' },
      { label: 'DMCA / Copyright', action: 'legal' },
      { label: 'API Usage', href: 'https://api.jikan.moe/v4' },
    ],
  },
];

const FooterAnchor: React.FC<FooterLink & { onLegalClick?: () => void }> = ({ label, action, to, href, onLegalClick }) => {
  const handleScroll = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const baseClass = "block w-fit text-left text-[14px] font-medium text-zinc-400 transition-all duration-300 hover:-translate-y-[1px] hover:text-[var(--app-accent)] py-1";

  return action === 'legal' ? (
    <button type="button" className={baseClass} onClick={onLegalClick} style={{ fontFamily: '"Onest", sans-serif' }}>
      {label}
    </button>
  ) : to ? (
    <Link to={to} className={baseClass} onClick={handleScroll} style={{ fontFamily: '"Onest", sans-serif' }}>
      {label}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className={baseClass} style={{ fontFamily: '"Onest", sans-serif' }}>
      {label}
    </a>
  );
};

interface AppFooterProps {
  onOpenLegal?: () => void;
}

const AppFooter: React.FC<AppFooterProps> = ({ onOpenLegal }) => (
  <>
    <style>{FOOTER_FONTS}</style>
    <footer className="mt-16 border-t border-white/5 bg-[var(--app-bg)] relative overflow-hidden font-sans antialiased">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--app-accent)]/20 to-transparent shadow-[0_0_20px_var(--app-accent)] opacity-50" />

      <div className="mx-auto max-w-[1540px] px-6 md:px-8 lg:px-10 py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row justify-between gap-16 lg:gap-20">
          
          {/* LEFT COLUMN */}
          {/* Increased gap from 5 to 8 for better vertical rhythm */}
          <div className="flex flex-col gap-8 lg:w-[320px] shrink-0">
            
            <motion.div 
              className="flex items-center gap-3.5 cursor-pointer w-fit"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              <motion.div 
                variants={{
                  rest: { scale: 1, rotate: 0 },
                  hover: { scale: 1.05, rotate: -4, transition: { type: "spring", stiffness: 400, damping: 12 } },
                  tap: { scale: 0.95, rotate: 0 }
                }}
                className="bg-[var(--app-surface-1)] text-[var(--app-accent)] flex items-center justify-center p-2.5 rounded-[14px] border border-white/5 shadow-sm relative overflow-hidden"
              >
                <motion.div 
                  variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
                  className="absolute inset-0 bg-[var(--app-accent)]/10 transition-opacity duration-300"
                />
                <div className="h-6 w-6 relative z-10 flex items-center justify-center">
                  <BrandLogo />
                </div>
              </motion.div>

              <motion.span 
                variants={{
                  rest: { x: 0, color: "#ffffff" },
                  hover: { x: 4, color: "var(--app-accent)", transition: { type: "spring", stiffness: 300, damping: 20 } }
                }}
                className="text-[26px] font-bold tracking-tight" 
                style={{ fontFamily: '"Syne", sans-serif' }}
              >
                kotatsuweb
              </motion.span>
            </motion.div>

            {/* FIXED ICONS ALIGNMENT */}
            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } }
              }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              // Removed negative margin (-ml-1) and increased gap to 3
              className="flex items-center gap-3"
            >
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 20 } },
                    rest: { y: 0, scale: 1 },
                    hover: { y: -3, scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 15 } },
                    tap: { scale: 0.92 }
                  }}
                  className="group relative flex h-10 w-10 items-center justify-center text-zinc-500 rounded-[12px] outline-none"
                >
                  <motion.div
                    variants={{
                      rest: { opacity: 0 },
                      hover: { opacity: 1 }
                    }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute inset-0 rounded-[12px] bg-[var(--app-surface-1)] border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                  />
                  
                  {/* Made icons slightly larger (20px) for better balance */}
                  <Icon className="relative z-10 h-[20px] w-[20px] transition-colors duration-200 group-hover:text-[var(--app-accent)]" strokeWidth={1.75} />
                </motion.a>
              ))}
            </motion.div>

            {/* Slightly reduced gap here to group text logically */}
            <div className="flex flex-col gap-1 text-[14px] text-zinc-500" style={{ fontFamily: '"Onest", sans-serif' }}>
              <p>
                KotatsuWeb is{' '}
                <a href="https://github.com/RimuruOnDiscord/kotatsuweb" target="_blank" rel="noreferrer" className="font-semibold text-zinc-300 transition-all duration-300 hover:text-[var(--app-accent)] hover:underline underline-offset-4">
                  open source
                </a>.
              </p>
              <p className="opacity-80">© {new Date().getFullYear()} KotatsuWeb.</p>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          {/* Changed w-full to flex-1 and adjusted grid spacing */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 flex-1 lg:pl-12 pt-2 lg:pt-0">
            {footerGroups.map((group) => (
              // Increased gap from 5 to 6 to distance headings from links
              <div key={group.title} className="flex flex-col gap-6">
                {/* Reduced font size from 18px to 16px, added slight tracking */}
                <h3 className="text-[16px] font-bold tracking-wide text-white" style={{ fontFamily: '"Syne", sans-serif' }}>
                  {group.title}
                </h3>
                {/* Increased gap from 1.5 to 3 for better list readability */}
                <ul className="flex flex-col gap-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <FooterAnchor {...link} onLegalClick={onOpenLegal} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-white/5 text-center flex flex-col items-center gap-4">
          <p className="text-[10px] md:text-[11px] font-bold tracking-[0.08em] text-zinc-600 uppercase max-w-3xl leading-relaxed" style={{ fontFamily: '"Syne", sans-serif' }}>
            Not an official service. We do not host any files. All video content and metadata are provided by non-affiliated third parties.
          </p>
        </div>
      </div>
    </footer>
  </>
);

export default AppFooter;
