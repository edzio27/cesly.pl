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
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path
        d="M 7 31 C 9 18, 15 11, 24 9"
        fill="none"
        stroke="url(#cesly-arrow-gradient)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <polygon points="33,6 22,7.5 28,18" fill="url(#cesly-arrow-gradient)" />
    </svg>
  );
}
