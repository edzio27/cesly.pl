import React from 'react';

type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <img
      src="/cesly_logo_cropped_big.png"
      alt="Cesly.pl"
      className={className}
      style={{ height: size }}
    />
  );
}
