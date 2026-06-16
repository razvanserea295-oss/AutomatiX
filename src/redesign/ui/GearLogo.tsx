









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
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`block text-accent ${className}`}
      style={{ display: 'block' }}
    >
      {}
      <path
        d="M24 3.5l2.55 4.06a2 2 0 0 0 2.18.88l4.63-1.2 1.2 4.63a2 2 0 0 0 1.4 1.4l4.63 1.2-1.2 4.63a2 2 0 0 0 .88 2.18L44.5 24l-4.06 2.55a2 2 0 0 0-.88 2.18l1.2 4.63-4.63 1.2a2 2 0 0 0-1.4 1.4l-1.2 4.63-4.63-1.2a2 2 0 0 0-2.18.88L24 44.5l-2.55-4.06a2 2 0 0 0-2.18-.88l-4.63 1.2-1.2-4.63a2 2 0 0 0-1.4-1.4l-4.63-1.2 1.2-4.63a2 2 0 0 0-.88-2.18L3.5 24l4.06-2.55a2 2 0 0 0 .88-2.18l-1.2-4.63 4.63-1.2a2 2 0 0 0 1.4-1.4l1.2-4.63 4.63 1.2a2 2 0 0 0 2.18-.88L24 3.5z"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.08}
      />
      {}
      <circle
        cx="24"
        cy="24"
        r="8"
        stroke="currentColor"
        strokeWidth={2.4}
      />
      {}
      <circle cx="24" cy="24" r="2.4" fill="currentColor" />
    </svg>
  );
}
