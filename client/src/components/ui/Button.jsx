import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  isDisabled = false,
  type = 'button',
  onClick,
  className = '',
  icon: Icon,
  ...props
}) => {
  const showLoading = isLoading || loading;
  const baseStyles = 'inline-flex items-center justify-center font-medium focus:outline-none transition-all duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none rounded-full';
  
  const variants = {
    primary: 'bg-[#1C1B18] text-white hover:bg-[#C48B3F] shadow-xs cursor-pointer',
    secondary: 'bg-[#EAE4DC] text-[#1C1B18] hover:bg-[#DCD4C8] border border-[#DCD4C8] cursor-pointer',
    outline: 'border border-[#1C1B18] text-[#1C1B18] hover:bg-[#EAE4DC] cursor-pointer',
    danger: 'bg-rose-700 hover:bg-rose-800 text-white cursor-pointer',
    ghost: 'bg-transparent hover:bg-[#EAE4DC] text-[#1C1B18] hover:text-[#C48B3F] cursor-pointer',
  };

  const sizes = {
    sm: 'px-4 py-1.5 text-xs font-medium rounded-full',
    md: 'px-6 py-2.5 text-xs font-medium rounded-full',
    lg: 'px-8 py-3 text-sm font-medium rounded-full',
  };

  return (
    <button
      type={type}
      disabled={isDisabled || showLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {showLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!showLoading && Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};
