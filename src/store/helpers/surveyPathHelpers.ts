import { Node } from "reactflow";

export function buildLogicTracks(nodes: Node[]) {
  const pathableNodes = nodes.filter((n) => !n.id.startsWith("box-"));
  const uniqueLogicTracks = new Set<string>();

  pathableNodes.forEach((n) => {
    if (n.data?.isBranchingLogic && n.data?.logicText) {
      uniqueLogicTracks.add(n.data.logicText);
    }
    if (n.id.startsWith("TERM-") && n.data?.logicText) {
      uniqueLogicTracks.add(n.data.logicText);
    }
  });

  return { pathableNodes, uniqueLogicTracks };
}

export function buildLinearPaths(pathableNodes: Node[], logicTracks: Set<string>) {
  const linearPaths: string[][] = [];
  const baseSpine: string[] = [];

  for (const node of pathableNodes) {
    if (node.id.startsWith("TERM-")) {
      if (!node.data?.logicText && baseSpine.includes(node.id.replace("TERM-", ""))) {
        break;
      }
    } else if (!node.data?.isBranchingLogic) {
      baseSpine.push(node.id);
    }
  }

  linearPaths.push(baseSpine);

  Array.from(logicTracks).forEach((trackLogic) => {
    const trackPath: string[] = [];

    for (const node of pathableNodes) {
      if (node.id.startsWith("TERM-")) {
        const parentId = node.id.replace("TERM-", "");
        const isUnconditionalTerm = !node.data?.logicText;
        const isTrackTerm = node.data?.logicText === trackLogic;

        if (isTrackTerm || (isUnconditionalTerm && trackPath.includes(parentId))) {
          if (!trackPath.includes(parentId)) trackPath.push(parentId);
          break;
        }
      } else {
        if (!node.data?.isBranchingLogic || node.data?.logicText === trackLogic) {
          trackPath.push(node.id);
        }
      }
    }

    linearPaths.push(trackPath);
  });

  return linearPaths;
}

export function deduplicatePaths(paths: string[][]) {
  const finalPathsMap = new Map<string, string[]>();

  paths.forEach((path) => {
    const cleanPath = path.filter((p) => !p.startsWith("TERM-"));
    const signature = cleanPath.join("->");
    if (signature && !finalPathsMap.has(signature)) {
      finalPathsMap.set(signature, cleanPath);
    }
  });

  return Array.from(finalPathsMap.values());
}

export function pruneSubsetPaths(paths: string[][]) {
  return paths.filter((currentPath, index, array) => {
    const currentStr = currentPath.join("->");
    return !array.some((otherPath, otherIndex) => {
      if (index === otherIndex) return false;
      const otherStr = otherPath.join("->");
      return otherStr.includes(currentStr) && otherStr.length > currentStr.length;
    });
  });
}
