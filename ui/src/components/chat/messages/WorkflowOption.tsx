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

interface WorkflowOptionProps {
    content: string;
    name?: string;
    avatar: string;
    latestInput: string;
    installedNodes: any[];
    onAddMessage?: (message: any) => void;
}

export function WorkflowOption({ content, name = 'Assistant', avatar, latestInput, installedNodes, onAddMessage }: WorkflowOptionProps) {
    const response = JSON.parse(content) as ChatResponse;
    const workflows = response.ext?.find(item => item.type === 'workflow')?.data || [];
    
    const handleAcceptWorkflow = async (workflow: Workflow) => {
        if (!workflow.id) {
            console.error('No workflow id provided');
            return;
        }

        try {
            // 获取优化后的工作流
            const optimizedResult = await WorkflowChatAPI.getOptimizedWorkflow(
                workflow.id,
                latestInput
            );

            // 加载优化后的工作流
            if (optimizedResult.workflow) {
                // 检查是否需要安装节点
                const nodeTypes = new Set<string>();
                for (const node of optimizedResult.workflow.nodes) {
                    nodeTypes.add(node.type);
                }
                
                console.log('[WorkflowOption] Required node types:', Array.from(nodeTypes));
                console.log('[WorkflowOption] Installed nodes:', installedNodes);
                
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
                                data: nodeInfos.map(info => ({
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
                        return;
                    } catch (error) {
                        console.error('[WorkflowOption] Error fetching node info:', error);
                        alert('Error checking required nodes. Please try again.');
                        return;
                    }
                }

                // 如果所有节点都已安装，直接加载工作流
                loadWorkflow(optimizedResult.workflow, optimizedResult.optimized_params);
            }
        } catch (error) {
            console.error('Failed to optimize workflow:', error);
        }
    };

    const loadWorkflow = (workflow: any, optimizedParams: any[]) => {
        app.loadGraphData(workflow);
        
        // 应用优化后的参数 [节点id，节点名称，参数id，参数名称，参数默认值]
        for (const [nodeId, nodeName, paramIndex, paramName, value] of optimizedParams) {
            const widgets = app.graph._nodes_by_id[nodeId].widgets;
            for (const widget of widgets) {
                if (widget.name === paramName) {
                    widget.value = value;
                }
            }
        }
        app.graph.setDirtyCanvas(false, true);
    };
    
    return (
        // <BaseMessage avatar={avatar} name={name}>
            <div className="space-y-3">
                {workflows.length > 0 && (
                    <div className="flex flex-col space-y-4">
                        {workflows.map((workflow: Workflow, index: number) => (
                            <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                                {workflow.image && (
                                    <img
                                        src={workflow.image}
                                        alt={workflow.name}
                                        className="w-14 h-14 object-cover rounded-lg"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null; // 防止循环触发
                                            target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56' fill='none'%3E%3Crect width='56' height='56' fill='%23F3F4F6'/%3E%3Cpath d='M28 28C30.2091 28 32 26.2091 32 24C32 21.7909 30.2091 20 28 20C25.7909 20 24 21.7909 24 24C24 26.2091 25.7909 28 28 28Z' fill='%239CA3AF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M18.7253 37.6307C19.8278 35.1533 22.6897 33.6 26 33.6H30C33.3103 33.6 36.1722 35.1533 37.2747 37.6307C37.6419 38.4561 37.0611 39.2 36.1694 39.2H19.8306C18.9389 39.2 18.3581 38.4561 18.7253 37.6307Z' fill='%239CA3AF'/%3E%3C/svg%3E";
                                        }}
                                    />
                                )}
                                <div className="flex-1 break-words flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-medium text-xs">{workflow.name}</h3>
                                        {workflow.description && (
                                            <p className="text-gray-600 text-xs">{workflow.description}</p>
                                        )}
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <button
                                            onClick={() => handleAcceptWorkflow(workflow)}
                                            className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        // </BaseMessage>
    );
} 