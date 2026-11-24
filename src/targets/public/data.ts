import { loadPublic } from '../../lib/load-data';
const data = loadPublic();
export const GET = () => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
