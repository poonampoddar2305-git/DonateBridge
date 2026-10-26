import React from 'react';

export const InputField = React.forwardRef(({
  label,
  id,
  type = 'text',
  error,
  helperText,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wider text-[#1C1B18] ml-0.5 mb-0.5"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        className={`w-full border border-[#DCD4C8] rounded-xl px-4 py-3 focus:outline-none focus:border-[#C48B3F] transition-all duration-200 text-xs text-[#1C1B18] bg-[#F3F0EA] placeholder-[#666157] ${
          error ? 'border-rose-500 ring-1 ring-rose-500' : ''
        }`}
        {...props}
      />
      {error && (
        <span
          id={`${id}-error`}
          role="alert"
          className="text-xs font-medium text-rose-600 mt-0.5"
        >
          {error.message || error}
        </span>
      )}
      {!error && helperText && (
        <span
          id={`${id}-helper`}
          className="text-xs text-[#666157] mt-0.5"
        >
          {helperText}
        </span>
      )}
    </div>
  );
});

InputField.displayName = 'InputField';
