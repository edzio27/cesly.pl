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
      <rect x="2" y="15.3" width="13" height="1.4" fill="#D9622F" />
      <rect x="4" y="12.3" width="9" height="1.4" fill="#D9622F" />
      <rect x="6" y="9.3" width="5" height="1.4" fill="#D9622F" />
      <path
        d="M 13 17 L 17 10 L 24 10 L 27 17 Z"
        fill="#D9622F"
      />
      <rect x="9" y="17" width="21" height="8" rx="2.5" fill="#D9622F" />
      <circle cx="14" cy="26" r="2.8" fill="#12163A" />
      <circle cx="26" cy="26" r="2.8" fill="#12163A" />
    </svg>
  );
}
