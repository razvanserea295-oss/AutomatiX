interface GearLogoProps {
  size?: number;
  className?: string;
}

export default function GearLogo({ size = 48, className = '' }: GearLogoProps) {
  return (
    <svg
      role="img"
      aria-label="Automatix"
      width={size}
      height={size}
      viewBox="0 0 104 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`block ${className}`}
      style={{ display: 'block' }}
    >
      <g stroke="#0f172a" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M20 102 L50 18" />
        <path d="M50 18 L84 102" />
        <path d="M31 74 L69 74" />
      </g>
      <path d="M84 18 L50 102" stroke="#2563eb" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}