// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

/**
 * Updates text input values in the state
 */
export const handleTextInputChange = (
  nodeId: string, 
  paramName: string, 
  index: number, 
  value: string,
  textInputs: {[key: string]: string[]},
  setTextInputs: React.Dispatch<React.SetStateAction<{[key: string]: string[]}>>
) => {
  const textKey = `${nodeId}_${paramName}`;
  
  setTextInputs(prev => {
    const currentTexts = [...(prev[textKey] || [])];
    currentTexts[index] = value;
    return {
      ...prev,
      [textKey]: currentTexts
    };
  });
  
  // Also return the current texts with the new value directly
  const currentTexts = [...(textInputs[textKey] || [])];
  currentTexts[index] = value;
  return currentTexts;
};

/**
 * Adds a new text input
 */
export const handleAddTextInput = (
  nodeId: string, 
  paramName: string,
  textInputs: {[key: string]: string[]},
  setTextInputs: React.Dispatch<React.SetStateAction<{[key: string]: string[]}>>
) => {
  const textKey = `${nodeId}_${paramName}`;
  
  setTextInputs(prev => {
    const currentTexts = [...(prev[textKey] || [])];
    currentTexts.push('');
    return {
      ...prev,
      [textKey]: currentTexts
    };
  });
  
  // Return the updated texts
  return [...(textInputs[textKey] || []), ''];
};

/**
 * Removes a text input
 */
export const handleRemoveTextInput = (
  nodeId: string, 
  paramName: string, 
  index: number,
  textInputs: {[key: string]: string[]},
  setTextInputs: React.Dispatch<React.SetStateAction<{[key: string]: string[]}>>
) => {
  const textKey = `${nodeId}_${paramName}`;
  
  setTextInputs(prev => {
    const currentTexts = [...(prev[textKey] || [])];
    currentTexts.splice(index, 1);
    return {
      ...prev,
      [textKey]: currentTexts
    };
  });
  
  // Return the updated texts
  const updatedTexts = [...(textInputs[textKey] || [])];
  updatedTexts.splice(index, 1);
  return updatedTexts;
}; 