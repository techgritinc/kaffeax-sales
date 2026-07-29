import type { Metadata } from 'next';

import { figtree, playfairDisplay } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kaffea-X POC — Meeting Summary to CRM',
  description: "Kaffea-X sales ops automation tool let's you automate the manual tracking tasks.",
  icons: '/icons/favicon.png',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full ${figtree.variable} ${playfairDisplay.variable} antialiased`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
