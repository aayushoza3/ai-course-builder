// src/lib/toast.ts
export function toast(msg: string, type: 'success'|'info'|'error'='info', timeout=2600){
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('acb:toast', { detail: { msg, type, timeout } }));
  }
  