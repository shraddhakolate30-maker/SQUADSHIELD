import { useState } from 'react';
import { User } from 'lucide-react';

interface AvatarWithFallbackProps {
  src: string;
  alt: string;
  name: string;
  sizeClass?: string;
}

export function AvatarWithFallback({
  src,
  alt,
  name,
  sizeClass = 'w-10 h-10',
}: AvatarWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`${sizeClass} rounded-lg bg-gradient-to-br from-[#1C2233] to-[#26203A] border border-[#2C3347] flex items-center justify-center shrink-0 text-[#E2E8F0] font-display font-semibold text-sm select-none`}
        aria-label={alt}
      >
        {name ? name.slice(0, 2).toUpperCase() : <User className="w-4 h-4 text-[#94A3B8]" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`${sizeClass} rounded-lg object-cover border border-[#272D3D] shrink-0 bg-[#141824]`}
    />
  );
}
