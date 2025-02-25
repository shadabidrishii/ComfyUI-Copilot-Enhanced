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

interface WorkflowChatProps {
    onClose?: () => void;
    visible?: boolean;
    triggerUsage?: boolean;
    onUsageTriggered?: () => void;
}

export default function WorkflowChat({ onClose, visible = true, triggerUsage = false, onUsageTriggered }: WorkflowChatProps) {
    const { state, dispatch } = useChatContext();
    const { messages, installedNodes, loading, sessionId, selectedNode } = state;
    const messageDivRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState<string>('');
    const [latestInput, setLatestInput] = useState<string>('');
    const [width, setWidth] = useState(window.innerWidth / 3);
    const [isResizing, setIsResizing] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
    const [height, setHeight] = useState<number>(window.innerHeight);
    const [topPosition, setTopPosition] = useState<number>(0);

    // 使用自定义 hooks，只在visible为true时启用
    useMousePosition(visible);
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
        const fetchInstalledNodes = async () => {
            console.log('[WorkflowChat] Fetching installed nodes');
            const nodes = await getInstalledNodes();
            console.log('[WorkflowChat] Received installed nodes:', nodes);
            dispatch({ type: 'SET_INSTALLED_NODES', payload: nodes });
        };
        fetchInstalledNodes();
    }, []);

    // 获取历史消息
    const fetchMessages = async (sid: string) => {
        try {
            const data = await WorkflowChatAPI.fetchMessages(sid);
            dispatch({ type: 'SET_MESSAGES', payload: data });
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    useEffect(() => {
        let sid = localStorage.getItem("sessionId");
        if (sid) {
            dispatch({ type: 'SET_SESSION_ID', payload: sid });
            fetchMessages(sid);
        } else {
            sid = generateUUID();
            dispatch({ type: 'SET_SESSION_ID', payload: sid });
            localStorage.setItem("sessionId", sid);
        }
    }, []);

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

            // 添加初始AI消息
            const initialAiMessage: Message = {
                id: aiMessageId,
                role: "ai",
                content: "",
                type: "stream",
                format: "markdown",
                finished: false,
                name: "Assistant"
            };
            dispatch({ type: 'ADD_MESSAGE', payload: initialAiMessage });
            
            for await (const response of WorkflowChatAPI.streamInvokeServer(
                sessionId, 
                input, 
                uploadedImages.map(img => img.file),
                null,
                modelExt,
                traceId
            )) {
                const aiMessage: Message = {
                    id: aiMessageId, // 使用相同的消息ID
                    role: "ai",
                    content: JSON.stringify(response),
                    type: response.type,
                    format: response.format,
                    finished: response.finished,
                    name: "Assistant"
                };

                dispatch({ type: 'UPDATE_MESSAGE', payload: aiMessage });

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
        localStorage.removeItem("sessionId");
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
            const initialAiMessage: Message = {
                id: aiMessageId,
                role: "ai",
                content: "",
                format: "markdown",
                finished: false,
                name: "Assistant"
            };
            dispatch({ type: 'ADD_MESSAGE', payload: initialAiMessage });

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
                    name: "Assistant"
                };

                dispatch({ type: 'UPDATE_MESSAGE', payload: aiMessage });

                if (response.finished) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleAddMessage = (message: Message) => {
        console.log('[WorkflowChat] Adding new message:', message);
        dispatch({ type: 'ADD_MESSAGE', payload: message });
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
        if (triggerUsage && onUsageTriggered) {
            handleSendMessageWithIntent('node_explain');
            onUsageTriggered();
        }
    }, [triggerUsage]);

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
                />
                <div>
                    {installedNodes.map((node: any) => (
                        <div key={node.name}>{node.name}</div>
                    ))}
                </div>
                
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
            </div>
        </div>
    );
}