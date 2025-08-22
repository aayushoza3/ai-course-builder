// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('acb_user') : null;
    setUser(u);
  }, []);

  const logout = () => {
    localStorage.removeItem('acb_user');
    setUser(null);
  };

  const openSidebar = () => {
    window.dispatchEvent(new Event('acb:sidebar-toggle'));
  };

  return (
    <nav className="row" style={{ gap: 8 }}>
      <button className="icon-btn" aria-label="Open menu" onClick={openSidebar}>
        {/* Hamburger */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>
      <Link href="/" className="btn ghost">Builder</Link>
      <Link href="/courses" className="btn ghost">My Courses</Link>
      <ThemeToggle />
      {!user ? (
        <>
          <Link href="/login" className="btn">Log in</Link>
          <Link href="/signup" className="btn ghost">Sign up</Link>
        </>
      ) : (
        <button className="btn" onClick={logout}>Logout</button>
      )}
    </nav>
  );
}
