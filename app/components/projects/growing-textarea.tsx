'use client';
import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
export function GrowingTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element) {
      element.style.height = 'auto';
      element.style.height = `${Math.max(96, element.scrollHeight)}px`;
    }
  }, [props.value]);
  return <textarea {...props} ref={ref} className={`growing-textarea ${props.className ?? ''}`} />;
}
