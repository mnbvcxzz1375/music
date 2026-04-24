import { useRef, useEffect, useCallback, useState } from 'react';

export interface TouchGestureConfig {
  swipeThreshold: number;
  pinchThreshold: number;
  tapThreshold: number;
  longPressDelay: number;
}

const defaultConfig: TouchGestureConfig = {
  swipeThreshold: 50,
  pinchThreshold: 10,
  tapThreshold: 10,
  longPressDelay: 500,
};

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
}

export interface PinchData {
  scale: number;
  center: { x: number; y: number };
}

export interface TapData {
  x: number;
  y: number;
  duration: number;
}

export interface LongPressData {
  x: number;
  y: number;
}

export interface TouchGestureHandlers {
  onSwipe?: (swipe: SwipeDirection) => void;
  onPinch?: (pinch: PinchData) => void;
  onTap?: (tap: TapData) => void;
  onLongPress?: (longPress: LongPressData) => void;
  onDoubleTap?: (tap: TapData) => void;
}

export function useTouchGestures(
  handlers: TouchGestureHandlers,
  config: TouchGestureConfig = defaultConfig
) {
  const ref = useRef<HTMLElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null);
  
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const getTouchCenter = (touches: React.TouchList): { x: number; y: number } => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    
    if (e.touches.length === 2) {
      pinchStartRef.current = {
        distance: getTouchDistance(e.touches),
        scale: 1,
      };
    }
    
    if (handlers.onLongPress) {
      longPressTimerRef.current = window.setTimeout(() => {
        if (touchStartRef.current) {
          handlers.onLongPress?.({
            x: touchStartRef.current.x,
            y: touchStartRef.current.y,
          });
        }
      }, config.longPressDelay);
    }
  }, [handlers, config]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (e.touches.length === 2 && pinchStartRef.current && handlers.onPinch) {
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / pinchStartRef.current.distance;
      
      if (Math.abs(scale - pinchStartRef.current.scale) > config.pinchThreshold / 100) {
        handlers.onPinch({
          scale,
          center: getTouchCenter(e.touches),
        });
        pinchStartRef.current.scale = scale;
      }
    }
  }, [handlers, config]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - touchStartRef.current.time;
    const velocity = distance / duration;
    
    if (distance < config.tapThreshold && duration < 300) {
      const tapData: TapData = {
        x: touch.clientX,
        y: touch.clientY,
        duration,
      };
      
      if (handlers.onDoubleTap && lastTapRef.current) {
        const lastTap = lastTapRef.current;
        const tapDx = touch.clientX - lastTap.x;
        const tapDy = touch.clientY - lastTap.y;
        const tapDistance = Math.sqrt(tapDx * tapDx + tapDy * tapDy);
        const tapInterval = Date.now() - lastTap.time;
        
        if (tapDistance < config.tapThreshold && tapInterval < 300) {
          handlers.onDoubleTap(tapData);
          lastTapRef.current = null;
          touchStartRef.current = null;
          return;
        }
      }
      
      handlers.onTap?.(tapData);
      lastTapRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    } else if (distance > config.swipeThreshold && handlers.onSwipe) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      
      let direction: SwipeDirection['direction'];
      if (absDx > absDy) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }
      
      handlers.onSwipe({
        direction,
        distance,
        velocity,
      });
    }
    
    touchStartRef.current = null;
    pinchStartRef.current = null;
  }, [handlers, config]);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);
  
  return {
    ref,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

export interface SwipeableViewProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export function SwipeableView({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  className 
}: SwipeableViewProps) {
  const { ref, handlers } = useTouchGestures({
    onSwipe: (swipe) => {
      if (swipe.direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      }
      if (swipe.direction === 'right' && onSwipeRight) {
        onSwipeRight();
      }
    },
  });
  
  return (
    <div 
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      {...handlers}
    >
      {children}
    </div>
  );
}

export interface PinchZoomProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  className?: string;
}

export function PinchZoom({ 
  children, 
  minScale = 0.5, 
  maxScale = 3,
  className 
}: PinchZoomProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  
  const { ref, handlers } = useTouchGestures({
    onPinch: (pinch) => {
      const newScale = Math.min(maxScale, Math.max(minScale, pinch.scale));
      setScale(newScale);
    },
  });
  
  return (
    <div 
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      {...handlers}
      style={{
        transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </div>
  );
}