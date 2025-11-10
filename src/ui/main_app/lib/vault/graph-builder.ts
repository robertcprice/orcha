/**
 * Graph Builder
 *
 * Builds graph data structures from vault documents for visualization.
 * Creates nodes (documents) and edges (links) for force-directed graphs.
 */

import { ParsedDocument, extractWikiLinks, getRelatedDocs, wikiLinkToPath } from './metadata';

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  type: string;
  group: string;
  tags: string[];
  size: number; // Node size based on connections
  color?: string;
  x?: number;
  y?: number;
  fx?: number | null; // Fixed position
  fy?: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'wiki-link' | 'related' | 'tag' | 'backlink';
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    groups: string[];
    orphans: string[]; // Nodes with no connections
    hubs: string[]; // Highly connected nodes
  };
}

export interface DocumentMap {
  [path: string]: {
    content: string;
    parsed: ParsedDocument;
  };
}

/**
 * Build graph from document map
 */
export function buildGraph(documents: DocumentMap): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const connectionCounts = new Map<string, number>();

  // First pass: Create nodes
  Object.entries(documents).forEach(([path, { parsed }]) => {
    const node = createNode(path, parsed);
    nodes.push(node);
    nodeMap.set(path, node);
    connectionCounts.set(path, 0);
  });

  // Second pass: Create edges
  Object.entries(documents).forEach(([sourcePath, { parsed }]) => {
    // Wiki-link edges
    parsed.links.forEach(link => {
      const targetPath = resolveWikiLink(link.text, documents);
      if (targetPath && targetPath !== sourcePath) {
        edges.push({
          source: sourcePath,
          target: targetPath,
          type: 'wiki-link',
          weight: 2
        });

        // Increment connection counts
        connectionCounts.set(sourcePath, (connectionCounts.get(sourcePath) || 0) + 1);
        connectionCounts.set(targetPath, (connectionCounts.get(targetPath) || 0) + 1);
      }
    });

    // Related docs edges (from frontmatter)
    const relatedDocs = getRelatedDocs(parsed.frontmatter);
    relatedDocs.forEach(related => {
      const targetPath = resolveWikiLink(related, documents);
      if (targetPath && targetPath !== sourcePath) {
        // Check if edge already exists
        const existingEdge = edges.find(
          e => e.source === sourcePath && e.target === targetPath
        );

        if (!existingEdge) {
          edges.push({
            source: sourcePath,
            target: targetPath,
            type: 'related',
            weight: 3
          });

          connectionCounts.set(sourcePath, (connectionCounts.get(sourcePath) || 0) + 1);
          connectionCounts.set(targetPath, (connectionCounts.get(targetPath) || 0) + 1);
        }
      }
    });

    // Tag-based connections (documents with same tags)
    Object.entries(documents).forEach(([otherPath, { parsed: otherParsed }]) => {
      if (otherPath === sourcePath) return;

      const sharedTags = parsed.tags.filter(tag => otherParsed.tags.includes(tag));
      if (sharedTags.length >= 2) {
        // Only create edge if they share 2+ tags
        const existingEdge = edges.find(
          e =>
            (e.source === sourcePath && e.target === otherPath) ||
            (e.source === otherPath && e.target === sourcePath)
        );

        if (!existingEdge) {
          edges.push({
            source: sourcePath,
            target: otherPath,
            type: 'tag',
            weight: sharedTags.length
          });
        }
      }
    });
  });

  // Update node sizes based on connections
  nodes.forEach(node => {
    node.size = Math.max(5, Math.min(20, (connectionCounts.get(node.id) || 0) * 2));
  });

  // Calculate stats
  const stats = calculateGraphStats(nodes, edges, connectionCounts);

  return { nodes, edges, stats };
}

/**
 * Create a graph node from a document
 */
function createNode(path: string, parsed: ParsedDocument): GraphNode {
  const filename = path.split('/').pop() || path;
  const label = parsed.frontmatter.title || filename.replace('.md', '');

  // Determine group from path or type
  let group = 'default';
  if (path.includes('Agents/')) group = 'agents';
  else if (path.includes('Architecture/')) group = 'architecture';
  else if (path.includes('Documentation/')) group = 'documentation';
  else if (path.includes('Experiments/')) group = 'experiments';
  else if (path.includes('Projects/')) group = 'projects';
  else if (path.includes('Sessions/')) group = 'sessions';
  else if (path.includes('Tasks/')) group = 'tasks';
  else if (parsed.frontmatter.type) group = parsed.frontmatter.type;

  return {
    id: path,
    label,
    path,
    type: parsed.frontmatter.type || 'document',
    group,
    tags: parsed.tags,
    size: 8,
    color: getGroupColor(group)
  };
}

/**
 * Resolve wiki-link to actual document path
 */
function resolveWikiLink(linkText: string, documents: DocumentMap): string | null {
  const searchName = linkText.toLowerCase();

  // Try exact match first
  for (const path of Object.keys(documents)) {
    const filename = path.split('/').pop()?.replace('.md', '').toLowerCase();
    if (filename === searchName) {
      return path;
    }
  }

  // Try partial match
  for (const path of Object.keys(documents)) {
    if (path.toLowerCase().includes(searchName)) {
      return path;
    }
  }

  return null;
}

/**
 * Get color for node group
 */
function getGroupColor(group: string): string {
  const colors: Record<string, string> = {
    agents: '#00D9FF',          // cyan
    architecture: '#FF00FF',     // magenta
    documentation: '#FFFF00',    // yellow
    experiments: '#00FF00',      // green
    projects: '#FF6B35',         // orange
    sessions: '#9D4EDD',         // purple
    tasks: '#06FFA5',            // mint
    default: '#7B89A8'          // gray-blue
  };

  return colors[group] || colors.default;
}

/**
 * Calculate graph statistics
 */
function calculateGraphStats(
  nodes: GraphNode[],
  edges: GraphEdge[],
  connectionCounts: Map<string, number>
): GraphData['stats'] {
  // Get unique groups
  const groups = [...new Set(nodes.map(n => n.group))];

  // Find orphans (no connections)
  const orphans = nodes
    .filter(n => (connectionCounts.get(n.id) || 0) === 0)
    .map(n => n.id);

  // Find hubs (highly connected, top 10%)
  const sortedByConnections = [...connectionCounts.entries()]
    .sort((a, b) => b[1] - a[1]);

  const hubThreshold = Math.ceil(nodes.length * 0.1);
  const hubs = sortedByConnections
    .slice(0, hubThreshold)
    .filter(([_, count]) => count >= 3)
    .map(([path, _]) => path);

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    groups,
    orphans,
    hubs
  };
}

/**
 * Filter graph by criteria
 */
export function filterGraph(
  graph: GraphData,
  filters: {
    groups?: string[];
    tags?: string[];
    searchTerm?: string;
    minConnections?: number;
  }
): GraphData {
  let { nodes, edges } = graph;

  // Filter by groups
  if (filters.groups && filters.groups.length > 0) {
    nodes = nodes.filter(n => filters.groups!.includes(n.group));
  }

  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    nodes = nodes.filter(n =>
      filters.tags!.some(tag => n.tags.includes(tag))
    );
  }

  // Filter by search term
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    nodes = nodes.filter(n =>
      n.label.toLowerCase().includes(term) ||
      n.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }

  // Filter by minimum connections
  if (filters.minConnections !== undefined) {
    const connectionCounts = new Map<string, number>();
    edges.forEach(edge => {
      connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
      connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
    });

    nodes = nodes.filter(n =>
      (connectionCounts.get(n.id) || 0) >= filters.minConnections!
    );
  }

  // Filter edges to only include nodes that remain
  const nodeIds = new Set(nodes.map(n => n.id));
  edges = edges.filter(e =>
    nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  // Recalculate stats
  const connectionCounts = new Map<string, number>();
  edges.forEach(edge => {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
  });

  const stats = calculateGraphStats(nodes, edges, connectionCounts);

  return { nodes, edges, stats };
}

/**
 * Get subgraph around a specific node
 */
export function getSubgraph(
  graph: GraphData,
  nodeId: string,
  depth: number = 1
): GraphData {
  const includedNodes = new Set<string>([nodeId]);
  const nodesToExplore = [nodeId];
  const exploredNodes = new Set<string>();

  // BFS to find connected nodes up to depth
  for (let d = 0; d < depth; d++) {
    const currentLevel = [...nodesToExplore];
    nodesToExplore.length = 0;

    currentLevel.forEach(currentNode => {
      if (exploredNodes.has(currentNode)) return;
      exploredNodes.add(currentNode);

      graph.edges.forEach(edge => {
        if (edge.source === currentNode && !includedNodes.has(edge.target)) {
          includedNodes.add(edge.target);
          nodesToExplore.push(edge.target);
        } else if (edge.target === currentNode && !includedNodes.has(edge.source)) {
          includedNodes.add(edge.source);
          nodesToExplore.push(edge.source);
        }
      });
    });
  }

  const nodes = graph.nodes.filter(n => includedNodes.has(n.id));
  const edges = graph.edges.filter(e =>
    includedNodes.has(e.source) && includedNodes.has(e.target)
  );

  const connectionCounts = new Map<string, number>();
  edges.forEach(edge => {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
  });

  const stats = calculateGraphStats(nodes, edges, connectionCounts);

  return { nodes, edges, stats };
}

/**
 * Calculate layout positions using force simulation
 */
export function calculateLayout(
  graph: GraphData,
  width: number,
  height: number
): GraphData {
  // Simple force-directed layout algorithm
  // For production, use D3's force simulation

  const { nodes, edges } = graph;
  const nodePositions = new Map<string, { x: number; y: number }>();

  // Initialize random positions
  nodes.forEach(node => {
    nodePositions.set(node.id, {
      x: Math.random() * width,
      y: Math.random() * height
    });
  });

  // Simple force simulation (simplified)
  const iterations = 100;
  const repulsionStrength = 50;
  const attractionStrength = 0.01;

  for (let i = 0; i < iterations; i++) {
    // Repulsion between all nodes
    nodes.forEach(nodeA => {
      const posA = nodePositions.get(nodeA.id)!;

      nodes.forEach(nodeB => {
        if (nodeA.id === nodeB.id) return;

        const posB = nodePositions.get(nodeB.id)!;
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = repulsionStrength / (distance * distance);
        posA.x -= (dx / distance) * force;
        posA.y -= (dy / distance) * force;
      });
    });

    // Attraction along edges
    edges.forEach(edge => {
      const posSource = nodePositions.get(edge.source)!;
      const posTarget = nodePositions.get(edge.target)!;

      const dx = posTarget.x - posSource.x;
      const dy = posTarget.y - posSource.y;

      const force = attractionStrength * edge.weight;
      posSource.x += dx * force;
      posSource.y += dy * force;
      posTarget.x -= dx * force;
      posTarget.y -= dy * force;
    });

    // Keep nodes in bounds
    nodes.forEach(node => {
      const pos = nodePositions.get(node.id)!;
      pos.x = Math.max(50, Math.min(width - 50, pos.x));
      pos.y = Math.max(50, Math.min(height - 50, pos.y));
    });
  }

  // Apply positions to nodes
  const positionedNodes = nodes.map(node => ({
    ...node,
    x: nodePositions.get(node.id)!.x,
    y: nodePositions.get(node.id)!.y
  }));

  return {
    ...graph,
    nodes: positionedNodes
  };
}
