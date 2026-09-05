import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ChatFab } from '@/components/chat/ChatFab';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AQUASENSE / Operational Digital Twin',
  description:
    'Real-time wastewater treatment operations console with an interactive plant digital twin.',
};

export const viewport: Viewport = {
  themeColor: '#071522',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      data-style="brutal"
      data-admin-look="soft"
      suppressHydrationWarning
    >
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var d=document.documentElement;var t=localStorage.getItem('aquasense.theme');if(t!=='light')t='dark';d.classList.remove('light','dark');d.classList.add(t);var s=localStorage.getItem('aquasense.style');if(s!=='hydraulic'&&s!=='atlas')s='brutal';d.setAttribute('data-style',s);var a=localStorage.getItem('aquasense.adminLook');if(a!=='brutal')a='soft';d.setAttribute('data-admin-look',a);}catch(e){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-style','brutal');document.documentElement.setAttribute('data-admin-look','soft');}})();",
          }}
        />
        <ThemeProvider>
          {children}
          <ChatFab />
        </ThemeProvider>
      </body>
    </html>
  );
}
