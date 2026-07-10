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
      <circle cx="20" cy="20" r="20" fill="#2453C4" />
      <path
        d="M 27.37 25.16 A 9 9 0 1 1 27.37 14.84"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
