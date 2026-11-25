// Service icon fills as classes (the CSP forbids style="" attributes). Same colours as lib/icons.ts.
import { SERVICE_ICONS, FALLBACK_ICON, CLASSIFIED_FILL } from '../../lib/icons';
const grad = (c1: string, c2: string) => `linear-gradient(160deg,${c1} 0%,${c2} 100%)`;
const rules = Object.entries(SERVICE_ICONS).map(([n, i]) => `.ic-${n.replace(/[^a-z0-9]/g, '')}{background:${grad(i.c1, i.c2)}}`);
rules.push(`.ic-fallback{background:${grad(FALLBACK_ICON.c1, FALLBACK_ICON.c2)}}`, `.ic-classified{background:${CLASSIFIED_FILL}}`);
export const GET = () => new Response(rules.join('\n') + '\n', { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
