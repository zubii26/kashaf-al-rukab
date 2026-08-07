import React from 'react';

export const PageTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = "", children, ...props }) => {
  return (
    <h1 className={`text-2xl font-bold text-primary ${className}`} {...props}>
      {children}
    </h1>
  );
};

export const SectionHeading: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = "", children, ...props }) => {
  return (
    <h2 className={`text-lg font-semibold text-text-primary ${className}`} {...props}>
      {children}
    </h2>
  );
};

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className = "", children, ...props }) => {
  return (
    <label className={`text-sm font-medium text-text-secondary ${className}`} {...props}>
      {children}
    </label>
  );
};
