import React from 'react';

interface InitialScreenProps {
  selectedNodes: any[];
  handleParamSelect: (param: string, event?: React.MouseEvent) => void;
  selectedParams: {[key: string]: boolean};
  handleNext: (event?: React.MouseEvent) => void;
  handleClose: (event?: React.MouseEvent) => void;
}

export const InitialScreen: React.FC<InitialScreenProps> = ({
  selectedNodes,
  handleParamSelect,
  selectedParams,
  handleNext,
  handleClose
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="mb-4 border-b pb-2 flex justify-between items-center">
        <div>
          <h3 className="text-base font-medium text-gray-800">Select Parameters for Testing</h3>
          <p className="text-xs text-gray-500">Choose the parameters you want to include in your batch test</p>
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
      
      {/* Dynamically render nodes and their parameters */}
      {selectedNodes.map((node, nodeIndex) => {
        // Get node title
        const nodeTitle = node.title || "Unknown Node";
        
        // Get node widgets/parameters
        const nodeWidgets = node.widgets || [];
        
        return (
          <div key={`node-${nodeIndex}`} className="border rounded-md mb-4 overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 border-b">
              {nodeTitle}
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {nodeWidgets.map((widget: any, widgetIndex: number) => {
                  const paramName = widget.name;
                  return (
                    <div key={`widget-${widgetIndex}`} className="flex items-center">
                      <div 
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          selectedParams[paramName] ? 'border-red-500 bg-red-100' : 'border-gray-300'
                        }`} 
                        onClick={(e) => handleParamSelect(paramName, e)}
                      >
                        {selectedParams[paramName] && <div className="w-3 h-3 rounded-full bg-red-500"></div>}
                      </div>
                      <span className="ml-2 text-gray-700 text-xs">{paramName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
      
      <div className="mt-6 flex justify-center">
        <button
          onClick={(e) => handleNext(e)}
          className="px-3 py-1.5 text-xs bg-pink-200 text-pink-700 rounded-md hover:bg-pink-300 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}; 