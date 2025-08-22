export default function Logo({ className = 'h-6 w-6' }: { className?: string }) {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0" stopColor="#4ade80" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#g)" />
        <path d="M18 22h28M18 32h18M18 42h12" stroke="currentColor" strokeWidth="4" className="text-gray-900 dark:text-gray-900" />
      </svg>
    );
  }
  