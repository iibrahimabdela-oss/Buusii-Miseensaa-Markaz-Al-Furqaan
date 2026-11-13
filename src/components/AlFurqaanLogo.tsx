import React from 'react';

export type LogoSize = 'icon' | 'profile' | 'sm' | 'md' | 'lg' | 'header' | 'xl';

interface AlFurqaanLogoProps {
  size?: LogoSize | number;
  className?: string;
  alt?: string;
}

const SIZE_MAP: Record<LogoSize, { width: number; height: number; classNames: string }> = {
  icon: { width: 32, height: 32, classNames: 'w-8 h-8' },
  profile: { width: 40, height: 40, classNames: 'w-10 h-10' },
  sm: { width: 36, height: 36, classNames: 'w-9 h-9' },
  md: { width: 48, height: 48, classNames: 'w-12 h-12' },
  lg: { width: 64, height: 64, classNames: 'w-16 h-16' },
  header: { width: 80, height: 80, classNames: 'w-20 h-20' }, // Standard size for receipts, reports, forms
  xl: { width: 104, height: 104, classNames: 'w-26 h-26' },
};

export const AlFurqaanLogo: React.FC<AlFurqaanLogoProps> = ({
  size = 'md',
  className = '',
  alt = 'Giddu-gala Hifzii Qur’aanaa Al-Furqaan Logo',
}) => {
  const sizeConfig = typeof size === 'string' ? SIZE_MAP[size] : null;

  const style = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <img
      src="/assets/aistudio/loog_6003b99d.jpg"
      alt={alt}
      style={style}
      className={`inline-block rounded-full object-cover bg-white shrink-0 select-none shadow-sm ${
        sizeConfig ? sizeConfig.classNames : ''
      } ${className}`}
    />
  );
};
