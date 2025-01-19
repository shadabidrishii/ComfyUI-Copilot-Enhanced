import { Message } from "../../types/types";
import { UserMessage } from "./messages/UserMessage";
import { AIMessage } from "./messages/AIMessage";
import { WorkflowOption } from "./messages/WorkflowOption";
import { NodeSearch } from "./messages/NodeSearch";
import { NodeRecommend } from "./messages/NodeRecommend";
import { DownstreamSubgraphs } from "./messages/DownstreamSubgraphs";
import { NodeInstallGuide } from "./messages/NodeInstallGuide";
import { LoadingMessage } from "./messages/LoadingMessage";

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

export function MessageList({ messages, latestInput, onOptionClick, installedNodes, onAddMessage, loading }: MessageListProps) {
const renderMessage = (message: Message) => {
        console.log('[MessageList] Rendering message:', message);
        
        if (message.role === 'user') {
            return <UserMessage key={message.id} content={message.content} />;
        }

        if (message.role === 'ai' || message.role === 'tool') {
            const avatar = getAvatar(message.role);
            
            try {
                const response = JSON.parse(message.content);
                console.log('[MessageList] Parsed message content:', response);
                
                // 获取扩展类型
                const workflowExt = response.ext?.find(item => item.type === 'workflow');
                const nodeExt = response.ext?.find(item => item.type === 'node');
                const nodeRecommendExt = response.ext?.find(item => item.type === 'node_recommend');
                const downstreamSubgraphsExt = response.ext?.find(item => item.type === 'downstream_subgraph_search');
                const nodeInstallGuideExt = response.ext?.find(item => item.type === 'node_install_guide');
                
                console.log('[MessageList] Found extensions:', {
                    workflowExt,
                    nodeExt,
                    nodeRecommendExt,
                    downstreamSubgraphsExt,
                    nodeInstallGuideExt
                });

                // 根据扩展类型添加对应组件
                let ExtComponent = null;
                if (workflowExt) {
                    ExtComponent = (
                        <WorkflowOption
                            content={message.content}
                            name={message.name}
                            latestInput={latestInput}
                            installedNodes={installedNodes}
                            onAddMessage={onAddMessage}
                        />
                    );
                } else if (nodeRecommendExt) {
                    ExtComponent = (
                        <NodeRecommend
                            content={message.content}
                            name={message.name}
                            avatar={avatar}
                            installedNodes={installedNodes}
                        />
                    );
                } else if (nodeExt) {
                    ExtComponent = (
                        <NodeSearch
                            content={message.content}
                            name={message.name}
                            avatar={avatar}
                            installedNodes={installedNodes}
                        />
                    );
                } else if (downstreamSubgraphsExt) {
                    ExtComponent = (
                        <DownstreamSubgraphs
                            content={message.content}
                            name={message.name}
                            avatar={avatar}
                            installedNodes={installedNodes}
                            onAddMessage={onAddMessage}
                        />
                    );
                } else if (nodeInstallGuideExt) {
                    ExtComponent = (
                        <NodeInstallGuide
                            content={message.content}
                            onLoadSubgraph={() => {
                                if (message.metadata?.pendingSubgraph) {
                                    const selectedNode = Object.values(app.canvas.selected_nodes)[0];
                                    if (selectedNode) {
                                        // 直接调用 DownstreamSubgraphs 中的 loadSubgraphToCanvas
                                        const node = message.metadata.pendingSubgraph;
                                        const nodes = node.json.nodes;
                                        const links = node.json.links;
                                        
                                        const entryNode = nodes.find(node => node.id === 0);
                                        const entryNodeId = entryNode?.id;

                                        const nodeMap = {};
                                        if (entryNodeId) {
                                            nodeMap[entryNodeId] = selectedNode;
                                        }
                                        
                                        // 创建其他所有节点
                                        app.canvas.emitBeforeChange();
                                        try {
                                            for (const node of nodes) {
                                                if (node.id !== entryNodeId) {
                                                    const posEntryOld = entryNode?.pos;
                                                    const posEntryNew = [selectedNode._pos[0], selectedNode._pos[1]];
                                                    const nodePosNew = [
                                                        node.pos[0] + posEntryNew[0] - posEntryOld[0], 
                                                        node.pos[1] + posEntryNew[1] - posEntryOld[1]
                                                    ];
                                                    nodeMap[node.id] = app.addNodeOnGraph(
                                                        { name: node.type }, 
                                                        {pos: nodePosNew}
                                                    );
                                                }
                                            }
                                        } finally {
                                            app.canvas.emitAfterChange();
                                        }

                                        // 处理所有连接
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
                                }
                            }}
                        />
                    );
                }

                // 如果有response.text，使用AIMessage渲染
                if (response.text || ExtComponent) {
                    return (
                        <AIMessage 
                            key={message.id}
                            content={message.content}
                            name={message.name}
                            format={message.format}
                            onOptionClick={onOptionClick}
                            extComponent={ExtComponent}
                        />
                    );
                }

                // 如果没有response.text但有扩展组件，直接返回扩展组件
                if (ExtComponent) {
                    return ExtComponent;
                }

                // 默认返回AIMessage
                return (
                    <AIMessage 
                        key={message.id}
                        content={message.content}
                        name={message.name}
                        format={message.format}
                        onOptionClick={onOptionClick}
                    />
                );
            } catch (error) {
                console.error('[MessageList] Error parsing message content:', error);
                // 如果解析JSON失败,使用AIMessage
                console.error('解析JSON失败', message.content);
                return (
                    <AIMessage 
                        key={message.id}
                        content={message.content}
                        name={message.name}
                        format={message.format}
                        onOptionClick={onOptionClick}
                    />
                );
            }
        }

        return null;
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            {messages?.map(renderMessage)}
            {loading && <LoadingMessage />}
        </div>
    );
} 