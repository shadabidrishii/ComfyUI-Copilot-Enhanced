import { useState } from 'react';
import { XIcon, TrashIcon } from './Icons';
import { ApiKeyModal } from './ApiKeyModal';

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
                <h3 className="text-lg font-medium text-gray-800">copilot</h3>
                <button
                    onClick={handleApiKeyClick}
                    className="p-1 hover:bg-gray-100 rounded"
                >
                    🔨
                </button>
            </div>
            <div className="flex items-center gap-1">
                <button
                    className="inline-flex items-center justify-center rounded-md p-2 
                             text-gray-500 hover:bg-gray-100 hover:text-gray-600 
                             disabled:opacity-50 transition-colors duration-200"
                    disabled={!hasMessages}
                    onClick={onClear}>
                    <TrashIcon className="h-5 w-5" />
                </button>
                <button
                    className="inline-flex items-center justify-center rounded-md p-2 
                             text-gray-500 hover:bg-gray-100 hover:text-gray-600 
                             transition-colors duration-200"
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