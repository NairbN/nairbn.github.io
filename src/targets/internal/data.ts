import { loadInternal } from '../../lib/load-data';
const data = loadInternal();
export const GET = () => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
