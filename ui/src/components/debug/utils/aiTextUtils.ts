// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { WorkflowChatAPI } from '../../../apis/workflowChatApi';

/**
 * Handle AI text generation
 */
export const handleAiWriting = async (
  aiWritingModalText: string,
  task_id: string,
  setAiWritingLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setAiWritingError: React.Dispatch<React.SetStateAction<string | null>>,
  setAiGeneratedTexts: React.Dispatch<React.SetStateAction<string[]>>,
  setAiSelectedTexts: React.Dispatch<React.SetStateAction<{[key: string]: boolean}>>
) => {
  if (!aiWritingModalText.trim()) {
    setAiWritingError("Please enter some text to generate variations");
    return;
  }
  
  setAiWritingLoading(true);
  setAiWritingError(null);
  setAiGeneratedTexts([]);
  setAiSelectedTexts({});
  
  try {
    const generatedTexts = await WorkflowChatAPI.generateSDPrompts(aiWritingModalText);
    setAiGeneratedTexts(generatedTexts);
    // Send tracking event
    WorkflowChatAPI.trackEvent({
      event_type: 'prompt_generate',
      message_type: 'parameter_debug',
      message_id: task_id,
      data: {
        input_text: aiWritingModalText,
        generated_texts: generatedTexts
      }
    });
    
    // Pre-select all generated texts
    const newSelectedTexts: {[key: string]: boolean} = {};
    generatedTexts.forEach((text, index) => {
      newSelectedTexts[`text${index+1}`] = false;
    });
    setAiSelectedTexts(newSelectedTexts);
  } catch (error) {
    console.error("Error generating text:", error);
    setAiWritingError("Failed to generate text variations. Please try again.");
  } finally {
    setAiWritingLoading(false);
  }
};

/**
 * Handle text selection toggle
 */
export const toggleTextSelection = (
  textKey: string,
  setAiSelectedTexts: React.Dispatch<React.SetStateAction<{[key: string]: boolean}>>
) => {
  setAiSelectedTexts(prev => ({
    ...prev,
    [textKey]: !prev[textKey]
  }));
};

/**
 * Add selected texts to text input list
 */
export const addSelectedTexts = (
  aiWritingNodeId: string,
  aiWritingParamName: string,
  aiSelectedTexts: {[key: string]: boolean},
  aiGeneratedTexts: string[],
  aiWritingModalText: string,
  task_id: string,
  textInputs: {[nodeId_paramName: string]: string[]},
  setTextInputs: React.Dispatch<React.SetStateAction<{[nodeId_paramName: string]: string[]}>>,
  updateParamTestValues: (nodeId: string, paramName: string, values: any[]) => void,
  setAiWritingModalVisible: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const textKey = `${aiWritingNodeId}_${aiWritingParamName}`;
  const selectedTexts = Object.entries(aiSelectedTexts)
    .filter(([_, isSelected]) => isSelected)
    .map(([key]) => {
      const index = parseInt(key.replace('text', '')) - 1;
      return aiGeneratedTexts[index];
    });
  
  if (selectedTexts.length === 0) {
    return;
  }
  
  setTextInputs(prev => {
    const currentTexts = [...(prev[textKey] || [])];
    return {
      ...prev,
      [textKey]: [...currentTexts, ...selectedTexts]
    };
  });

  // Send tracking event
  WorkflowChatAPI.trackEvent({
    event_type: 'prompt_apply',
    message_type: 'parameter_debug',
    message_id: task_id,
    data: {
      input_text: aiWritingModalText,
      generated_texts: aiGeneratedTexts,
      selected_texts: selectedTexts
    }
  });
  
  // Also update paramTestValues
  const updatedTexts = [...(textInputs[textKey] || []), ...selectedTexts];
  updateParamTestValues(aiWritingNodeId, aiWritingParamName, updatedTexts);
  
  // Close the modal
  setAiWritingModalVisible(false);
};

/**
 * Open AI writing modal
 */
export const openAiWritingModal = (
  nodeId: string,
  paramName: string,
  setAiWritingModalVisible: React.Dispatch<React.SetStateAction<boolean>>,
  setAiWritingNodeId: React.Dispatch<React.SetStateAction<string>>,
  setAiWritingParamName: React.Dispatch<React.SetStateAction<string>>,
  setAiWritingModalText: React.Dispatch<React.SetStateAction<string>>,
  setAiGeneratedTexts: React.Dispatch<React.SetStateAction<string[]>>,
  setAiSelectedTexts: React.Dispatch<React.SetStateAction<{[key: string]: boolean}>>,
  setAiWritingLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setAiWritingError: React.Dispatch<React.SetStateAction<string | null>>
) => {
  setAiWritingModalVisible(true);
  setAiWritingNodeId(nodeId);
  setAiWritingParamName(paramName);
  setAiWritingModalText('');
  setAiGeneratedTexts([]);
  setAiSelectedTexts({});
  setAiWritingLoading(false);
  setAiWritingError(null);
}; 