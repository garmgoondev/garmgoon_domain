"use client";

// High-detail SVG Mini Race Car with customizable body color & nitro flame
export default function CarIcon({ color = "#3B82F6", isNitro = false, className = "" }) {
  return (
    <div className={`carWrapper ${className}`} style={{ position: "relative", display: "inline-block" }}>
      <svg
        width="64"
        height="32"
        viewBox="0 0 64 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}
      >
        {/* Car Body Shadow */}
        <ellipse cx="32" cy="30" rx="26" ry="2" fill="rgba(0,0,0,0.2)" />

        {/* Rear Spoiler */}
        <rect x="4" y="6" width="4" height="12" rx="1" fill="#1E293B" />
        <rect x="2" y="5" width="8" height="3" rx="1" fill="#0F172A" />

        {/* Main Chassis */}
        <path
          d="M6 22C6 19 8 16 12 15L22 13L34 8C37 6.5 42 6.5 45 8L54 13C58 15 60 18 60 22L58 24C58 25 56 26 54 26H10C8 26 6 25 6 24V22Z"
          fill={color}
        />

        {/* Aerodynamic highlight */}
        <path
          d="M12 16L24 14L35 9.5C37 8.5 41 8.5 43 9.5L52 14"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Cockpit / Windshield */}
        <path
          d="M26 13L35 9C37 8 40 8 42 9L48 13C47 15 45 15.5 41 15.5H29C27 15.5 26 14.5 26 13Z"
          fill="#0F172A"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.8"
        />
        {/* Windshield Reflection */}
        <path d="M30 13.5L36 10L39 10L33 13.5H30Z" fill="rgba(255,255,255,0.3)" />

        {/* Headlight */}
        <path d="M58 20L60 21L58 22H56V20H58Z" fill="#FDE047" />

        {/* Front Wheel */}
        <circle cx="48" cy="24" r="6" fill="#1E293B" />
        <circle cx="48" cy="24" r="3.5" fill="#64748B" />
        <circle cx="48" cy="24" r="1.5" fill="#CBD5E1" />

        {/* Rear Wheel */}
        <circle cx="16" cy="24" r="6" fill="#1E293B" />
        <circle cx="16" cy="24" r="3.5" fill="#64748B" />
        <circle cx="16" cy="24" r="1.5" fill="#CBD5E1" />

        {/* Side Racing Stripe */}
        <line x1="20" y1="19" x2="42" y2="19" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>

      {/* Nitro Flame (Animated when High WPM) */}
      {isNitro && (
        <div className="nitroFlame">
          <span className="flameInner" />
        </div>
      )}
    </div>
  );
}
