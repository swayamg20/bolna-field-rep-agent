import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BOLNA ASSIGNMENT — Field Sales Intelligence',
  description: 'Automated field sales rep check-ins powered by voice AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
