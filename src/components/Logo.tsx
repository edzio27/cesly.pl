import React from 'react';

type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <circle cx="50" cy="50" r="48" fill="url(#gradient)" opacity="0.95" />

      <path
        d="M 30 45 Q 50 25, 70 45"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />

      <circle cx="30" cy="45" r="4" fill="white" filter="url(#glow)" />
      <circle cx="70" cy="45" r="4" fill="white" filter="url(#glow)" />

      <path
        d="M 30 55 Q 50 75, 70 55"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />

      <circle cx="30" cy="55" r="4" fill="white" filter="url(#glow)" />
      <circle cx="70" cy="55" r="4" fill="white" filter="url(#glow)" />

      <path
        d="M 45 50 L 55 50 M 50 45 L 50 55"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#glow)"
      />
    </svg>
  );
}
