import React from 'react';
import { BookOpen, Github, Globe, Radio, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './shared/topbarShared';

type FooterLink = {
  label: string;
  to?: string;
  href?: string;
};

const socialLinks =[
  { icon: Github, href: 'https://github.com/RimuruOnDiscord/kotatsuweb', label: 'GitHub' },
  { icon: Globe, href: 'https://anilist.co', label: 'AniList' },
  { icon: Radio, href: 'https://api.jikan.moe/v4', label: 'Jikan API' },
  { icon: BookOpen, href: 'https://manga-scrapers.onrender.com', label: 'Reader Sources' },
  { icon: ShieldCheck, href: 'https://nohello.net/en/', label: 'Jikan API' },
];

const footerGroups: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'About',
    links:[
      { label: 'Home', to: '/' },
      { label: 'Browse', to: '/browse' },
      { label: 'Bookmarks', to: '/bookmarks' },
      { label: 'Random', to: '/random' },
    ],
  },
  {
    title: 'Library',
    links:[
      { label: 'Browse', to: '/browse' },
      { label: 'Newest', to: '/newest' },
      { label: 'Updated', to: '/updated' },
      { label: 'Added', to: '/added' },
    ],
  },
  {
    title: 'Resources',
    links:[
      { label: 'AniList', href: 'https://anilist.co' },
      { label: 'Jikan API', href: 'https://api.jikan.moe/v4' },
      { label: 'Reader Sources', href: 'https://manga-scrapers.onrender.com' },
      { label: 'GitHub Repo', href: 'https://github.com/RimuruOnDiscord/kotatsuweb' },
    ],
  },
  {
    title: 'Legal',
    links:[
      { label: 'Reader Notice', href: 'https://manga-scrapers.onrender.com' },
      { label: 'Metadata Sources', href: 'https://anilist.co' },
      { label: 'API Usage', href: 'https://api.jikan.moe/v4' },
    ],
  },
];

const FooterAnchor: React.FC<FooterLink> = ({ label, to, href }) => {
  // Function to handle the scroll
  const handleScroll = () => {
    window.scrollTo({
      top: 0,
      behavior: 'instant' // or 'smooth' if you want it to slide up
    });
  };

  const baseClass = "block w-fit text-[14px] text-zinc-400 transition-all hover:text-white hover:underline underline-offset-4 py-1";

  return to ? (
    <Link 
      to={to} 
      className={baseClass}
      onClick={handleScroll} // <--- Added this
    >
      {label}
    </Link>
  ) : (
    <a 
      href={href} 
      target="_blank" 
      rel="noreferrer" 
      className={baseClass}
      // No scroll needed for external links usually, but you can add it if you want
    >
      {label}
    </a>
  );
};

const AppFooter: React.FC = () => (
  // Uses color-mix to seamlessly blend 65% of your theme background with 35% black
  <footer className="mt-12 border-t border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_65%,black)] relative overflow-hidden font-sans">
    <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 lg:py-16">
      
      <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-24">
        
        {/* Left Column: Brand, Socials, & Info */}
        <div className="flex flex-col gap-6 lg:w-[280px] shrink-0">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3.5 -ml-1.5">
            <div className="bg-[var(--app-surface-1)] text-[var(--app-accent)] flex items-center justify-center p-2.5 rounded-2xl">
              <div className="h-7 w-7 flex items-center justify-center">
                <BrandLogo />
              </div>
            </div>
            <span className="text-[26px] font-bold tracking-tight text-white translate-y-[2px]">
              kotatsuweb
            </span>
          </div>

          {/* Icon-only Socials */}
          <div className="flex items-center gap-4 -ml-1">
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="text-zinc-400 transition-colors hover:text-white"
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </a>
            ))}
          </div>

          {/* Simple Text Info */}
          <div className="flex flex-col gap-2.5 text-[14px] text-zinc-400 mt-1">
            <p>
              KotatsuWeb is <a href="https://github.com/RimuruOnDiscord/kotatsuweb" target="_blank" rel="noreferrer" className="text-[var(--app-accent)] hover:underline underline-offset-4">open source</a>.
            </p>
            <p>© {new Date().getFullYear()} KotatsuWeb.</p>
          </div>
        </div>

        {/* Right Column: Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10 w-full">
          {footerGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-4">
              <h3 className="text-[15px] font-bold text-white ">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <FooterAnchor {...link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Disclaimer */}
      <div className="mt-16 md:mt-24 text-center">
        <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.05em] text-zinc-600 uppercase">
          NOT AN OFFICIAL SERVICE. WE DO NOT HOST ANY CONTENT. ALL METADATA BELONGS TO THEIR RESPECTIVE OWNERS.
        </p>
      </div>
    </div>
  </footer>
);

export default AppFooter;
