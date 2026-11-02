import { useEffect } from 'react';
import { assetBase } from './scene-data';

/** Plex is packaged with the observatory assets, so its faces resolve against that base. */
export const fontFaceCss = (base: string) =>
  [400, 500, 700]
    .map(
      (weight) =>
        `@font-face{font-family:Plex;src:url('${base}ibm-plex-mono-${weight}.woff2') format('woff2');font-weight:${weight};font-display:swap}`,
    )
    .join('');

export function useFonts() {
  useEffect(() => {
    const fonts = document.createElement('style');
    fonts.textContent = fontFaceCss(assetBase);
    document.head.append(fonts);
    return () => fonts.remove();
  }, []);
}
