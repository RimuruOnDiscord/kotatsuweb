import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Server, Shield, Lock, UserCheck, FileText, Mail, ChevronRight } from 'lucide-react';

// ─────────────────────────────────────────
// FONTS & BASE STYLES
// ─────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500;600;700&display=swap');

  .legal-display { font-family: 'Syne', sans-serif; }
  .legal-body    { font-family: 'Onest', sans-serif; }

  .legal-card {
    position: relative;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.022);
    backdrop-filter: blur(20px);
    overflow: hidden;
    transition: border-color 0.35s ease, box-shadow 0.35s ease;
  }
  .legal-card:hover {
    border-color: rgba(255,255,255,0.11);
    box-shadow: 0 20px 60px -20px rgba(0,0,0,0.6);
  }
  .legal-card::before {
    content: '';
    position: absolute;
    inset-inline: 0;
    top: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    pointer-events: none;
  }

  .legal-nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 14px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
    color: rgba(255,255,255,0.35);
    font-size: 12.5px;
    font-weight: 600;
    font-family: 'Syne', sans-serif;
    outline: none;
  }
  .legal-nav-item:hover { color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.04); }
  .legal-nav-item.active {
    color: #fff;
    background: rgba(255,255,255,0.07);
    border-color: rgba(255,255,255,0.09);
  }

  .legal-number {
    font-family: 'Syne', sans-serif;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    opacity: 0.18;
    line-height: 1;
  }

  @keyframes legal-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

// ─────────────────────────────────────────
// DATA
// ─────────────────────────────────────────
interface Section {
  id: string;
  icon: React.ElementType;
  label: string;
  title: string;
  tag: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'service',
    icon: Server,
    label: 'Service Model',
    tag: 'How We Operate',
    title: 'Service Model',
    body: [
      'Anikage functions as a search engine and content aggregator that indexes publicly available media from across the internet.',
      "We don't host, store, or control any media files — everything is sourced from external third-party websites that are already publicly accessible.",
      "Our automated systems simply provide links to content that's already available online, without bypassing any security measures.",
    ],
  },
  {
    id: 'copyright',
    icon: Shield,
    label: 'Copyright Policy',
    tag: 'Content & Copyright',
    title: 'Copyright Policy',
    body: [
      "Since we don't host any content ourselves, all takedown requests must go directly to the websites that actually host the files.",
      'We respect intellectual property rights and will cooperate with valid legal requests within our technical capabilities.',
      'For content removal, please contact the original hosting platform — we cannot remove what we don\'t control.',
      'If you are a copyright holder and want to report a violation, we are more than happy to point you to where we found the content.',
    ],
  },
  {
    id: 'privacy',
    icon: Lock,
    label: 'Data Protection',
    tag: 'Privacy & Data',
    title: 'Data Protection',
    body: [
      "User privacy is important to us. We don't collect, store, or track any personal information about our users.",
      "Optionally, users can store their bookmarks and watch history in our encrypted backend. But we don't store any personal information or identifying data.",
      'Anikage is entirely self-hostable, and can be run on any server. Even by yourself.',
    ],
  },
  {
    id: 'users',
    icon: UserCheck,
    label: 'User Responsibilities',
    tag: 'User Guidelines',
    title: 'User Responsibilities',
    body: [
      'Users are responsible for ensuring their access complies with local laws and regulations in their jurisdiction.',
      'We strongly recommend using VPN services for enhanced privacy and security while browsing. Downloading is not advised.',
      'Please respect intellectual property rights and be mindful of copyright laws in your area.',
    ],
  },
  {
    id: 'terms',
    icon: FileText,
    label: 'Terms & Conditions',
    tag: 'Service Terms',
    title: 'Terms & Conditions',
    body: [
      'Anikage is licensed under the MIT license.',
      "By using our platform, you acknowledge these terms and agree that we're not responsible for third-party content.",
      'We operate in good faith compliance with applicable laws and regulations. We are not liable for any damages or losses incurred while using our service.',
    ],
  },
  {
    id: 'contact',
    icon: Mail,
    label: 'Legal Contact',
    tag: 'Legal Inquiries',
    title: 'Legal Contact',
    body: [
      'For legal matters related to specific content, please contact the hosting websites directly as they have control over their files.',
      'Anikage operates within legal boundaries and cooperates with legitimate requests when technically feasible.',
    ],
  },
];

// ─────────────────────────────────────────
// CARD
// ─────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 },
  }),
};

const bulletVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.4, ease: 'easeOut', delay: 0.15 + i * 0.06 },
  }),
};

const SectionCard: React.FC<{ section: Section; index: number }> = ({ section, index }) => {
  const Icon = section.icon;
  const num = String(index + 1).padStart(2, '0');

  return (
    <motion.div
      id={section.id}
      className="legal-card"
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={cardVariants}
    >
      {/* Accent glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[24px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--app-accent,#8b5cf6) 10%, transparent), transparent 65%)' }}
      />

      <div className="relative z-10 p-8 md:p-10 lg:p-12">
        {/* Top row */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            {/* Icon badge */}
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px] border border-white/[0.08]"
              style={{ background: 'color-mix(in srgb, var(--app-accent,#8b5cf6) 16%, rgba(255,255,255,0.03))' }}
            >
              <Icon size={20} style={{ color: 'var(--app-accent,#8b5cf6)' }} strokeWidth={1.7} />
            </div>
            <div>
              <p
                className="legal-display text-[10px] font-bold uppercase tracking-[0.2em] mb-1"
                style={{ color: 'var(--app-accent,#8b5cf6)' }}
              >
                {section.tag}
              </p>
              <h2 className="legal-display text-[22px] md:text-[26px] font-bold tracking-tight text-white leading-tight">
                {section.title}
              </h2>
            </div>
          </div>
          {/* Large ghost number */}
          <span className="legal-number text-[48px] md:text-[64px] text-white select-none hidden sm:block">
            {num}
          </span>
        </div>

        {/* Divider */}
        <div className="mb-7 h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)' }} />

        {/* Body bullets */}
        <div className="flex flex-col gap-4">
          {section.body.map((para, i) => (
            <motion.div
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={bulletVariants}
              className="flex gap-3.5 items-start"
            >
              <span
                className="mt-[6px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in srgb, var(--app-accent,#8b5cf6) 18%, transparent)', border: '1px solid color-mix(in srgb, var(--app-accent,#8b5cf6) 35%, transparent)' }}
              >
                <ChevronRight size={11} style={{ color: 'var(--app-accent,#8b5cf6)' }} strokeWidth={2.5} />
              </span>
              <p className="legal-body text-[14.5px] md:text-[15px] leading-[1.82] text-white/55">
                {para}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────
const LegalPage: React.FC = () => {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id); });
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <style>{STYLES}</style>

      {/* Reading progress bar */}
      <motion.div
        style={{ scaleX, transformOrigin: '0% 50%' }}
        className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px]"
      >
        <div className="h-full w-full" style={{ background: 'linear-gradient(90deg, var(--app-accent,#8b5cf6), color-mix(in srgb, var(--app-accent,#8b5cf6) 60%, white))' }} />
      </motion.div>

      <div className="relative min-h-screen">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden">
          {/* Glow blob */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[700px] -translate-y-1/3"
            style={{ background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--app-accent,#8b5cf6) 18%, transparent) 0%, transparent 70%)', filter: 'blur(40px)' }}
          />

          <div className="relative mx-auto max-w-[1460px] px-4 pt-12 pb-16 md:pb-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Tag */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-7"
                style={{
                  background: 'color-mix(in srgb, var(--app-accent,#8b5cf6) 10%, rgba(255,255,255,0.03))',
                  borderColor: 'color-mix(in srgb, var(--app-accent,#8b5cf6) 30%, transparent)',
                }}
              >
                <Shield size={12} style={{ color: 'var(--app-accent,#8b5cf6)' }} strokeWidth={2} />
                <span className="legal-display text-[10.5px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--app-accent,#8b5cf6)' }}>
                  Legal & Compliance
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="legal-display text-[46px] sm:text-[60px] md:text-[72px] font-black tracking-tight text-white leading-[1.0] mb-6"
              >
                Legal /
                <br />
                <span style={{ WebkitTextStroke: '2px rgba(255,255,255,0.25)', color: 'transparent' }}>
                  DMCA
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18, ease: 'easeOut' }}
                className="legal-body mx-auto max-w-[480px] text-[15.5px] leading-[1.78] text-white/45"
              >
                Transparency about how Anikage operates, how we handle content, and what users and rights holders can expect.
              </motion.p>

              {/* Quick-nav pills (mobile/tablet) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.26 }}
                className="lg:hidden mt-9 flex flex-wrap justify-center gap-2"
              >
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className="legal-display flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold text-white/50 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all"
                  >
                    <Icon size={11} strokeWidth={2} />
                    {label}
                  </button>
                ))}
              </motion.div>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 h-px w-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 50%, transparent)' }}
            />
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="mx-auto max-w-[1460px] px-4 pb-28">
          <div className="flex gap-10 xl:gap-16 items-start">

            {/* Sticky side-nav — desktop only */}
            <aside className="hidden lg:flex flex-col gap-1 sticky top-[100px] w-[200px] xl:w-[220px] flex-shrink-0">
              <p className="legal-display text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/20 mb-3 px-3.5">
                On this page
              </p>

              {SECTIONS.map(({ id, icon: Icon, label }, i) => {
                const isActive = activeId === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`legal-nav-item text-left w-full ${isActive ? 'active' : ''}`}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <motion.div
                        layoutId="legal-nav-indicator"
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                        style={{ background: 'var(--app-accent,#8b5cf6)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span
                      className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-[8px]"
                      style={{
                        background: isActive ? 'color-mix(in srgb, var(--app-accent,#8b5cf6) 18%, transparent)' : 'transparent',
                        color: isActive ? 'var(--app-accent,#8b5cf6)' : 'rgba(255,255,255,0.3)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Icon size={13} strokeWidth={2} />
                    </span>
                    <span className="truncate">{label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="legal-nav-dot"
                        className="ml-auto h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{ background: 'var(--app-accent,#8b5cf6)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}

              {/* Metadata */}
              <div className="mt-8 px-3.5">
                <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="legal-display text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-2">Last updated</p>
                  <p className="legal-body text-[13px] font-semibold text-white/50">May 2025</p>
                  <div className="my-3 h-px bg-white/[0.06]" />
                  <p className="legal-display text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-2">License</p>
                  <p className="legal-body text-[13px] font-semibold" style={{ color: 'var(--app-accent,#8b5cf6)' }}>MIT</p>
                </div>
              </div>
            </aside>

            {/* Cards */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              {SECTIONS.map((section, i) => (
                <SectionCard key={section.id} section={section} index={i} />
              ))}

              {/* Bottom note */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 rounded-[20px] border border-white/[0.05] bg-white/[0.015] p-6 text-center"
              >
                <p className="legal-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/20">
                  Anikage · MIT License · Built for the community
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LegalPage;
