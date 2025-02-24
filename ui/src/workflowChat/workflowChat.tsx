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

interface WorkflowChatProps {
    onClose?: () => void;
    visible?: boolean;
    triggerUsage?: boolean;
    onUsageTriggered?: () => void;
}

export default function WorkflowChat({ onClose, visible = true, triggerUsage = false, onUsageTriggered }: WorkflowChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [latestInput, setLatestInput] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string>();
    const messageDivRef = useRef<HTMLDivElement>(null);
    const [selectedNodeInfo, setSelectedNodeInfo] = useState<any>(null);
    const [installedNodes, setInstalledNodes] = useState<any[]>([]);
    const [width, setWidth] = useState(window.innerWidth / 3);
    const [isResizing, setIsResizing] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
    const [height, setHeight] = useState<number>(window.innerHeight);
    const [topPosition, setTopPosition] = useState<number>(0);

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
            setInstalledNodes(nodes);
        };
        fetchInstalledNodes();
    }, []);

    // 获取历史消息
    const fetchMessages = async (sid: string) => {
        try {
            const data = await WorkflowChatAPI.fetchMessages(sid);
            setMessages(data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    useEffect(() => {
        let sid = localStorage.getItem("sessionId");
        if (sid) {
            setSessionId(sid);
            fetchMessages(sid);
        } else {
            sid = generateUUID();
            setSessionId(sid);
            localStorage.setItem("sessionId", sid);
        }
    }, []);

    // 使用防抖处理节点选择事件
    const handleNodeSelection = React.useCallback(() => {
        const selectedNodes = app.canvas.selected_nodes;
        if (Object.keys(selectedNodes ?? {}).length) {
            const nodeInfo = Object.values(selectedNodes)[0];
            setSelectedNodeInfo(nodeInfo);
        } else {
            setSelectedNodeInfo(null);
        }
    }, []);

    // 使用防抖优化事件处理
    const debouncedHandleNodeSelection = React.useMemo(
        () => debounce(handleNodeSelection, 100),
        [handleNodeSelection]
    );

    useEffect(() => {
        // 添加事件监听器
        document.addEventListener("click", debouncedHandleNodeSelection);

        // 清理
        return () => {
            document.removeEventListener("click", debouncedHandleNodeSelection);
            debouncedHandleNodeSelection.cancel(); // 取消未执行的防抖函数
        };
    }, [debouncedHandleNodeSelection]);

    // 使用防抖处理鼠标移动事件 - 用于更新鼠标位置
    const handleMouseMoveForPosition = React.useCallback((e: MouseEvent) => {
        document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    }, []);

    const debouncedHandleMouseMoveForPosition = React.useMemo(
        () => debounce(handleMouseMoveForPosition, 16), // 约60fps
        [handleMouseMoveForPosition]
    );

    useEffect(() => {
        document.addEventListener('mousemove', debouncedHandleMouseMoveForPosition);
        return () => {
            document.removeEventListener('mousemove', debouncedHandleMouseMoveForPosition);
            debouncedHandleMouseMoveForPosition.cancel();
        };
    }, [debouncedHandleMouseMoveForPosition]);

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
        if ((input.trim() === "" && !selectedNodeInfo) || !sessionId) return;
        setLoading(true);
        setLatestInput(input);
        
        const traceId = generateUUID(); // Generate trace_id for this request

        const userMessage: Message = {
            id: generateUUID(),
            role: "user",
            content: input,
            trace_id: traceId, // Add trace_id to user message
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");

        try {
            // Create ext array with model selection
            const modelExt = { type: "model_select", data: [selectedModel] };
            
            for await (const response of WorkflowChatAPI.streamInvokeServer(
                sessionId, 
                input, 
                uploadedImages.map(img => img.file),
                null,  // intent
                modelExt,  // ext
                traceId  // Pass trace_id to API call
            )) {
                const aiMessage: Message = {
                    id: generateUUID(),
                    role: "ai",
                    content: JSON.stringify(response),
                    type: response.type,
                    format: response.format,
                    finished: response.finished,
                    name: "Assistant"
                };

                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.role === 'ai') {
                        return [...prev.slice(0, -1), aiMessage];
                    }
                    return [...prev, aiMessage];
                });

                if (response.finished) {
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setLoading(false);
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
        setMessages([]);
        localStorage.removeItem("sessionId");
        const newSessionId = generateUUID();
        setSessionId(newSessionId);
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
        if (!sessionId || !selectedNodeInfo) return;
        setLoading(true);

        const traceId = generateUUID(); // Generate trace_id for this request

        const userMessage: Message = {
            id: generateUUID(),
            role: "user",
            content: selectedNodeInfo.comfyClass || selectedNodeInfo.type,
            trace_id: traceId, // Add trace_id to user message
        };

        setMessages(prev => [...prev, userMessage]);

        try {
            for await (const response of WorkflowChatAPI.streamInvokeServer(
                sessionId, 
                selectedNodeInfo.comfyClass || selectedNodeInfo.type, 
                [], 
                intent, 
                ext,
                traceId // Pass trace_id to API call
            )) {
                const aiMessage: Message = {
                    id: generateUUID(),
                    role: "ai",
                    content: JSON.stringify(response),
                    format: response.format,
                    finished: response.finished,
                    name: "Assistant"
                };

                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.role === 'ai') {
                        return [...prev.slice(0, -1), aiMessage];
                    }
                    return [...prev, aiMessage];
                });

                if (response.finished) {
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setLoading(false);
        }
    };

    const handleAddMessage = (message: Message) => {
        console.log('[WorkflowChat] Adding new message:', message);
        setMessages(prev => {
            const newMessages = [...prev, message];
            console.log('[WorkflowChat] Updated messages:', newMessages);
            return newMessages;
        });
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

    const handleHeightResize = (deltaY: number) => {
        setHeight(prevHeight => {
            const newHeight = prevHeight - deltaY;
            // 限制最小高度为 300px，最大高度为窗口高度
            return Math.min(Math.max(300, newHeight), window.innerHeight);
        });
        
        setTopPosition(prevTop => {
            const newTop = prevTop + deltaY;
            // 确保不会超出屏幕顶部
            return Math.max(0, newTop);
        });
    };

    return (
        <div 
            className="fixed right-0 shadow-lg bg-white
                      transition-transform duration-200 ease-out"
            style={{ 
                display: visible ? 'block' : 'none',
                width: `${width}px`,
                height: `${height}px`,
                top: `${topPosition}px`
            }}
        >
            <div
                className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-gray-300"
                onMouseDown={handleMouseDown}
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
                    {selectedNodeInfo && (
                        <SelectedNodeInfo 
                            nodeInfo={selectedNodeInfo}
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