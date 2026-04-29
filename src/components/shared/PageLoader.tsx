import React, { useEffect } from 'react';

const LOADER_STYLES = `
  @keyframes spinSmooth {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .spin-smooth {
    animation: spinSmooth 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes pulseRing {
    0%   { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(2); opacity: 0; }
  }
  .pulse-ring::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid var(--app-accent);
    animation: pulseRing 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .loader-fade-in-up {
    animation: fadeInUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
`;

interface PageLoaderProps {
  size?: number;
  className?: string;
  fullPage?: boolean;
  text?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({
  size = 48,
  className = '',
  fullPage = false,
  text,
}) => {
  useEffect(() => {
    const id = 'page-loader-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = LOADER_STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  const wrapperClasses = fullPage
    ? `loader-fade-in-up flex flex-col items-center justify-center min-h-[50vh] ${className}`
    : `loader-fade-in-up flex flex-col items-center justify-center ${className}`;

  return (
    <div className={wrapperClasses}>
      <div className="relative">
        <div
          className="spin-smooth rounded-full border-[3px] border-t-transparent"
          style={{
            width: size,
            height: size,
            borderColor: 'var(--app-accent)',
            borderTopColor: 'transparent',
          }}
        />
        <div className="pulse-ring absolute inset-0 rounded-full" />
      </div>
      {text && (
        <p className="mt-4 text-sm text-zinc-500 font-medium tracking-wide">{text}</p>
      )}
    </div>
  );
};

export default PageLoader;
