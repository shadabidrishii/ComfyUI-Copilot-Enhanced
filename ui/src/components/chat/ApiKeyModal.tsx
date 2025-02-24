/*
 * @Author: 晴知 qingli.hql@alibaba-inc.com
 * @Date: 2024-12-12 21:28:03
 * @LastEditors: ai-business-hql ai.bussiness.hql@gmail.com
 * @LastEditTime: 2025-02-24 11:46:49
 * @FilePath: /comfyui_copilot/ui/src/components/chat/ApiKeyModal.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { useEffect, useState } from 'react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (apiKey: string) => void;
    initialApiKey?: string;
}

export function ApiKeyModal({ isOpen, onClose, onSave, initialApiKey = '' }: ApiKeyModalProps) {
    const [apiKey, setApiKey] = useState(initialApiKey);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        setApiKey(initialApiKey);
    }, [initialApiKey]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 w-[480px] shadow-2xl">
                <h2 className="text-xl text-gray-900 dark:text-white font-semibold mb-6">Set API Key</h2>
                <div className="relative">
                    <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg mb-4 pr-12
                        bg-gray-50 dark:bg-gray-700 
                        text-gray-900 dark:text-white
                        placeholder-gray-500 dark:placeholder-gray-400
                        focus:border-blue-500 dark:focus:border-blue-400 
                        focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20
                        focus:outline-none"
                    />
                    <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 dark:text-gray-400 
                        hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        onClick={() => setShowApiKey(!showApiKey)}
                    >
                        {showApiKey ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        )}
                    </button>
                </div>
                <div className="mb-6 text-sm text-gray-600 dark:text-gray-300">
                    <span>Don't have an API key? </span>
                    <a 
                        href="https://form.typeform.com/to/tkg91K8D"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                        Click here to request one
                    </a>
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 
                        rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onSave(apiKey);
                            onClose();
                        }}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 
                        text-white rounded-lg font-medium transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
} 