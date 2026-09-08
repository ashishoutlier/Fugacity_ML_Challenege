import type { Metadata } from 'next';
import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-serif/400.css';
import '@fontsource/ibm-plex-serif/400-italic.css';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(
    'https://reactor-yield-ashish.zany-dell-8430.chatgpt.site',
  ),
  title: 'Reactor Yield | Ashish Sharma',
  description:
    'A scientific machine learning project combining reactor physics with an ExtraTrees residual model. Explore an interactive simulation and the original work by Ashish Sharma.',
  openGraph: {
    title: 'Reactor Yield | Ashish Sharma',
    description:
      'Teaching a model how a reactor behaves. An interactive scientific machine learning case study.',
    type: 'website',
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
