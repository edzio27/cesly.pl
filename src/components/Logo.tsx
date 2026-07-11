type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Cesly.pl"
    >
      <defs>
        <linearGradient id="cesly-arrow-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
      </defs>
      <path
        d="M 5 30 C 9 17, 17 9, 24 9"
        fill="none"
        stroke="url(#cesly-arrow-gradient)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <polygon points="36,6 22,5.5 27,17" fill="url(#cesly-arrow-gradient)" />
    </svg>
  );
}
