// src/app/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem('acb_user', name || email);
      router.push('/');
    } catch (e: any) {
      setErr(e?.message ?? 'Signup failed');
    }
  }

  return (
    <div className="stack stack-lg" style={{maxWidth:520, margin:'0 auto'}}>
      <h1 className="h1">Create account</h1>
      <form onSubmit={onSubmit} className="card stack">
        <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="btn primary" type="submit">Sign up</button>
      </form>
      {err && <div className="small" style={{color:'var(--danger)'}}>{err}</div>}
    </div>
  );
}
