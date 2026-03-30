import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delayHide?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  className = '',
  delayHide = 300
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, delayHide);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {isVisible && (
        <div 
          className={`absolute z-[100] px-3 py-2 text-xs font-medium text-white bg-zinc-900/90 dark:bg-zinc-800/95 backdrop-blur-md rounded-xl border border-white/10 shadow-xl whitespace-nowrap pointer-events-auto ${positionClasses[position]}`}
          onMouseEnter={show}
          onMouseLeave={hide}
          role="tooltip"
        >
          {content}
          <div className={`absolute w-2 h-2 bg-zinc-900/90 dark:bg-zinc-800/95 border-white/10 border-t border-l rotate-45 ${
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1 border-r' :
            'right-full top-1/2 -translate-y-1/2 -mr-1 border-b'
          }`} />
        </div>
      )}
    </div>
  );
};
