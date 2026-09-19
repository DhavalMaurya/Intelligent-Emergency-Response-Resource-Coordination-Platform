import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  badge,
  actions,
  className = '',
  headerClassName = '',
  bodyClassName = '',
}) => {
  return (
    <div
      className={`bg-slate-900/90 border border-slate-800 rounded-lg shadow-lg backdrop-blur-sm overflow-hidden flex flex-col ${className}`}
    >
      {(title || actions || badge) && (
        <div
          className={`px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50 ${headerClassName}`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-3.5 bg-rose-500/80 rounded-full inline-block" />
            <div>
              {typeof title === 'string' ? (
                <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase font-display">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {badge && <div className="ml-2">{badge}</div>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`p-4 flex-1 ${bodyClassName}`}>{children}</div>
    </div>
  );
};
