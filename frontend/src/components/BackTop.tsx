// src/components/BackTop.tsx
'use client';

import { useEffect, useState } from 'react';

export default function BackTop(){
  const [show, setShow] = useState(false);
  useEffect(()=>{
    const onScroll = () => setShow(window.scrollY > 240);
    onScroll(); window.addEventListener('scroll', onScroll);
    return ()=> window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button className="backtop" onClick={()=>window.scrollTo({top:0, behavior:'smooth'})} title="Back to top">↑</button>
  );
}
