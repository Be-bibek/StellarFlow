'use client';

import React, { useRef, useEffect, useState } from 'react';

export interface GooeyNavItem {
  label: string;
  icon?: React.ReactNode;
  id: string;
}

export interface GooeyNavProps {
  items: GooeyNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
}

const GooeyNav: React.FC<GooeyNavProps> = ({
  items,
  activeId,
  onSelect,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(
    Math.max(0, items.findIndex(i => i.id === activeId))
  );

  // Sync activeIndex when activeId prop changes from outside
  useEffect(() => {
    const idx = items.findIndex(i => i.id === activeId);
    if (idx >= 0 && idx !== activeIndex) {
      setActiveIndex(idx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, items]);

  const noise = (n = 1) => n / 2 - Math.random() * n;
  const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };
  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    const rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
    };
  };
  const makeParticles = (element: HTMLElement) => {
    const d: [number, number] = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      element.classList.remove('active');
      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);
        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => {
          element.classList.add('active');
        });
        setTimeout(() => {
          try { element.removeChild(particle); } catch {}
        }, t);
      }, 30);
    }
  };

  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
  };

  const handleClick = (index: number, liEl: HTMLElement) => {
    if (activeIndex === index) return;
    setActiveIndex(index);
    onSelect(items[index].id);
    updateEffectPosition(liEl);
    if (filterRef.current) {
      const particles = filterRef.current.querySelectorAll('.particle');
      particles.forEach(p => filterRef.current!.removeChild(p));
    }
    if (textRef.current) {
      textRef.current.classList.remove('active');
      void textRef.current.offsetWidth;
      textRef.current.classList.add('active');
    }
    if (filterRef.current) {
      makeParticles(filterRef.current);
    }
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;
    const lis = navRef.current.querySelectorAll('li');
    const activeLi = lis[activeIndex] as HTMLElement;
    if (activeLi) {
      updateEffectPosition(activeLi);
      textRef.current?.classList.add('active');
    }
    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex] as HTMLElement;
      if (currentActiveLi) updateEffectPosition(currentActiveLi);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <>
      <style>{`
        :root {
          --color-1: #6366f1;
          --color-2: #8b5cf6;
          --color-3: #a78bfa;
          --color-4: #c4b5fd;
          --linear-ease: linear(0, 0.068, 0.19 2.7%, 0.804 8.1%, 1.037, 1.199 13.2%, 1.245, 1.27 15.8%, 1.274, 1.272 17.4%, 1.249 19.1%, 0.996 28%, 0.949, 0.928 33.3%, 0.926, 0.933 36.8%, 1.001 45.6%, 1.013, 1.019 50.8%, 1.018 54.4%, 1 63.1%, 0.995 68%, 1.001 85%, 1);
        }
        .gooey-effect {
          position: absolute;
          opacity: 1;
          pointer-events: none;
          display: grid;
          place-items: center;
          z-index: 1;
          border-radius: 9999px;
        }
        .gooey-effect.gooey-filter {
          filter: blur(7px) contrast(100) blur(0);
          mix-blend-mode: lighten;
        }
        .gooey-effect.gooey-filter::before {
          content: "";
          position: absolute;
          inset: -75px;
          z-index: -2;
          background: black;
        }
        .gooey-effect.gooey-filter::after {
          content: "";
          position: absolute;
          inset: 0;
          background: white;
          transform: scale(0);
          opacity: 0;
          z-index: -1;
          border-radius: 9999px;
        }
        .gooey-effect.gooey-active::after {
          animation: gooey-pill 0.3s ease both;
        }
        @keyframes gooey-pill {
          to { transform: scale(1); opacity: 1; }
        }
        .gooey-particle, .gooey-point {
          display: block;
          opacity: 0;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          transform-origin: center;
        }
        .gooey-particle {
          --time: 5s;
          position: absolute;
          top: calc(50% - 7px);
          left: calc(50% - 7px);
          animation: gooey-particle-anim calc(var(--time)) ease 1 -350ms;
        }
        .gooey-point {
          background: var(--color);
          opacity: 1;
          animation: gooey-point-anim calc(var(--time)) ease 1 -350ms;
        }
        @keyframes gooey-particle-anim {
          0%   { transform: rotate(0deg) translate(calc(var(--start-x)), calc(var(--start-y))); opacity: 1; animation-timing-function: cubic-bezier(0.55,0,1,0.45); }
          70%  { transform: rotate(calc(var(--rotate)*0.5)) translate(calc(var(--end-x)*1.2), calc(var(--end-y)*1.2)); opacity: 1; animation-timing-function: ease; }
          85%  { transform: rotate(calc(var(--rotate)*0.66)) translate(var(--end-x), var(--end-y)); opacity: 1; }
          100% { transform: rotate(calc(var(--rotate)*1.2)) translate(calc(var(--end-x)*0.5), calc(var(--end-y)*0.5)); opacity: 1; }
        }
        @keyframes gooey-point-anim {
          0%   { transform: scale(0); opacity: 0; animation-timing-function: cubic-bezier(0.55,0,1,0.45); }
          25%  { transform: scale(calc(var(--scale)*0.25)); }
          38%  { opacity: 1; }
          65%  { transform: scale(var(--scale)); opacity: 1; animation-timing-function: ease; }
          85%  { transform: scale(var(--scale)); opacity: 1; }
          100% { transform: scale(0); opacity: 0; }
        }
        .gooey-item-active { color: #1e1b4b !important; }
      `}</style>

      {/* colour vars for particles */}
      <style>{`
        .particle { }
        .point { }
      `}</style>

      <div
        ref={containerRef}
        className="relative flex items-center"
        style={{ transform: 'translate3d(0,0,0.01px)' }}
      >
        <ul
          ref={navRef}
          className="flex items-center list-none m-0 p-0 gap-1 relative z-[3]"
        >
          {items.map((item, index) => {
            const isActive = activeIndex === index;
            return (
              <li
                key={item.id}
                className={`relative cursor-pointer flex-shrink-0 rounded-full transition-colors duration-300 ${isActive ? 'gooey-item-active' : ''}`}
                onClick={(e) => handleClick(index, e.currentTarget as HTMLElement)}
              >
                <span className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 select-none ${isActive ? 'text-indigo-900' : 'text-slate-400'}`}>
                  {item.icon && <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>}
                  <span className="text-[9px] font-medium leading-tight whitespace-nowrap">{item.label}</span>
                </span>
              </li>
            );
          })}
        </ul>

        <span className="gooey-effect gooey-filter" ref={filterRef} />
        <span className="gooey-effect" ref={textRef} />
      </div>
    </>
  );
};

export default GooeyNav;
