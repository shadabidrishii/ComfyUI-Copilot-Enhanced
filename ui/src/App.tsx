/*
 * @Author: ai-business-hql ai.bussiness.hql@gmail.com
 * @Date: 2025-04-21 11:01:32
 * @LastEditors: ai-business-hql ai.bussiness.hql@gmail.com
 * @LastEditTime: 2025-04-21 11:44:43
 * @FilePath: /comfyui_copilot/ui/src/App.tsx
 */
// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import React, { useState, useEffect, Suspense } from "react";
import { COPILOT_EVENTS } from "./constants/events";
import { ChatProvider } from './context/ChatContext';

const WorkflowChat = React.lazy(() => import("./workflowChat/workflowChat").then(module => ({
  default: module.default
})));

export default function App() {
  const [shouldTriggerUsage, setShouldTriggerUsage] = useState(false);

  useEffect(() => {
    const handleExplainNode = () => {
      setShouldTriggerUsage(true);
    };

    window.addEventListener(COPILOT_EVENTS.EXPLAIN_NODE, handleExplainNode);
    return () => window.removeEventListener(COPILOT_EVENTS.EXPLAIN_NODE, handleExplainNode);
  }, []);

  return (
    <ChatProvider>
      <div className="h-full w-full flex flex-col">
        <Suspense fallback={<div className="h-full w-full flex items-center justify-center">Loading...</div>}>
          <WorkflowChat 
            visible={true}
            triggerUsage={shouldTriggerUsage}
            onUsageTriggered={() => setShouldTriggerUsage(false)}
          />
        </Suspense>
      </div>
    </ChatProvider>
  );
}
