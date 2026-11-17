interface FolixLogoProps {
  size?: number;
  className?: string;
}

export function FolixLogo({ size = 24, className }: FolixLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="folixEmblemBg"
          x1="28"
          y1="20"
          x2="228"
          y2="236"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="55%" stopColor="#3730A3" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient
          id="folixEmblemF"
          x1="78"
          y1="66"
          x2="178"
          y2="190"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E0E7FF" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="224" height="224" rx="52" fill="url(#folixEmblemBg)" />
      <rect
        x="17"
        y="17"
        width="222"
        height="222"
        rx="51"
        stroke="#C7D2FE"
        strokeOpacity="0.28"
        strokeWidth="2"
      />
      <rect
        x="96"
        y="64"
        width="90"
        height="120"
        rx="14"
        fill="#E0E7FF"
        fillOpacity="0.22"
      />
      <path
        d="M80 74C80 67.3726 85.3726 62 92 62H168C174.627 62 180 67.3726 180 74V78C180 84.6274 174.627 90 168 90H110V114H148C154.627 114 160 119.373 160 126V128C160 134.627 154.627 140 148 140H110V178C110 184.627 104.627 190 98 190H92C85.3726 190 80 184.627 80 178V74Z"
        fill="url(#folixEmblemF)"
      />
      <circle cx="165" cy="173" r="15" fill="#F59E0B" />
    </svg>
  );
}

