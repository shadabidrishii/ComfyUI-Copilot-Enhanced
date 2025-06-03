/*
 * @Author: Shadab Idrishi <official.shadabidrishi@gmail.com>
 * @Date: 2024-11-28 10:19:07
 * @LastEditors: ai-business-hql ai.bussiness.hql@gmail.com
 * @LastEditTime: 2025-04-22 17:52:22
 * @FilePath: /comfyui_copilot/ui/src/components/chat/ChatHeader.tsx
 */
// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { useState, useEffect } from 'react';
import { XIcon, TrashIcon, CogIcon } from './Icons';
import { ApiKeyModal } from './ApiKeyModal';
import logoImage from '../../../../assets/logo.png';

interface ChatHeaderProps {
    onClose?: () => void;
    onClear?: () => void;
    hasMessages: boolean;
    onHeightResize?: (deltaY: number) => void;
    title?: string;
}

export function ChatHeader({ 
    onClose, 
    onClear, 
    hasMessages, 
    onHeightResize,
    title = "ComfyUI-Copilot"
}: ChatHeaderProps) {
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    
    const handleApiKeyClick = () => {
        setIsApiKeyModalOpen(true);
    };

    const handleSaveApiKey = (apiKey: string) => {
        localStorage.setItem('chatApiKey', apiKey);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const deltaY = e.movementY;
            onHeightResize?.(deltaY);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, onHeightResize]);

    return (
        <>
            <div className="flex items-center justify-between border-b px-3 py-2 
                        bg-white border-gray-200 sticky top-2 z-10">
                <div className="flex items-center space-x-1">
                    <img 
                        src={logoImage}
                        alt="ComfyUI-Copilot Logo" 
                        className="h-7 w-7 -ml-1" 
                    />
                    <h3 className="text-[14px] font-medium text-gray-800">{title}</h3>
                    <button
                        onClick={handleApiKeyClick}
                        className="p-1 bg-white border-none hover:bg-gray-100 rounded text-gray-500"
                    >
                        <CogIcon className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        className={`inline-flex bg-white border-none items-center justify-center rounded-md p-1.5 
                                 ${hasMessages ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
                        disabled={!hasMessages}
                        onClick={onClear}>
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setIsApiKeyModalOpen(false)}
                onSave={handleSaveApiKey}
                initialApiKey={localStorage.getItem('chatApiKey') || ''}
            />
        </>
    );
} 