import React from 'react';

interface NodeInstallGuideProps {
    content: string;
    onLoadSubgraph?: () => void;
}

export function NodeInstallGuide({ content, onLoadSubgraph }: NodeInstallGuideProps) {
    const response = JSON.parse(content);
    const nodeInfos = response.ext?.find(item => item.type === 'node_install_guide')?.data || [];

    return (
        <div>
            <p>在加载graph到画布前，以下节点有待安装，请跳转到对应的github安装节点：</p>
            <div className="space-y-2">
                {nodeInfos.map((node: any, index: number) => (
                    <div 
                        key={index}
                        className="w-full p-3 bg-white rounded-lg border border-gray-200 
                                 hover:shadow-sm transition-all duration-200"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-800">
                                {node.name}
                            </h3>
                            <button
                                className="px-3 py-1.5 bg-white text-gray-900 rounded-md 
                                         border border-gray-900 hover:bg-gray-100 
                                         transition-colors text-xs flex items-center gap-1"
                                onClick={() => window.open(node.repository_url, '_blank')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-4"></p>
            <p>安装完成后，请点击继续加载graph按钮，将graph加载到画布中：</p>
            <div className="mt-4">
                <button
                    className="px-3 py-2 bg-blue-500 text-white rounded-md 
                             hover:bg-blue-600 transition-colors text-xs block mx-auto"
                    onClick={onLoadSubgraph}
                >
                    继续加载graph
                </button>
            </div>
        </div>
    );
} 