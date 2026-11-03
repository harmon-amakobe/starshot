import type { FlightAudio } from '@starshot/presentation/audio';
import { useEffect, type RefObject } from 'react';
import { assetBase } from './scene-data';
// Keep font, media listener and audio disposal in the shell's original effect slot.
export function useShellAssets(
  setReduced: (value: boolean) => void,
  audio: RefObject<FlightAudio>,
) {
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)'),
      change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    const fonts = document.createElement('style');
    fonts.textContent = [400, 500, 700]
      .map(
        (weight) =>
          `@font-face{font-family:Plex;src:url('${assetBase}ibm-plex-mono-${weight}.woff2') format('woff2');font-weight:${weight};font-display:swap}`,
      )
      .join('');
    document.head.append(fonts);
    return () => {
      query.removeEventListener('change', change);
      fonts.remove();
      audio.current.dispose();
    };
  }, []);
}
