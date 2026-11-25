import { bootScript } from '../../lib/boot';
import { PHOTOS, PERIODS } from '../../lib/photos';
const photoMap = Object.fromEntries(PERIODS.map((p) => [p, { f: `/backdrops/${p}`, alt: PHOTOS[p].alt }]));
export const GET = () => new Response(bootScript(photoMap), { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
