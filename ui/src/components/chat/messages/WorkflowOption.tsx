import { app } from "../../../utils/comfyapp";
import { BaseMessage } from './BaseMessage';
import { ChatResponse, Workflow } from "../../../types/types";
import { WorkflowChatAPI } from "../../../apis/workflowChatApi";
import { MemoizedReactMarkdown } from "../../markdown";
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeExternalLinks from 'rehype-external-links';
import { generateUUID } from "../../../utils/uuid";
import { useState } from "react";

interface WorkflowOptionProps {
    content: string;
    name?: string;
    avatar: string;
    latestInput: string;
    installedNodes: any[];
    onAddMessage?: (message: any) => void;
}

interface NodeInfo {
    name: string;
    github_url: string;
    [key: string]: any;
}

export function WorkflowOption({ content, name = 'Assistant', avatar, latestInput, installedNodes, onAddMessage }: WorkflowOptionProps) {
    const response = JSON.parse(content) as ChatResponse;
    const workflows = response.ext?.find(item => item.type === 'workflow')?.data || [];
    const [loadingWorkflows, setLoadingWorkflows] = useState<Record<string, boolean>>({});
    
    const handleAcceptWorkflow = async (workflow: Workflow) => {
        if (!workflow.id) {
            console.error('No workflow id provided');
            return;
        }

        // Convert workflow.id to string to ensure it can be used as an object key
        const workflowId = String(workflow.id);

        // Prevent double-clicking
        if (loadingWorkflows[workflowId]) {
            return;
        }

        // Set current workflow to loading state
        setLoadingWorkflows(prev => ({
            ...prev,
            [workflowId]: true
        }));

        // Send tracking event
        WorkflowChatAPI.trackEvent({
            event_type: 'workflow_accept',
            message_type: 'workflow',
            message_id: response.message_id,
            data: {
                workflow_id: workflow.id,
                workflow_name: workflow.name
            }
        });

        try {
            // Get optimized workflow
            const optimizedResult = await WorkflowChatAPI.getOptimizedWorkflow(
                workflow.id,
                latestInput
            );

            // Load the optimized workflow
            if (optimizedResult.workflow) {
                // Check if nodes need to be installed
                const nodeTypes = new Set<string>();
                if(optimizedResult.workflow.nodes) {
                    for (const node of optimizedResult.workflow.nodes) {
                        nodeTypes.add(node.type);
                    }
                } else {
                    for (const node of Object.values(optimizedResult.workflow)) {
                        nodeTypes.add(node.class_type);
                    }
                }
                
                const missingNodeTypes = Array.from(nodeTypes).filter(
                    type => !installedNodes.includes(type)
                );
                
                console.log('[WorkflowOption] Missing node types:', missingNodeTypes);

                if (missingNodeTypes.length > 0) {
                    try {
                        console.log('[WorkflowOption] Fetching info for missing nodes');
                        const nodeInfos = await WorkflowChatAPI.batchGetNodeInfo(missingNodeTypes);
                        console.log('[WorkflowOption] Received node infos:', nodeInfos);
                        
                        const messageContent = {
                            text: ``,
                            ext: [{
                                type: 'node_install_guide',
                                data: nodeInfos.map((info: NodeInfo) => ({
                                    name: info.name,
                                    repository_url: info.github_url
                                }))
                            }]
                        };

                        const aiMessage = {
                            id: generateUUID(),
                            role: 'ai',
                            content: JSON.stringify(messageContent),
                            format: 'markdown',
                            name: 'Assistant',
                            metadata: {
                                pendingWorkflow: optimizedResult.workflow,
                                optimizedParams: optimizedResult.optimized_params
                            }
                        };

                        onAddMessage?.(aiMessage);
                    } catch (error) {
                        console.error('[WorkflowOption] Error fetching node info:', error);
                        alert('Error checking required nodes. Please try again.');
                    } finally {
                        // Reset loading state regardless of success or failure
                        setLoadingWorkflows(prev => ({
                            ...prev,
                            [workflowId]: false
                        }));
                    }
                    return;
                }

                // If all nodes are already installed, load the workflow directly
                loadWorkflow(optimizedResult.workflow, optimizedResult.optimized_params);
            }
        } catch (error) {
            console.error('Failed to optimize workflow:', error);
            alert('Failed to optimize workflow. Please try again.');
        } finally {
            // Reset loading state regardless of success or failure
            setLoadingWorkflows(prev => ({
                ...prev,
                [workflowId]: false
            }));
        }
    };

    const loadWorkflow = (workflow: any, optimizedParams: any[]) => {
        if(workflow.nodes) {
            app.loadGraphData(workflow);
        } else {
            app.loadApiJson(workflow);
        }

        // Apply optimized parameters [node id, node name, parameter id, parameter name, parameter default value]
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
    };
    
    return (
        // <BaseMessage avatar={avatar} name={name}>
            <div className="space-y-3">
                {workflows.length > 0 && (
                    <div className="flex flex-col space-y-4">
                        {workflows.map((workflow: Workflow, index: number) => {
                            // Ensure workflow.id exists and convert to string
                            const workflowId = workflow.id ? String(workflow.id) : '';
                            return (
                                <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                                    {workflow.image && (
                                        <img
                                            src={workflow.image}
                                            alt={workflow.name}
                                            className="w-14 h-14 object-cover rounded-lg"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null; // Prevent infinite trigger
                                                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56' fill='none'%3E%3Crect width='56' height='56' fill='%23F3F4F6'/%3E%3Cpath d='M28 28C30.2091 28 32 26.2091 32 24C32 21.7909 30.2091 20 28 20C25.7909 20 24 21.7909 24 24C24 26.2091 25.7909 28 28 28Z' fill='%239CA3AF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M18.7253 37.6307C19.8278 35.1533 22.6897 33.6 26 33.6H30C33.3103 33.6 36.1722 35.1533 37.2747 37.6307C37.6419 38.4561 37.0611 39.2 36.1694 39.2H19.8306C18.9389 39.2 18.3581 38.4561 18.7253 37.6307Z' fill='%239CA3AF'/%3E%3C/svg%3E";
                                            }}
                                        />
                                    )}
                                    <div className="flex-1 break-words flex flex-col h-[4.5rem] justify-between">
                                        <div>
                                            <h3 className="font-medium text-sm line-clamp-2 h-10 overflow-hidden">{workflow.name}</h3>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            {workflow.description && (
                                                <div className="relative group">
                                                    <div className="w-5 h-5 flex items-center justify-center text-gray-500 cursor-help">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                                                        </svg>
                                                    </div>
                                                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
                                                        <div className="bg-gray-900 text-white text-xs rounded-md py-2 px-3 min-w-[400px] whitespace-normal break-words">
                                                            {workflow.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleAcceptWorkflow(workflow)}
                                                disabled={loadingWorkflows[workflowId]}
                                                className={`px-3 py-1.5 ${loadingWorkflows[workflowId] 
                                                    ? 'bg-gray-400 cursor-not-allowed' 
                                                    : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md transition-colors text-xs`}
                                            >
                                                {loadingWorkflows[workflowId] ? 'Loading...' : 'Accept'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        // </BaseMessage>
    );
} 