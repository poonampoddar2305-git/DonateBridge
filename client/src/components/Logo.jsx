import React from 'react';

/**
 * DonateBridge Original branding logo component.
 * Represents: Bridge + Heart + Helping Hands + Location Pin + Leaf.
 */
export default function Logo({
  type = 'main', // 'main' | 'icon' | 'horizontal' | 'vertical' | 'navbar' | 'favicon'
  theme = 'light', // 'light' | 'dark'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = ''
}) {
  // Dimensions map
  const sizeMap = {
    sm: { icon: 24, text: 'text-sm' },
    md: { icon: 40, text: 'text-xl' },
    lg: { icon: 72, text: 'text-3xl' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Base icon SVG Path:
  // - Pin & Bridge base: path starting like location pin, but base is arched bridge path.
  // - Heart: in the center.
  // - Leaf: top green element.
  // - Helping Hands: supporting lines.
  const renderIconSvg = () => {
    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none"
      >
        {/* Gradients */}
        <defs>
          <linearGradient id="gradientPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C48B3F" />
            <stop offset="100%" stopColor="#1C1B18" />
          </linearGradient>
          <linearGradient id="gradientSecondary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C48B3F" />
            <stop offset="100%" stopColor="#EAE4DC" />
          </linearGradient>
        </defs>

        {/* 1. Location Pin + Bridge Base (Combined Outer Frame) */}
        <path
          d="M60 10C35.15 10 15 30.15 15 55C15 75 35 95 35 95L42.5 102.5C48 108 51.5 110 60 110C68.5 110 72 108 77.5 102.5L85 95C85 95 105 75 105 55C105 30.15 84.85 10 60 10Z"
          fill="url(#gradientPrimary)"
        />

        {/* Arched Bridge Span Negative Space at the bottom */}
        <path
          d="M32 90C45 78 75 78 88 90C78 100 60 102 32 90Z"
          fill={theme === 'dark' ? '#191815' : '#F3F0EA'}
        />

        {/* 2. Heart Center Shape (Negative space in the pin core) */}
        <path
          d="M60 74C60 74 42 61 42 49C42 42.5 47 38 53.5 38C56.8 38 58.8 39.5 60 41C61.2 39.5 63.2 38 66.5 38C73 38 78 42.5 78 49C78 61 60 74 60 74Z"
          fill={theme === 'dark' ? '#0F0E0C' : '#FFFFFF'}
        />

        {/* 3. Overlapping Helping Hands inside the heart */}
        <path
          d="M50 49C52 46 58 46 60 50C62 46 68 46 70 49C66 52 54 52 50 49Z"
          stroke="#C48B3F"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 4. Fresh Leaf resting at the top (Sustainability/Hope/Growth) */}
        <path
          d="M60 22C64 22 70 28 66 36C61 40 60 36 60 36C60 36 59 40 54 36C50 28 56 22 60 22Z"
          fill="url(#gradientSecondary)"
        />
      </svg>
    );
  };

  // Base font style
  const textColor = theme === 'dark' ? 'text-white' : 'text-[#1C1B18]';

  if (type === 'icon' || type === 'favicon') {
    return (
      <div
        className={`flex items-center justify-center shrink-0 ${className}`}
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        {renderIconSvg()}
      </div>
    );
  }

  if (type === 'navbar') {
    return (
      <div className={`flex items-center gap-2.5 shrink-0 ${className}`}>
        <div className="w-8 h-8 flex items-center justify-center">
          {renderIconSvg()}
        </div>
        <span className="font-serif font-bold text-base tracking-tight text-[#1C1B18]">
          Donate<span className="text-[#C48B3F]">Bridge</span>
        </span>
      </div>
    );
  }

  if (type === 'horizontal') {
    return (
      <div className={`flex items-center gap-4 shrink-0 ${className}`}>
        <div style={{ width: currentSize.icon, height: currentSize.icon }}>
          {renderIconSvg()}
        </div>
        <div className="flex flex-col">
          <span className={`font-display font-extrabold leading-none ${currentSize.text} ${textColor}`}>
            Donate<span className="text-primary">Bridge</span>
          </span>
          <span className="text-xs text-slate-400 font-medium tracking-wide mt-1">
            Bridging Donors with NGOs
          </span>
        </div>
      </div>
    );
  }

  if (type === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center gap-3 shrink-0 ${className}`}>
        <div style={{ width: currentSize.icon * 1.5, height: currentSize.icon * 1.5 }}>
          {renderIconSvg()}
        </div>
        <div className="flex flex-col items-center">
          <span className={`font-display font-extrabold ${textColor} text-2xl`}>
            Donate<span className="text-primary">Bridge</span>
          </span>
          <span className="text-xs text-slate-500 font-medium tracking-wider mt-1 max-w-[200px]">
            One Donation at a Time
          </span>
        </div>
      </div>
    );
  }

  // Default main logo: full view representation with tagline
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="flex items-center gap-4">
        <div style={{ width: currentSize.icon * 1.2, height: currentSize.icon * 1.2 }}>
          {renderIconSvg()}
        </div>
        <div className="flex flex-col">
          <h1 className={`font-display font-black tracking-tight ${textColor} text-3xl`}>
            Donate<span className="text-primary">Bridge</span>
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
            Circular Economy Portal
          </p>
        </div>
      </div>
    </div>
  );
}
