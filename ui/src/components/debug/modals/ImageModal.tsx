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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-2 max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
        <button 
          className="absolute top-2 right-2 text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-200 p-1"
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