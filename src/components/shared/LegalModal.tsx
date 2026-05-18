import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { FileText, Lock, Mail, Server, Shield, UserCheck, X } from 'lucide-react';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

interface LegalModalProps {
  open: boolean;
  onClose: () => void;
}

interface LegalSection {
  id: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  title: string;
  body: string[];
}

const SECTIONS: LegalSection[] = [
  {
    id: 'service',
    icon: Server,
    label: 'Service',
    desc: 'How KotatsuTV operates',
    title: 'Service Model',
    body: [
      'KotatsuTV functions as a search engine and content aggregator that indexes publicly available media from across the internet.',
      "KotatsuTV doesn't host, store, or control any media files. Everything is sourced from external third-party websites that are already publicly accessible.",
      "Automated systems simply provide links to content that's already available online, without bypassing any security measures.",
    ],
  },
  {
    id: 'copyright',
    icon: Shield,
    label: 'Copyright',
    desc: 'DMCA and takedowns',
    title: 'Copyright Policy',
    body: [
      "Since KotatsuTV doesn't host content, takedown requests should go directly to the websites that actually host the files.",
      'KotatsuTV respects intellectual property rights and will cooperate with valid legal requests within its technical capabilities.',
      "For content removal, please contact the original hosting platform. KotatsuTV cannot remove what it doesn't control.",
      'If you are a copyright holder and want to report a violation, KotatsuTV can help point you to where the content was found.',
    ],
  },
  {
    id: 'privacy',
    icon: Lock,
    label: 'Privacy',
    desc: 'Data handling',
    title: 'Data Protection',
    body: [
      "User privacy is important to KotatsuTV. The service doesn't collect, store, or track personal information beyond what is required for optional account features.",
      "Users can optionally store bookmarks and watch history in the backend, but KotatsuTV doesn't store identifying personal data for browsing activity.",
      'KotatsuTV is self-hostable and can be run on your own server.',
    ],
  },
  {
    id: 'users',
    icon: UserCheck,
    label: 'Users',
    desc: 'User responsibilities',
    title: 'User Responsibilities',
    body: [
      'Users are responsible for ensuring their access complies with local laws and regulations in their jurisdiction.',
      'VPN services are recommended for enhanced privacy and security while browsing. Downloading is not advised.',
      'Please respect intellectual property rights and be mindful of copyright laws in your area.',
    ],
  },
  {
    id: 'terms',
    icon: FileText,
    label: 'Terms',
    desc: 'Service terms',
    title: 'Terms & Conditions',
    body: [
      'KotatsuTV is licensed under the MIT license.',
      "By using KotatsuTV, you acknowledge these terms and agree that KotatsuTV isn't responsible for third-party content.",
      'KotatsuTV operates in good faith compliance with applicable laws and regulations. It is not liable for damages or losses incurred while using the service.',
    ],
  },
  {
    id: 'contact',
    icon: Mail,
    label: 'Contact',
    desc: 'Legal inquiries',
    title: 'Legal Contact',
    body: [
      'For legal matters related to specific content, please contact the hosting websites directly as they have control over their files.',
      'KotatsuTV operates within legal boundaries and cooperates with legitimate requests when technically feasible.',
    ],
  },
];

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } },
};

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <motion.div
    variants={fadeUpItem}
    className={`rounded-[14px] shadow-lg ${className}`}
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}
  >
    {children}
  </motion.div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.p variants={fadeUpItem} className="mb-2.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.15em] text-zinc-500">
    {children}
  </motion.p>
);

const LegalSectionPanel: React.FC<{ section: LegalSection }> = ({ section }) => (
  <motion.section
    id={`legal-modal-${section.id}`}
    className="scroll-mt-4"
    variants={staggerContainer}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: '-40px' }}
  >
    <SectionLabel>{section.title}</SectionLabel>
    <SectionCard>
      {section.body.map((paragraph, index) => (
        <div
          key={paragraph}
          className="px-4 py-3 text-[13.5px] leading-relaxed text-zinc-300 transition-colors duration-200 hover:bg-white/[0.03] first:rounded-t-[14px] last:rounded-b-[14px]"
          style={index < section.body.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
        >
          {paragraph}
        </div>
      ))}
    </SectionCard>
  </motion.section>
);

const LegalModal: React.FC<LegalModalProps> = ({ open, onClose }) => {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeSection = SECTIONS.find(section => section.id === activeId) ?? SECTIONS[0];

  useEffect(() => {
    if (!open) return;

    const previousTitle = document.title;
    const previousOverflow = document.body.style.overflow;
    document.title = 'Legal';
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.title = previousTitle;
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !contentRef.current) return;

    contentRef.current.scrollTo({ top: 0 });
    setActiveId(SECTIONS[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find(entry => entry.isIntersecting);
        if (visibleEntry?.target.id) {
          setActiveId(visibleEntry.target.id.replace('legal-modal-', ''));
        }
      },
      { root: contentRef.current, rootMargin: '-20% 0px -62% 0px', threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const element = document.getElementById(`legal-modal-${id}`);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [open]);

  const scrollToSection = (id: string) => {
    document.getElementById(`legal-modal-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const modalStyles = {
    fontFamily: APP_FONT,
    background: 'var(--app-bg, #09090b)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.8)',
  } as React.CSSProperties;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4 lg:p-6 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="legal-modal-title"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="aw-material-modal relative flex h-[100dvh] w-full max-w-[800px] flex-col overflow-hidden pointer-events-auto md:h-[80vh] md:max-h-[720px] md:flex-row md:rounded-[20px]"
              style={modalStyles}
              onClick={event => event.stopPropagation()}
            >
              <div className="flex flex-shrink-0 flex-col border-b border-white/[0.08] bg-[rgba(255,255,255,0.015)] pt-[env(safe-area-inset-top)] md:hidden">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h2 className="text-[20px] text-white" style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' }}>
                      Legal
                    </h2>
                    <p className="mt-0.5 max-w-[220px] truncate text-[11.5px] font-medium text-zinc-400">
                      KotatsuTV terms and policies
                    </p>
                  </div>
                  <motion.button
                    onClick={onClose}
                    whileTap={{ scale: 0.9 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </motion.button>
                </div>

                <nav className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 pb-3">
                  {SECTIONS.map(section => {
                    const active = activeId === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`relative flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-[12px] font-bold outline-none transition-colors ${
                          active
                            ? 'border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] text-white'
                            : 'border-transparent bg-white/[0.03] text-zinc-400'
                        }`}
                      >
                        <section.icon size={14} className={active ? 'text-[var(--app-accent)]' : ''} />
                        {section.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <aside
                className="hidden w-[220px] flex-shrink-0 flex-col py-6 md:flex"
                style={{ background: 'rgba(255,255,255,0.015)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="mb-8 px-6">
                  <h2 className="text-[20px] text-white" style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Legal
                  </h2>
                  <p className="mt-1.5 truncate text-[11.5px] font-medium text-zinc-400">
                    KotatsuTV policies
                  </p>
                </div>

                <nav className="flex flex-1 flex-col gap-1.5 px-3">
                  {SECTIONS.map(section => {
                    const active = activeId === section.id;
                    return (
                      <motion.button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        initial={false}
                        animate={{
                          backgroundColor: active ? 'var(--app-accent-muted)' : 'rgba(255, 255, 255, 0)',
                          color: active ? '#ffffff' : 'rgb(161, 161, 170)',
                        }}
                        whileHover={{
                          backgroundColor: active ? 'var(--app-accent-muted)' : 'rgba(255, 255, 255, 0.06)',
                          color: '#ffffff',
                        }}
                        transition={{ duration: 0.2 }}
                        className="relative flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13.5px] font-medium outline-none"
                      >
                        <motion.div animate={{ scale: active ? 1.1 : 1, color: active ? 'var(--app-accent)' : undefined }}>
                          <section.icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                        </motion.div>
                        <span className="leading-none">{section.label}</span>
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="mx-3 mt-2 px-3 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600" style={{ fontFamily: DISPLAY_FONT }}>
                    Last updated
                  </p>
                  <p className="mt-2 text-[12.5px] font-medium text-zinc-400">May 2025</p>
                </div>
              </aside>

              <div className="flex min-w-0 flex-1 flex-col bg-white/[0.01]">
                <div
                  className="aw-material-modal-header hidden flex-shrink-0 items-center justify-between px-8 py-6 md:flex"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <motion.div
                    key={activeSection.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
                  >
                    <h3 id="legal-modal-title" className="text-[17px] font-bold tracking-wide text-white" style={{ fontFamily: DISPLAY_FONT }}>
                      {activeSection.title}
                    </h3>
                    <p className="mt-1 text-[12.5px] text-zinc-400">{activeSection.desc}</p>
                  </motion.div>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.1, rotate: 90, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 outline-none transition-colors hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </motion.button>
                </div>

                <div className="flex border-b border-white/[0.04] bg-white/[0.02] px-4 py-3 md:hidden">
                  <p className="text-[12px] font-medium text-zinc-400">
                    {activeSection.desc}
                  </p>
                </div>

                <main
                  ref={contentRef}
                  className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 md:px-8 md:py-6 md:pb-6"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  <motion.div variants={staggerContainer} initial="hidden" animate="show" exit="exit" className="flex flex-col gap-6">
                    {SECTIONS.map(section => (
                      <LegalSectionPanel key={section.id} section={section} />
                    ))}
                  </motion.div>
                </main>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LegalModal;
