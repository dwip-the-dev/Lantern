import React from 'react';

interface LanternLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export const LanternLogo: React.FC<LanternLogoProps> = ({
  className = 'w-5 h-5',
  size = 20,
  glow = false
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${glow ? 'filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''}`}
    >
      {/* Top Cap & Ring */}
      <circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 4.5V6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8 6H16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      
      {/* Lantern Frame */}
      <path
        d="M8 6L6.5 11L7.5 18H16.5L17.5 11L16 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      
      {/* Base */}
      <path d="M8.5 18H15.5V20.5C15.5 21.0523 15.0523 21.5 14.5 21.5H9.5C8.94772 21.5 8.5 21.0523 8.5 20.5V18Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      
      {/* Vertical Ribs */}
      <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="1 1" />
      
      {/* Inner Flame Light */}
      <path
        d="M12 9.5C12.8 11 13.5 12.2 13.5 13.2C13.5 14.3 12.8 15 12 15C11.2 15 10.5 14.3 10.5 13.2C10.5 12.2 11.2 11 12 9.5Z"
        fill="#f59e0b"
      />
      <circle cx="12" cy="13" r="1" fill="#fef08a" />
    </svg>
  );
};

export default LanternLogo;
