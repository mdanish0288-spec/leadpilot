// Sample photos for the layout library come from Unsplash (free commercial licence).
// Real demos use the business's own photos only (see docs/design-playbook.md).
export const unsplash = (id: string, w: number, h?: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=${w}${h ? `&h=${h}` : ''}`;

export const srcset = (id: string, ratio?: number, widths = [480, 800, 1200, 1800]) =>
  widths.map((w) => `${unsplash(id, w, ratio ? Math.round(w * ratio) : undefined)} ${w}w`).join(', ');
