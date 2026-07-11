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
          <stop offset="0%" stopColor="#193CB4" />
          <stop offset="100%" stopColor="#64AAFA" />
        </linearGradient>
      </defs>
      <path
        d="M 15 17.5 C 19.5 16, 23.5 14, 27 12.5"
        fill="none"
        stroke="url(#cesly-arrow-gradient)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M 35.5 7.5 L 35.8 12.8 L 27.5 13.3 Q 30.5 11.3 27 9.2 Z"
        fill="url(#cesly-arrow-gradient)"
      />
    </svg>
  );
}
