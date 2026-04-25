import type { MouseEvent, PointerEvent } from 'react';

export const handleRippleMouseDown = (event: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>) => {
  if ('pointerType' in event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
  } else if (event.button !== 0) {
    return;
  }

  const target = event.currentTarget;
  if ('disabled' in target && target.disabled) return;

  const rect = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height) * 1.35;

  ripple.className = 'ui-ripple';
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left}px`;
  ripple.style.top = `${event.clientY - rect.top}px`;

  target.insertBefore(ripple, target.firstChild);

  ripple.addEventListener('animationend', () => {
    ripple.remove();
  });
};
