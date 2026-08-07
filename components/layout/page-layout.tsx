import React from 'react';

type PageLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export const PageLayout: React.FC<PageLayoutProps> = ({ children, className = "" }) => {
  return (
    <main className={`min-h-screen bg-background text-text-primary ${className}`}>
      <section className="mx-auto max-w-7xl p-6">
        {/* Content goes here */}
        {children}
      </section>
    </main>
  );
};
