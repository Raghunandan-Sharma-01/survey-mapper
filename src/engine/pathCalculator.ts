import { Node, Edge } from "reactflow";

/**
 * Builds an adjacency list representation of the graph from ReactFlow nodes and edges
 */
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

/**
 * Identifies root nodes (nodes with no incoming edges) in the graph
 */
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

/**
 * Extracts all valid paths from root nodes to leaf nodes using depth-first search
 */
export function extractPathsUsingDFS(
  rootNodes: string[],
  adjacencyList: Record<string, string[]>
): string[][] {
  const validPaths: string[][] = [];

  function performDepthFirstSearch(
    currentNodeId: string,
    currentPath: string[]
  ) {
    const nextNodeIds = adjacencyList[currentNodeId];

    if (!nextNodeIds || nextNodeIds.length === 0) {
      validPaths.push([...currentPath]);
      return;
    }

    nextNodeIds.forEach((nextNodeId) => {
      if (!currentPath.includes(nextNodeId)) {
        performDepthFirstSearch(nextNodeId, [...currentPath, nextNodeId]);
      }
    });
  }

  rootNodes.forEach((rootId) => performDepthFirstSearch(rootId, [rootId]));
  return validPaths;
}

/**
 * Calculates all possible paths through the graph
 * Used for analyzing survey flow and logic paths
 */
export function calculateAllPaths(nodes: Node[], edges: Edge[]): string[][] {
  const { adjacencyList, inDegreeTracker } = buildPathAdjacencyList(nodes, edges);
  const rootNodes = findPathRoots(adjacencyList, inDegreeTracker);
  const rawPaths = extractPathsUsingDFS(rootNodes, adjacencyList);

  // THE FIX: Deduplicate the paths by joining them into strings,
  // storing them in a Map, and extracting the unique arrays.
  const uniquePathsMap = new Map<string, string[]>();
  rawPaths.forEach(path => {
    uniquePathsMap.set(path.join('|'), path);
  });

  return Array.from(uniquePathsMap.values());
}