import { Node, Edge } from "reactflow";

export function buildPathAdjacencyList(nodes: Node[], edges: Edge[]) {
  const adjacencyList: Record<string, string[]> = {};
  const inDegreeTracker: Record<string, number> = {};

  nodes.forEach((node) => {
    if (!node.id.startsWith("TERM-")) {
      adjacencyList[node.id] = [];
      inDegreeTracker[node.id] = 0;
    }
  });

  edges.forEach((edge) => {
    if (
      edge.source &&
      edge.target &&
      adjacencyList[edge.source] &&
      !edge.target.startsWith("TERM-") &&
      !edge.id.startsWith("loop-") &&
      !edge.id.startsWith("ld-logic-")
    ) {
      if (!adjacencyList[edge.source].includes(edge.target)) {
        adjacencyList[edge.source].push(edge.target);
        if (inDegreeTracker[edge.target] !== undefined) {
          inDegreeTracker[edge.target]++;
        }
      }
    }
  });

  return { adjacencyList, inDegreeTracker };
}

export function findPathRoots(
  adjacencyList: Record<string, string[]>,
  inDegreeTracker: Record<string, number>
): string[] {
  const rootNodes = Object.keys(inDegreeTracker).filter(
    (id) => inDegreeTracker[id] === 0
  );
  if (rootNodes.length === 0 && Object.keys(adjacencyList).length > 0) {
    rootNodes.push(Object.keys(adjacencyList)[0]);
  }
  return rootNodes;
}
