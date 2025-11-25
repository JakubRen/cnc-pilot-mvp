import React from 'react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', href, fullWidth, children, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20",
      secondary: "bg-slate-700 text-slate-100 hover:bg-slate-600",
      outline: "border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white",
      ghost: "hover:bg-slate-800 text-slate-300 hover:text-white",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2 text-sm",
      lg: "h-12 px-6 text-base",
    };

    const widthClass = fullWidth ? "w-full" : "";
    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`;

    if (href) {
      return (
        <Link href={href} className={combinedClassName}>
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
