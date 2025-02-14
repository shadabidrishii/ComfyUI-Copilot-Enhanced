// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { MemoizedReactMarkdown } from "../../markdown";
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeExternalLinks from 'rehype-external-links';
import { BaseMessage } from './BaseMessage';
import { ChatResponse } from "../../../types/types";
import { useRef } from "react";
interface AIMessageProps {
  content: string;
  name?: string;
  avatar: string;
  format?: string;
  onOptionClick?: (option: string) => void;
  extComponent?: React.ReactNode;
}

export function AIMessage({ content, name = 'Assistant', format, onOptionClick, extComponent }: AIMessageProps) {
  const markdownWrapper = useRef<HTMLDivElement | null>()
  const renderContent = () => {
    try {
      const response = JSON.parse(content) as ChatResponse;
      const guides = response.ext?.find(item => item.type === 'guides')?.data || [];

      return (
        <div className="space-y-3">
          {format === 'markdown' && response.text ? (
            <div ref={markdownWrapper as React.RefObject<HTMLDivElement>}>
              <MemoizedReactMarkdown
                rehypePlugins={[
                  [rehypeExternalLinks, { target: '_blank' }],
                  rehypeKatex
                ]}
                remarkPlugins={[remarkGfm, remarkMath]}
                className="prose prose-xs prose-neutral prose-a:text-accent-foreground/50 break-words [&>*]:!my-1 leading-relaxed text-xs
                           prose-headings:font-semibold
                           prose-h1:text-base
                           prose-h2:text-sm
                           prose-h3:text-xs
                           prose-h4:text-xs
                           prose-p:text-xs
                           prose-ul:text-xs
                           prose-ol:text-xs
                           prose-li:text-xs
                           prose-code:text-xs
                           prose-pre:text-xs"
                components={{
                  p: ({ children }) => {
                    return <p className="!my-0.5 leading-relaxed text-xs">{children}</p>
                  },
                  h1: ({ children }) => {
                    return <h1 className="text-base font-semibold !my-1">{children}</h1>
                  },
                  h2: ({ children }) => {
                    return <h2 className="text-sm font-semibold !my-1">{children}</h2>
                  },
                  h3: ({ children }) => {
                    return <h3 className="text-xs font-semibold !my-1">{children}</h3>
                  },
                  h4: ({ children }) => {
                    return <h4 className="text-xs font-semibold !my-1">{children}</h4>
                  },
                  table: ({ children }) => (
                    <table className="border-solid border border-[#979797] w-[100%] text-xs">{children}</table>
                  ),
                  th: ({ children }) => (
                    <th className="border-solid bg-[#E5E7ED] dark:bg-[#FFFFFF] dark:text-[#000000] border border-[#979797] text-center pt-2 text-xs">{children}</th>
                  ),
                  td: ({ children }) => {
                    if (Array.isArray(children) && children?.length > 0) {
                      const list: any[] = [];
                      const length = children.length;
                      for (let i = 0; i < length; i++) {
                        if (children[i] === '<br>') {
                          list.push(<br />)
                        } else {
                          list.push(children[i])
                        }
                      }
                      children = list;
                    }
                    return (
                      <td className="border-solid border border-[#979797] text-center text-xs">{children}</td>
                    )
                  },
                  code: ({ children }) => {
                    return <code className="text-xs bg-gray-100 rounded px-1">{children}</code>
                  },
                  pre: ({ children }) => {
                    return <pre className="text-xs bg-gray-100 rounded p-2 overflow-x-auto">{children}</pre>
                  },
                  img: ({ node, ...props }) => (
                    <div className="w-1/2 mx-auto">
                      <img
                        {...props}
                        loading="lazy"
                        className="w-full h-auto block" 
                        onError={(e) => {
                          console.warn('Image failed to load:', props.src, 'Error:', e);
                          e.currentTarget.style.opacity = '0';
                        }}
                      />
                    </div>
                  ),
                }}
              >
                {response.text}
              </MemoizedReactMarkdown>
            </div>
          ) : response.text ? (
            <p className="whitespace-pre-wrap text-left">
              {response.text}
            </p>
          ) : null}

          {guides.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {guides.map((guide: string, index: number) => (
                <button
                  key={index}
                  className="px-3 py-1.5 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-[12px] w-[calc(50%-0.25rem)]"
                  onClick={() => onOptionClick?.(guide)}
                >
                  {guide}
                </button>
              ))}
            </div>
          )}

          {extComponent}
        </div>
      );
    } catch {
      return <p className="whitespace-pre-wrap text-left">{content}</p>;
    }
  };

  return (
    <BaseMessage name={name}>
      <div className="w-full rounded-lg bg-gray-50 p-4 text-gray-700 text-sm break-words overflow-hidden">
        {renderContent()}
      </div>
    </BaseMessage>
  );
} 