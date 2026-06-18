import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'StellarFlow | Treasury OS',
  description: 'Enterprise-grade Corporate Treasury Operating System',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-canvas text-primary dark:bg-dark-canvas dark:text-dark-primary transition-colors duration-[450ms] ease-in-out" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
          <div className="fixed inset-0 z-[-1] bg-transparent dark:bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.03)_0%,#040208_100%)] bg-[radial-gradient(circle_at_50%_0%,rgba(217,119,6,0.02)_0%,#FDFDFB_100%)] pointer-events-none transition-colors duration-[450ms] ease-in-out" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
