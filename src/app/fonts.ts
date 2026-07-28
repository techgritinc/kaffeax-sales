import { Figtree, Playfair_Display } from 'next/font/google';

// Body / UI face — matches the prototype's Figtree weight range (300–800).
export const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-figtree',
});

// Display / editorial face — matches the prototype's Playfair Display (700/900).
export const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  weight: ['700', '900'],
  variable: '--font-playfair',
});
