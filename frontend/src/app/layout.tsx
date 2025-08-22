// src/app/layout.tsx
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/Navbar';
import Toaster from '@/components/Toaster';
import Sidebar from '@/components/Sidebar';
import CommandPalette from '@/components/CommandPalette';
import QuickResume from '@/components/QuickResume';
import BackgroundFX from '@/components/BackgroundFX';

export const metadata = {
  title: 'AI Course Builder',
  description: 'Describe what you want to learn. We’ll make the course.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Literata:wght@400;600&display=swap" rel="stylesheet"/>
      </head>
      <body>
        <Providers>
          {/* Background sits behind everything */}
          <BackgroundFX />

          <header style={{position:'sticky', top:0, zIndex:30, backdropFilter:'blur(6px)'}}>
            <div className="container row" style={{justifyContent:'space-between', borderBottom:'1px solid var(--border)', height:56}}>
              <a href="/" className="row" style={{fontWeight:700}}>
                <span style={{
                  display:'inline-flex', width:24, height:24, alignItems:'center', justifyContent:'center',
                  borderRadius:6, background:'var(--ring)', color:'#fff', fontSize:12
                }}>A</span>
                <span>AI Course Builder</span>
              </a>
              <Navbar />
            </div>
          </header>

          <Sidebar />

          <main className="container">
            {children}
          </main>

          <Toaster />
          <CommandPalette />
          <QuickResume />
          <div className="noise" aria-hidden="true"></div>
        </Providers>
      </body>
    </html>
  );
}
