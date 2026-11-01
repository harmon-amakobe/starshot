export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    fit: <path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" />,
    play: <path d="m8 5 11 7-11 7Z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    guide: <><path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3Z" /></>,
    orbit: <><circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)" /></>,
    face: <><circle cx="12" cy="12" r="9" /><path d="M8 14q4 5 8 0M8 8v1m8-1v1" /></>,
    menu: <path d="M5 6h14M5 12h14M5 18h14" />,
    retry: <><path d="M4 10a8 8 0 1 1 2 8M4 4v6h6" /></>,
    lock: <><rect x="6" y="10" width="12" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    craft: <><path d="M3 6v12m3-7 12-5 3 6-3 6-12-5Z" /><circle cx="16" cy="12" r="2" /></>,
    wave: <path d="M2 12q3-12 6 0t6 0 6 0" />,
    down: <path d="m6 9 6 6 6-6" />,
    sound: <><path d="M3 9h4l5-4v14l-5-4H3ZM16 8q4 4 0 8m3-11q7 7 0 14" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.orbit}</svg>;
}
