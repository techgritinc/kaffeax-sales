import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Kaffea-X Sales',
  description: "Kaffea-X sales ops automation tool let's you automate the manual tracking tasks.",
  icons: '/icons/favicon.png',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
