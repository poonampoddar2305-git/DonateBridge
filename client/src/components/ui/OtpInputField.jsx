import React, { useRef, useEffect } from 'react';

export default function OtpInputField({ length = 6, value = '', onChange, disabled = false, error = '' }) {
  const inputRefs = useRef([]);

  // Ensure value is formatted as array of digits up to length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    // Focus first input box on mount if empty
    if (!value && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const focusInput = (index) => {
    if (index >= 0 && index < length && inputRefs.current[index]) {
      inputRefs.current[index].focus();
      inputRefs.current[index].select();
    }
  };

  const handleChange = (e, index) => {
    const val = e.target.value;
    // Extract digit only
    const digit = val.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    const newOtp = newDigits.join('');

    onChange(newOtp);

    if (digit && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[index]) {
        newDigits[index] = '';
        onChange(newDigits.join(''));
      } else if (index > 0) {
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pastedData) return;

    onChange(pastedData);
    const targetIndex = Math.min(pastedData.length, length - 1);
    focusInput(targetIndex);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center gap-2 max-w-sm mx-auto" onPaste={handlePaste}>
        {Array.from({ length }).map((_, index) => {
          const isFilled = Boolean(digits[index]);
          return (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              autoComplete="one-time-code"
              value={digits[index]}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={(e) => e.target.select()}
              disabled={disabled}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-2xl border transition-all duration-150 outline-none shadow-xs ${
                disabled
                  ? 'bg-[#EAE4DC] border-[#DCD4C8] text-[#666157] opacity-60 cursor-not-allowed'
                  : isFilled
                  ? 'bg-[#EAE4DC] border-[#C48B3F] text-[#1C1B18] ring-2 ring-[#C48B3F]/20'
                  : 'bg-[#F3F0EA] border-[#DCD4C8] text-[#1C1B18] focus:border-[#C48B3F] focus:ring-2 focus:ring-[#C48B3F]/30 focus:bg-[#EAE4DC]'
              }`}
              aria-label={`Digit ${index + 1} of verification code`}
            />
          );
        })}
      </div>
      {error && <p className="text-xs text-rose-600 font-bold text-center mt-1">{error}</p>}
    </div>
  );
}
