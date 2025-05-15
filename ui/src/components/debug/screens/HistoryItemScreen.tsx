// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import React from 'react';
import { ImageModal } from '../modals/ImageModal';
import { GeneratedImage } from '../types/parameterDebugTypes';
import { HistoryItem, formatDate } from '../utils/historyUtils';

interface HistoryItemScreenProps {
  historyItem: HistoryItem;
  selectedImageIndex: number | null;
  handleSelectImage: (index: number, event?: React.MouseEvent) => void;
  handleClose: (event?: React.MouseEvent) => void;
  currentPage: number;
  handlePageChange: (newPage: number, event?: React.MouseEvent) => void;
  imagesPerPage: number;
  modalVisible: boolean;
  modalImageUrl: string;
  modalImageParams: { [key: string]: any } | null;
  openImageModal: (imageUrl: string, params: { [key: string]: any }, event: React.MouseEvent) => void;
  closeImageModal: (event?: React.MouseEvent) => void;
}

export const HistoryItemScreen: React.FC<HistoryItemScreenProps> = ({
  historyItem,
  selectedImageIndex,
  handleSelectImage,
  handleClose,
  currentPage,
  handlePageChange,
  imagesPerPage,
  modalVisible,
  modalImageUrl,
  modalImageParams,
  openImageModal,
  closeImageModal
}) => {
  const { timestamp, nodeName, generatedImages } = historyItem;
  
  // Calculate total pages
  const actualTotalPages = Math.ceil(generatedImages.length / imagesPerPage);
  
  // Calculate current page's image index range
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = Math.min(startIndex + imagesPerPage, generatedImages.length);
  const currentImages = generatedImages.slice(startIndex, endIndex);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="mb-4 border-b pb-2 flex justify-between items-center">
        <div>
          <h3 className="text-base font-medium text-gray-800">{nodeName}</h3>
          <p className="text-xs text-gray-500">{formatDate(timestamp)} • {generatedImages.length} images</p>
        </div>
        <button 
          className="text-gray-400 hover:text-gray-600"
          onClick={handleClose}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Image Modal */}
      <ImageModal
        visible={modalVisible}
        imageUrl={modalImageUrl}
        params={modalImageParams || {}}
        onClose={closeImageModal}
      />
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        {currentImages.map((image, indexOnPage) => {
          const actualIndex = startIndex + indexOnPage;
          return (
            <div 
              key={actualIndex} 
              className={`relative rounded-lg overflow-hidden border ${selectedImageIndex === actualIndex ? 'border-pink-500 ring-2 ring-pink-300' : 'border-gray-200'}`}
              onClick={(e) => handleSelectImage(actualIndex, e)}
            >
              {/* Zoom icon */}
              <button 
                className="absolute top-2 right-2 bg-white bg-opacity-75 rounded-full p-0.5 text-gray-600 hover:text-gray-900 shadow-sm z-10"
                onClick={(e) => openImageModal(image.url, image.params, e)}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </button>
              <div className="aspect-square">
                <img 
                  src={image.url} 
                  alt={`Generated image ${actualIndex+1}`} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Pagination controls */}
      {actualTotalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4 mb-4">
          <button 
            onClick={(e) => handlePageChange(1, e)}
            disabled={currentPage === 1}
            className={`px-2 py-1 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M8.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L4.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            onClick={(e) => handlePageChange(currentPage - 1, e)}
            disabled={currentPage === 1}
            className={`px-2 py-1 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="px-2 py-1 text-xs text-gray-800">
            Page {currentPage} of {actualTotalPages}
          </div>

          <button 
            onClick={(e) => handlePageChange(currentPage + 1, e)}
            disabled={currentPage === actualTotalPages}
            className={`px-2 py-1 rounded ${currentPage === actualTotalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            onClick={(e) => handlePageChange(actualTotalPages, e)}
            disabled={currentPage === actualTotalPages}
            className={`px-2 py-1 rounded ${currentPage === actualTotalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 15.707a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L8.586 10 4.293 14.293a1 1 0 000 1.414z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M11.293 15.707a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L15.586 10l-4.293 4.293a1 1 0 000 1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}; 