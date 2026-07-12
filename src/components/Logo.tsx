type LogoProps = {
  size?: number;
  className?: string;
};

// Cropped directly from the user's own logo file (car + speed lines,
// keyed out of its navy background) so the on-site mark is pixel-exact
// to the source rather than a hand-redrawn approximation.
const ASPECT_RATIO = 329 / 148;

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <img
      src="/car-icon.png"
      alt="Cesly.pl"
      className={className}
      style={{ height: size, width: size * ASPECT_RATIO }}
    />
  );
}
