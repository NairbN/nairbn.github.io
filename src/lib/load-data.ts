// Build-time data. PUBLIC_DATA / INTERNAL_DATA point at a real JSON file (set by the deploy
// scripts on flynn); without them the fictional mocks are used (local dev, CI).
import fs from 'node:fs';
import publicMock from '../data/public.mock.json';
import internalMock from '../data/internal.mock.json';

function load(envVar: string, fallback: unknown): unknown {
  const p = process.env[envVar];
  if (!p) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
export const loadPublic = () => load('PUBLIC_DATA', publicMock);
export const loadInternal = () => load('INTERNAL_DATA', internalMock);
