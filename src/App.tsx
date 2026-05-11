/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import InteractiveMap from './InteractiveMap';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    document.body.style.colorScheme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="antialiased text-ink min-h-screen bg-background relative">
      <button
        type="button"
        onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
        className="fixed top-4 right-4 z-50 inline-flex items-center gap-2 rounded-none border border-ink/20 bg-paper/90 px-3 py-2 mono text-[8px] uppercase tracking-widest shadow-sm backdrop-blur-md hover:border-gold hover:bg-paper"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? <SunMedium className="h-3.5 w-3.5" /> : <MoonStar className="h-3.5 w-3.5" />}
        {theme === 'dark' ? 'Light' : 'Dark'} Mode
      </button>
      <InteractiveMap />
    </div>
  );
}
