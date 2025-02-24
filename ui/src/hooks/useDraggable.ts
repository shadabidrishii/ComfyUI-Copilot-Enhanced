import { useState, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DragConfig {
  initialX?: number;
  initialY?: number;
  boundaryPadding?: {
    right?: number;
    bottom?: number;
  };
}

export function useDraggable(config: DragConfig = {}) {
  const [position, setPosition] = useState<Position>({
    x: config.initialX ?? (window.innerWidth - 160),
    y: config.initialY ?? 20
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.min(
          Math.max(0, e.clientX - dragOffset.x), 
          window.innerWidth - (config.boundaryPadding?.right ?? 100)
        );
        const newY = Math.min(
          Math.max(0, e.clientY - dragOffset.y), 
          window.innerHeight - (config.boundaryPadding?.bottom ?? 40)
        );
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, config.boundaryPadding]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const buttonRect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - buttonRect.left,
      y: e.clientY - buttonRect.top
    });
  };

  return {
    position,
    isDragging,
    handleMouseDown
  };
} 