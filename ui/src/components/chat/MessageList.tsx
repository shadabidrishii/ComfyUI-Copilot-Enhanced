// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { Message } from "../../types/types";
import { UserMessage } from "./messages/UserMessage";
import { AIMessage } from "./messages/AIMessage";
// Import as components to be used directly, not lazy-loaded
import { LoadingMessage } from "./messages/LoadingMessage";
import { generateUUID } from "../../utils/uuid";
import { app } from "../../utils/comfyapp";
import { addNodeOnGraph } from "../../utils/graphUtils";
import React, { lazy, Suspense } from "react";

// Define types for ext items to avoid implicit any
interface ExtItem {
  type: string;
  data?: any;
}

interface NodeMap {
    [key: string | number]: any;
}

interface NodeWithPosition {
    id: number;
    type: string;
    pos: [number, number];
}

interface MessageListProps {
    messages: Message[];
    onOptionClick: (option: string) => void;
    latestInput: string;
    installedNodes: any[];
    onAddMessage: (message: Message) => void;
    loading?: boolean;
}

const getAvatar = (name?: string) => {
    return `https://ui-avatars.com/api/?name=${name || 'User'}&background=random`;
};

// Use lazy loading for components that are conditionally rendered
const LazyWorkflowOption = lazy(() => import('./messages/WorkflowOption').then(m => ({ default: m.WorkflowOption })));
const LazyNodeSearch = lazy(() => import('./messages/NodeSearch').then(m => ({ default: m.NodeSearch })));
const LazyDownstreamSubgraphs = lazy(() => import('./messages/DownstreamSubgraphs').then(m => ({ default: m.DownstreamSubgraphs })));
const LazyNodeInstallGuide = lazy(() => import('./messages/NodeInstallGuide').then(m => ({ default: m.NodeInstallGuide })));

export function MessageList({ messages, latestInput, onOptionClick, installedNodes, onAddMessage, loading }: MessageListProps) {
    // Cache renderMessage function with useMemo
    const renderMessage = React.useMemo(() => (message: Message) => {
        // Remove frequent log output
        // console.log('[MessageList] Rendering message:', message);
        
        if (message.role === 'user') {
            return <UserMessage 
                key={message.id} 
                content={message.content} 
                trace_id={message.trace_id} 
            />;
        }

        if (message.role === 'ai' || message.role === 'tool') {
            const avatar = getAvatar(message.role);
            
            try {
                const response = JSON.parse(message.content);
                // Remove frequent log output
                // console.log('[MessageList] Parsed message content:', response);
                
                // Get extension types
                const workflowExt = response.ext?.find((item: ExtItem) => item.type === 'workflow');
                const nodeExt = response.ext?.find((item: ExtItem) => item.type === 'node');
                const downstreamSubgraphsExt = response.ext?.find((item: ExtItem) => item.type === 'downstream_subgraph_search');
                const nodeInstallGuideExt = response.ext?.find((item: ExtItem) => item.type === 'node_install_guide');
                
                // Remove frequent log output
                // console.log('[MessageList] Found extensions:', {
                //     workflowExt,
                //     nodeExt,
                //     nodeRecommendExt,
                //     downstreamSubgraphsExt,
                //     nodeInstallGuideExt
                // });

                // Add corresponding component based on extension type
                let ExtComponent = null;
                if (workflowExt) {
                    ExtComponent = (
                        <Suspense fallback={<div>Loading...</div>}>
                            <LazyWorkflowOption
                                content={message.content}
                                name={message.name}
                                avatar={avatar}
                                latestInput={latestInput}
                                installedNodes={installedNodes}
                                onAddMessage={onAddMessage}
                            />
                        </Suspense>
                    );
                } else if (nodeExt) {
                    ExtComponent = (
                        <Suspense fallback={<div>Loading...</div>}>
                            <LazyNodeSearch
                                content={message.content}
                                name={message.name}
                                avatar={avatar}
                                installedNodes={installedNodes}
                            />
                        </Suspense>
                    );
                } else if (downstreamSubgraphsExt) {
                    const dsExtComponent = (
                        <Suspense fallback={<div>Loading...</div>}>
                            <LazyDownstreamSubgraphs
                                content={message.content}
                                name={message.name}
                                avatar={avatar}
                                onAddMessage={onAddMessage}
                            />
                        </Suspense>
                    );
                    
                    // If this is specifically from an intent button click (not regular message parsing)
                    if (message.metadata?.intent === 'downstream_subgraph_search') {
                        // Return the AIMessage with the extComponent
                        return (
                            <AIMessage 
                                key={message.id}
                                content={message.content}
                                name={message.name}
                                avatar={avatar}
                                format={message.format}
                                onOptionClick={onOptionClick}
                                extComponent={dsExtComponent}
                                metadata={message.metadata}
                            />
                        );
                    }
                    
                    // For normal detection from ext, use the ExtComponent directly
                    ExtComponent = dsExtComponent;
                } else if (nodeInstallGuideExt) {
                    ExtComponent = (
                        <Suspense fallback={<div>Loading...</div>}>
                            <LazyNodeInstallGuide
                                content={message.content}
                                onLoadSubgraph={() => {
                                    if (message.metadata?.pendingSubgraph) {
                                        const selectedNode = Object.values(app.canvas.selected_nodes)[0] as any;
                                        if (selectedNode) {
                                            // Directly call loadSubgraphToCanvas in DownstreamSubgraphs
                                            const node = message.metadata.pendingSubgraph;
                                            const nodes = node.json.nodes;
                                            const links = node.json.links;
                                            
                                            const entryNode = nodes.find((n: any) => n.id === 0);
                                            const entryNodeId = entryNode?.id;

                                            const nodeMap: NodeMap = {};
                                            if (entryNodeId) {
                                                nodeMap[entryNodeId] = selectedNode;
                                            }
                                            
                                            // Create all other nodes
                                            app.canvas.emitBeforeChange();
                                            try {
                                                for (const node of nodes as NodeWithPosition[]) {
                                                    if (node.id !== entryNodeId) {
                                                        const posEntryOld = entryNode?.pos || [0, 0];
                                                        const posEntryNew = selectedNode._pos || [0, 0];
                                                        const nodePosNew = [
                                                            node.pos[0] + posEntryNew[0] - posEntryOld[0], 
                                                            node.pos[1] + posEntryNew[1] - posEntryOld[1]
                                                        ];
                                                        nodeMap[node.id] = addNodeOnGraph(node.type, {pos: nodePosNew});
                                                    }
                                                }
                                            } finally {
                                                app.canvas.emitAfterChange();
                                            }

                                            // Process all connections
                                            for (const link of links) {
                                                const origin_node = nodeMap[link['origin_id']];
                                                const target_node = nodeMap[link['target_id']];
                                                
                                                if (origin_node && target_node) {
                                                    origin_node.connect(
                                                        link['origin_slot'], 
                                                        target_node, 
                                                        link['target_slot']
                                                    );
                                                }
                                            }
                                        } else {
                                            alert("Please select a upstream node first before adding a subgraph.");
                                        }
                                    } else if (message.metadata?.pendingWorkflow) {
                                        const workflow = message.metadata.pendingWorkflow;
                                        const optimizedParams = message.metadata.optimizedParams;
                                        app.loadGraphData(workflow);
                                        
                                        for (const [nodeId, nodeName, paramIndex, paramName, value] of optimizedParams) {
                                            const widgets = app.graph._nodes_by_id[nodeId].widgets;
                                            for (const widget of widgets) {
                                                if (widget.name === paramName) {
                                                    widget.value = value;
                                                }
                                            }
                                        }
                                        app.graph.setDirtyCanvas(false, true);
                                        // Add success message
                                        const successMessage = {
                                            id: generateUUID(),
                                            role: 'tool',
                                            content: JSON.stringify({
                                                text: 'The workflow has been successfully loaded to the canvas',
                                                ext: []
                                            }),
                                            format: 'markdown',
                                            name: 'Assistant'
                                        };
                                        onAddMessage?.(successMessage);
                                    }
                                }}
                            />
                        </Suspense>
                    );
                }

                // If response.text exists, render with AIMessage
                if (response.text || ExtComponent) {
                    return (
                        <AIMessage 
                            key={message.id}
                            content={message.content}
                            name={message.name}
                            avatar={avatar}
                            format={message.format}
                            onOptionClick={onOptionClick}
                            extComponent={ExtComponent}
                            metadata={message.metadata}
                        />
                    );
                }

                // If no response.text but has extension component, return the extension component directly
                if (ExtComponent) {
                    return ExtComponent;
                }

                // Default to returning AIMessage
                return (
                    <AIMessage 
                        key={message.id}
                        content={message.content}
                        name={message.name}
                        avatar={avatar}
                        format={message.format}
                        onOptionClick={onOptionClick}
                        metadata={message.metadata}
                    />
                );
            } catch (error) {
                console.error('[MessageList] Error parsing message content:', error);
                // If JSON parsing fails, use AIMessage
                console.error('Failed to parse JSON', message.content);
                return (
                    <AIMessage 
                        key={message.id}
                        content={message.content}
                        name={message.name}
                        avatar={avatar}
                        format={message.format}
                        onOptionClick={onOptionClick}
                        metadata={message.metadata}
                    />
                );
            }
        }

        return null;
    }, [installedNodes, onOptionClick, onAddMessage, latestInput]); // Added dependencies that are used inside the function

    // Cache message list with useMemo
    const messageElements = React.useMemo(() => 
        messages?.map(renderMessage),
        [messages, renderMessage]
    );

    return (
        <div className="flex flex-col gap-4 w-full">
            {messageElements}
            {loading && <LoadingMessage />}
        </div>
    );
} 