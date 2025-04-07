import React, { useState, useEffect } from 'react';
import { getOnlyOneImageNode, getOutputImageByPromptId, queuePrompt, WidgetParamConf } from '../../utils/queuePrompt';
import { app } from '../../utils/comfyapp';
import { interruptProcessing, manageQueue } from '../../apis/comfyApiCustom';
import { useChatContext } from '../../context/ChatContext';
import { WorkflowChatAPI } from '../../apis/workflowChatApi';

// Add CSS for the highlight pulse effect
const highlightPulseStyle = `
  @keyframes highlight-pulse {
    0% { 
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
    }
    70% { 
      box-shadow: 0 0 0 15px rgba(59, 130, 246, 0);
    }
    100% { 
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
    }
  }
  
  .highlight-pulse {
    animation: highlight-pulse 1.5s infinite;
    border: 2px solid #3b82f6;
  }

  @keyframes fade-in-out {
    0% { opacity: 0; transform: translateY(-20px); }
    10% { opacity: 1; transform: translateY(0); }
    90% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
  }
  
  .animate-fade-in-out {
    animation: fade-in-out 3s forwards;
  }
`;

// 添加一个新的接口来定义图像类型
interface GeneratedImage {
  url: string;
  params: { [key: string]: any };
}

interface ParameterDebugInterfaceProps {
  selectedNodes: any[];
  visible: boolean;
  onClose?: () => void;
}

// Define WidgetPair interface here since it's not exported from queuePrompt
interface WidgetPair {
  paramName: string;
  paramValue: string;
}

export const ParameterDebugInterface: React.FC<ParameterDebugInterfaceProps> = ({
  selectedNodes,
  visible,
  onClose
}) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [selectedParams, setSelectedParams] = useState<{[key: string]: boolean}>({
    Steps: true,
    CFG: true,
    sampler_name: true,
    threshold: false,
    prompt: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(12);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(() => {
    // Create an array of placeholder image URLs
    return Array(12).fill(null).map((_, i) => ({
      url: `https://source.unsplash.com/random/300x300?sig=${Math.random()}`,
      params: {
        step: i % 3 === 0 ? 5 : i % 3 === 1 ? 10 : 15,
        sampler_name: 'euler',
        cfg: 1
      }
    }));
  });

  // 修改参数测试值结构，使用嵌套对象，按节点ID进行分组
  const [paramTestValues, setParamTestValues] = useState<{[nodeId: string]: {[paramName: string]: any[]}}>({}); 
  // Add a state to store dropdown open status
  const [openDropdowns, setOpenDropdowns] = useState<{[key: string]: boolean | {isOpen: boolean, x: number, y: number}}>({});

  // Add new state to store search terms
  const [searchTerms, setSearchTerms] = useState<{[key: string]: string}>({});

  // Add state to track input values - 更新为使用nodeId_paramName作为键
  const [inputValues, setInputValues] = useState<{[nodeId_paramName: string]: {min?: string, max?: string, step?: string}}>({});

  // Add a state to store current page
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 6;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add state to store notification visibility
  const [notificationVisible, setNotificationVisible] = useState(false);

  // Add new state for modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');

  // Add state for text inputs and AI writing modal
  const [textInputs, setTextInputs] = useState<{[nodeId_paramName: string]: string[]}>({});
  const [aiWritingModalVisible, setAiWritingModalVisible] = useState(false);
  const [aiWritingModalText, setAiWritingModalText] = useState('');
  const [aiGeneratedTexts, setAiGeneratedTexts] = useState<string[]>([]);
  const [aiWritingLoading, setAiWritingLoading] = useState(false);
  const [aiWritingNodeId, setAiWritingNodeId] = useState<string>('');
  const [aiWritingParamName, setAiWritingParamName] = useState<string>('');
  const [aiWritingError, setAiWritingError] = useState<string | null>(null);
  const [aiSelectedTexts, setAiSelectedTexts] = useState<{[key: string]: boolean}>({});

  // Get dispatch from context to update screen state
  const { dispatch } = useChatContext();

  // Add function to handle AI text generation
  const handleAiWriting = async () => {
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
  
  // Add function to handle text input changes
  const handleTextInputChange = (nodeId: string, paramName: string, index: number, value: string) => {
    const textKey = `${nodeId}_${paramName}`;
    
    setTextInputs(prev => {
      const currentTexts = [...(prev[textKey] || [])];
      currentTexts[index] = value;
      return {
        ...prev,
        [textKey]: currentTexts
      };
    });
    
    // Also update paramTestValues with the new value directly instead of using textInputs state
    // (which hasn't been updated yet)
    const currentTexts = [...(textInputs[textKey] || [])];
    currentTexts[index] = value;
    updateParamTestValues(nodeId, paramName, currentTexts);
  };
  
  // Add function to add a new text input
  const handleAddTextInput = (nodeId: string, paramName: string) => {
    const textKey = `${nodeId}_${paramName}`;
    
    setTextInputs(prev => {
      const currentTexts = [...(prev[textKey] || [])];
      currentTexts.push('');
      return {
        ...prev,
        [textKey]: currentTexts
      };
    });
    
    // Also update paramTestValues
    const updatedTexts = [...(textInputs[textKey] || []), ''];
    updateParamTestValues(nodeId, paramName, updatedTexts);
  };
  
  // Add function to remove a text input
  const handleRemoveTextInput = (nodeId: string, paramName: string, index: number) => {
    const textKey = `${nodeId}_${paramName}`;
    
    setTextInputs(prev => {
      const currentTexts = [...(prev[textKey] || [])];
      currentTexts.splice(index, 1);
      return {
        ...prev,
        [textKey]: currentTexts
      };
    });
    
    // Also update paramTestValues
    const updatedTexts = [...(textInputs[textKey] || [])];
    updatedTexts.splice(index, 1);
    updateParamTestValues(nodeId, paramName, updatedTexts);
  };
  
  // Add function to toggle text selection in AI writing modal
  const toggleTextSelection = (textKey: string) => {
    setAiSelectedTexts(prev => ({
      ...prev,
      [textKey]: !prev[textKey]
    }));
  };
  
  // Add function to add selected texts from AI modal
  const addSelectedTexts = () => {
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
    
    // Also update paramTestValues
    const updatedTexts = [...(textInputs[textKey] || []), ...selectedTexts];
    updateParamTestValues(aiWritingNodeId, aiWritingParamName, updatedTexts);
    
    // Close the modal
    setAiWritingModalVisible(false);
  };
  
  // Add function to open AI writing modal
  const openAiWritingModal = (nodeId: string, paramName: string) => {
    setAiWritingModalVisible(true);
    setAiWritingNodeId(nodeId);
    setAiWritingParamName(paramName);
    setAiWritingModalText('');
    setAiGeneratedTexts([]);
    setAiSelectedTexts({});
    setAiWritingLoading(false);
    setAiWritingError(null);
  };

  // Add useEffect to initialize parameter test values when selectedNodes change
  useEffect(() => {
    if (!selectedNodes || selectedNodes.length === 0) return;
    
    // Initialize empty parameter test values for any newly selected nodes
    const updatedParamTestValues = { ...paramTestValues };
    
    // Clean up any nodes that are no longer selected
    const selectedNodeIds = selectedNodes.map((node: any) => node.id.toString());
    const currentNodeIds = Object.keys(updatedParamTestValues);
    
    // Remove test values for nodes that are no longer selected
    currentNodeIds.forEach(nodeId => {
      if (!selectedNodeIds.includes(nodeId)) {
        delete updatedParamTestValues[nodeId];
      }
    });
    
    // Add empty entries for newly selected nodes
    selectedNodes.forEach((node: any) => {
      const nodeId = node.id.toString();
      if (!updatedParamTestValues[nodeId]) {
        updatedParamTestValues[nodeId] = {};
      }
    });
    
    // Update state if changes were made
    if (JSON.stringify(updatedParamTestValues) !== JSON.stringify(paramTestValues)) {
      setParamTestValues(updatedParamTestValues);
    }
  }, [selectedNodes, paramTestValues]);

  // Add useEffect to update screen state in context when screen changes
  useEffect(() => {
    dispatch({ 
      type: 'SET_SCREEN_STATE', 
      payload: {
        currentScreen,
        isProcessing,
        isCompleted
      } 
    });
  }, [currentScreen, isProcessing, isCompleted, dispatch]);

  // Add style to document head
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = highlightPulseStyle;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Add a useEffect to handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only process if there are open dropdowns
      if (Object.values(openDropdowns).some(isOpen => isOpen)) {
        // Check if clicked element is inside dropdown-menu or its trigger
        const target = event.target as Element;
        
        // Check if the click was inside any dropdown menu
        const isInsideDropdown = !!target.closest('.dropdown-menu');
        
        // Check if the click was on a dropdown trigger button
        const isOnTrigger = !!target.closest('[data-dropdown]');
        
        // If click was outside both dropdown and trigger, close all dropdowns
        if (!isInsideDropdown && !isOnTrigger) {
          setOpenDropdowns({});
        }
      }
    };
    
    // Add listener to document once
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdowns]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / imagesPerPage);

  // Handle page change
  const handlePageChange = (newPage: number, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  // Navigate to next screen
  const handleNext = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // 如果要从屏幕 1 进入屏幕 2，更新 totalCount
    if (currentScreen === 1) {
      const combinations = generateParameterCombinations();
      setTotalCount(combinations.length);
    }
    // 清除错误消息
    setErrorMessage(null);
    setCurrentScreen(prev => Math.min(prev + 1, 2));
  };

  // Navigate to previous screen
  const handlePrevious = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // 清除错误消息
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
    
    setCurrentScreen(prev => Math.max(prev - 1, 0));
  };

  // Handle parameter selection
  const handleParamSelect = (param: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setSelectedParams(prev => ({
      ...prev,
      [param]: !prev[param]
    }));
  };

  // Generate numeric test values
  const generateNumericTestValues = (min: number, max: number, step: number, precision: number = 0) => {
    // Ensure all parameters have valid values
    min = isNaN(min) ? 0 : min;
    max = isNaN(max) ? 100 : max;
    step = isNaN(step) || step <= 0 ? 1 : step;
    
    // Ensure max >= min
    if (max < min) {
      max = min;
    }
    
    // Calculate count based on the actual step
    const count = Math.floor((max - min) / step) + 1;
    if (count <= 1) return [min];
    
    // Generate values based on the actual step
    const values = [];
    let current = min;
    if (count <= 10){
      while (current <= max && values.length <= 10) {
        // Apply precision based on the parameter
        const factor = Math.pow(10, precision);
        const roundedValue = Math.round(current * factor) / factor;
        
        values.push(roundedValue);
        current += step;
      }
    }
    else{
      // For large ranges, generate evenly distributed values
      const range = max - min;
      const step = range / 9; // 9 steps to get 10 values
      
      for (let i = 0; i <= 9; i++) {
        // Calculate the value at this position
        const value = min + (step * i);
        
        // Apply precision
        const factor = Math.pow(10, precision);
        const roundedValue = Math.round(value * factor) / factor;
        
        values.push(roundedValue);
      }
    }
    
    return values;
  };

// Generate all parameter combinations for the selected parameters
const generateParameterCombinations = () => {
  // First, we need to get all the different parameter combinations
  const result: WidgetParamConf[][] = [];
  
  // Create a list of all parameter combinations for each node
  const nodeParamCombinations: {[nodeId: string]: Array<WidgetParamConf[]>} = {};
  
  // For each node, generate all combinations of its parameters
  Object.keys(paramTestValues).forEach(nodeIdStr => {
    const nodeId = parseInt(nodeIdStr);
    const nodeParams = paramTestValues[nodeIdStr] || {};
    
    // Get all parameter names that have values
    const paramNames = Object.keys(nodeParams).filter(
      paramName => nodeParams[paramName] && nodeParams[paramName].length > 0
    );
    
    if (paramNames.length === 0) return;
    
    // Create all possible combinations of parameter values for this node
    const combinations: WidgetParamConf[][] = [[]];
    
    // For each parameter, create combinations with all its values
    paramNames.forEach(paramName => {
      const values = nodeParams[paramName];
      const newCombinations: WidgetParamConf[][] = [];
      
      // For each existing combination
      combinations.forEach(combo => {
        // For each value of the current parameter
        values.forEach(value => {
          // Create a new combination by adding this parameter value
          const newCombo = [...combo, {
            nodeId,
            paramName,
            paramValue: String(value)
          }];
          newCombinations.push(newCombo);
        });
      });
      
      // Replace combinations with the new ones
      combinations.length = 0;
      combinations.push(...newCombinations);
    });
    
    // Store all combinations for this node
    nodeParamCombinations[nodeIdStr] = combinations;
  });
  
  // If no nodes have parameters, return empty result
  if (Object.keys(nodeParamCombinations).length === 0) {
    return result;
  }
  
  // If there's only one node, return its combinations directly
  if (Object.keys(nodeParamCombinations).length === 1) {
    const nodeId = Object.keys(nodeParamCombinations)[0];
    return nodeParamCombinations[nodeId];
  }
  
  // For multiple nodes, we need to create combinations across nodes
  const nodeIds = Object.keys(nodeParamCombinations);
  
  // Start with combinations from the first node
  let allCombinations = nodeParamCombinations[nodeIds[0]];
  
  // For each additional node, create combinations with all previous nodes
  for (let i = 1; i < nodeIds.length; i++) {
    const nodeCombinations = nodeParamCombinations[nodeIds[i]];
    const newCombinations: WidgetParamConf[][] = [];
    
    // For each existing combination across previous nodes
    allCombinations.forEach(existingCombo => {
      // For each combination from the current node
      nodeCombinations.forEach(nodeCombo => {
        // Combine them
        newCombinations.push([...existingCombo, ...nodeCombo]);
      });
    });
    
    // Update all combinations
    allCombinations = newCombinations;
  }
  
  return allCombinations;
};
  
  // Toggle dropdown open status - 使用nodeId_paramName作为键
  const toggleDropdown = (nodeId: string, paramName: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const dropdownKey = `${nodeId}_${paramName}`;
    
    setOpenDropdowns(prev => {
      const isCurrentlyOpen = prev[dropdownKey] && 
        typeof prev[dropdownKey] === 'object' ? 
        (prev[dropdownKey] as {isOpen: boolean}).isOpen : 
        Boolean(prev[dropdownKey]);
      
      if (isCurrentlyOpen) {
        return {
          ...prev,
          [dropdownKey]: false
        };
      } else {
        // 确定下拉框的位置
        let x = 0;
        let y = 0;
        
        // 尝试从事件目标获取位置
        if (event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          x = rect.left;
          y = rect.bottom;
        } else {
          // 如果无法获取元素位置，使用鼠标点击位置
          x = event.clientX;
          y = event.clientY + 20; // 在鼠标位置下方20px显示
        }
        
        // 确保下拉框不会超出窗口边界
        const windowWidth = window.innerWidth;
        const dropdownWidth = 250; // 估计的下拉框宽度
        
        if (x + dropdownWidth > windowWidth) {
          x = windowWidth - dropdownWidth - 10; // 确保距离右边界至少10px
        }
        
        if (x < 0) x = 10; // 确保距离左边界至少10px
        
        return {
          ...prev,
          [dropdownKey]: {
            isOpen: true,
            x: x,
            y: y
          }
        };
      }
    });
  };
  
  // Update parameter test values - 修改为支持新的参数结构
  const updateParamTestValues = (nodeId: string, paramName: string, values: any[]) => {
    setParamTestValues(prev => {
      const updatedValues = { ...prev };
      
      // 确保节点ID存在
      if (!updatedValues[nodeId]) {
        updatedValues[nodeId] = {};
      }
      
      // 更新特定节点和参数的值
      updatedValues[nodeId][paramName] = values;
      
      return updatedValues;
    });
  };
  
  // Handle selecting specific test values - 修改为支持新的参数结构
  const handleTestValueSelect = (nodeId: string, paramName: string, value: any, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setParamTestValues(prev => {
      const updatedValues = { ...prev };
      
      // 确保节点ID存在
      if (!updatedValues[nodeId]) {
        updatedValues[nodeId] = {};
      }
      
      // 确保参数名存在
      if (!updatedValues[nodeId][paramName]) {
        updatedValues[nodeId][paramName] = [];
      }
      
      const currentValues = updatedValues[nodeId][paramName];
      
      if (currentValues.includes(value)) {
        updatedValues[nodeId][paramName] = currentValues.filter(v => v !== value);
      } else {
        updatedValues[nodeId][paramName] = [...currentValues, value];
      }
      
      return updatedValues;
    });
  };

  // Add processing search - 使用nodeId_paramName作为键
  const handleSearch = (nodeId: string, paramName: string, term: string) => {
    const searchKey = `${nodeId}_${paramName}`;
    setSearchTerms(prev => ({
      ...prev,
      [searchKey]: term
    }));
  };

  // Add select all - 修改为支持新的参数结构
  const handleSelectAll = (nodeId: string, paramName: string, values: any[]) => {
    // 确保节点ID存在
    if (!paramTestValues[nodeId]) {
      updateParamTestValues(nodeId, paramName, values);
      return;
    }
    
    // 获取当前值
    const currentValues = paramTestValues[nodeId][paramName] || [];
    
    // 如果所有值都已选择，则取消选择所有，否则选择所有
    if (values.length === currentValues.length) {
      updateParamTestValues(nodeId, paramName, []);
    } else {
      updateParamTestValues(nodeId, paramName, [...values]);
    }
  };

  // Add function to generate dynamic parameters - modified to work with the new structure
  const generateDynamicParams = (paramTestValues: {[nodeId: string]: {[paramName: string]: any[]}}, index: number) => {
    // Create object to store dynamic parameters
    const dynamicParams: { 
      [key: string]: any,
      nodeParams?: {[nodeId: string]: {[paramName: string]: any}}
    } = {};
    
    // Initialize nodeParams structure
    dynamicParams.nodeParams = {};
    
    // Get all parameter combinations
    const allCombinations = generateParameterCombinations();
    
    // Use the index to select a specific combination
    if (index < allCombinations.length) {
      const selectedCombination = allCombinations[index];
      
      // Process each parameter in the combination
      selectedCombination.forEach(param => {
        const nodeId = param.nodeId.toString();
        const paramName = param.paramName;
        const paramValue = param.paramValue;
        
        // Initialize node if needed
        if (!dynamicParams.nodeParams![nodeId]) {
          dynamicParams.nodeParams![nodeId] = {};
        }
        
        // Add to nodeParams structure
        dynamicParams.nodeParams![nodeId][paramName] = paramValue;
        
        // Also add to flat structure for backwards compatibility and display
        dynamicParams[paramName] = paramValue;
      });
    }
    
    return dynamicParams;
  };

  // Handle start generation
  const handleStartGeneration = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Get parameter combinations
    const paramCombinations = generateParameterCombinations();
    const totalCombinations = paramCombinations.length;
    const showNodeId = getOnlyOneImageNode();
    
    // Check if total runs exceed 100
    if (totalCombinations > 100) {
      setErrorMessage(`Cannot generate more than 100 images at once (currently: ${totalCombinations} images)`);
      return;
    }
    
    setErrorMessage(null);
    setIsProcessing(true);
    setCompletedCount(0);
    
    console.log("Generated parameter combinations:", paramCombinations);
    
    // If we have no combinations, show error and return
    if (paramCombinations.length === 0) {
      setErrorMessage("No valid parameter combinations found. Please check your parameter selections.");
      setIsProcessing(false);
      return;
    }
    
    const prompt_ids: string[] = [];
    try {
      // Each combination represents all parameters for a single image generation
      for (const combination of paramCombinations) {
        const response = await queuePrompt(combination);
        if(response.prompt_id) {
            prompt_ids.push(response.prompt_id);
        } else {
            console.error("Failed to get prompt_id from response:", response);
            prompt_ids.push("");
        }
      }

      // Create an array to track images and their parameters
      const newImages: GeneratedImage[] = Array(paramCombinations.length).fill(null).map((_, i) => ({
        url: `https://source.unsplash.com/random/300x300?sig=${Math.random()}`, // Default placeholder
        params: generateDynamicParams(paramTestValues, i)
      }));
      
      // Set initial images
      setGeneratedImages(newImages);
      
      // Track timeout
      const startTime = Date.now();
      const timeoutDuration = 5 * 60 * 1000; // 5 minutes
      
      // Function to poll for images
      const pollForImages = async () => {
        // Check if timeout has been reached
        if (Date.now() - startTime > timeoutDuration) {
          console.log("Timeout reached while waiting for images");
          setIsProcessing(false);
          setIsCompleted(true);
          setCurrentPage(1);
          return;
        }
        
        let completedImagesCount = 0;
        
        // Check each prompt id to see if images are ready
        
        for (let i = 0; i < prompt_ids.length; i++) {
          const promptId = prompt_ids[i];
          if (!promptId) continue;
          
          try {
            const imageUrl = await getOutputImageByPromptId(promptId, showNodeId);
            
            if (imageUrl) {
              // If we have an image URL, update in our array
              newImages[i] = {
                ...newImages[i],
                url: imageUrl
              };
              completedImagesCount++;
            }
          } catch (error) {
            console.error(`Error fetching image for prompt ID ${promptId}:`, error);
          }
        }
        
        // Update the images in state
        setGeneratedImages([...newImages]);
        
        // Update the completed count
        setCompletedCount(completedImagesCount);
        
        // If all images are ready or timeout occurred, we're done
        if (completedImagesCount === prompt_ids.length || Date.now() - startTime > timeoutDuration) {
          setIsProcessing(false);
          setIsCompleted(true);
          setCurrentPage(1);
        } else {
          // Otherwise, poll again in 3 seconds
          setTimeout(pollForImages, 3000);
        }
      };
      
      // Start polling
      pollForImages();
    } catch (error) {
      console.error("Error generating images:", error);
      setIsProcessing(false);
    }
  };

  // Handle selecting an image
  const handleSelectImage = (index: number, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setSelectedImageIndex(index);
  };

  // Add new function to open image modal
  const openImageModal = (imageUrl: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setModalImageUrl(imageUrl);
    setModalVisible(true);
  };

  // Add new function to close image modal
  const closeImageModal = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setModalVisible(false);
  };

  // Handle applying selected image
  const handleApplySelected = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (selectedImageIndex !== null) {
      console.log(`Applied image ${selectedImageIndex + 1} with parameters:`, generatedImages[selectedImageIndex].params);
      // 把选中图片的参数应用到画布上
      const selectedParams = generatedImages[selectedImageIndex].params;
      
      // 使用结构化的参数格式
      if (selectedParams.nodeParams) {
        // 遍历所有节点参数
        Object.entries(selectedParams.nodeParams).forEach(([nodeId, nodeParams]) => {
          // 获取节点
          const node = app.graph._nodes_by_id[nodeId];
          if (!node || !node.widgets) return;
          
          // 遍历节点的参数
          Object.entries(nodeParams as Record<string, any>).forEach(([paramName, value]) => {
            // 在节点的widgets中查找对应名称的widget
            for (const widget of node.widgets) {
              if (widget.name === paramName) {
                // 设置widget的值
                widget.value = value;
                break;
              }
            }
          });
        });
        
        // 标记画布为脏，触发重新渲染
        app.graph.setDirtyCanvas(false, true);
        
        // 显示通知消息
        setNotificationVisible(true);
        
        // 3秒后隐藏通知
        setTimeout(() => {
          setNotificationVisible(false);
        }, 3000);
      }
    }
  };

  // Modified handle close to implement different behaviors based on current screen
  const handleClose = (event?: React.MouseEvent, nodeIndex?: number) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Screen 2: Close individual node card
    if (currentScreen === 1 && nodeIndex !== undefined) {
      // Remove the node at specified index
      const newSelectedNodes = [...selectedNodes];
      newSelectedNodes.splice(nodeIndex, 1);
      
      // If no nodes left, return to original screen
      if (newSelectedNodes.length === 0) {
        if (onClose) {
          // Clear screen state from context when closing
          dispatch({ type: 'SET_SCREEN_STATE', payload: null });
          // Call provided onClose to reset the interface
          onClose();
        }
      } else {
        // Update the context with the new selected nodes
        dispatch({ type: 'SET_SELECTED_NODE', payload: newSelectedNodes });
      }
      return;
    }
    
    // Screen 3, 4, 5 or original: Close the entire interface
    if (onClose) {
      // Clear screen state from context when closing
      dispatch({ type: 'SET_SCREEN_STATE', payload: null });
      // Use the provided onClose callback
      onClose();
    } else {
      // For users of this component without a callback
      // Reset internal states
      setCurrentScreen(0);
      setIsCompleted(false);
      setIsProcessing(false);
      setErrorMessage(null);
    }
  };

  // Conditionally render based on whether nodes are selected
  // Screen original - Only stop propagation, don't prevent default
  if (!visible || selectedNodes.length === 0) {
    return (
      <div 
        className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-lg p-8 bg-white rounded-lg shadow-sm border border-blue-100 relative">
          <div className="mb-6 text-center">
            <h3 className="text-base font-bold text-blue-800 mb-2">GenLab</h3>
            <div className="h-1 w-16 bg-blue-500 mx-auto rounded-full mb-4"></div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-800">Batch Test Parameter Pairs</h4>
                <p className="text-xs text-gray-600">Select a node to batch test parameter pairs</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-800">How To Use</h4>
                <p className="text-xs text-gray-600">Click on any node in your workflow to start the parameter testing process</p>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-600 mb-3">No node is currently selected</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 5: If we're in completed state, show the results gallery
  if (isCompleted) {
    // Calculate current page's image index range using generatedImages.length instead of totalCount
    const startIndex = (currentPage - 1) * imagesPerPage;
    const endIndex = Math.min(startIndex + imagesPerPage, generatedImages.length);
    const currentImages = generatedImages.slice(startIndex, endIndex);
    
    // Update total pages calculation based on actual image count
    const actualTotalPages = Math.ceil(generatedImages.length / imagesPerPage);
    
    return (
      <div 
        className="flex-1 overflow-y-auto bg-gray-50 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="mb-4 border-b pb-2 flex justify-between items-center">
            <div>
              <h3 className="text-base font-medium text-gray-800">Generation Complete</h3>
              <p className="text-xs text-gray-500">All {generatedImages.length} images have been generated.</p>
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
          
          {/* Notification toast */}
          {notificationVisible && (
            <div className="fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-3 shadow-md rounded animate-fade-in-out z-50">
              <div className="flex items-center">
                <div className="py-1">
                  <svg className="h-4 w-4 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs">Parameters has been applied.</p>
              </div>
            </div>
          )}
          
          {/* Image Modal */}
          {modalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeImageModal}>
              <div className="bg-white rounded-lg p-2 max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="absolute top-2 right-2 text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-200 p-1"
                  onClick={closeImageModal}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="overflow-auto max-h-[calc(90vh-4rem)]">
                  <img 
                    src={modalImageUrl} 
                    alt="Enlarged image" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
            </div>
          )}
          
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
                    onClick={(e) => openImageModal(image.url, e)}
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
                  <div className="p-2 text-xs text-gray-600 bg-white max-h-16 overflow-y-auto">
                    {Object.entries(image.params)
                      // Filter out nodeParams and other complex objects from display
                      .filter(([paramName, value]) => 
                        paramName !== 'nodeParams' && 
                        typeof value !== 'object'
                      )
                      .map(([paramName, value]) => (
                        <div key={paramName}>{paramName}: {String(value)}</div>
                      ))
                    }
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
          
          <div className="mt-6 flex justify-between">
            <button
              onClick={(e) => handlePrevious(e)}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={(e) => handleApplySelected(e)}
              className="px-3 py-1.5 text-xs bg-pink-200 text-pink-700 rounded-md hover:bg-pink-300 transition-colors"
              disabled={selectedImageIndex === null}
            >
              Apply Selected
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 4: If processing, show the loading overlay
  if (isProcessing) {
    return (
      <div 
        className="flex-1 overflow-y-auto bg-gray-50 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative">
          {/* Semi-transparent overlay */}
          <div className="absolute inset-0 bg-gray-500 bg-opacity-30 flex flex-col items-center justify-center z-10">
            <div className="text-center text-gray-800 bg-white p-4 rounded-lg shadow-lg">
              <div className="mb-2 text-sm font-medium">Processing...</div>
              <div className="text-xs mb-3">Completed {completedCount} of {totalCount} runs</div>
              <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 transition-all duration-200"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                ></div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Already generated {completedCount} images
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  manageQueue({clear: true});
                  interruptProcessing();
                  setIsProcessing(false);
                  setCurrentScreen(2);
                }}
                className="mt-4 px-3 py-1.5 text-xs bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Background content (same as screen 3 content) */}
          <div className="mb-4 border-b pb-2 flex justify-between items-center">
            <div>
              <h3 className="text-base font-medium text-gray-800">Confirm Test Configuration</h3>
              <p className="text-xs text-gray-500">
                In the selected parameter combinations, there are {totalCount} total runs. Each run will generate a separate image.
              </p>
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
          
          {/* Display error message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-2">{errorMessage}</div>
              </div>
            </div>
          )}
          
          {selectedNodes.length > 0 ? (
            selectedNodes.map((node, nodeIndex) => {
              const nodeType = node.type || "Unknown Node";
              const widgets = node.widgets || [];
              const nodeId = node.id;
              
              return (
                <div key={nodeIndex} className="border rounded-md mb-4 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 border-b">
                    {nodeType} (ID: {nodeId})
                  </div>
                  <div className="p-4 space-y-3">
                    {widgets.map((widget: any, widgetIndex: number) => {
                      const paramName = widget.name;
                      
                      if (!selectedParams[paramName]) {
                        return null;
                      }
                      
                      const testValues = paramTestValues[nodeId]?.[paramName] || [];
                      const displayValues = Array.isArray(testValues) 
                        ? `[${testValues.join(', ')}]` 
                        : JSON.stringify(testValues);
                      
                      return (
                        <div key={widgetIndex} className={widgetIndex < widgets.length - 1 ? "flex justify-between items-center border-b pb-2" : "flex justify-between items-center"}>
                          <label className="font-medium text-gray-700">{paramName}</label>
                          <div className="flex space-x-2 items-center">
                            <input 
                              type="text" 
                              className="w-64 h-7 border border-gray-300 rounded text-sm px-2 bg-gray-50 cursor-not-allowed text-gray-500" 
                              readOnly 
                              disabled
                              value={displayValues} 
                              onClick={(e) => e.preventDefault()}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="border rounded-md mb-4 p-4 text-center text-gray-500">
              No nodes selected. Please select a node in the workflow to configure parameters.
            </div>
          )}
          
          <div className="mt-6 flex justify-between">
            <button
              onClick={(e) => handlePrevious(e)}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={(e) => handleStartGeneration(e)}
              className="px-3 py-1.5 text-xs bg-pink-200 text-pink-700 rounded-md hover:bg-pink-300 transition-colors"
            >
              Start Generation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 1: Select parameters
  if (currentScreen === 0) {
    return (
      <div 
        className="flex-1 overflow-y-auto bg-gray-50 p-4"
        onClick={(e) => e.stopPropagation()}
      >
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
      </div>
    );
  }

  // Screen 2: Configure parameter options
  if (currentScreen === 1) {
    return (
      <div 
        className="flex-1 overflow-y-auto bg-gray-50 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="mb-4 border-b pb-2 flex justify-between items-center">
            <div>
              <h3 className="text-base font-medium text-gray-800">Parameter Options</h3>
              <p className="text-xs text-gray-500">Configure the test values for each parameter</p>
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
          
          {/* AI Writing Modal */}
          {aiWritingModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="text-lg font-medium">AI Writing Assistant</h3>
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => setAiWritingModalVisible(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-4">
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
                
                <div className="p-4 border-t flex justify-end">
                  <button 
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm mr-2 hover:bg-gray-200 transition-colors"
                    onClick={() => setAiWritingModalVisible(false)}
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
          )}
          
          {selectedNodes.length > 0 ? (
            selectedNodes.map((node, nodeIndex) => {
              const widgets = node.widgets || {};
              const nodeWidgets = Object.values(widgets);
              const nodeId = node.id; // 获取节点ID
              
              return (
                <div key={nodeIndex} className="border rounded-md mb-4 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 border-b flex justify-between items-center">
                    <span>{node.type} (ID: {nodeId})</span>
                    {/* Add close button for individual node card */}
                    <button 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={(e) => handleClose(e, nodeIndex)}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    {nodeWidgets.map((widget: any, widgetIndex: number) => {
                      const paramName = widget.name;
                      
                      // Only show selected parameters
                      if (!selectedParams[paramName]) {
                        return null;
                      }

                      // 为每个输入字段创建唯一的键值
                      const inputKey = `${nodeId}_${paramName}`;
                      
                      // Handle text parameter type
                      if (widget.type === "customtext" || widget.type.toLowerCase().includes("text")) {
                        // Initialize text inputs if not already set
                        if (!textInputs[inputKey]) {
                          setTextInputs(prev => ({
                            ...prev,
                            [inputKey]: ['']
                          }));
                          
                          // Initialize parameter test values
                          if (!paramTestValues[nodeId] || !paramTestValues[nodeId][paramName]) {
                            updateParamTestValues(nodeId, paramName, ['']);
                          }
                        }
                        
                        const currentTexts = textInputs[inputKey] || [''];
                        
                        return (
                          <div key={widgetIndex} className="border-b pb-3">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-medium text-gray-700">{paramName}:</label>
                              <button
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs flex items-center hover:bg-blue-200 transition-colors"
                                onClick={() => openAiWritingModal(nodeId, paramName)}
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                AI Writing
                              </button>
                            </div>
                            
                            <div className="space-y-2">
                              {currentTexts.map((text, textIndex) => (
                                <div key={textIndex} className="flex items-start">
                                  <textarea
                                    className="flex-1 border border-gray-300 rounded p-2 text-xs resize-y"
                                    rows={2}
                                    placeholder="Enter text..."
                                    value={text}
                                    onChange={(e) => handleTextInputChange(nodeId, paramName, textIndex, e.target.value)}
                                  />
                                  <button
                                    className="ml-2 text-red-500 hover:text-red-700"
                                    onClick={() => handleRemoveTextInput(nodeId, paramName, textIndex)}
                                    title="Remove"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                            
                            <button
                              className="mt-2 px-2 py-1 border border-dashed border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50 flex items-center"
                              onClick={() => handleAddTextInput(nodeId, paramName)}
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add Text
                            </button>
                          </div>
                        );
                      }
                      
                      if (widget.type === "number") {
                        const min = widget.options?.min || 0;
                        const max = widget.options?.max || 100;
                        const step = (widget.options?.step || 10) / 10;
                        const precision = widget.options?.precision || 0;
                        const defaultValues = generateNumericTestValues(min, max, step, precision);
                        
                        // 获取当前输入状态，如果不存在则初始化
                        const currentInputs = inputValues[inputKey] || {
                          min: min.toString(),
                          max: max.toString(),
                          step: step.toString()
                        };
                        
                        // 为这个参数初始化测试值
                        if (!paramTestValues[nodeId] || !paramTestValues[nodeId][paramName]) {
                          updateParamTestValues(nodeId, paramName, defaultValues);
                          
                          // 初始化输入状态
                          setInputValues(prev => ({
                            ...prev,
                            [inputKey]: currentInputs
                          }));
                        }
                        
                        return (
                          <div key={widgetIndex} className="border-b pb-3">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-medium text-gray-700">{paramName}:</label>
                              <div className="w-4"></div>
                            </div>
                            <div className="flex space-x-2 items-center">
                              <label className="text-xs text-gray-600">Min</label>
                              <input 
                                type="text" 
                                className="w-12 h-6 border border-gray-300 rounded text-xs px-2" 
                                value={currentInputs.min}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onChange={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const value = e.target.value;
                                  
                                  // 更新输入状态
                                  setInputValues(prev => ({
                                    ...prev,
                                    [inputKey]: {
                                      ...prev[inputKey],
                                      min: value
                                    }
                                  }));
                                  
                                  // 只有当输入为空或有效时才更新参数值
                                  if (value === '' || !isNaN(parseFloat(value))) {
                                    const newMin = value === '' ? 0 : parseFloat(value);
                                    const newMax = parseFloat(currentInputs.max || max.toString());
                                    const newStep = parseFloat(currentInputs.step || step.toString());
                                    const newValues = generateNumericTestValues(newMin, newMax, newStep, precision);
                                    updateParamTestValues(nodeId, paramName, newValues);
                                  }
                                }}
                              />
                              <label className="text-xs text-gray-600">Max</label>
                              <input 
                                type="text" 
                                className="w-12 h-6 border border-gray-300 rounded text-xs px-2" 
                                value={currentInputs.max}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onChange={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const value = e.target.value;
                                  
                                  // 更新输入状态
                                  setInputValues(prev => ({
                                    ...prev,
                                    [inputKey]: {
                                      ...prev[inputKey],
                                      max: value
                                    }
                                  }));
                                  
                                  // 只有当输入为空或有效时才更新参数值
                                  if (value === '' || !isNaN(parseFloat(value))) {
                                    const newMin = parseFloat(currentInputs.min || min.toString());
                                    const newMax = value === '' ? newMin : parseFloat(value);
                                    const newStep = parseFloat(currentInputs.step || step.toString());
                                    const newValues = generateNumericTestValues(newMin, newMax, newStep, precision);
                                    updateParamTestValues(nodeId, paramName, newValues);
                                  }
                                }}
                              />
                              <label className="text-xs text-gray-600">Step</label>
                              <input 
                                type="text" 
                                className="w-12 h-6 border border-gray-300 rounded text-xs px-2" 
                                value={currentInputs.step}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onChange={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const value = e.target.value;
                                  
                                  // 更新输入状态
                                  setInputValues(prev => ({
                                    ...prev,
                                    [inputKey]: {
                                      ...prev[inputKey],
                                      step: value
                                    }
                                  }));
                                  
                                  // 只有当输入为空或有效时才更新参数值
                                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) > 0)) {
                                    const newMin = parseFloat(currentInputs.min || min.toString());
                                    const newMax = parseFloat(currentInputs.max || max.toString());
                                    const newStep = value === '' ? 1 : parseFloat(value);
                                    const newValues = generateNumericTestValues(newMin, newMax, newStep, precision);
                                    updateParamTestValues(nodeId, paramName, newValues);
                                  }
                                }}
                              />
                            </div>
                            <div className="mt-1">
                              <label className="text-xs text-gray-600">Test values</label>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(paramTestValues[nodeId]?.[paramName] || defaultValues).map((value, idx) => (
                                  <div 
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md flex items-center text-xs cursor-pointer hover:bg-blue-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTestValueSelect(nodeId, paramName, value, e);
                                    }}
                                  >
                                    <span>{value}</span>
                                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="mt-1">
                              <p className="text-xs text-gray-500">Values are distributed evenly between Min and Max (max 10 values)</p>
                            </div>
                          </div>
                        );
                      } else if (widget.type === "combo") {
                        const values = widget.options?.values || [];
                        const dropdownKey = `${nodeId}_${paramName}`;
                        
                        // 初始化测试值
                        if (!paramTestValues[nodeId] || !paramTestValues[nodeId][paramName]) {
                          updateParamTestValues(nodeId, paramName, values.slice(0, 3));
                        }
                        
                        return (
                          <div key={widgetIndex} className="border-b pb-3">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-medium text-gray-700">{paramName}</label>
                              <div className="relative dropdown-container">
                                <button 
                                  className="appearance-none border border-gray-300 rounded px-2 py-0.5 pr-6 text-xs flex items-center bg-white text-gray-700"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleDropdown(nodeId, paramName, e);
                                  }}
                                  data-dropdown={dropdownKey}
                                >
                                  <span>
                                    {(paramTestValues[nodeId]?.[paramName] || []).length > 0 
                                      ? `${paramName}: ${(paramTestValues[nodeId]?.[paramName] || []).length} selected` 
                                      : `Select ${paramName}`}
                                  </span>
                                  <div className="ml-2">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                    </svg>
                                  </div>
                                </button>
                                
                                {openDropdowns[dropdownKey] && (
                                  <div 
                                    className="absolute z-[9999] mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg dropdown-menu"
                                    style={{
                                      position: 'fixed',
                                      top: typeof openDropdowns[dropdownKey] === 'object' ? 
                                        `${(openDropdowns[dropdownKey] as {y: number}).y}px` : '0px',
                                      left: typeof openDropdowns[dropdownKey] === 'object' ? 
                                        `${(openDropdowns[dropdownKey] as {x: number}).x}px` : '0px',
                                      maxHeight: '300px',
                                      overflowY: 'auto',
                                    }}
                                  >
                                    {/* Search box */}
                                    <div className="p-2 border-b sticky top-0 bg-white">
                                      <input
                                        type="text"
                                        className="w-full px-2 py-0.5 text-xs border border-gray-300 rounded"
                                        placeholder="Search..."
                                        value={searchTerms[dropdownKey] || ''}
                                        onChange={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleSearch(nodeId, paramName, e.target.value);
                                        }}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        autoFocus
                                      />
                                    </div>
                                    
                                    {/* Select all option */}
                                    <div 
                                      className="px-3 py-1.5 bg-gray-50 border-b cursor-pointer text-xs flex items-center text-gray-700 hover:bg-gray-100"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const filteredValues = values.filter((value: string) => 
                                          !searchTerms[dropdownKey] || 
                                          value.toLowerCase().includes((searchTerms[dropdownKey] || '').toLowerCase())
                                        );
                                        handleSelectAll(nodeId, paramName, filteredValues);
                                      }}
                                    >
                                      <div className={`w-4 h-4 mr-2 border rounded-sm flex items-center justify-center ${
                                        values.length > 0 && 
                                        (paramTestValues[nodeId]?.[paramName] || []).length === values.length 
                                          ? 'bg-blue-500 border-blue-500' 
                                          : (paramTestValues[nodeId]?.[paramName] || []).length > 0 
                                            ? 'bg-blue-500 border-blue-500 opacity-50' 
                                            : 'border-gray-300'
                                      }`}>
                                        {(paramTestValues[nodeId]?.[paramName] || []).length > 0 && (
                                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </div>
                                      <span className="font-medium">
                                        {values.length > 0 && 
                                        (paramTestValues[nodeId]?.[paramName] || []).length === values.length 
                                          ? 'Deselect All' 
                                          : 'Select All'}
                                      </span>
                                    </div>
                                    
                                    {/* Scrollable option list */}
                                    <div className="max-h-60 overflow-y-auto">
                                      {values
                                        .filter((value: string) => 
                                          !searchTerms[dropdownKey] || 
                                          value.toLowerCase().includes((searchTerms[dropdownKey] || '').toLowerCase())
                                        )
                                        .map((value: string, i: number) => (
                                          <div 
                                            key={i} 
                                            className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-xs flex items-center text-gray-700"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleTestValueSelect(nodeId, paramName, value, e);
                                            }}
                                          >
                                            <div className={`w-4 h-4 mr-2 border rounded-sm flex items-center justify-center ${(paramTestValues[nodeId]?.[paramName] || []).includes(value) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                              {(paramTestValues[nodeId]?.[paramName] || []).includes(value) && (
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                              )}
                                            </div>
                                            <span className="whitespace-normal overflow-hidden text-ellipsis">{value}</span>
                                          </div>
                                        ))}
                                      
                                      {/* No search results message */}
                                      {values.filter((value: string) => 
                                        !searchTerms[dropdownKey] || 
                                        value.toLowerCase().includes((searchTerms[dropdownKey] || '').toLowerCase())
                                      ).length === 0 && (
                                        <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                          No matching options
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-2">
                              <label className="text-xs text-gray-600">Test values</label>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(paramTestValues[nodeId]?.[paramName] || []).map((value: string, idx: number) => (
                                  <div 
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md flex items-center text-xs"
                                  >
                                    <span>{value}</span>
                                    <svg 
                                      className="w-4 h-4 ml-1 cursor-pointer hover:text-blue-600" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleTestValueSelect(nodeId, paramName, value, e);
                                      }}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </div>
                                ))}
                                <button 
                                  className="px-2 py-0.5 border border-dashed border-blue-300 text-blue-600 rounded-md text-xs flex items-center hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newValue = `${paramName}${(paramTestValues[nodeId]?.[paramName] || []).length + 1}`;
                                    updateParamTestValues(nodeId, paramName, [...(paramTestValues[nodeId]?.[paramName] || []), newValue]);
                                  }}
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  <span>Add</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // 初始化其他类型参数的测试值
                        if (!paramTestValues[nodeId] || !paramTestValues[nodeId][paramName]) {
                          updateParamTestValues(nodeId, paramName, [`${paramName}1`, `${paramName}2`, `${paramName}3`]);
                        }
                        
                        return (
                          <div key={widgetIndex} className="border-b pb-3">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-medium text-gray-700">{paramName}</label>
                            </div>
                            <div className="mt-2">
                              <label className="text-xs text-gray-600">Test values</label>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(paramTestValues[nodeId]?.[paramName] || []).map((value: string, idx: number) => (
                                  <div 
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md flex items-center text-xs"
                                  >
                                    <span>{value}</span>
                                    <svg 
                                      className="w-4 h-4 ml-1 cursor-pointer hover:text-blue-600" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleTestValueSelect(nodeId, paramName, value, e);
                                      }}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </div>
                                ))}
                                <button 
                                  className="px-2 py-0.5 border border-dashed border-blue-300 text-blue-600 rounded-md text-xs flex items-center hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newValue = `${paramName}${(paramTestValues[nodeId]?.[paramName] || []).length + 1}`;
                                    updateParamTestValues(nodeId, paramName, [...(paramTestValues[nodeId]?.[paramName] || []), newValue]);
                                  }}
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  <span>Add</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="border rounded-md mb-4 p-4 text-center text-gray-500">
              No nodes selected. Please select a node in the workflow to configure parameters.
            </div>
          )}
          
          <div className="mt-6 flex justify-between">
            <button
              onClick={(e) => handlePrevious(e)}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={(e) => handleNext(e)}
              className="px-3 py-1.5 text-xs bg-pink-200 text-pink-700 rounded-md hover:bg-pink-300 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 3: Final configuration
  return (
    <div 
      className="flex-1 overflow-y-auto bg-gray-50 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="mb-4 border-b pb-2 flex justify-between items-center">
          <div>
            <h3 className="text-base font-medium text-gray-800">Confirm Test Configuration</h3>
            <p className="text-xs text-gray-500">
              In the selected parameter combinations, there are {totalCount} total runs. Each run will generate a separate image.
            </p>
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
        
        {/* Display error message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-2">{errorMessage}</div>
            </div>
          </div>
        )}
        
        {selectedNodes.length > 0 ? (
          selectedNodes.map((node, nodeIndex) => {
            const nodeType = node.type || "Unknown Node";
            const widgets = node.widgets || [];
            const nodeId = node.id;
            
            return (
              <div key={nodeIndex} className="border rounded-md mb-4 overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 border-b">
                  {nodeType} (ID: {nodeId})
                </div>
                <div className="p-4 space-y-3">
                  {widgets.map((widget: any, widgetIndex: number) => {
                    const paramName = widget.name;
                    
                    if (!selectedParams[paramName]) {
                      return null;
                    }
                    
                    const testValues = paramTestValues[nodeId]?.[paramName] || [];
                    const displayValues = Array.isArray(testValues) 
                      ? `[${testValues.join(', ')}]` 
                      : JSON.stringify(testValues);
                      
                    return (
                      <div key={widgetIndex} className={widgetIndex < widgets.length - 1 ? "flex justify-between items-center border-b pb-2" : "flex justify-between items-center"}>
                        <label className="font-medium text-gray-700 text-xs">{paramName}</label>
                        <div className="flex space-x-2 items-center">
                          <input 
                            type="text" 
                            className="w-64 h-7 border border-gray-300 rounded text-xs px-2 bg-gray-50 cursor-not-allowed text-gray-500" 
                            readOnly 
                            disabled
                            value={displayValues} 
                            onClick={(e) => e.preventDefault()}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="border rounded-md mb-4 p-4 text-center text-gray-500 text-xs">
            No nodes selected. Please select a node in the workflow to configure parameters.
          </div>
        )}
        
        <div className="mt-6 flex justify-between">
          <button
            onClick={(e) => handlePrevious(e)}
            className="px-3 py-1.5 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={(e) => handleStartGeneration(e)}
            className="px-3 py-1.5 text-xs bg-pink-200 text-pink-700 rounded-md hover:bg-pink-300 transition-colors"
          >
            Start Generation
          </button>
        </div>
      </div>
    </div>
  );
};