"use client";

import { useState, useEffect } from "react";
import { FolderOpen, Plus, Trash2, Check, X, Loader2, FolderPlus } from "lucide-react";
import ProjectInitializationChat from "./ProjectInitializationChat";

interface Project {
  id: string;
  name: string;
  description?: string;
  created: string;
  updated: string;
  isCurrent?: boolean;
}

export default function ProjectManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [initializingProject, setInitializingProject] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  // Fetch current project on mount to display button correctly
  useEffect(() => {
    fetchCurrentProject();
  }, []);

  const fetchCurrentProject = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (data.ok) {
        setProjects(data.projects || []);
        setCurrentProjectState(data.currentProject);
      }
    } catch (error) {
      console.error("Failed to fetch current project:", error);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (data.ok) {
        setProjects(data.projects || []);
        setCurrentProjectState(data.currentProject);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        const projectName = newProjectName;
        setNewProjectName("");
        setNewProjectDescription("");
        setShowCreateForm(false);
        setIsOpen(false);

        // Switch to new project first
        await switchProjectWithoutReload(data.project.id);

        // Show initialization chat
        setInitializingProject({
          id: data.project.id,
          name: projectName,
        });
      } else {
        alert(data.error || "Failed to create project");
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const switchProjectWithoutReload = async (projectId: string) => {
    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();
      if (data.ok) {
        setCurrentProjectState(projectId);
      }
    } catch (error) {
      console.error("Failed to switch project:", error);
    }
  };

  const switchProject = async (projectId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();
      if (data.ok) {
        setCurrentProjectState(projectId);
        // Reload the page to update all project-scoped data
        window.location.reload();
      } else {
        alert(data.error || "Failed to switch project");
      }
    } catch (error) {
      console.error("Failed to switch project:", error);
      alert("Failed to switch project");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects?id=${projectId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.ok) {
        setDeleteConfirm(null);
        await fetchProjects();
      } else {
        alert(data.error || "Failed to delete project");
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project");
    } finally {
      setLoading(false);
    }
  };

  const handleInitializationComplete = (readme: string) => {
    console.log("✓ Project initialization complete");
    console.log("README generated:", readme.substring(0, 100) + "...");
    setInitializingProject(null);
    // Reload to show updated project
    window.location.reload();
  };

  const handleInitializationSkip = () => {
    console.log("✓ Project initialization skipped");
    setInitializingProject(null);
    // Reload to show updated project
    window.location.reload();
  };

  if (!isOpen && !initializingProject) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-all"
      >
        <FolderOpen className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">
          {currentProject ? `Project: ${projects.find(p => p.id === currentProject)?.name || currentProject}` : "No Project"}
        </span>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-background border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-6 h-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">Project Manager</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your orchestration projects
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Create Project Button/Form */}
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Create New Project</span>
              </button>
            ) : (
              <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-primary" />
                  New Project
                </h3>
                <div>
                  <label className="text-sm font-medium block mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., E-commerce Platform"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Description (optional)</label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Describe your project..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none transition-all resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewProjectName("");
                      setNewProjectDescription("");
                    }}
                    className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Projects List */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground px-2">
                Your Projects ({projects.length})
              </h3>

              {loading && projects.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No projects yet. Create one to get started!</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className={`rounded-lg border p-4 transition-all ${
                      project.isCurrent
                        ? "bg-primary/10 border-primary"
                        : "bg-secondary/30 border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground truncate">
                            {project.name}
                          </h4>
                          {project.isCurrent && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary">
                              Current
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>ID: {project.id}</span>
                          <span>Created: {new Date(project.created).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!project.isCurrent && (
                          <button
                            onClick={() => switchProject(project.id)}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/80 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            Load
                          </button>
                        )}
                        {!project.isCurrent && (
                          deleteConfirm === project.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteProject(project.id)}
                                disabled={loading}
                                className="px-2 py-1.5 rounded-lg bg-error hover:bg-error/80 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(project.id)}
                              disabled={loading}
                              className="p-2 rounded-lg hover:bg-error/20 text-error disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              title="Delete project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Initialization Chat */}
      {initializingProject && (
        <ProjectInitializationChat
          projectId={initializingProject.id}
          projectName={initializingProject.name}
          onComplete={handleInitializationComplete}
          onSkip={handleInitializationSkip}
        />
      )}
    </>
  );
}
