import fs from 'fs';
import path from 'path';

export interface Project {
  id: string;
  name: string;
  description?: string;
  created: string;
  updated: string;
  path: string;
  hasObsidianVault: boolean;
  vaultPath?: string;
  lastModified: number;
  isCurrent?: boolean;
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

// Orchestration System projects directory
const getOrchestratorProjectsPath = () => {
  return path.join(PROJECTS_BASE_PATH, 'Orchestration-System', 'projects');
};

const getCurrentProjectPath = () => {
  return path.join(PROJECTS_BASE_PATH, 'Orchestration-System', 'current-project.txt');
};

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
    return { nodes, edges: [] };
  }
}

/**
 * List orchestrator projects
 */
export function listOrchestratorProjects(): Project[] {
  const projectsPath = getOrchestratorProjectsPath();
  const projects: Project[] = [];

  try {
    if (!fs.existsSync(projectsPath)) {
      return [];
    }

    const currentProjectId = getCurrentProject();
    const entries = fs.readdirSync(projectsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectPath = path.join(projectsPath, entry.name);
      const metadataPath = path.join(projectPath, 'metadata.json');

      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        const vaultPath = path.join(projectPath, 'obsidian-vault');
        const stats = fs.statSync(projectPath);

        projects.push({
          id: entry.name,
          ...metadata,
          path: projectPath,
          hasObsidianVault: fs.existsSync(vaultPath),
          vaultPath: fs.existsSync(vaultPath) ? vaultPath : undefined,
          lastModified: stats.mtimeMs,
          isCurrent: entry.name === currentProjectId,
        });
      } catch (error) {
        console.error(`Failed to read project ${entry.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error listing orchestrator projects:', error);
  }

  return projects.sort((a, b) => b.lastModified - a.lastModified);
}

/**
 * Create a new orchestrator project
 */
export function createOrchestratorProject(name: string, description?: string): Project {
  const projectsPath = getOrchestratorProjectsPath();

  // Ensure projects directory exists
  if (!fs.existsSync(projectsPath)) {
    fs.mkdirSync(projectsPath, { recursive: true });
  }

  // Create project ID (slugify)
  const projectId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const projectPath = path.join(projectsPath, projectId);

  if (fs.existsSync(projectPath)) {
    throw new Error('Project already exists');
  }

  // Create project structure
  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'tasks', 'pending'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'tasks', 'active'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'tasks', 'completed'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'tasks', 'failed'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'tasks', 'archived'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'obsidian-vault'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'state'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'outputs'), { recursive: true });

  // Create metadata
  const metadata = {
    name,
    description: description || '',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(projectPath, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // Create initial state
  const initialState = {
    projectId,
    created: new Date().toISOString(),
    tasks: { pending: 0, active: 0, completed: 0, failed: 0 },
  };

  fs.writeFileSync(
    path.join(projectPath, 'state', 'current.json'),
    JSON.stringify(initialState, null, 2)
  );

  // Create README in obsidian vault
  const readme = `# ${name}\n\n${description || 'Project workspace for orchestration tasks.'}\n\nCreated: ${new Date().toLocaleString()}\n`;
  fs.writeFileSync(
    path.join(projectPath, 'obsidian-vault', 'README.md'),
    readme
  );

  const vaultPath = path.join(projectPath, 'obsidian-vault');
  const stats = fs.statSync(projectPath);

  return {
    id: projectId,
    ...metadata,
    path: projectPath,
    hasObsidianVault: true,
    vaultPath,
    lastModified: stats.mtimeMs,
  };
}

/**
 * Delete an orchestrator project
 */
export function deleteOrchestratorProject(projectId: string): void {
  const currentProjectId = getCurrentProject();

  if (currentProjectId === projectId) {
    throw new Error('Cannot delete the current project. Switch to another project first.');
  }

  const projectsPath = getOrchestratorProjectsPath();
  const projectPath = path.join(projectsPath, projectId);

  if (!fs.existsSync(projectPath)) {
    throw new Error('Project not found');
  }

  fs.rmSync(projectPath, { recursive: true, force: true });
}

/**
 * Get current project ID
 */
export function getCurrentProject(): string | null {
  const currentProjectPath = getCurrentProjectPath();

  try {
    if (fs.existsSync(currentProjectPath)) {
      return fs.readFileSync(currentProjectPath, 'utf-8').trim();
    }
  } catch (error) {
    console.error('Error reading current project:', error);
  }

  return null;
}

/**
 * Set current project
 */
export function setCurrentProject(projectId: string): void {
  const projectsPath = getOrchestratorProjectsPath();
  const projectPath = path.join(projectsPath, projectId);

  if (!fs.existsSync(projectPath)) {
    throw new Error('Project not found');
  }

  const currentProjectPath = getCurrentProjectPath();
  fs.writeFileSync(currentProjectPath, projectId);
}

/**
 * Get orchestrator project by ID
 */
export function getOrchestratorProject(projectId: string): Project | null {
  const projects = listOrchestratorProjects();
  return projects.find(p => p.id === projectId) || null;
}
