'use client';

import { motion, HTMLMotionProps } from 'motion/react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { gsap } from 'gsap';

interface BentoCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  noPadding?: boolean;
  
  // Magic Bento specific props (optional per card)
  enableStars?: boolean;
  enableTilt?: boolean;
  enableMagnetism?: boolean; // kept for API compat but always off now
  enableBorderGlow?: boolean;
  clickEffect?: boolean;
  particleCount?: number;
  disableAnimations?: boolean;
}

const DEFAULT_PARTICLE_COUNT = 8;
const DEFAULT_GLOW_COLOR = '132, 0, 255'; // Dark mode purple
const LIGHT_GLOW_COLOR = '217, 119, 6'; // Light mode gold

const createParticleElement = (x: number, y: number, color: string): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'bento-particle';
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

export function BentoCard({
  children,
  delay = 0,
  className = '',
  noPadding = false,
  enableStars = true,
  enableTilt = false,
  enableMagnetism = false, // GRAVITY/MAGNETISM DISABLED — user removed this
  enableBorderGlow = true,
  clickEffect = true,
  particleCount = DEFAULT_PARTICLE_COUNT,
  disableAnimations = false,
  ...props
}: BentoCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(0);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);

  useEffect(() => {
    setMounted(true);
    
    // Add global CSS if not exists
    if (!document.getElementById('bento-card-styles')) {
      const style = document.createElement('style');
      style.id = 'bento-card-styles';
      style.innerHTML = `
        .bento-card-base {
          --glow-x: 50%;
          --glow-y: 50%;
          --glow-intensity: 0;
          --glow-radius: 200px;
          --glow-color: 217, 119, 6; /* light mode gold */
        }
        
        html.dark .bento-card-base {
          --glow-color: 132, 0, 255; /* dark mode purple */
        }

        .bento-card-base::after {
          content: '';
          position: absolute;
          inset: 0;
          padding: 6px;
          background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
              rgba(var(--glow-color), calc(var(--glow-intensity) * 0.8)) 0%,
              rgba(var(--glow-color), calc(var(--glow-intensity) * 0.4)) 30%,
              transparent 60%);
          border-radius: inherit;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
          opacity: 1;
          transition: opacity 0.3s ease;
          z-index: 1;
        }

        .bento-card-base:hover::after {
          opacity: 1;
        }

        .bento-particle::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: rgba(var(--glow-color), 0.2);
          border-radius: 50%;
          z-index: -1;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || resolvedTheme === undefined);
  const glowColor = isDark ? DEFAULT_GLOW_COLOR : LIGHT_GLOW_COLOR;
  const spotlightColor = isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(197, 160, 89, 0.07)';

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !divRef.current) return;
    const { width, height } = divRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    particlesRef.current.forEach(particle => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        }
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!divRef.current || !isHoveredRef.current || !enableStars || disableAnimations) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !divRef.current) return;
        const clone = particle.cloneNode(true) as HTMLDivElement;
        
        clone.style.background = `rgba(${glowColor}, 1)`;
        clone.style.boxShadow = `0 0 6px rgba(${glowColor}, 0.6)`;
        
        divRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: 'none',
          repeat: -1,
          yoyo: true
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true
        });
      }, index * 100);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles, enableStars, disableAnimations, glowColor]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setOpacity(1);
    if (disableAnimations) return;

    isHoveredRef.current = true;
    animateParticles();

    if (enableTilt && divRef.current) {
      gsap.to(divRef.current, {
        rotateX: 5,
        rotateY: 5,
        duration: 0.3,
        ease: 'power2.out',
        transformPerspective: 1000
      });
    }
    
    if (props.onMouseEnter) {
      props.onMouseEnter(e);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setOpacity(0);
    if (disableAnimations) return;

    isHoveredRef.current = false;
    clearAllParticles();

    if (divRef.current) {
      divRef.current.style.setProperty('--glow-intensity', '0');

      if (enableTilt) {
        gsap.to(divRef.current, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }

      // MAGNETISM REMOVED — no x/y snap-back needed
    }

    if (props.onMouseLeave) {
      props.onMouseLeave(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (enableBorderGlow) {
      const relativeX = (x / rect.width) * 100;
      const relativeY = (y / rect.height) * 100;
      divRef.current.style.setProperty('--glow-x', `${relativeX}%`);
      divRef.current.style.setProperty('--glow-y', `${relativeY}%`);
      divRef.current.style.setProperty('--glow-intensity', '1');
    }

    if (!disableAnimations) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;
        gsap.to(divRef.current, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: 'power2.out',
          transformPerspective: 1000
        });
      }

      // MAGNETISM/GRAVITY DISABLED — card stays perfectly still on hover
    }

    if (props.onMouseMove) {
      props.onMouseMove(e);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickEffect || disableAnimations || !divRef.current) return;

    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const maxDistance = Math.max(
      Math.hypot(x, y),
      Math.hypot(x - rect.width, y),
      Math.hypot(x, y - rect.height),
      Math.hypot(x - rect.width, y - rect.height)
    );

    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: absolute;
      width: ${maxDistance * 2}px;
      height: ${maxDistance * 2}px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
      left: ${x - maxDistance}px;
      top: ${y - maxDistance}px;
      pointer-events: none;
      z-index: 1000;
    `;

    divRef.current.appendChild(ripple);

    gsap.fromTo(
      ripple,
      { scale: 0, opacity: 1 },
      {
        scale: 1,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => ripple.remove()
      }
    );

    if (props.onClick) {
      props.onClick(e);
    }
  };

  const baseClasses = `bento-card-base relative overflow-hidden rounded-xl border border-[rgba(212,163,89,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[#FFFFFF] dark:bg-[#0D0B14] backdrop-blur-[14px] saturate-120 dark:backdrop-blur-[16px] shadow-sm transition-colors duration-[450ms] ease-in-out ${className}`;

  return (
    <motion.div
      ref={divRef}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={baseClasses}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(600px circle at var(--glow-x, 50%) var(--glow-y, 50%), ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className={`relative z-10 h-full ${noPadding ? '' : 'p-4 md:p-6'}`}>
        {children}
      </div>
    </motion.div>
  );
}
