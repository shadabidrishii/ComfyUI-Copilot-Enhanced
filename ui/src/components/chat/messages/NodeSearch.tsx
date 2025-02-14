// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { app } from "../../../utils/comfyapp";
import { BaseMessage } from './BaseMessage';
import { useState } from 'react';
import { ChatResponse, Node } from "../../../types/types";
import { addNodeOnGraph } from "../../../utils/graphUtils";

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

    // 添加一个格式化数字的辅助函数
    const formatNumber = (num: number) => {
        if (num >= 10000) {
            return `${(num / 10000).toFixed(1)}w`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}k`;
        }
        return num.toString();
    };

    return (
        <div className="rounded-lg bg-green-50 p-3 text-gray-700 text-xs break-words overflow-visible">
            {installedNodesList.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-medium">Installed nodes:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {installedNodesList.map((node: Node) => (
                            <div
                                key={node.name}
                                className="w-full p-3 bg-white rounded-lg border border-gray-200 
                                         hover:shadow-sm transition-all duration-200 relative group"
                                onMouseEnter={() => setHoveredNode(node.name)}
                                onMouseLeave={() => setHoveredNode(null)}
                            >
                                <h3 className="text-sm font-medium text-gray-800 mb-4">
                                    {node.name}
                                </h3>
                                <div className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1 text-gray-600">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 .25a.75.75 0 0 1 .673.418l3.058 6.197 6.839.994a.75.75 0 0 1 .415 1.279l-4.948 4.823 1.168 6.811a.75.75 0 0 1-1.088.791L12 18.347l-6.117 3.216a.75.75 0 0 1-1.088-.79l1.168-6.812-4.948-4.823a.75.75 0 0 1 .416-1.28l6.838-.993L11.327.668A.75.75 0 0 1 12 .25z"/>
                                        </svg>
                                        <span>{formatNumber(node.github_stars || 0)}</span>
                                    </div>
                                    <button
                                        className="px-2 py-1 bg-blue-500 text-white rounded-md 
                                                 hover:bg-blue-600 transition-colors text-[10px] flex items-center gap-1"
                                        onClick={() => {
                                            const addNode = addNodeOnGraph(node.name);
                                            if (addNode) {
                                                addNode.connect(node.from_index, addNode, node.to_index);
                                            }
                                        }}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                                        </svg>
                                        Add to Canvas
                                    </button>
                                </div>
                                {hoveredNode === node.name && node.description && (
                                    <div className="fixed transform -translate-y-full z-[9999] w-64 p-2 
                                                bg-gray-800 text-white text-xs rounded-md shadow-lg mb-2"
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
                    <p className="text-xs font-medium">Uninstalled nodes:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {uninstalledNodesList.map((node: Node) => (
                            <div
                                key={node.name}
                                className="w-full p-3 bg-white rounded-lg border border-gray-200 
                                         hover:shadow-sm transition-all duration-200 relative group"
                                onMouseEnter={() => setHoveredNode(node.name)}
                                onMouseLeave={() => setHoveredNode(null)}
                            >
                                <h3 className="text-[12px] font-medium text-gray-800 mb-4">
                                    {node.name}
                                </h3>
                                <div className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1 text-gray-600">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 .25a.75.75 0 0 1 .673.418l3.058 6.197 6.839.994a.75.75 0 0 1 .415 1.279l-4.948 4.823 1.168 6.811a.75.75 0 0 1-1.088.791L12 18.347l-6.117 3.216a.75.75 0 0 1-1.088-.79l1.168-6.812-4.948-4.823a.75.75 0 0 1 .416-1.28l6.838-.993L11.327.668A.75.75 0 0 1 12 .25z"/>
                                        </svg>
                                        <span>{formatNumber(node.github_stars || 0)}</span>
                                    </div>
                                    <a
                                        href={node.github_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 bg-white text-gray-900 rounded-md 
                                                 border border-gray-900 hover:bg-gray-100 
                                                 transition-colors text-[10px] flex items-center gap-1"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download
                                    </a>
                                </div>
                                {hoveredNode === node.name && node.description && (
                                    <div className="fixed transform -translate-y-full z-[9999] w-64 p-2 
                                                bg-gray-800 text-white text-xs rounded-md shadow-lg mb-2"
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