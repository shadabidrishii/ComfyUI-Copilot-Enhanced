import { app } from "../../../utils/comfyapp";
import { BaseMessage } from './BaseMessage';
import { useState } from 'react';
import { ChatResponse, Node } from "../../../types/types";

interface NodeSearchProps {
    content: string;
    name?: string;
    avatar: string;
    installedNodes: any[];
}

export function NodeSearch({ content, name = 'Assistant', avatar, installedNodes }: NodeSearchProps) {
    const response = JSON.parse(content) as ChatResponse;
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const nodes = response.ext?.find(item => item.type === 'node')?.data || [];
    
    const isNodeInstalled = (nodeName: string) => {
        return installedNodes.some(node => node === nodeName);
    };

    const installedNodesList = nodes.filter(node => isNodeInstalled(node.name));
    const uninstalledNodesList = nodes.filter(node => !isNodeInstalled(node.name));

    return (
        <div className="rounded-lg bg-green-50 p-3 text-gray-700 text-xs break-words overflow-visible">
            {installedNodesList.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs">Available nodes that can be added to canvas:</p>
                    <div className="flex flex-wrap gap-2">
                        {installedNodesList.map((node: Node) => (
                            <div key={node.name} className="relative group">
                                <button
                                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md 
                                             hover:bg-blue-600 transition-colors text-xs"
                                    onClick={() => {
                                        const addNode = app.addNodeOnGraph({ name: node.name });
                                        if (addNode) {
                                            addNode.connect(node.from_index, addNode, node.to_index);
                                        }
                                    }}
                                    onMouseEnter={() => setHoveredNode(node.name)}
                                    onMouseLeave={() => setHoveredNode(null)}
                                >
                                    {node.name}
                                </button>
                                {hoveredNode === node.name && node.description && (
                                    <div className="fixed transform -translate-y-full 
                                                z-[9999] w-64 p-2 bg-gray-800 text-white text-xs 
                                                rounded-md shadow-lg mb-2"
                                        style={{
                                            left: 'calc(var(--mouse-x, 0) + 16px)',
                                            top: 'calc(var(--mouse-y, 0) - 8px)'
                                        }}
                                    >
                                        {node.description}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 
                                                    border-4 border-transparent border-t-gray-800"/>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {uninstalledNodesList.length > 0 && (
                <div className={`space-y-3 ${installedNodesList.length > 0 ? 'mt-4' : ''}`}>
                    <p className="text-xs">
                        Uninstalled nodes, you can install them from github:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {uninstalledNodesList.map((node: Node) => (
                            <div key={node.name} className="relative group">
                                <a
                                    href={node.github_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md
                                             hover:bg-gray-200 transition-colors text-xs border 
                                             border-gray-200"
                                    onMouseEnter={() => setHoveredNode(node.name)}
                                    onMouseLeave={() => setHoveredNode(null)}
                                >
                                    {node.name}
                                </a>
                                {hoveredNode === node.name && node.description && (
                                    <div className="fixed transform -translate-y-full 
                                                z-[9999] w-64 p-2 bg-gray-800 text-white text-xs 
                                                rounded-md shadow-lg mb-2"
                                        style={{
                                            left: 'calc(var(--mouse-x, 0) + 16px)',
                                            top: 'calc(var(--mouse-y, 0) - 8px)'
                                        }}
                                    >
                                        {node.description}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 
                                                    border-4 border-transparent border-t-gray-800"/>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
} 