import { ChangeEvent, KeyboardEvent, useState } from 'react';
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
}

export interface UploadedImage {
    id: string;
    file: File;
    preview: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ChatInput({ 
    input, 
    loading, 
    onChange, 
    onSend, 
    onKeyPress, 
    onUploadImages,
    uploadedImages,
    onRemoveImage,
}: ChatInputProps) {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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
            {/* 已上传图片预览 */}
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
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5
                                         opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <XIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <textarea
                onChange={onChange}
                onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        if (e.nativeEvent.isComposing) {
                            return;
                        }
                        e.preventDefault();
                        onSend();
                    }
                    onKeyPress(e);
                }}
                value={input}
                placeholder="Type your message..."
                className="w-full min-h-[80px] resize-none rounded-md border 
                         border-gray-200 px-3 py-2 pr-12 text-sm shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent bg-white transition-all 
                         duration-200 text-gray-700"
            />

            {/* 上传图片按钮 */}
            <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="absolute bottom-3 left-3 p-2 rounded-md text-gray-500 
                         hover:bg-gray-100 hover:text-gray-600 transition-all duration-200">
                <ImageIcon className="h-5 w-5" />
            </button>

            {/* 发送按钮 */}
            <button
                type="submit"
                onClick={onSend}
                disabled={loading}
                className="absolute bottom-3 right-3 p-2 rounded-md text-gray-500 
                         hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 
                         transition-all duration-200 active:scale-95">
                {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full 
                                  border-2 border-gray-300 border-t-blue-500" />
                ) : (
                    <SendIcon className="h-5 w-5 transform transition-transform 
                                       group-hover:translate-x-1" />
                )}
            </button>

            {/* 上传图片模态框 */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 relative">
                        <button 
                            onClick={() => setShowUploadModal(false)}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                        
                        <h3 className="text-lg font-medium mb-4">Upload Images</h3>
                        
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

                        {/* 预览区域 */}
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
                                            className="absolute -top-1 -right-1 bg-red-500 text-white 
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