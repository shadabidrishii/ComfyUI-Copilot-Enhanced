/*
 * @Author: ai-business-hql ai.bussiness.hql@gmail.com
 * @Date: 2025-04-11 16:37:05
 * @LastEditors: ai-business-hql ai.bussiness.hql@gmail.com
 * @LastEditTime: 2025-04-22 17:58:06
 * @FilePath: /comfyui_copilot/ui/src/components/debug/modals/ImageModal.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React from 'react';

interface ImageModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: (event?: React.MouseEvent) => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  visible,
  imageUrl,
  onClose
}) => {
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-2 max-w-4xl max-h-[90vh] relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button 
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1"
          onClick={onClose}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="overflow-auto max-h-[calc(90vh-4rem)]">
          <img 
            src={imageUrl} 
            alt="Enlarged image" 
            className="max-w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}; 