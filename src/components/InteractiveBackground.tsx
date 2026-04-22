import React, { useEffect, useRef } from 'react';

const GLOBAL_BACKGROUND_STYLES = `
  /* Interactive Background Additions */
  .aw-grid-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background-size: 50px 50px;
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    mask-image: radial-gradient(circle at center, black, transparent 80%);
    -webkit-mask-image: radial-gradient(circle at center, black, transparent 80%);
  }

  @keyframes aw-float {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-30px) scale(1.1); }
  }
  
  .aw-glow-1 {
    animation: aw-float 15s ease-in-out infinite;
  }
  
  .aw-glow-2 {
    animation: aw-float 18s ease-in-out infinite reverse;
  }
`;

const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Inject styles safely
  useEffect(() => {
    const id = 'aw-global-bg-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = GLOBAL_BACKGROUND_STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  // Canvas Particle Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Array<{x: number, y: number, vx: number, vy: number, size: number}> = [];
    let animationFrameId: number;
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 18000), 75); 
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4, 
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 1.5 + 0.5
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    resize();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        let dx = mouse.x - p.x;
        let dy = mouse.y - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 80) {
           p.x -= dx * 0.015;
           p.y -= dy * 0.015;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          let p2 = particles[j];
          let dx2 = p.x - p2.x;
          let dy2 = p.y - p2.y;
          let dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (dist2 < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 - dist2/1500})`; 
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 - dist/1066})`; 
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Interactive Particle Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[0]" />
      
      {/* Subtle Grid Texture */}
      <div className="aw-grid-bg" />

      {/* Ambient Drifting Glows */}
      <div className="aw-glow-1 pointer-events-none fixed -top-[10%] left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-[100%] bg-[var(--app-accent)] opacity-[0.08] blur-[140px] z-[0]" />
      <div className="aw-glow-2 pointer-events-none fixed -bottom-[20%] right-[-10%] h-[500px] w-[800px] rounded-[100%] bg-[var(--app-accent)] opacity-[0.04] blur-[160px] z-[0]" />
    </>
  );
};

export default InteractiveBackground;