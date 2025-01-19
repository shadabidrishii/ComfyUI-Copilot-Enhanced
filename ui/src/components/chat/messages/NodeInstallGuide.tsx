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
                    <button
                        key={index}
                        className="w-full px-3 py-2 bg-white text-blue-600 rounded-md 
                                 hover:bg-blue-50 transition-colors text-xs text-left"
                        onClick={() => window.open(node.repository_url, '_blank')}
                    >
                        {node.name}
                    </button>
                ))}
            </div>
            <p>安装完成后，请点击继续加载graph按钮，将graph加载到画布中：</p>
            <div className="mt-4">
                <button
                    className="w-full px-3 py-2 bg-blue-500 text-white rounded-md 
                             hover:bg-blue-600 transition-colors text-xs"
                    onClick={onLoadSubgraph}
                >
                    继续加载graph
                </button>
            </div>
        </div>
    );
} 