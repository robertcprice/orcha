'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FolderOpen, Plus, ChevronDown } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface ProjectSelectorProps {
  onNewProject: () => void;
}

export default function ProjectSelector({ onNewProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

  // Stable callback for loading projects
  const loadProjects = useCallback(async () => {
    console.log('[ProjectSelector] Loading projects...');
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();

      console.log('[ProjectSelector] API response:', data);

      if (data.ok) {
        setProjects(data.projects || []);
        setCurrentProject(data.currentProject || null);
        console.log('[ProjectSelector] Set current project:', data.currentProject);
      } else {
        console.error('[ProjectSelector] API returned error:', data.error);
      }
    } catch (error) {
      console.error('[ProjectSelector] Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load projects on mount - use mounted ref to ensure it only runs once
  useEffect(() => {
    if (!hasMounted.current) {
      console.log('[ProjectSelector] Component mounted, loading projects');
      hasMounted.current = true;
      loadProjects();
    }
  }, [loadProjects]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function switchProject(projectId: string) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (data.ok) {
        setCurrentProject(projectId);
        setIsOpen(false);

        // Reload page to refresh with new project context
        window.location.reload();
      } else {
        console.error('Failed to switch project:', data.error);
        alert(`Failed to switch project: ${data.error}`);
      }
    } catch (error) {
      console.error('Error switching project:', error);
      alert('Failed to switch project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const currentProjectData = projects.find(p => p.id === currentProject);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
        style={{
          background: 'var(--glass-light)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
        }}
      >
        <FolderOpen size={18} />
        <span className="text-sm font-medium">
          {currentProjectData?.name || 'Select Project'}
        </span>
        <ChevronDown
          size={16}
          className="transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-64 rounded-lg shadow-2xl overflow-hidden"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
          }}
        >
          {/* New Project Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              onNewProject();
            }}
            className="w-full px-4 py-3 flex items-center gap-3 transition-colors hover:bg-opacity-50"
            style={{
              background: 'var(--glass-light)',
              borderBottom: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
            }}
          >
            <Plus size={18} />
            <span className="text-sm font-medium">New Project</span>
          </button>

          {/* Project List */}
          <div className="max-h-64 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm opacity-60">
                No projects yet
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => switchProject(project.id)}
                  disabled={project.id === currentProject || isLoading}
                  className="w-full px-4 py-3 text-left transition-colors"
                  style={{
                    background: project.id === currentProject ? 'var(--glass-medium)' : 'transparent',
                    color: 'var(--text-primary)',
                    opacity: project.id === currentProject ? 1 : 0.8,
                    cursor: project.id === currentProject ? 'default' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (project.id !== currentProject) {
                      e.currentTarget.style.background = 'var(--glass-light)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (project.id !== currentProject) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div className="font-medium text-sm">{project.name}</div>
                  {project.description && (
                    <div className="text-xs opacity-60 mt-1 line-clamp-1">
                      {project.description}
                    </div>
                  )}
                  {project.id === currentProject && (
                    <div className="text-xs mt-1" style={{ color: 'var(--accent-primary)' }}>
                      ● Active
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
