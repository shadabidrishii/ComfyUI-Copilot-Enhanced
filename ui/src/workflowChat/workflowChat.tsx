/*
 * @Author: ai-business-hql ai.bussiness.hql@gmail.com
 * @Date: 2025-03-20 15:15:20
 * @LastEditors: ai-business-hql ai.bussiness.hql@gmail.com
 * @LastEditTime: 2025-03-20 17:50:09
 * @FilePath: /comfyui_copilot/ui/src/workflowChat/workflowChat.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Message } from "../types/types";
import { WorkflowChatAPI } from "../apis/workflowChatApi";
import { app } from "../utils/comfyapp";
import { ChatHeader } from "../components/chat/ChatHeader";
import { ChatInput } from "../components/chat/ChatInput";
import { SelectedNodeInfo } from "../components/chat/SelectedNodeInfo";
import { MessageList } from "../components/chat/MessageList";
import { generateUUID } from "../utils/uuid";
import { getInstalledNodes } from "../apis/comfyApiCustom";
import { UploadedImage } from '../components/chat/ChatInput';
import React from "react";
import { debounce } from "lodash";
import { useChatContext } from '../context/ChatContext';
import { useMousePosition } from '../hooks/useMousePosition';
import { useResizable } from '../hooks/useResizable';
import { useNodeSelection } from '../hooks/useNodeSelection';
import { MemoizedReactMarkdown } from "../components/markdown";
import remarkGfm from 'remark-gfm';
import rehypeExternalLinks from 'rehype-external-links';

// Define the Tab type - We should import this from context to ensure consistency
import type { TabType } from '../context/ChatContext';

interface WorkflowChatProps {
    onClose?: () => void;
    visible?: boolean;
    triggerUsage?: boolean;
    onUsageTriggered?: () => void;
}

// 优化公告组件样式 - 更加美观和专业，支持Markdown
const Announcement = ({ message, onClose }: { message: string, onClose: () => void }) => {
    if (!message) return null;
    
    return (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200 px-5 py-2 mt-2 relative shadow-sm">
            <div className="flex items-center">
                <div className="flex-shrink-0 mr-2">
                    <svg className="w-3.5 h-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                </div>
                <div className="text-amber-800 font-medium leading-relaxed pr-6 markdown-content" style={{ fontSize: '11px' }}>
                    <MemoizedReactMarkdown
                        rehypePlugins={[
                            [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }]
                        ]}
                        remarkPlugins={[remarkGfm]}
                        className="prose !text-[11px] prose-a:text-amber-700 prose-a:underline prose-a:font-medium hover:prose-a:text-amber-800"
                        components={{
                            a: ({ node, ...props }) => (
                                <a {...props} className="text-amber-700 underline hover:text-amber-800 transition-colors" style={{ fontSize: '11px' }} />
                            ),
                            p: ({ children }) => (
                                <span className="inline" style={{ fontSize: '11px' }}>{children}</span>
                            ),
                            // Add explicit styling for all text elements
                            span: ({ children }) => (
                                <span style={{ fontSize: '11px' }}>{children}</span>
                            ),
                            li: ({ children }) => (
                                <li style={{ fontSize: '11px' }}>{children}</li>
                            ),
                            ul: ({ children }) => (
                                <ul style={{ fontSize: '11px' }}>{children}</ul>
                            ),
                            ol: ({ children }) => (
                                <ol style={{ fontSize: '11px' }}>{children}</ol>
                            )
                        }}
                    >
                        {message}
                    </MemoizedReactMarkdown>
                </div>
            </div>
            <button 
                onClick={onClose}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-700 transition-colors p-1 rounded-full hover:bg-amber-200/50"
                aria-label="Close announcement"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

// Parameter Debug Tab Component
const ParameterDebugTab = () => {
    const { state } = useChatContext();
    const { selectedNode } = state;
    const selectedNodes = selectedNode ? selectedNode : [];
    
    const ParameterDebugInterface = React.lazy(() => 
      import("../components/debug/ParameterDebugInterface").then(module => ({
          default: module.ParameterDebugInterface
      }))
    );
    
    return (
        <div className="flex-1 flex flex-col overflow-y-auto">
            <React.Suspense fallback={<div>Loading...</div>}>
                <ParameterDebugInterface selectedNodes={selectedNodes} visible={true} />
            </React.Suspense>
        </div>
    );
};

// Tab component
const TabButton = ({ 
    active, 
    onClick, 
    children 
}: { 
    active: boolean; 
    onClick: () => void; 
    children: React.ReactNode 
}) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-medium text-sm transition-colors duration-200 ${
            active 
                ? "text-blue-600 border-b-2 border-blue-600" 
                : "text-gray-600 hover:text-blue-500 hover:border-b-2 hover:border-blue-300"
        }`}
    >
        {children}
    </button>
);

export default function WorkflowChat({ onClose, visible = true, triggerUsage = false, onUsageTriggered }: WorkflowChatProps) {
    const { state, dispatch } = useChatContext();
    const { messages, installedNodes, loading, sessionId, selectedNode, activeTab } = state;
    const messageDivRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState<string>('');
    const [latestInput, setLatestInput] = useState<string>('');
    const [width, setWidth] = useState(window.innerWidth / 3);
    const [isResizing, setIsResizing] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
    const [height, setHeight] = useState<number>(window.innerHeight);
    const [topPosition, setTopPosition] = useState<number>(0);
    // 添加公告状态
    const [announcement, setAnnouncement] = useState<string>('');
    const [showAnnouncement, setShowAnnouncement] = useState<boolean>(false);

    // 使用自定义 hooks，只在visible为true且activeTab为chat时启用
    useMousePosition(visible && activeTab === 'chat');
    useNodeSelection(visible);
    const { 
        isResizing: resizableIsResizing, 
        setIsResizing: resizableSetIsResizing, 
        dimensions, 
        handleHeightResize 
    } = useResizable({
        minWidth: 300,
        maxWidth: window.innerWidth * 0.8,
        minHeight: 300,
        maxHeight: window.innerHeight
    }, visible);

    useEffect(() => {
        if (messageDivRef.current) {
            messageDivRef.current.scrollTop = messageDivRef.current.scrollHeight
        }
    }, [messages])

    useEffect(() => {
        if (activeTab !== 'chat') return;
        
        const fetchInstalledNodes = async () => {
            const nodes = await getInstalledNodes();
            console.log('[WorkflowChat] Received installed nodes:', nodes.length);
            dispatch({ type: 'SET_INSTALLED_NODES', payload: nodes });
        };
        fetchInstalledNodes();
    }, [activeTab]);

    // 获取历史消息
    const fetchMessages = async (sid: string) => {
        try {
            const data = await WorkflowChatAPI.fetchMessages(sid);
            dispatch({ type: 'SET_MESSAGES', payload: data });
            // Note: The localStorage cache is already updated in the fetchMessages API function
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    useEffect(() => {
        if (activeTab !== 'chat') return;
        
        let sid = localStorage.getItem("sessionId");
        if (sid) {
            dispatch({ type: 'SET_SESSION_ID', payload: sid });
            fetchMessages(sid);
        } else {
            sid = generateUUID();
            dispatch({ type: 'SET_SESSION_ID', payload: sid });
            localStorage.setItem("sessionId", sid);
        }
    }, [activeTab]);

    // 使用防抖处理宽度调整
    const handleMouseMoveForResize = React.useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        
        const newWidth = window.innerWidth - e.clientX;
        const clampedWidth = Math.min(
            Math.max(300, newWidth),
            window.innerWidth * 0.8
        );
        
        setWidth(clampedWidth);
    }, [isResizing]);

    const debouncedHandleMouseMoveForResize = React.useMemo(
        () => debounce(handleMouseMoveForResize, 16),
        [handleMouseMoveForResize]
    );

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', debouncedHandleMouseMoveForResize);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', debouncedHandleMouseMoveForResize);
            document.removeEventListener('mouseup', handleMouseUp);
            debouncedHandleMouseMoveForResize.cancel();
        };
    }, [isResizing, debouncedHandleMouseMoveForResize]);

    const handleMessageChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(event.target.value);
    }


    const handleSendMessage = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        if ((input.trim() === "" && !selectedNode) || !sessionId) return;
        setLatestInput(input);
        
        const traceId = generateUUID();

        const userMessage: Message = {
            id: generateUUID(),
            role: "user",
            content: input,
            trace_id: traceId,
        };

        dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
        setInput("");

        try {
            const modelExt = { type: "model_select", data: [selectedModel] };
            let aiMessageId = generateUUID(); // 生成一个固定的消息ID
            let isFirstResponse = true;

            for await (const response of WorkflowChatAPI.streamInvokeServer(
                sessionId, 
                input, 
                uploadedImages.map(img => img.file),
                null,
                modelExt,
                traceId
            )) {
                const aiMessage: Message = {
                    id: aiMessageId,
                    role: "ai",
                    content: JSON.stringify(response),
                    format: response.format,
                    finished: response.finished,
                    name: "Assistant"
                };

                if (isFirstResponse) {
                    dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });
                    isFirstResponse = false;
                } else {
                    dispatch({ type: 'UPDATE_MESSAGE', payload: aiMessage });
                    // Update localStorage cache
                    const updatedMessages = state.messages.map(msg => 
                        msg.id === aiMessage.id && !msg.finished ? aiMessage : msg
                    );
                    updateMessagesCache(updatedMessages);
                }

                if (response.finished) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            dispatch({ type: 'SET_LOADING', payload: false });
        } finally {
            setUploadedImages([]);
        }
    };

    const handleSendMessageWithContent = async (content: string) => {
        if (!sessionId) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        setLatestInput(content);
        
        const traceId = generateUUID();

        const userMessage: Message = {
            id: generateUUID(),
            role: "user",
            content: content,
            trace_id: traceId,
        };

        dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

        try {
            const modelExt = { type: "model_select", data: [selectedModel] };
            let aiMessageId = generateUUID();
            let isFirstResponse = true;

            for await (const response of WorkflowChatAPI.streamInvokeServer(
                sessionId, 
                content, 
                uploadedImages.map(img => img.file),
                null,
                modelExt,
                traceId
            )) {
                const aiMessage: Message = {
                    id: aiMessageId,
                    role: "ai",
                    content: JSON.stringify(response),
                    format: response.format,
                    finished: response.finished,
                    name: "Assistant"
                };

                if (isFirstResponse) {
                    dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });
                    isFirstResponse = false;
                } else {
                    dispatch({ type: 'UPDATE_MESSAGE', payload: aiMessage });
                    // Update localStorage cache
                    const updatedMessages = state.messages.map(msg => 
                        msg.id === aiMessage.id && !msg.finished ? aiMessage : msg
                    );
                    updateMessagesCache(updatedMessages);
                }

                if (response.finished) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            dispatch({ type: 'SET_LOADING', payload: false });
        } finally {
            setUploadedImages([]);
        }
    };

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.metaKey && event.key === "Enter") {
            handleSendMessage();
        }
    }

    const handleClearMessages = () => {
        dispatch({ type: 'CLEAR_MESSAGES' });
        // Remove old session data
        const oldSessionId = state.sessionId;
        if (oldSessionId) {
            localStorage.removeItem(`messages_${oldSessionId}`);
        }
        localStorage.removeItem("sessionId");
        
        // Create new session
        const newSessionId = generateUUID();
        dispatch({ type: 'SET_SESSION_ID', payload: newSessionId });
        localStorage.setItem("sessionId", newSessionId);
    };

    const avatar = (name?: string) => {
        return `https://ui-avatars.com/api/?name=${name || 'User'}&background=random`;
    }

    const handleClose = () => {
        onClose?.();
    };

    const handleOptionClick = (option: string) => {
        setInput(option);
    };

    const handleSendMessageWithIntent = async (intent: string, ext?: any) => {
        if (!sessionId || !selectedNode) return;
        dispatch({ type: 'SET_LOADING', payload: true });

        const traceId = generateUUID();
        const userMessage: Message = {
            id: generateUUID(),
            role: "user",
            content: selectedNode.comfyClass || selectedNode.type,
            trace_id: traceId,
        };

        dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

        try {
            let aiMessageId = generateUUID();
            let isFirstResponse = true;

            for await (const response of WorkflowChatAPI.streamInvokeServer(
                sessionId, 
                selectedNode.comfyClass || selectedNode.type,
                [], 
                intent, 
                ext,
                traceId
            )) {
                const aiMessage: Message = {
                    id: aiMessageId,
                    role: "ai",
                    content: JSON.stringify(response),
                    format: response.format,
                    finished: response.finished,
                    name: "Assistant",
                };
                if (intent && intent !== '') {
                    aiMessage.metadata = {
                        intent: intent
                    }
                }

                if (isFirstResponse) {
                    dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });
                    isFirstResponse = false;
                } else {
                    dispatch({ type: 'UPDATE_MESSAGE', payload: aiMessage });
                    // Update localStorage cache
                    const updatedMessages = state.messages.map(msg => 
                        msg.id === aiMessage.id && !msg.finished ? aiMessage : msg
                    );
                    updateMessagesCache(updatedMessages);
                }

                if (response.finished) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    // Utility function to update localStorage cache for messages
    const updateMessagesCache = (messages: Message[]) => {
        if (state.sessionId) {
            localStorage.setItem(`messages_${state.sessionId}`, JSON.stringify(messages));
        }
    };

    const handleAddMessage = (message: Message) => {
        console.log('[WorkflowChat] Adding new message:', message);
        const updatedMessages = [...state.messages, message];
        dispatch({ type: 'ADD_MESSAGE', payload: message });
        
        // Update the localStorage cache with the new message
        updateMessagesCache(updatedMessages);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    const handleUploadImages = (files: FileList) => {
        const newImages = Array.from(files).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file)
        }));
        setUploadedImages(prev => [...prev, ...newImages]);
    };

    const handleRemoveImage = (imageId: string) => {
        setUploadedImages(prev => {
            const newImages = prev.filter(img => img.id !== imageId);
            return newImages;
        });
    };

    React.useEffect(() => {
        return () => {
            uploadedImages.forEach(image => URL.revokeObjectURL(image.preview));
        };
    }, [uploadedImages]);

    useEffect(() => {
        if (triggerUsage && onUsageTriggered && activeTab === 'chat') {
            handleSendMessageWithIntent('node_explain');
            onUsageTriggered();
        }
    }, [triggerUsage, activeTab]);

    // 获取公告内容
    useEffect(() => {
        if (!visible || activeTab !== 'chat') return;
        
        const fetchAnnouncement = async () => {
            try {
                // 检查今天是否已经显示过公告
                const today = new Date().toDateString();
                const lastShownDate = localStorage.getItem('announcementLastShownDate');
                
                // 如果今天没有显示过公告，则显示
                if (lastShownDate !== today) {
                    const message = await WorkflowChatAPI.fetchAnnouncement();
                    if (message && message.trim() !== '') {
                        setAnnouncement(message);
                        setShowAnnouncement(true);
                        // 记录今天的日期
                        localStorage.setItem('announcementLastShownDate', today);
                    }
                }
            } catch (error) {
                console.error('Error fetching announcement:', error);
            }
        };
        
        fetchAnnouncement();
    }, [visible, activeTab]);

    // 关闭公告
    const handleCloseAnnouncement = () => {
        setShowAnnouncement(false);
    };

    // Handle tab change
    const handleTabChange = (tab: TabType) => {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
    };

    return (
        <div 
            className="fixed right-0 shadow-lg bg-white duration-200 ease-out"
            style={{ 
                display: visible ? 'block' : 'none',
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                top: `${dimensions.top}px`
            }}
        >
            <div
                className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-gray-300"
                onMouseDown={(e) => {
                    resizableSetIsResizing(true);
                    e.preventDefault();
                }}
            />
            
            <div className="flex h-full flex-col">
                <ChatHeader 
                    onClose={onClose}
                    onClear={handleClearMessages}
                    hasMessages={messages.length > 0}
                    onHeightResize={handleHeightResize}
                    title={`ComfyUI-Copilot`}
                />
                
                {/* Tab navigation */}
                <div className="flex border-b border-gray-200 mt-2">
                    <TabButton 
                        active={activeTab === 'chat'}
                        onClick={() => handleTabChange('chat')}
                    >
                        Chat
                    </TabButton>
                    <TabButton 
                        active={activeTab === 'parameter-debug'}
                        onClick={() => handleTabChange('parameter-debug')}
                    >
                        Parameter Lab
                    </TabButton>
                </div>
                
                {/* 将公告移到 ChatHeader 下方和Tab导航下方 */}
                {showAnnouncement && announcement && activeTab === 'chat' && (
                    <Announcement 
                        message={announcement} 
                        onClose={handleCloseAnnouncement} 
                    />
                )}
                
                {/* Tab content */}
                {activeTab === 'chat' ? (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 scroll-smooth" ref={messageDivRef}>
                            <MessageList 
                                messages={messages}
                                latestInput={latestInput}
                                onOptionClick={handleOptionClick}
                                installedNodes={installedNodes}
                                onAddMessage={handleAddMessage}
                                loading={loading}
                            />
                        </div>

                        <div className="border-t px-4 py-3 border-gray-200 bg-white sticky bottom-0">
                            {selectedNode && (
                                <SelectedNodeInfo 
                                    nodeInfo={selectedNode}
                                    onSendWithIntent={handleSendMessageWithIntent}
                                    loading={loading}
                                    onSendWithContent={handleSendMessageWithContent}
                                />
                            )}

                            <ChatInput 
                                input={input}
                                loading={loading}
                                onChange={handleMessageChange}
                                onSend={handleSendMessage}
                                onKeyPress={handleKeyPress}
                                onUploadImages={handleUploadImages}
                                uploadedImages={uploadedImages}
                                onRemoveImage={handleRemoveImage}
                                selectedModel={selectedModel}
                                onModelChange={setSelectedModel}
                            />
                        </div>
                    </>
                ) : (
                    <ParameterDebugTab />
                )}
            </div>
        </div>
    );
}