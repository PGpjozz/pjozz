/** Wordmark for marketing header — cyan/violet accent */
export function PjozzMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        className="h-9 w-9 shrink-0"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="pjozz-ring" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="9" stroke="url(#pjozz-ring)" strokeWidth="1.5" fill="none" />
        <path
          d="M12 28V12h8.2c3.5 0 6 2.4 6 5.6 0 2.1-1 3.8-2.7 4.7L28 28h-4.2l-3.5-4.8h-4.3V28H12zm4-8.3h4c1.4 0 2.3-.9 2.3-2.2 0-1.4-.9-2.2-2.4-2.2h-4v4.4z"
          fill="url(#pjozz-ring)"
        />
      </svg>
      <span className="font-heading text-lg font-semibold tracking-tight text-white">
        Pjozz<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">.</span>
      </span>
    </span>
  );
}
