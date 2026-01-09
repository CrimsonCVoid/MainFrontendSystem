"use client";

export default function SpinningRoof() {
  return (
    <div className="relative h-40 rounded-lg bg-white border border-neutral-200 overflow-hidden">
      {/* soft background grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" aria-hidden>
        <defs>
          <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* spinning roof group */}
      <div className="absolute inset-0 grid place-items-center">
        <svg
          viewBox="-60 -60 120 120"
          className="w-[86%] h-[86%] animate-spin [animation-duration:8000ms]"
          role="img"
          aria-label="Spinning roof preview"
        >
          <defs>
            {/* metallic-ish gradients */}
            <linearGradient id="roofLeft" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#dcdfe3" />
              <stop offset="100%" stopColor="#b9bec6" />
            </linearGradient>
            <linearGradient id="roofRight" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e6e9ee" />
              <stop offset="100%" stopColor="#c5cbd4" />
            </linearGradient>
            <linearGradient id="ridge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8f96a1" />
              <stop offset="100%" stopColor="#a8afb9" />
            </linearGradient>
          </defs>

          {/* subtle drop shadow */}
          <g filter="url(#shadow)">
            {/* simple gable: two roof planes */}
            <polygon
              points="-44,10 0,-18 0,18 -44,46"
              fill="url(#roofLeft)"
              stroke="#8c95a3"
              strokeWidth="1.2"
            />
            <polygon
              points="0,-18 44,10 44,46 0,18"
              fill="url(#roofRight)"
              stroke="#8c95a3"
              strokeWidth="1.2"
            />
            {/* ridge cap */}
            <polyline
              points="-10,-4 0,-8 10,-4"
              fill="none"
              stroke="url(#ridge)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* eaves / fascia accents */}
            <polyline
              points="-44,46 0,18 44,46"
              fill="none"
              stroke="#aab2bd"
              strokeWidth="2"
            />
          </g>

          {/* shadow filter */}
          <defs>
            <filter id="shadow" x="-200%" y="-200%" width="400%" height="400%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0b0e13" floodOpacity="0.15" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}
