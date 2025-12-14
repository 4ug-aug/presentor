import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ScaledSlideProps {
  width?: number;
  height?: number;
  children: ReactNode;
  className?: string;
}

/**
 * ScaledSlide - Maintains pixel-perfect slide rendering by scaling instead of reflowing.
 * 
 * Slides are designed at a base resolution (default 1280x720) and CSS transformed
 * to fit the available space while maintaining aspect ratio.
 */
export function ScaledSlide({ 
  width = 1280, 
  height = 720, 
  children,
  className = '',
}: ScaledSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Calculate scale based on available parent space
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (parent) {
        const scaleW = parent.clientWidth / width;
        const scaleH = parent.clientHeight / height;
        setScale(Math.min(scaleW, scaleH, 1)); // Never scale up, only down
      }
    };
    
    // Initial calculation
    updateScale();
    
    // Use ResizeObserver for more reliable resize detection
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }
    
    // Also listen to window resize as fallback
    window.addEventListener('resize', updateScale);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [width, height]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center overflow-hidden"
      style={{ minHeight: `${height * 0.3}px` }} // Minimum height for very small containers
    >
      <div 
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className={`flex-shrink-0 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
