// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import React from 'react';

/**
 * Open image modal
 */
export const openImageModal = (
  imageUrl: string, 
  params: { [key: string]: any }, 
  selectedNodes: any[],
  setModalImageUrl: React.Dispatch<React.SetStateAction<string>>,
  setModalImageParams: React.Dispatch<React.SetStateAction<{ [key: string]: any } | null>>,
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>,
  event: React.MouseEvent
) => {
  event.preventDefault();
  event.stopPropagation();
  
  // Add node name information
  const enhancedParams = { ...params };
  
  // If nodeParams exists, add node names for each node
  if (params.nodeParams) {
    // Create nodeNames mapping
    const nodeNames: {[nodeId: string]: string} = {};
    Object.keys(params.nodeParams).forEach(nodeId => {
      // Try to find the corresponding node name from selectedNodes
      const node = selectedNodes.find(n => n.id.toString() === nodeId);
      nodeNames[nodeId] = node ? (node.title || `Node ${nodeId}`) : `Node ${nodeId}`;
    });
    
    // Add node name information to parameters
    enhancedParams.nodeNames = nodeNames;
  }
  // If no nodeParams but other parameters exist, create a simple nodeParams structure
  else if (Object.keys(params).length > 0) {
    // Create a mock nodeParams structure
    const simpleNode: {[key: string]: any} = {};
    Object.entries(params).forEach(([key, value]) => {
      // Only process non-object type values
      if (typeof value !== 'object' || value === null) {
        simpleNode[key] = value;
      }
    });
    
    if (Object.keys(simpleNode).length > 0) {
      enhancedParams.nodeParams = { 
        default: simpleNode 
      };
      enhancedParams.nodeNames = { 
        default: params.node_name || params.nodeName || "Parameter" 
      };
    }
  }
  
  setModalImageUrl(imageUrl);
  setModalImageParams(enhancedParams);
  setModalVisible(true);
};

/**
 * Close image modal
 */
export const closeImageModal = (
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>,
  event?: React.MouseEvent
) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  setModalVisible(false);
}; 