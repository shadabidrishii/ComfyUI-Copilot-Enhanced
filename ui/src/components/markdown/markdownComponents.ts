// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import React from 'react';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

// Type for markdown component props
interface MarkdownComponentProps {
  children?: React.ReactNode;
  className?: string;
}

// Type for markdown components
type MarkdownComponents = {
  [key: string]: React.ComponentType<MarkdownComponentProps>;
};

// Define markdown components
export const markdownComponents: MarkdownComponents = {
  p: ({ children, className = '' }) => {
    return React.createElement('p', {
      className: `!my-0.5 leading-relaxed text-xs ${className}`
    }, children);
  },
  h1: ({ children, className = '' }) => {
    return React.createElement('h1', {
      className: `text-base font-semibold !my-1 ${className}`
    }, children);
  }
};

// Define markdown plugins
export const markdownPlugins = {
  rehypePlugins: [
    [rehypeExternalLinks, { target: '_blank' }],
    rehypeKatex
  ],
  remarkPlugins: [remarkGfm, remarkMath]
} as const; 