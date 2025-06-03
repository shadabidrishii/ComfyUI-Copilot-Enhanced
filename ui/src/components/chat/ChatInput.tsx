// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { ChangeEvent, KeyboardEvent, useState, useRef, useEffect } from 'react';
import { SendIcon, ImageIcon, PlusIcon, XIcon } from './Icons';
import React from 'react';

interface ChatInputProps {
    input: string;
    loading: boolean;
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
    onSend: () => void;
    onKeyPress: (event: KeyboardEvent) => void;
    onUploadImages: (files: FileList) => void;
    uploadedImages: UploadedImage[];
    onRemoveImage: (imageId: string) => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
}

export interface UploadedImage {
    id: string;
    file: File;
    preview: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const models_conf = [
    {
        "name": "gpt-4o",
        "image_enable": true
    },
    {
        "name": "gpt-4o-mini",
        "image_enable": true
    },
    {
        "name": "qwen-plus",
        "image_enable": false
    },
    {
        "name": "DeepSeek-V3",
        "image_enable": false
    }
]

export function ChatInput({ 
    input, 
    loading, 
    onChange, 
    onSend, 
    onKeyPress, 
    onUploadImages,
    uploadedImages,
    onRemoveImage,
    selectedModel,
    onModelChange,
}: ChatInputProps) {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            // Reset height to auto to get the correct scrollHeight
            textareaRef.current.style.height = 'auto';
            // Set the height to scrollHeight to fit all content
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
        }
    }, [input]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const invalidFiles: string[] = [];
            const validFiles: File[] = [];

            Array.from(event.target.files).forEach(file => {
                if (!SUPPORTED_FORMATS.includes(file.type)) {
                    invalidFiles.push(`${file.name} (unsupported format)`);
                } else if (file.size > MAX_FILE_SIZE) {
                    invalidFiles.push(`${file.name} (exceeds 5MB)`);
                } else {
                    validFiles.push(file);
                }
            });

            if (invalidFiles.length > 0) {
                alert(`The following files couldn't be uploaded:\n${invalidFiles.join('\n')}`);
            }

            if (validFiles.length > 0) {
                const dataTransfer = new DataTransfer();
                validFiles.forEach(file => dataTransfer.items.add(file));
                onUploadImages(dataTransfer.files);
            }
        }
    };

    return (
        <div className={`relative ${uploadedImages.length > 0 ? 'mt-12' : ''}`}>
            {/* Uploaded images preview */}
            {uploadedImages.length > 0 && (
                <div className="absolute -top-10 left-0 flex gap-2">
                    {uploadedImages.map(image => (
                        <div key={image.id} className="relative group">
                            <img 
                                src={image.preview} 
                                alt="uploaded" 
                                className="w-8 h-8 rounded object-cover"
                            />
                            <button
                                onClick={() => onRemoveImage(image.id)}
                                className="absolute -top-1 -right-1 bg-white border-none text-gray-500 rounded-full p-0.5
                                         opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <XIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <textarea
                ref={textareaRef}
                onChange={onChange}
                onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        if (e.nativeEvent.isComposing) {
                            return;
                        }
                        e.preventDefault();
                        if (input.trim() !== '') {
                            onSend();
                        }
                    }
                    onKeyPress(e);
                }}
                value={input}
                placeholder="Type your message..."
                className="w-full min-h-[80px] max-h-[400px] resize-none rounded-md border 
                         border-gray-200 px-3 py-2 pr-12 pb-10 text-[14px] shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent bg-white transition-all 
                         duration-200 text-gray-700 overflow-y-auto"
                style={{ height: '80px' }}
            />

            {/* Bottom toolbar */}
            <div className="absolute bottom-2 left-3 right-12 flex items-center gap-2 
                          bg-white border-t border-gray-100 pt-1">
                {/* Model selector dropdown */}
                <select
                    value={selectedModel}
                    onChange={(e) => onModelChange(e.target.value)}
                    className="px-1.5 py-0.5 text-xs rounded-md 
                             border border-gray-200 bg-white text-gray-700
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent hover:bg-gray-50
                             transition-colors border-0"
                >
                    {models_conf.map((model) => (
                        <option value={model.name} key={model.name}>{model.name}</option>
                    ))}
                </select>

                {/* Upload image button */}
                <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    disabled={!models_conf.find(model => model.name === selectedModel)?.image_enable}
                    className={`p-1.5 text-gray-500 bg-white border-none
                             hover:bg-gray-100 hover:text-gray-600 
                             transition-all duration-200 outline-none
                             ${!models_conf.find(model => model.name === selectedModel)?.image_enable ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <ImageIcon className="h-4 w-4" />
                </button>
            </div>

            {/* Send button */}
            <button
                type="submit"
                onClick={onSend}
                disabled={loading || input.trim() === ''}
                className="absolute bottom-3 right-3 p-2 rounded-md text-gray-500 bg-white border-none 
                         hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 
                         transition-all duration-200 active:scale-95">
                {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full 
                                  border-2 border-gray-300 border-t-blue-500" />
                ) : (
                    <SendIcon className="h-5 w-5 group-hover:translate-x-1" />
                )}
            </button>

            {/* Upload image modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 relative">
                        <button 
                            onClick={() => setShowUploadModal(false)}
                            className="absolute top-2 right-2 bg-white border-none text-gray-500 hover:text-gray-700"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                        
                        <h3 className="text-lg text-gray-800 font-medium mb-4">Upload Images</h3>
                        
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8
                                      flex flex-col items-center justify-center gap-4
                                      hover:border-blue-500 transition-colors cursor-pointer"
                             onClick={() => fileInputRef.current?.click()}
                        >
                            <PlusIcon className="w-8 h-8 text-gray-400" />
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-2">
                                    Click to upload images or drag and drop
                                </p>
                                <p className="text-xs text-gray-400">
                                    Supported formats: JPG, PNG, GIF, WebP
                                </p>
                                <p className="text-xs text-gray-400">
                                    Max file size: 5MB
                                </p>
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={SUPPORTED_FORMATS.join(',')}
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {/* Preview area */}
                        {uploadedImages.length > 0 && (
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                {uploadedImages.map(image => (
                                    <div key={image.id} className="relative group">
                                        <img 
                                            src={image.preview} 
                                            alt="preview" 
                                            className="w-full h-20 object-cover rounded"
                                        />
                                        <button
                                            onClick={() => onRemoveImage(image.id)}
                                            className="absolute -top-1 -right-1 bg-white border-none text-gray-500 
                                                     rounded-full p-0.5 opacity-0 group-hover:opacity-100 
                                                     transition-opacity"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 
                                         bg-white border border-gray-300 rounded-md 
                                         hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 