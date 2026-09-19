import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'urgent' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5 font-semibold',
  };

  const variants = {
    primary: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/50 focus:ring-rose-500',
    urgent: 'bg-red-700 hover:bg-red-600 text-white font-bold border border-red-500 shadow-lg shadow-red-950/80 focus:ring-red-500 animate-subtle-pulse',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:ring-slate-500',
    outline: 'border border-slate-700 hover:border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800/60 focus:ring-slate-500',
    ghost: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 focus:ring-slate-500',
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled} {...props}>
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
