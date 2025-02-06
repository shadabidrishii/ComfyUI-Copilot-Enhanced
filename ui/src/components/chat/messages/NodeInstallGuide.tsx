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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nodeInfos.map((node: any, index: number) => (
                    <div 
                        key={index}
                        className="w-full p-3 bg-white rounded-lg border border-gray-200 
                                 hover:shadow-sm transition-all duration-200"
                    >
                        <div className="flex flex-col">
                            <h3 className="text-sm font-medium text-gray-800 mb-4">
                                {node.name}
                            </h3>
                            <div className="flex justify-end">
                                <a
                                    href={node.repository_url}
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