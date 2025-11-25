import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger';
}

export const Badge = ({ 
  className = '', 
  variant = 'default', 
  children, 
  ...props 
}: BadgeProps) => {
  
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2";
  
  const variants = {
    default: "bg-blue-600/10 text-blue-400 border border-blue-600/20",
    secondary: "bg-slate-700 text-slate-300",
    outline: "text-slate-300 border border-slate-600",
    success: "bg-green-500/10 text-green-400 border border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20",
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${className}`;

  return (
    <span className={combinedClassName} {...props}>
      {children}
    </span>
  );
};
