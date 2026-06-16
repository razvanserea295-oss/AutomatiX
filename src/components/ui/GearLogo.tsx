import gearLogoUrl from '@/assets/images/gear-logo.png';

interface GearLogoProps {
  size?: number;
  className?: string;
}

export default function GearLogo({ size = 48, className = '' }: GearLogoProps) {
  return (
    <img
      src={gearLogoUrl}
      alt="Automatix"
      width={size}
      height={size}
      className={className}
      draggable={false}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  );
}
