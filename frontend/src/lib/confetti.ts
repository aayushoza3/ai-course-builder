// src/lib/confetti.ts
export function confettiBurst(count=36){
    if (typeof window === 'undefined') return;
    const root = document.createElement('div');
    root.className = 'confetti';
    document.body.appendChild(root);
  
    const colors = ['#60a5fa', '#34d399', '#f472b6', '#f59e0b', '#a78bfa'];
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  
    for (let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const x = Math.random()*vw;
      const xend = x + (Math.random()*120 - 60);
      const c = colors[i % colors.length];
      el.style.left = `${x}px`;
      el.style.setProperty('--x', '0px');
      el.style.setProperty('--xend', `${xend - x}px`);
      el.style.background = c;
      el.style.animationDuration = `${1.6 + Math.random()*0.9}s`;
      el.style.animationDelay = `${Math.random()*0.2}s`;
      root.appendChild(el);
    }
  
    setTimeout(()=> root.remove(), 2600);
  }
  