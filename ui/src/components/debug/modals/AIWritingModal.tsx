import React from 'react';

interface AIWritingModalProps {
  visible: boolean;
  aiWritingModalText: string;
  setAiWritingModalText: React.Dispatch<React.SetStateAction<string>>;
  aiGeneratedTexts: string[];
  aiSelectedTexts: {[key: string]: boolean};
  aiWritingLoading: boolean;
  aiWritingError: string | null;
  handleAiWriting: () => void;
  toggleTextSelection: (textKey: string) => void;
  addSelectedTexts: () => void;
  onClose: () => void;
}

export const AIWritingModal: React.FC<AIWritingModalProps> = ({
  visible,
  aiWritingModalText,
  setAiWritingModalText,
  aiGeneratedTexts,
  aiSelectedTexts,
  aiWritingLoading,
  aiWritingError,
  handleAiWriting,
  toggleTextSelection,
  addSelectedTexts,
  onClose
}) => {
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">AI Writing Assistant</h3>
          <button 
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Enter text and AI will generate variations</p>
            <textarea 
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
              rows={3}
              placeholder="Enter some text here..."
              value={aiWritingModalText}
              onChange={(e) => setAiWritingModalText(e.target.value)}
            />
            
            <button 
              className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm flex items-center hover:bg-blue-200 transition-colors"
              onClick={handleAiWriting}
              disabled={aiWritingLoading}
            >
              {aiWritingLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>Generate</>
              )}
            </button>
          </div>
          
          {aiWritingError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {aiWritingError}
            </div>
          )}
          
          {aiGeneratedTexts.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Generated variations (select items to add):</p>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto p-2">
                {aiGeneratedTexts.map((text, idx) => (
                  <div key={idx} className="flex items-start border border-gray-200 rounded-md p-2">
                    <div className="mr-2 mt-1">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          id={`text${idx+1}`}
                          checked={!!aiSelectedTexts[`text${idx+1}`]}
                          onChange={() => toggleTextSelection(`text${idx+1}`)}
                          className="sr-only" /* Hide the actual checkbox but keep it functional */
                        />
                        <div 
                          className={`h-4 w-4 rounded border ${
                            aiSelectedTexts[`text${idx+1}`] 
                              ? 'bg-blue-600 border-blue-600' 
                              : 'bg-white border-gray-300'
                          } flex items-center justify-center`}
                          onClick={() => toggleTextSelection(`text${idx+1}`)}
                        >
                          {aiSelectedTexts[`text${idx+1}`] && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                    <label htmlFor={`text${idx+1}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                      {text}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end flex-shrink-0">
          <button 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm mr-2 hover:bg-gray-200 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
            onClick={addSelectedTexts}
            disabled={Object.values(aiSelectedTexts).every(v => !v)}
          >
            Add Selected
          </button>
        </div>
      </div>
    </div>
  );
}; 