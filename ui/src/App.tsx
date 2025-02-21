// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import React, { useRef, useState, useEffect } from "react";
import { DRAWER_Z_INDEX } from "./const";
import { COPILOT_EVENTS } from "./constants/events";
import logoImage from '../../assets/logo.png'; 
const WorkflowChat = React.lazy(() => import("./workflowChat/workflowChat").then(module => ({
  default: module.default
})));

export default function App() {
  const workspaceContainerRef = useRef(null);
  const [showChat, setShowChat] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [shouldTriggerUsage, setShouldTriggerUsage] = useState(false);

  useEffect(() => {
    const handleExplainNode = () => {
      console.log("Explain node event received");
      setShowChat(true);
      setShouldTriggerUsage(true);
    };

    window.addEventListener(COPILOT_EVENTS.EXPLAIN_NODE, handleExplainNode);
    return () => window.removeEventListener(COPILOT_EVENTS.EXPLAIN_NODE, handleExplainNode);
  }, []);

  useEffect(() => {
    setPosition({
      x: window.innerWidth - 160,
      y: 20
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const buttonRect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - buttonRect.left,
      y: e.clientY - buttonRect.top
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.min(Math.max(0, e.clientX - dragOffset.x), window.innerWidth - 100);
        const newY = Math.min(Math.max(0, e.clientY - dragOffset.y), window.innerHeight - 40);
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!position) return null;

  return (
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
          onClick={() => {
            setShowChat(true);
          }}
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
  );
}
