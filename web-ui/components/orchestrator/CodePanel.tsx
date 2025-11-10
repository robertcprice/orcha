'use client';

import { useEffect, useState, useRef, memo } from 'react';
import { X, FileCode, Folder, ChevronRight, ChevronDown } from 'lucide-react';

interface CodeFile {
  path: string;
  content: string;
  language?: string;
  lastModified?: string;
}

interface CodePanelProps {
  files: CodeFile[];
  onClose: () => void;
  selectedFile?: string;
  onFileSelect?: (path: string) => void;
}

function CodePanel({ files, onClose, selectedFile, onFileSelect }: CodePanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [localSelectedFile, setLocalSelectedFile] = useState<string>(selectedFile || '');
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (selectedFile) {
      setLocalSelectedFile(selectedFile);
    }
  }, [selectedFile]);

  const selectedFileContent = files.find(f => f.path === localSelectedFile);

  const getFileTree = () => {
    const tree: Record<string, any> = {};
    
    files.forEach(file => {
      const parts = file.path.split('/');
      let current = tree;
      
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // File
          current[part] = { type: 'file', path: file.path, ...file };
        } else {
          // Folder
          if (!current[part]) {
            current[part] = { type: 'folder', children: {} };
          }
          current = current[part].children;
        }
      });
    });
    
    return tree;
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const handleFileClick = (path: string) => {
    setLocalSelectedFile(path);
    if (onFileSelect) {
      onFileSelect(path);
    }
  };

  const renderTree = (tree: Record<string, any>, path = '', depth = 0) => {
    const entries = Object.entries(tree).sort(([a], [b]) => {
      const aIsFolder = tree[a].type === 'folder';
      const bIsFolder = tree[b].type === 'folder';
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      return a.localeCompare(b);
    });

    return (
      <div style={{ paddingLeft: `${depth * 12}px` }}>
        {entries.map(([name, item]) => {
          const fullPath = path ? `${path}/${name}` : name;
          
          if (item.type === 'folder') {
            const isExpanded = expandedFolders.has(fullPath);
            return (
              <div key={fullPath}>
                <div
                  className="flex items-center gap-1 py-1 px-2 hover:bg-white/5 cursor-pointer rounded"
                  onClick={() => toggleFolder(fullPath)}
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={14} />
                  <span className="text-xs">{name}</span>
                </div>
                {isExpanded && item.children && (
                  <div>{renderTree(item.children, fullPath, depth + 1)}</div>
                )}
              </div>
            );
          } else {
            return (
              <div
                key={fullPath}
                className={`flex items-center gap-1 py-1 px-2 hover:bg-white/5 cursor-pointer rounded ${
                  localSelectedFile === fullPath ? 'bg-white/10' : ''
                }`}
                onClick={() => handleFileClick(fullPath)}
                style={{ 
                  color: localSelectedFile === fullPath ? 'var(--terminal-accent)' : 'var(--text-secondary)'
                }}
              >
                <FileCode size={14} />
                <span className="text-xs">{name}</span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  const detectLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'sh': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
    };
    return langMap[ext || ''] || 'text';
  };

  const highlightCode = (code: string, language: string): string => {
    // Basic syntax highlighting - can be enhanced with a library later
    // For now, just return the code with basic formatting
    return code;
  };

  return (
    <div
      className="fixed left-0 top-0 h-full flex flex-col z-30 transition-all duration-300"
      style={{
        width: '35%',
        background: 'var(--terminal-bg)',
        borderRight: '2px solid var(--terminal-border)',
        backdropFilter: 'blur(var(--blur-lg))',
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--terminal-border)' }}>
        <h3 className="text-sm font-semibold font-mono flex items-center gap-2" style={{ color: 'var(--terminal-accent)' }}>
          <FileCode size={16} />
          Code Panel
        </h3>
        <button 
          onClick={onClose} 
          className="p-1.5 hover:opacity-70 transition-opacity rounded hover:bg-red-500/20" 
          style={{ color: 'var(--text-secondary)' }}
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Split View: File Tree and Code */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree */}
        <div 
          className="w-1/3 border-r overflow-y-auto"
          style={{ 
            borderColor: 'var(--terminal-border)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div className="p-2">
            {files.length === 0 ? (
              <div className="text-xs text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                No files available yet...
              </div>
            ) : (
              renderTree(getFileTree())
            )}
          </div>
        </div>

        {/* Code Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFileContent ? (
            <>
              <div 
                className="px-4 py-2 border-b text-xs font-mono"
                style={{ 
                  borderColor: 'var(--terminal-border)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                }}
              >
                {selectedFileContent.path} • {detectLanguage(selectedFileContent.path)}
              </div>
              <pre
                ref={codeRef}
                className="flex-1 overflow-auto p-4 font-mono text-sm"
                style={{ 
                  color: 'var(--terminal-text)',
                  whiteSpace: 'pre',
                  wordBreak: 'normal',
                  overflowWrap: 'normal',
                }}
              >
                <code>{selectedFileContent.content}</code>
              </pre>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
              <div className="text-center">
                <FileCode size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm">Select a file to view code</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CodePanel);

