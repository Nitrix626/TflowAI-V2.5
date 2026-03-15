import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Pins - Top */}
      <rect x="32" y="5" width="6" height="15" rx="3" fill="currentColor" />
      <rect x="47" y="5" width="6" height="15" rx="3" fill="currentColor" />
      <rect x="62" y="5" width="6" height="15" rx="3" fill="currentColor" />
      
      {/* Pins - Bottom */}
      <rect x="32" y="80" width="6" height="15" rx="3" fill="currentColor" />
      <rect x="47" y="80" width="6" height="15" rx="3" fill="currentColor" />
      <rect x="62" y="80" width="6" height="15" rx="3" fill="currentColor" />
      
      {/* Pins - Left */}
      <rect x="5" y="32" width="15" height="6" rx="3" fill="currentColor" />
      <rect x="5" y="47" width="15" height="6" rx="3" fill="currentColor" />
      <rect x="5" y="62" width="15" height="6" rx="3" fill="currentColor" />
      
      {/* Pins - Right */}
      <rect x="80" y="32" width="15" height="6" rx="3" fill="currentColor" />
      <rect x="80" y="47" width="15" height="6" rx="3" fill="currentColor" />
      <rect x="80" y="62" width="15" height="6" rx="3" fill="currentColor" />
      
      {/* Chip Body */}
      <rect x="20" y="20" width="60" height="60" rx="16" stroke="currentColor" strokeWidth="8" />
      
      {/* AI Text */}
      <path 
        d="M35 62L43 38L51 62M37 56H49" 
        stroke="currentColor" 
        strokeWidth="7" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M62 38V62" 
        stroke="currentColor" 
        strokeWidth="7" 
        strokeLinecap="round" 
      />
    </svg>
  );
};
