import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

// Store active dev servers
const activeServers = new Map<string, { port: number; process: any }>();

async function findHTMLFiles(directory: string): Promise<string[]> {
  try {
    const files = await fs.readdir(directory, { recursive: true });
    return files.filter(file =>
      file.endsWith('.html') ||
      file.endsWith('.htm')
    ).map(file => path.join(directory, file));
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
}

async function startDevServer(projectPath: string): Promise<{ port: number; url: string }> {
  // Check if server already running for this project
  if (activeServers.has(projectPath)) {
    const existing = activeServers.get(projectPath)!;
    return { port: existing.port, url: `http://localhost:${existing.port}` };
  }

  // Find an available port (start from 3001)
  const port = 3001 + activeServers.size;

  try {
    // Check if package.json exists (Node project)
    const packageJsonPath = path.join(projectPath, 'package.json');
    let serverProcess;

    try {
      await fs.access(packageJsonPath);
      // Node project exists - try npm run dev or npm start
      console.log('Starting npm dev server for', projectPath);
      serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: projectPath,
        stdio: 'ignore',
        detached: true
      });
    } catch {
      // No package.json - use Python HTTP server
      console.log('Starting Python HTTP server for', projectPath);
      serverProcess = spawn('python3', ['-m', 'http.server', port.toString()], {
        cwd: projectPath,
        stdio: 'ignore',
        detached: true
      });
    }

    // Store the process
    activeServers.set(projectPath, { port, process: serverProcess });

    // Clean up on process exit
    serverProcess.on('exit', () => {
      activeServers.delete(projectPath);
    });

    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    return { port, url: `http://localhost:${port}` };
  } catch (error) {
    console.error('Failed to start dev server:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the current project directory
    // Default to the projects directory if no specific project selected
    const projectsRoot = path.join(process.cwd(), '..', 'projects');

    // Try to get current project from file
    const currentProjectFile = path.join(projectsRoot, '..', 'current-project.txt');
    let currentProject = 'default';

    try {
      currentProject = await fs.readFile(currentProjectFile, 'utf-8').then(s => s.trim());
    } catch {
      console.log('No current project file, using default');
    }

    const projectPath = path.join(projectsRoot, currentProject, 'outputs');

    // Check if project outputs directory exists
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json({
        error: 'No project outputs found',
        message: 'The project outputs directory does not exist'
      }, { status: 404 });
    }

    // Find HTML files in the project
    const htmlFiles = await findHTMLFiles(projectPath);

    if (htmlFiles.length === 0) {
      return NextResponse.json({
        error: 'No viewable files found',
        message: 'No HTML files were created in this project',
        projectPath
      }, { status: 404 });
    }

    // Start a dev server for the project
    const server = await startDevServer(projectPath);

    // Return the URL to the first HTML file (usually index.html)
    const indexFile = htmlFiles.find(f => f.includes('index.html')) || htmlFiles[0];
    const relativePath = path.relative(projectPath, indexFile);

    return NextResponse.json({
      success: true,
      url: `${server.url}/${relativePath}`,
      port: server.port,
      projectPath,
      files: htmlFiles.map(f => path.relative(projectPath, f)),
      type: 'web_app'
    });
  } catch (error: any) {
    console.error('Error detecting results:', error);
    return NextResponse.json({
      error: 'Failed to detect results',
      message: error.message
    }, { status: 500 });
  }
}

// Clean up servers on shutdown
process.on('SIGTERM', () => {
  activeServers.forEach(({ process }) => {
    try {
      process.kill();
    } catch (e) {
      console.error('Error killing server process:', e);
    }
  });
});
