// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import React, { useRef, useState, useEffect } from "react";
import { DRAWER_Z_INDEX } from "./const";
import { COPILOT_EVENTS } from "./constants/events";
import logoImage from '../../assets/logo.png'; 
import { ChatProvider } from './context/ChatContext';
import { useDraggable } from './hooks/useDraggable';

const WorkflowChat = React.lazy(() => import("./workflowChat/workflowChat").then(module => ({
  default: module.default
})));

export default function App() {
  const workspaceContainerRef = useRef(null);
  const [showChat, setShowChat] = useState(false);
  const [shouldTriggerUsage, setShouldTriggerUsage] = useState(false);

  const { position, isDragging, handleMouseDown } = useDraggable({
    boundaryPadding: { right: 100, bottom: 40 }
  });

  useEffect(() => {
    const handleExplainNode = () => {
      setShowChat(true);
      setShouldTriggerUsage(true);
    };

    window.addEventListener(COPILOT_EVENTS.EXPLAIN_NODE, handleExplainNode);
    return () => window.removeEventListener(COPILOT_EVENTS.EXPLAIN_NODE, handleExplainNode);
  }, []);

  if (!position) return null;

  return (
    <ChatProvider>
      <div ref={workspaceContainerRef}>
        <div 
          className="fixed" 
          style={{ 
            zIndex: DRAWER_Z_INDEX,
            left: position.x,
            top: position.y,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <button 
            onMouseDown={handleMouseDown}
            onClick={() => setShowChat(true)}
            className="px-2 py-1 border border-gray-300 rounded-md bg-white text-black hover:bg-blue-300 hover:font-bold transition-colors select-none w-40 flex items-center space-x-1"
            style={{ marginLeft: "-40px" }}
          >
            <img 
              src={logoImage}
              alt="ComfyUI-Copilot Logo" 
              className="h-8 w-8"
            />
            <span className="text-[14px] font-medium text-gray-800">ComfyUI-Copilot</span>
          </button>
          
          <React.Suspense fallback={<div>Loading...</div>}>
            <WorkflowChat 
              onClose={() => {
                setShowChat(false);
                setShouldTriggerUsage(false);
              }}
              visible={showChat}
              triggerUsage={shouldTriggerUsage}
              onUsageTriggered={() => setShouldTriggerUsage(false)}
            />
          </React.Suspense>
        </div>
      </div>
    </ChatProvider>
  );
}
