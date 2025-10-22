"use client";

import { useState, useEffect } from 'react';
import { FolderOpen, Database, ChevronDown } from 'lucide-react';

interface Project {
  name: string;
  path: string;
  hasObsidianVault: boolean;
  vaultPath?: string;
  lastModified: number;
}

interface ProjectSelectorProps {
  onProjectChange: (project: Project | null) => void;
}

export default function ProjectSelector({ onProjectChange }: ProjectSelectorProps) {

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    fetchProjects();
  }, []);

  const fetchProjects = async () => {

    try {

      const response = await fetch('/api/projects');
      const data = await response.json();

      // Filter to only show projects with Obsidian vaults
      const projectsWithVaults = data.filter((p: Project) => p.hasObsidianVault);
      setProjects(projectsWithVaults);

      // Auto-select first project
      if (projectsWithVaults.length > 0 && !selectedProject) {

        handleSelectProject(projectsWithVaults[0]);
      }

    } catch (error) {

      console.error('Failed to fetch projects:', error);

    } finally {

      setLoading(false);
    }
  };

  const handleSelectProject = (project: Project) => {

    setSelectedProject(project);
    setIsOpen(false);
    onProjectChange(project);
  };

  if (loading) {

    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <FolderOpen className="w-4 h-4 animate-pulse" />
        <span className="text-sm">Loading projects...</span>
      </div>
    );
  }

  if (projects.length === 0) {

    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Database className="w-4 h-4" />
        <span className="text-sm">No projects with Obsidian vaults found</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-secondary/30 border border-primary/50 rounded-lg hover:bg-secondary/50 hover:border-primary transition-all"
      >
        <FolderOpen className="w-4 h-4 text-primary" />
        <span className="font-medium">{selectedProject?.name || 'Select Project'}</span>
        <ChevronDown className={`w-4 h-4 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full min-w-[300px] bg-secondary/95 backdrop-blur-sm border border-primary/50 rounded-lg shadow-lg shadow-primary/10 z-50">
          <div className="p-2 space-y-1">
            {projects.map((project) => (
              <button
                key={project.path}
                onClick={() => handleSelectProject(project)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  selectedProject?.path === project.path
                    ? 'bg-primary/20 border border-primary text-primary'
                    : 'hover:bg-secondary border border-transparent hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {project.hasObsidianVault && (
                    <Database className="w-3 h-3 text-primary" />
                  )}
                  <span className="text-sm font-medium">{project.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {project.path}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
