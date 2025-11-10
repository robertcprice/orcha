'use client';

import { useState } from 'react';
import { X, FolderPlus, Loader2 } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export default function NewProjectModal({ isOpen, onClose, onProjectCreated }: NewProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleCreate() {
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        // Switch to the newly created project
        const switchResponse = await fetch('/api/projects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: data.project.id }),
        });

        if (switchResponse.ok) {
          setProjectName('');
          setDescription('');
          onProjectCreated();
          onClose();

          // Reload page to refresh with new project context
          setTimeout(() => window.location.reload(), 100);
        } else {
          setError('Project created but failed to switch to it');
        }
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  function handleClose() {
    if (!isCreating) {
      setProjectName('');
      setDescription('');
      setError(null);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg shadow-2xl p-6"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FolderPlus size={24} style={{ color: 'var(--accent-primary)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Create New Project
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="p-1 rounded hover:bg-opacity-80 transition-colors"
            style={{ background: 'var(--glass-light)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Project Name */}
          <div>
            <label
              htmlFor="project-name"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Project Name *
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setError(null);
              }}
              placeholder="My Awesome Project"
              disabled={isCreating}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{
                background: 'var(--glass-light)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="project-description"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Description (Optional)
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your project..."
              disabled={isCreating}
              rows={3}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all resize-none"
              style={{
                background: 'var(--glass-light)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="px-4 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              background: 'var(--glass-light)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !projectName.trim()}
            className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            style={{
              background: projectName.trim() ? 'var(--accent-primary)' : 'var(--glass-medium)',
              color: 'white',
              opacity: isCreating || !projectName.trim() ? 0.5 : 1,
              cursor: isCreating || !projectName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {isCreating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
