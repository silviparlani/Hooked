import { createElement, type ImgHTMLAttributes } from 'react';

type TestImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
};

export default function TestImage({ priority: _priority, ...props }: TestImageProps) {
  return createElement('img', props);
}
