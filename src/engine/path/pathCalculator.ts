import { Node, Edge } from "reactflow";
import { buildPathAdjacencyList, findPathRoots } from "./pathGraph";
import { extractPathsUsingDFS } from "./pathTraversal";

export function calculateAllPaths(nodes: Node[], edges: Edge[]): string[][] {
  const { adjacencyList, inDegreeTracker } = buildPathAdjacencyList(nodes, edges);
  const rootNodes = findPathRoots(adjacencyList, inDegreeTracker);
  const rawPaths = extractPathsUsingDFS(rootNodes, adjacencyList);
  const uniquePathsMap = new Map<string, string[]>();
  rawPaths.forEach((path) => uniquePathsMap.set(path.join("|"), path));
  return Array.from(uniquePathsMap.values());
}
