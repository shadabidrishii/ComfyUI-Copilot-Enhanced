import React, { useState, useEffect, useRef } from 'react';
import { getOnlyOneImageNode, getOutputImageByPromptId, queuePrompt } from '../../utils/queuePrompt';
import { app } from '../../utils/comfyapp';
import { interruptProcessing, manageQueue } from '../../apis/comfyApiCustom';
import { useChatContext } from '../../context/ChatContext';
import { WorkflowChatAPI } from '../../apis/workflowChatApi';
import { InitialScreen } from './screens/InitialScreen';
import { ConfigureParameterScreen } from './screens/ConfigureParameterScreen';
import { ConfirmConfigurationScreen } from './screens/ConfirmConfigurationScreen';
import { ProcessingScreen } from './screens/ProcessingScreen';
import { ResultGalleryScreen } from './screens/ResultGalleryScreen';
import { AIWritingModal } from './modals/AIWritingModal';
import { ImageModal } from './modals/ImageModal';
import { generateDynamicParams, generateParameterCombinations } from './utils/parameterUtils';
import { WidgetParamConf } from './utils/parameterUtils';
import { generateUUID } from '../../utils/uuid';

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

  // Add a ref to store the polling timeout
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Add a ref to track the current polling session ID
  const pollingSessionIdRef = useRef<string | null>(null);

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

  // Navigate to next screen
  const handleNext = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // When moving from screen 0 to screen 1, clean up paramTestValues for unselected parameters
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
    
    // When moving to the confirmation screen, ensure all text values are properly synchronized
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

  // Handle parameter selection
  const handleParamSelect = (param: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const isCurrentlySelected = selectedParams[param];
    
    // Update the selected params state
    setSelectedParams(prev => ({
      ...prev,
      [param]: !isCurrentlySelected
    }));
    
    // If we're deselecting a parameter, remove its values from paramTestValues
    if (isCurrentlySelected) {
      // Make a copy of the current paramTestValues
      const updatedParamTestValues = { ...paramTestValues };
      
      // For each node
      Object.keys(updatedParamTestValues).forEach(nodeId => {
        // If this parameter exists in this node, remove it
        if (updatedParamTestValues[nodeId][param]) {
          delete updatedParamTestValues[nodeId][param];
        }
      });
      
      // Update the state with cleaned up values
      setParamTestValues(updatedParamTestValues);
    }
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

  // Handle page change
  const handlePageChange = (newPage: number, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setCurrentPage(Math.max(1, Math.min(newPage, Math.ceil(generatedImages.length / imagesPerPage))));
  };

  // Handle polling cleanup function
  const cleanupPolling = () => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    pollingSessionIdRef.current = null;
  };

  // Add useEffect cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPolling();
    };
  }, []);

  // Handle start generation - modified to clean up before starting
  const handleStartGeneration = async (event?: React.MouseEvent, selectedNodeId?: number) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Clean up any existing polling
    cleanupPolling();
    
    // Get parameter combinations
    const paramCombinations = generateParameterCombinations(paramTestValues);
    const totalCombinations = paramCombinations.length;
    
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
    
    // Get node ID to use for showing images - use provided selectedNodeId if available
    let showNodeId: number | null = selectedNodeId || null;
    
    // If no selectedNodeId provided, try to get one automatically
    if (showNodeId === null) {
      const nodeId = getOnlyOneImageNode();
      if (nodeId !== null) {
        showNodeId = nodeId;
      }
    }
    
    // If showNodeId is null, we need user selection (handled in ConfirmConfigurationScreen)
    if (showNodeId === null) {
      setErrorMessage("Please select a SaveImage or PreviewImage node first.");
      setIsProcessing(false);
      return;
    }
    
    const prompt_ids: string[] = [];
    try {
      // Generate a unique session ID
      const sessionId = Date.now().toString();
      pollingSessionIdRef.current = sessionId;
      
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
        // Check if this polling session is still active
        if (pollingSessionIdRef.current !== sessionId) {
          console.log("Another polling session has started, stopping this one");
          return;
        }
        
        // Check if timeout has been reached
        if (Date.now() - startTime > timeoutDuration) {
          console.log("Timeout reached while waiting for images");
          if (pollingSessionIdRef.current === sessionId) {
            setIsProcessing(false);
            setIsCompleted(true);
            setCurrentPage(1);
          }
          return;
        }
        
        let completedImagesCount = 0;
        
        // Check each prompt id to see if images are ready
        for (let i = 0; i < prompt_ids.length; i++) {
          const promptId = prompt_ids[i];
          if (!promptId) continue;
          
          try {
            // We've already verified showNodeId is not null at this point
            const imageUrl = await getOutputImageByPromptId(promptId, Number(showNodeId));
            
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
        
        // Only update state if this polling session is still active
        if (pollingSessionIdRef.current === sessionId) {
          // Update the images in state
          setGeneratedImages([...newImages]);
          
          // Update the completed count
          setCompletedCount(completedImagesCount);
          
          // If all images are ready or timeout occurred, we're done
          if (completedImagesCount === prompt_ids.length) {
            console.log("All images ready, completing session");
            setIsProcessing(false);
            setIsCompleted(true);
            setCurrentPage(1);
          } else {
            // Otherwise, poll again in 3 seconds
            pollingTimeoutRef.current = setTimeout(pollForImages, 3000);
          }
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
  const handleApplySelected = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (selectedImageIndex !== null) {
      console.log(`Applied image ${selectedImageIndex + 1} with parameters:`, generatedImages[selectedImageIndex].params);

      // 发送埋点事件
      WorkflowChatAPI.trackEvent({
          event_type: 'parameter_debug_apply',
          message_type: 'parameter_debug',
          message_id: generateUUID(),
          data: {
              workflow: (await app.graphToPrompt()).output,
              selected_params: generatedImages[selectedImageIndex].params,
              all_params: paramTestValues,
              count: Object.keys(paramTestValues).length
          }
      });

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
      const removedNode = newSelectedNodes[nodeIndex];
      newSelectedNodes.splice(nodeIndex, 1);
      
      // Also remove the parameter test values for the removed node
      if (removedNode) {
        const removedNodeId = removedNode.id.toString();
        setParamTestValues(prev => {
          const updated = { ...prev };
          delete updated[removedNodeId];
          return updated;
        });
      }
      
      // If no nodes left, return to original screen
      if (newSelectedNodes.length === 0) {
        if (onClose) {
          // Clear screen state from context when closing
          dispatch({ type: 'SET_SCREEN_STATE', payload: null });
          // Clear all state variables
          resetAllStates();
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
      // Clear all state variables
      resetAllStates();
      // Use the provided onClose callback
      onClose();
    } else {
      // For users of this component without a callback
      // Reset all states
      resetAllStates();
    }
  };

  // Helper function to reset all state variables
  const resetAllStates = () => {
    setCurrentScreen(0);
    setSelectedParams({
      Steps: true,
      CFG: true,
      sampler_name: true,
      threshold: false,
      prompt: false
    });
    cleanupPolling(); // Add cleanup call
    setIsProcessing(false);
    setIsCompleted(false);
    setCompletedCount(0);
    setTotalCount(12);
    setSelectedImageIndex(null);
    setGeneratedImages(Array(12).fill(null).map((_, i) => ({
      url: `https://source.unsplash.com/random/300x300?sig=${Math.random()}`,
      params: {
        step: i % 3 === 0 ? 5 : i % 3 === 1 ? 10 : 15,
        sampler_name: 'euler',
        cfg: 1
      }
    })));
    setParamTestValues({});
    setOpenDropdowns({});
    setSearchTerms({});
    setInputValues({});
    setCurrentPage(1);
    setErrorMessage(null);
    setNotificationVisible(false);
    setModalVisible(false);
    setModalImageUrl('');
    // Completely reset text inputs to ensure clean state on next run
    setTextInputs({});
    setAiWritingModalVisible(false);
    setAiWritingModalText('');
    setAiGeneratedTexts([]);
    setAiWritingLoading(false);
    setAiWritingNodeId('');
    setAiWritingParamName('');
    setAiWritingError(null);
    setAiSelectedTexts({});
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
    return (
      <div 
        className="flex-1 overflow-y-auto bg-gray-50 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <ResultGalleryScreen 
          generatedImages={generatedImages}
          selectedImageIndex={selectedImageIndex}
          handleSelectImage={handleSelectImage}
          handleApplySelected={handleApplySelected}
          handlePrevious={handlePrevious}
          handleClose={handleClose}
          currentPage={currentPage}
          handlePageChange={handlePageChange}
          imagesPerPage={imagesPerPage}
          notificationVisible={notificationVisible}
          modalVisible={modalVisible}
          modalImageUrl={modalImageUrl}
          openImageModal={openImageModal}
          closeImageModal={closeImageModal}
        />
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
        <ProcessingScreen 
          selectedNodes={selectedNodes}
          paramTestValues={paramTestValues}
          selectedParams={selectedParams}
          totalCount={totalCount}
          completedCount={completedCount}
          errorMessage={errorMessage}
          handleClose={handleClose}
          setIsProcessing={setIsProcessing}
          setCurrentScreen={setCurrentScreen}
          cleanupPolling={cleanupPolling}
        />
      </div>
    );
  }

  // Screen 1: Select parameters
  if (currentScreen === 0) {
    return (
      <div 
        className="flex-1 overflow-y-auto bg-gray-50 p-4 flex flex-col h-full max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <InitialScreen 
          selectedNodes={selectedNodes}
          handleParamSelect={handleParamSelect}
          selectedParams={selectedParams}
          handleNext={handleNext}
          handleClose={handleClose}
        />
      </div>
    );
  }

  // Screen 2: Configure parameter options
  if (currentScreen === 1) {
    return (
      <div 
        className="flex-1 overflow-y-auto bg-gray-50 p-4 flex flex-col h-full max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <ConfigureParameterScreen 
          selectedNodes={selectedNodes}
          paramTestValues={paramTestValues}
          selectedParams={selectedParams}
          updateParamTestValues={updateParamTestValues}
          toggleDropdown={toggleDropdown}
          openDropdowns={openDropdowns}
          handleTestValueSelect={handleTestValueSelect}
          searchTerms={searchTerms}
          handleSearch={handleSearch}
          handleSelectAll={handleSelectAll}
          handleNext={handleNext}
          handlePrevious={handlePrevious}
          handleClose={handleClose}
          inputValues={inputValues}
          setInputValues={setInputValues}
          textInputs={textInputs}
          handleTextInputChange={handleTextInputChange}
          handleAddTextInput={handleAddTextInput}
          handleRemoveTextInput={handleRemoveTextInput}
          openAiWritingModal={openAiWritingModal}
        />
        
        {/* AI Writing Modal */}
        <AIWritingModal 
          visible={aiWritingModalVisible}
          aiWritingModalText={aiWritingModalText}
          setAiWritingModalText={setAiWritingModalText}
          aiGeneratedTexts={aiGeneratedTexts}
          aiSelectedTexts={aiSelectedTexts}
          aiWritingLoading={aiWritingLoading}
          aiWritingError={aiWritingError}
          handleAiWriting={handleAiWriting}
          toggleTextSelection={toggleTextSelection}
          addSelectedTexts={addSelectedTexts}
          onClose={() => setAiWritingModalVisible(false)}
        />
      </div>
    );
  }

  // Screen 3: Final configuration
  return (
    <div 
      className="flex-1 overflow-y-auto bg-gray-50 p-4 flex flex-col h-full max-h-[80vh]"
      onClick={(e) => e.stopPropagation()}
    >
      <ConfirmConfigurationScreen 
        selectedNodes={selectedNodes}
        paramTestValues={paramTestValues}
        selectedParams={selectedParams}
        totalCount={totalCount}
        errorMessage={errorMessage}
        handlePrevious={handlePrevious}
        handleStartGeneration={handleStartGeneration}
        handleClose={handleClose}
      />
    </div>
  );
}; 