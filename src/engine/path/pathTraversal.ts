export function extractPathsUsingDFS(
  rootNodes: string[],
  adjacencyList: Record<string, string[]>,
  maxPaths = 5000
): string[][] {
  const validPaths: string[][] = [];

  function performDepthFirstSearch(
    currentNodeId: string,
    currentPath: string[]
  ) {
    if (validPaths.length >= maxPaths) return;

    const nextNodeIds = adjacencyList[currentNodeId];

    if (!nextNodeIds || nextNodeIds.length === 0) {
      validPaths.push([...currentPath]);
      return;
    }

    nextNodeIds.forEach((nextNodeId) => {
      if (validPaths.length >= maxPaths) return;
      if (!currentPath.includes(nextNodeId)) {
        performDepthFirstSearch(nextNodeId, [...currentPath, nextNodeId]);
      }
    });
  }

  rootNodes.forEach((rootId) => performDepthFirstSearch(rootId, [rootId]));
  return validPaths;
}
