// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import React from 'react';

/**
 * Handle navigation to next screen
 */
export const handleNext = (
  currentScreen: number,
  setCurrentScreen: React.Dispatch<React.SetStateAction<number>>,
  selectedParams: {[key: string]: boolean},
  paramTestValues: {[nodeId: string]: {[paramName: string]: any[]}},
  setParamTestValues: React.Dispatch<React.SetStateAction<{[nodeId: string]: {[paramName: string]: any[]}}>>,
  textInputs: {[nodeId_paramName: string]: string[]},
  selectedNodes: any[],
  setTotalCount: React.Dispatch<React.SetStateAction<number>>,
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>,
  generateParameterCombinations: (paramTestValues: {[nodeId: string]: {[paramName: string]: any[]}}) => any[],
  event?: React.MouseEvent
) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Clean up paramTestValues for unselected parameters when moving from screen 0 to 1
  if (currentScreen === 0) {
    // Make a copy of the current paramTestValues
    const updatedParamTestValues = { ...paramTestValues };
    
    // For each node
    Object.keys(updatedParamTestValues).forEach(nodeId => {
      const nodeParams = updatedParamTestValues[nodeId];
      
      // For each parameter in this node
      Object.keys(nodeParams).forEach(paramName => {
        // If this parameter is no longer selected, remove it
        if (!selectedParams[paramName]) {
          delete nodeParams[paramName];
        }
      });
    });
    
    // Update the state with cleaned up values
    setParamTestValues(updatedParamTestValues);
  }
  
  // Ensure all text values are properly synchronized when moving to confirmation screen
  if (currentScreen === 1) {
    // Ensure textInputs are synced to paramTestValues for all selected nodes
    const updatedParamTestValues = { ...paramTestValues };
    selectedNodes.forEach(node => {
      const nodeId = node.id.toString();
      const widgets = node.widgets || {};
      
      Object.values(widgets).forEach((widget: any) => {
        const paramName = widget.name;
        
        // Only process selected text parameters
        if (selectedParams[paramName] && (widget.type === "customtext" || widget.type.toLowerCase().includes("text"))) {
          const inputKey = `${nodeId}_${paramName}`;
          const currentTexts = textInputs[inputKey] || [''];
          
          // Update paramTestValues with the current text values
          updatedParamTestValues[nodeId] = updatedParamTestValues[nodeId] || {};
          updatedParamTestValues[nodeId][paramName] = currentTexts;
        }
      });
    });
    
    // Update the state with synchronized values
    setParamTestValues(updatedParamTestValues);
    
    // Update totalCount with parameter combinations
    const combinations = generateParameterCombinations(updatedParamTestValues);
    setTotalCount(combinations.length);
  }
  
  // Clear error message
  setErrorMessage(null);
  setCurrentScreen(prev => Math.min(prev + 1, 2));
};

/**
 * Handle navigation to previous screen
 */
export const handlePrevious = (
  currentScreen: number,
  setCurrentScreen: React.Dispatch<React.SetStateAction<number>>,
  selectedNodes: any[],
  paramTestValues: {[nodeId: string]: {[paramName: string]: any[]}},
  setParamTestValues: React.Dispatch<React.SetStateAction<{[nodeId: string]: {[paramName: string]: any[]}}>>,
  textInputs: {[nodeId_paramName: string]: string[]},
  isCompleted: boolean,
  setIsCompleted: React.Dispatch<React.SetStateAction<boolean>>,
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>,
  event?: React.MouseEvent
) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  // Clear error message
  setErrorMessage(null);
  // Reset completed state when going back
  if (isCompleted) {
    setIsCompleted(false);
  }
  
  // If going back from screen 1 to 0, clean up any paramTestValues for nodes that are no longer selected
  if (currentScreen === 1) {
    const selectedNodeIds = selectedNodes.map(node => node.id.toString());
    const currentNodeIds = Object.keys(paramTestValues);
    
    // Remove test values for any nodes that are no longer selected
    const updatedParamTestValues = { ...paramTestValues };
    currentNodeIds.forEach(nodeId => {
      if (!selectedNodeIds.includes(nodeId)) {
        delete updatedParamTestValues[nodeId];
      }
    });
    
    setParamTestValues(updatedParamTestValues);
  }
  
  // If returning from the result gallery or confirmation screen, ensure text values are maintained
  if (currentScreen === 2 || isCompleted) {
    // Ensure paramTestValues are correctly synchronized with textInputs
    const updatedParamTestValues = { ...paramTestValues };
    
    // For each text input value, ensure it's properly synced to paramTestValues
    Object.entries(textInputs).forEach(([key, texts]) => {
      if (!texts || texts.length === 0) return;
      
      const [nodeId, paramName] = key.split('_');
      
      // Skip if node doesn't exist in selected nodes
      if (!selectedNodes.some(node => node.id.toString() === nodeId)) return;
      
      // Ensure the node and parameter exist in paramTestValues
      updatedParamTestValues[nodeId] = updatedParamTestValues[nodeId] || {};
      
      // Only update if the values are different to avoid unnecessary state updates
      if (JSON.stringify(updatedParamTestValues[nodeId][paramName]) !== JSON.stringify(texts)) {
        updatedParamTestValues[nodeId][paramName] = texts;
      }
    });
    
    setParamTestValues(updatedParamTestValues);
  }
  
  setCurrentScreen(prev => Math.max(prev - 1, 0));
};

/**
 * Handle page number change
 */
export const handlePageChange = (
  newPage: number,
  imagesPerPage: number,
  generatedImages: any[],
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>,
  event?: React.MouseEvent
) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  setCurrentPage(Math.max(1, Math.min(newPage, Math.ceil(generatedImages.length / imagesPerPage))));
}; 