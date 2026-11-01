export interface WorldRect { left: number; top: number; right: number; bottom: number; }
export function worldRect(width: number, height: number, deckHeight: number): WorldRect {
  const landscape = height < 500 && width > 600;
  const top = landscape ? 84 : width < 600 ? Math.min(270, height - deckHeight - 200) : width < 1000 ? 235 : 150;
  return { left: landscape ? 225 : width >= 1000 ? 380 : width < 600 ? 150 : 145,
    right: width - (width >= 1000 ? 190 : 65), top,
    bottom: Math.max(top + 85, height - deckHeight - (landscape ? 65 : 95)) };
}
export function fitOverview(points: readonly (readonly number[])[], width: number, height: number, rect: WorldRect) {
  const xs = points.map(p => p[0]!), ys = points.map(p => p[1]!);
  const lowX = Math.min(...xs), highX = Math.max(...xs), lowY = Math.min(...ys), highY = Math.max(...ys);
  const padding = height < 500 ? 32 : 36;
  const usableW = Math.max(40, rect.right - rect.left - padding * 2);
  const usableH = Math.max(35, rect.bottom - rect.top - padding * 2);
  const kmPerPixel = Math.max((highX - lowX) / usableW, (highY - lowY) / usableH, 1);
  const midX = (rect.left + rect.right) / 2, midY = (rect.top + rect.bottom) / 2;
  return { height: kmPerPixel * height, centre: [(lowX + highX) / 2 - (midX - width / 2) * kmPerPixel,
    (lowY + highY) / 2 + (midY - height / 2) * kmPerPixel, 0] as const };
}
