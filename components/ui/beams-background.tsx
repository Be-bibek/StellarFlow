'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Beams from './beams';

export function BeamsBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none">
      <Beams
        beamWidth={1}
        beamHeight={30}
        beamNumber={22}
        lightColor={isDark ? "#8b5cf6" : "#b0c4de"} // light steel blue for light mode
        baseColor={isDark ? "#000000" : "#ffffff"}
        speed={2}
        noiseIntensity={isDark ? 1.75 : 0}
        scale={0.2}
        rotation={30}
        backgroundColor={isDark ? "transparent" : "#ffffff"}
      />
    </div>
  );
}
