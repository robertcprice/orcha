import fs from 'fs';
import path from 'path';

export interface Project {
  name: string;
  path: string;
  hasObsidianVault: boolean;
  vaultPath?: string;
  lastModified: number;
}

export interface VaultFile {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: VaultFile[];
  content?: string;
}

// Base directory to scan for projects
const PROJECTS_BASE_PATH = '/Users/bobbyprice/projects/Smart Market Solutions';

/**
 * Discover all projects in the base directory
 */
export function discoverProjects(): Project[] {

  const projects: Project[] = [];

  try {

    const entries = fs.readdirSync(PROJECTS_BASE_PATH, { withFileTypes: true });

    for (const entry of entries) {

      if (!entry.isDirectory() || entry.name.startsWith('.')) {

        continue;
      }

      const projectPath = path.join(PROJECTS_BASE_PATH, entry.name);
      const vaultPath = path.join(projectPath, 'obsidian-vault');
      const hasObsidianVault = fs.existsSync(vaultPath);

      const stats = fs.statSync(projectPath);

      projects.push({
        name: entry.name,
        path: projectPath,
        hasObsidianVault,
        vaultPath: hasObsidianVault ? vaultPath : undefined,
        lastModified: stats.mtimeMs
      });
    }

  } catch (error) {

    console.error('Error discovering projects:', error);
  }

  return projects.sort((a, b) => b.lastModified - a.lastModified);
}

/**
 * Get vault structure as a tree
 */
export function getVaultStructure(vaultPath: string): VaultFile | null {

  try {

    if (!fs.existsSync(vaultPath)) {

      return null;
    }

    return buildFileTree(vaultPath, vaultPath);

  } catch (error) {

    console.error('Error reading vault structure:', error);
    return null;
  }
}

/**
 * Recursively build file tree
 */
function buildFileTree(fullPath: string, basePath: string): VaultFile {

  const stats = fs.statSync(fullPath);
  const relativePath = path.relative(basePath, fullPath);
  const name = path.basename(fullPath);

  const file: VaultFile = {
    name: name || 'root',
    path: relativePath || '/',
    isDirectory: stats.isDirectory()
  };

  if (stats.isDirectory()) {

    // Skip hidden directories except .obsidian
    if (name.startsWith('.') && name !== '.obsidian') {

      file.children = [];
      return file;
    }

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });

    file.children = entries
      .filter(entry => !entry.name.startsWith('.') || entry.name === '.obsidian')
      .map(entry => buildFileTree(path.join(fullPath, entry.name), basePath))
      .sort((a, b) => {

        // Directories first
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
  }

  return file;
}

/**
 * Read file content from vault
 */
export function readVaultFile(vaultPath: string, filePath: string): string | null {

  try {

    const fullPath = path.join(vaultPath, filePath);

    // Security check: ensure file is within vault
    if (!fullPath.startsWith(vaultPath)) {

      console.error('Security violation: attempted to read file outside vault');
      return null;
    }

    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {

      return null;
    }

    return fs.readFileSync(fullPath, 'utf-8');

  } catch (error) {

    console.error('Error reading vault file:', error);
    return null;
  }
}

/**
 * Get mind map data from vault index
 */
export function getMindMapData(vaultPath: string): any {

  try {

    const indexPath = path.join(vaultPath, '00-Index');

    if (!fs.existsSync(indexPath)) {

      return { nodes: [], edges: [] };
    }

    // Read key index files
    const statusFile = path.join(indexPath, 'CURRENT_PROJECT_STATUS.md');
    const workFile = path.join(indexPath, 'CURRENT_WORK_STATUS.md');

    const nodes: any[] = [
      {
        id: 'root',
        label: path.basename(path.dirname(vaultPath)),
        type: 'project'
      }
    ];

    const edges: any[] = [];

    // Add status nodes if they exist
    if (fs.existsSync(statusFile)) {

      nodes.push({
        id: 'project-status',
        label: 'Project Status',
        type: 'status'
      });
      edges.push({ from: 'root', to: 'project-status' });
    }

    if (fs.existsSync(workFile)) {

      nodes.push({
        id: 'work-status',
        label: 'Work Status',
        type: 'status'
      });
      edges.push({ from: 'root', to: 'work-status' });
    }

    // Add category nodes
    const categories = fs.readdirSync(vaultPath, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => entry.name);

    categories.forEach(category => {

      nodes.push({
        id: category,
        label: category.replace(/^\d+-/, ''),
        type: 'category'
      });
      edges.push({ from: 'root', to: category });
    });

    return { nodes, edges };

  } catch (error) {

    console.error('Error generating mind map:', error);
    return { nodes: [], edges: [] };
  }
}
