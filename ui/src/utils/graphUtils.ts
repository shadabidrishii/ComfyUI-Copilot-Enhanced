// import { LGraph, LGraphGroup, LiteGraph, LGraphNode } from "../types/litegraph.d";

// interface ParsedWorkflow {
//   nodes?: any[];
//   groups?: any[];
//   reroutes?: any[];
//   links?: any[];
// }

// interface LoadResults {
//   created: (LGraphNode | LGraphGroup)[];
//   nodes: Map<number, LGraphNode>;
//   links: Map<number, any>;
//   reroutes: Map<number, any>;
// }

// export function loadSubGraphData(jsonObject: string | object, graph: LGraph, mousePos: [number, number]): LoadResults {
//   // Parse JSON if string is provided
//   const parsed: ParsedWorkflow = typeof jsonObject === 'string' ? JSON.parse(jsonObject) : jsonObject;

//   // Initialize arrays if they don't exist
//   parsed.nodes ??= [];
//   parsed.groups ??= [];
//   parsed.reroutes ??= [];
//   parsed.links ??= [];

//   // Find minimum offsets
//   let offsetX = Infinity;
//   let offsetY = Infinity;

//   // Check nodes and reroutes positions
//   for (const item of [...parsed.nodes, ...parsed.reroutes]) {
//     if (item.pos[0] < offsetX) offsetX = item.pos[0];
//     if (item.pos[1] < offsetY) offsetY = item.pos[1];
//   }

//   // Check group positions
//   if (parsed.groups) {
//     for (const group of parsed.groups) {
//       if (group.bounding[0] < offsetX) offsetX = group.bounding[0];
//       if (group.bounding[1] < offsetY) offsetY = group.bounding[1];
//     }
//   }

//   // Initialize results
//   const results: LoadResults = {
//     created: [],
//     nodes: new Map(),
//     links: new Map(),
//     reroutes: new Map()
//   };

//   const { created, nodes, links, reroutes } = results;

//   // Add groups
//   for (const info of parsed.groups) {
//     info.id = undefined;
//     const group = new LGraphGroup();
//     group.configure(info);
//     graph.add(group);
//     created.push(group);
//   }

//   // Add nodes
//   for (const info of parsed.nodes) {
//     const node = LiteGraph.createNode(info.type);
//     if (!node) continue;
    
//     nodes.set(info.id, node);
//     info.id = undefined;
//     node.configure(info);
//     graph.add(node);
//     created.push(node);
//   }

//   // Add reroutes
//   for (const info of parsed.reroutes) {
//     const { id } = info;
//     info.id = undefined;
//     const reroute = graph.setReroute(info);
//     created.push(reroute);
//     reroutes.set(id, reroute);
//   }

//   // Update reroute parent IDs
//   for (const reroute of reroutes.values()) {
//     const mapped = reroutes.get(reroute.parentId);
//     if (mapped) reroute.parentId = mapped.id;
//   }

//   // Add links
//   for (const info of parsed.links) {
//     const outNode = nodes.get(info.origin_id);
//     const inNode = nodes.get(info.target_id);
//     const afterRerouteId = reroutes.get(info.parentId)?.id;

//     if (inNode) {
//       const link = outNode?.connect(
//         info.origin_slot,
//         inNode,
//         info.target_slot,
//         afterRerouteId
//       );
//       if (link) links.set(info.id, link);
//     }
//   }

//   // Validate and update reroutes
//   for (const reroute of reroutes.values()) {
//     const ids = [...reroute.linkIds].map(x => links.get(x)?.id ?? x);
//     reroute.update(reroute.parentId, undefined, ids);
//     if (!reroute.validateLinks(graph.links)) {
//       graph.removeReroute(reroute.id);
//     }
//   }

//   // Adjust positions relative to mouse position
//   for (const item of created) {
//     item.pos[0] += mousePos[0] - offsetX;
//     item.pos[1] += mousePos[1] - offsetY;
//   }

//   // Update graph
//   graph.afterChange();

//   return results;
// }
