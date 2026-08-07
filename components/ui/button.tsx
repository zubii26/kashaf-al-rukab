import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingText?: string;
};

// Same border-radius (rounded-md = 6px)
// Same height (h-10) and horizontal padding (px-4)
// Same font-weight (font-semibold = 600)
// No transitions
const baseClasses = "inline-flex items-center justify-center rounded-md h-10 px-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

export const PrimaryButton: React.FC<ButtonProps> = ({ 
  children, 
  isLoading, 
  loadingText = "Saving…", 
  className = "", 
  disabled,
  ...props 
}) => {
  return (
    <button 
      className={`${baseClasses} bg-accent text-white hover:opacity-90 ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? loadingText : children}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({ 
  children, 
  isLoading, 
  loadingText = "Loading…", 
  className = "", 
  disabled,
  ...props 
}) => {
  return (
    <button 
      className={`${baseClasses} bg-surface text-accent border border-accent hover:bg-background ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? loadingText : children}
    </button>
  );
};

export const DestructiveButton: React.FC<ButtonProps> = ({ 
  children, 
  isLoading, 
  loadingText = "Deleting…", 
  className = "", 
  disabled,
  ...props 
}) => {
  return (
    <button 
      className={`${baseClasses} bg-danger text-white hover:opacity-90 ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? loadingText : children}
    </button>
  );
};
