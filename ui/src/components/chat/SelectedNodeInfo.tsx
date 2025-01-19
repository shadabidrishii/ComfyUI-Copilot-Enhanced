import { app } from "../../utils/comfyapp";

interface SelectedNodeInfoProps {
    nodeInfo: any;
    onSendWithIntent: (intent: string, ext?: any) => void;
    loading: boolean;
}


function getDownstreamSubgraphExt() {
    const selectedNode = Object.values(app.canvas.selected_nodes)[0];
    const nodeTypeSet = new Set<string>();
    
    function findUpstreamNodes(node: any, depth: number) {
        if (!node || depth >= 1) return;
        
        if (node.inputs) {
            for (const input of Object.values(node.inputs)) {
                const linkId = (input as any).link;
                if (linkId && app.graph.links[linkId]) {
                    const originId = app.graph.links[linkId].origin_id;
                    const originNode = app.graph._nodes_by_id[originId];
                    if (originNode) {
                        nodeTypeSet.add(originNode.type);
                        findUpstreamNodes(originNode, depth + 1);
                    }
                }
            }
        }
    }

    if (selectedNode) {
        findUpstreamNodes(selectedNode, 0);
        return [{"type": "upstream_node_types", "data": Array.from(nodeTypeSet)}];
    }

    return null;
}

export function SelectedNodeInfo({ nodeInfo, onSendWithIntent, loading }: SelectedNodeInfoProps) {
    return (
        <div className="mb-3 p-3 rounded-md bg-gray-50 border border-gray-200 
                      transform transition-all duration-200 hover:shadow-md">
            <div className="text-sm">
                <p>node: {nodeInfo.type}</p>
                <div className="flex gap-2 mt-2">
                    <button
                        className="px-3 py-1 text-xs rounded-md bg-blue-50 
                                 hover:bg-blue-100 text-blue-700 transition-all 
                                 duration-200 hover:shadow-sm active:scale-95"
                        onClick={() => onSendWithIntent('node_explain')}
                        disabled={loading}>
                        Node Usage
                    </button>
                    <button
                        className="px-3 py-1 text-xs rounded bg-green-100 
                                 hover:bg-green-200 text-green-700 transition-colors"
                        onClick={() => onSendWithIntent('node_params')}
                        disabled={loading}>
                        Node Parameters
                    </button>
                    <button
                        className="px-3 py-1 text-xs rounded bg-purple-100 
                                 hover:bg-purple-200 text-purple-700 transition-colors"
                        onClick={() => onSendWithIntent('downstream_subgraph_search', getDownstreamSubgraphExt())}
                        disabled={loading}>
                        Downstream Node Recommend
                    </button>
                </div>
            </div>
        </div>
    );
} 