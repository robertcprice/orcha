'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, BookOpen, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import TaskHistoryDropdown from './TaskHistoryDropdown';
import ProjectSelector from './ProjectSelector';
import NewProjectModal from './NewProjectModal';

interface MinimalistTopBarProps {
  onTaskClick?: (taskId: string) => void;
}

export default function MinimalistTopBar({ onTaskClick }: MinimalistTopBarProps) {
  const { theme, themeId, toggleTheme } = useTheme();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-0.5"
        style={{
          background: 'rgba(0, 0, 0, 0.12)', // ✅ FIX: Even more transparent to prevent glow cutoff
          backdropFilter: 'blur(6px)', // Reduced blur for better transparency
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <TaskHistoryDropdown onTaskClick={onTaskClick} />

        {/* Project Selector - Center */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <ProjectSelector onNewProject={() => setIsNewProjectModalOpen(true)} />
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg" style={{ background: 'var(--glass-light)', border: '1px solid var(--glass-border)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </Link>

          <button onClick={toggleTheme} className="p-2 rounded-lg" style={{ background: 'var(--glass-light)', border: '1px solid var(--glass-border)' }}>
            {themeId === 'minimalist' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Link href="/docs" className="p-2 rounded-lg" style={{ background: 'var(--glass-light)', border: '1px solid var(--glass-border)' }}>
            <BookOpen size={18} />
          </Link>

          <Link href="/settings" className="p-2 rounded-lg" style={{ background: 'var(--glass-light)', border: '1px solid var(--glass-border)' }}>
            <Settings size={18} />
          </Link>
        </div>
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onProjectCreated={() => {
          // Modal will reload page after project creation
        }}
      />
    </>
  );
}
