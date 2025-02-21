/*
 * @Author: 晴知 qingli.hql@alibaba-inc.com
 * @Date: 2024-11-28 10:19:07
 * @LastEditors: ai-business-hql ai-business-hql@gmail.com
 * @LastEditTime: 2025-02-21 16:48:40
 * @FilePath: /comfyui_copilot/ui/src/components/chat/ChatHeader.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { useState } from 'react';
import { XIcon, TrashIcon, CogIcon } from './Icons';
import { ApiKeyModal } from './ApiKeyModal';
import logoImage from '../../../../assets/logo.png';

interface ChatHeaderProps {
    onClose?: () => void;
    onClear?: () => void;
    hasMessages: boolean;
}

export function ChatHeader({ onClose, onClear, hasMessages }: ChatHeaderProps) {
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    
    const handleApiKeyClick = () => {
        setIsApiKeyModalOpen(true);
    };

    const handleSaveApiKey = (apiKey: string) => {
        localStorage.setItem('chatApiKey', apiKey);
    };

    return (
        <div className="flex items-center justify-between border-b px-4 py-3 
                        bg-white border-gray-200 sticky top-0 z-10">
            <div className="flex items-center space-x-2">
                <img 
                    src={logoImage}
                    alt="ComfyUI-Copilot Logo" 
                    className="h-12 w-12 -ml-2"
                />
                <h3 className="text-[16px] font-medium text-gray-800">ComfyUI-Copilot</h3>
                <button
                    onClick={handleApiKeyClick}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500"
                >
                    <CogIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="flex items-center gap-1">
                <button
                    className="inline-flex items-center justify-center rounded-md p-2 
                             text-gray-500 hover:bg-gray-100"
                    disabled={!hasMessages}
                    onClick={onClear}>
                    <TrashIcon className="h-5 w-5" />
                </button>
                <button
                    className="inline-flex items-center justify-center rounded-md p-2 
                             text-gray-500 hover:bg-gray-100"
                    onClick={onClose}>
                    <XIcon className="h-5 w-5" />
                </button>
            </div>

            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setIsApiKeyModalOpen(false)}
                onSave={handleSaveApiKey}
                initialApiKey={localStorage.getItem('chatApiKey') || ''}
            />
        </div>
    );
} 