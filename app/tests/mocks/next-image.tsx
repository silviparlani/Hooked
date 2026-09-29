import { createElement, type ImgHTMLAttributes } from 'react';

type TestImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
  unoptimized?: boolean;
};

export default function TestImage({
  priority: _priority,
  unoptimized: _unoptimized,
  ...props
}: TestImageProps) {
  return createElement('img', props);
}
