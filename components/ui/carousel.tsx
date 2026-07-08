import { useEffect, useMemo, useRef, useState, JSX } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'motion/react';

import { Circle, Code, FileText, Layers, Layout } from 'lucide-react';

export interface CarouselItem {
  title: string;
  description: string;
  id: number;
  icon: React.ReactNode;
  colorFrom?: string;
  colorTo?: string;
  cardType?: string;
  cardNumber?: string;
}

export interface CarouselProps {
  items?: CarouselItem[];
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
  round?: boolean;
  onPositionChange?: (index: number) => void;
}

const DEFAULT_ITEMS: CarouselItem[] = [
  {
    title: 'Text Animations',
    description: 'Cool text animations for your projects.',
    id: 1,
    icon: <FileText className="h-[16px] w-[16px] text-white" />
  },
  {
    title: 'Animations',
    description: 'Smooth animations for your projects.',
    id: 2,
    icon: <Circle className="h-[16px] w-[16px] text-white" />
  },
  {
    title: 'Components',
    description: 'Reusable components for your projects.',
    id: 3,
    icon: <Layers className="h-[16px] w-[16px] text-white" />
  },
  {
    title: 'Backgrounds',
    description: 'Beautiful backgrounds and patterns for your projects.',
    id: 4,
    icon: <Layout className="h-[16px] w-[16px] text-white" />
  },
  {
    title: 'Common UI',
    description: 'Common UI components are coming soon!',
    id: 5,
    icon: <Code className="h-[16px] w-[16px] text-white" />
  }
];

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface CarouselItemProps {
  item: CarouselItem;
  index: number;
  itemWidth: number;
  round: boolean;
  trackItemOffset: number;
  x: any;
  transition: any;
}

function CarouselItem({ item, index, itemWidth, round, trackItemOffset, x, transition }: CarouselItemProps) {
  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];
  const outputRange = [90, 0, -90];
  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  return (
    <motion.div
      key={`${item?.id ?? index}-${index}`}
      className={`relative shrink-0 flex flex-col ${
        round
          ? 'items-center justify-center text-center bg-slate-900 dark:bg-[#120F17] border-0'
          : 'items-start justify-between bg-slate-900 border border-white/10 rounded-[20px]'
      } overflow-hidden cursor-grab active:cursor-grabbing shadow-xl ring-1 ring-white/10`}
      style={{
        width: itemWidth,
        height: round ? itemWidth : '100%',
        rotateY: rotateY,
        ...(round && { borderRadius: '50%' })
      }}
      transition={transition}
    >
      {/* Animated SVG Background for Smart Wallet Vibe */}
      <div className="absolute inset-0 z-0 opacity-60 mix-blend-screen pointer-events-none">
        <svg viewBox="0 0 400 400" className="w-full h-full object-cover">
          <motion.circle 
            cx="50" cy="50" r="250" 
            fill={`url(#grad1-${item.id})`}
            animate={{ cx: [50, 150, 50], cy: [50, 100, 50] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle 
            cx="350" cy="350" r="300" 
            fill={`url(#grad2-${item.id})`}
            animate={{ cx: [350, 250, 350], cy: [350, 200, 350] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <defs>
            <radialGradient id={`grad1-${item.id}`}>
              <stop offset="0%" stopColor={item.colorFrom || '#3b82f6'} stopOpacity="0.6" />
              <stop offset="100%" stopColor={item.colorFrom || '#3b82f6'} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`grad2-${item.id}`}>
              <stop offset="0%" stopColor={item.colorTo || '#8b5cf6'} stopOpacity="0.5" />
              <stop offset="100%" stopColor={item.colorTo || '#8b5cf6'} stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <div className={`relative z-10 flex justify-between items-start w-full ${round ? 'p-0 m-0' : 'p-6'}`}>
        <span className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 shadow-lg text-white">
          {item.icon}
        </span>
        {!round && (
          <span className="text-white/50 tracking-[0.2em] font-bold text-xs uppercase mix-blend-overlay">
            {item.cardType || 'DEBIT'}
          </span>
        )}
      </div>

      {/* Credit Card Chip */}
      {!round && (
        <div className="relative z-10 px-6 mt-2 opacity-80">
          <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="28" rx="6" fill="#FBBF24" fillOpacity="0.8"/>
            <path d="M0 10H36M0 18H36M12 0V28M24 0V28" stroke="#B45309" strokeWidth="1" strokeOpacity="0.6"/>
          </svg>
        </div>
      )}

      {/* Large Watermark Mask */}
      {!round && (
        <div className="absolute right-[-20px] bottom-10 z-0 opacity-10 pointer-events-none transform -rotate-12 select-none">
          <span className="text-7xl font-black italic text-white mix-blend-overlay">
            {item.cardType || 'DEBIT'}
          </span>
        </div>
      )}

      <div className="relative z-10 p-6 flex flex-col h-full justify-end">
        {item.cardNumber && (
          <div className="mb-4 font-mono text-xl text-white/90 tracking-widest drop-shadow-md">
            {item.cardNumber}
          </div>
        )}
        <div className="mb-1 font-black text-2xl tracking-tight text-white drop-shadow-md uppercase">{item.title}</div>
        <div className="text-sm font-medium text-white/80 drop-shadow-sm">{item.description}</div>
      </div>
    </motion.div>
  );
}

export default function Carousel({
  items = DEFAULT_ITEMS,
  baseWidth = 300,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
  round = false,
  onPositionChange
}: CarouselProps): JSX.Element {
  const containerPadding = 16;
  const itemWidth = baseWidth - containerPadding * 2;
  const trackItemOffset = itemWidth + GAP;
  const itemsForRender = useMemo(() => {
    if (!loop) return items;
    if (items.length === 0) return [];
    return [items[items.length - 1], ...items, items[0]];
  }, [items, loop]);

  const [position, setPosition] = useState<number>(loop ? 1 : 0);
  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  useEffect(() => {
    if (onPositionChange) {
      const actualIndex = loop 
        ? (position === 0 ? items.length - 1 : position === itemsForRender.length - 1 ? 0 : position - 1)
        : position;
      onPositionChange(actualIndex);
    }
  }, [position, loop, items.length, itemsForRender.length, onPositionChange]);

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return undefined;
    if (pauseOnHover && isHovered) return undefined;

    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, itemsForRender.length - 1));
    }, autoplayDelay);

    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length]);

  useEffect(() => {
    const startingPosition = loop ? 1 : 0;
    setPosition(startingPosition);
    x.set(-startingPosition * trackItemOffset);
  }, [items.length, loop, trackItemOffset, x]);

  useEffect(() => {
    if (!loop && position > itemsForRender.length - 1) {
      setPosition(Math.max(0, itemsForRender.length - 1));
    }
  }, [itemsForRender.length, loop, position]);

  const effectiveTransition = isJumping ? { duration: 0 } : SPRING_OPTIONS;

  const handleAnimationStart = () => {
    setIsAnimating(true);
  };

  const handleAnimationComplete = () => {
    if (!loop || itemsForRender.length <= 1) {
      setIsAnimating(false);
      return;
    }
    const lastCloneIndex = itemsForRender.length - 1;

    if (position === lastCloneIndex) {
      setIsJumping(true);
      const target = 1;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    if (position === 0) {
      setIsJumping(true);
      const target = items.length;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    setIsAnimating(false);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
    const { offset, velocity } = info;
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0;

    if (direction === 0) return;

    setPosition(prev => {
      const next = prev + direction;
      const max = itemsForRender.length - 1;
      return Math.max(0, Math.min(next, max));
    });
  };

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(itemsForRender.length - 1, 0),
          right: 0
        }
      };

  const activeIndex =
    items.length === 0 ? 0 : loop ? (position - 1 + items.length) % items.length : Math.min(position, items.length - 1);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden p-4 flex flex-col h-full w-full ${
        round ? 'rounded-full border border-white' : ''
      }`}
      style={{
        width: `100%`,
        ...(round && { height: `${baseWidth}px` })
      }}
    >
      <motion.div
        className="flex h-[calc(100%-40px)]"
        drag={isAnimating ? false : 'x'}
        {...dragProps}
        style={{
          width: itemWidth,
          gap: `${GAP}px`,
          perspective: 1000,
          perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
          x
        }}
        onDragEnd={handleDragEnd}
        animate={{ x: -(position * trackItemOffset) }}
        transition={effectiveTransition}
        onAnimationStart={handleAnimationStart}
        onAnimationComplete={handleAnimationComplete}
      >
        {itemsForRender.map((item, index) => (
          <CarouselItem
            key={`${item?.id ?? index}-${index}`}
            item={item}
            index={index}
            itemWidth={itemWidth}
            round={round}
            trackItemOffset={trackItemOffset}
            x={x}
            transition={effectiveTransition}
          />
        ))}
      </motion.div>
      <div className={`absolute bottom-2 left-0 right-0 flex w-full justify-center z-20`}>
        <div className="flex w-[150px] justify-center gap-3">
          {items.map((_, index) => (
            <motion.button
              type="button"
              key={index}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={activeIndex === index}
              className={`h-2.5 w-2.5 rounded-full cursor-pointer border-0 p-0 appearance-none transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 shadow-sm ${
                activeIndex === index
                  ? 'bg-blue-500 w-6'
                  : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
              }`}
              onClick={() => setPosition(loop ? index + 1 : index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
