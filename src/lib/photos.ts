// The three time-of-day backdrops and their credits (from design/photos/cities/CREDITS.tsv).
export type Period = 'morning' | 'midday' | 'night';

export interface Photo {
  period: Period;
  label: string;
  place: string;
  alt: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  commons: string;
  hours: string;
}

export const PHOTOS: Record<Period, Photo> = {
  morning: {
    period: 'morning', label: 'Morning', place: 'Chicago lakefront', hours: '5 am to 11 am',
    alt: 'The Chicago skyline glowing in soft early light across the lakefront',
    title: 'Chicago Lakefront Night Skyline', author: 'Tony Webster',
    license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    commons: 'https://commons.wikimedia.org/wiki/File:Chicago_Lakefront_Night_Skyline.jpg',
  },
  midday: {
    period: 'midday', label: 'Midday', place: 'Chicago River', hours: '11 am to 6 pm',
    alt: 'Skyscrapers lining the Chicago River under a bright blue sky',
    title: 'Chicago skyline on a sunny day', author: 'Bex Walton',
    license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    commons: 'https://commons.wikimedia.org/wiki/File:Chicago_skyline_on_a_sunny_day_(47880066481).jpg',
  },
  night: {
    period: 'night', label: 'Night', place: 'Minato, Tokyo', hours: '6 pm to 5 am',
    alt: 'Tokyo Tower glowing orange among the lit towers of Minato at night',
    title: 'Tokyo Tower, Minato City', author: 'David Kernan',
    license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    commons: 'https://commons.wikimedia.org/wiki/File:Tokyo_Tower,_Minato_City.jpg',
  },
};
export const PERIODS: Period[] = ['morning', 'midday', 'night'];

/** Plain-JS clock rule shared by the inline head script (kept in sync by hand): 05-11 morning, 11-18 midday, else night. */
export const periodAt = (hour: number): Period => (hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 18 ? 'midday' : 'night');

/** Built-in backdrops, addressed as `builtin:<id>` in portal settings. Files live in /backdrops (bundled with the internal build). */
export interface Builtin { id: string; label: string; place: string; period: Period; file: string }
export const BUILTINS: Builtin[] = [
  { id: 'chicago-lakefront', label: 'Lakefront', place: 'Chicago', period: 'morning', file: '/backdrops/morning' },
  { id: 'chicago-river', label: 'River', place: 'Chicago', period: 'midday', file: '/backdrops/midday' },
  { id: 'tokyo-minato', label: 'Minato', place: 'Tokyo', period: 'night', file: '/backdrops/night' },
];
