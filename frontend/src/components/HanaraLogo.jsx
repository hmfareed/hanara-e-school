import React from 'react';

const HanaraLogo = ({ className = '', size = 48, alt = 'HANARA Schools Official Badge' }) => {
  return (
    <img
      src="/hanara-badge.png"
      alt={alt}
      width={size}
      height={size}
      className={`object-contain inline-block drop-shadow-md ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: 'auto',
      }}
    />
  );
};

export default HanaraLogo;
