'use client';

import { useEffect, useState, useRef, memo } from 'react';
import { X, RefreshCw, Monitor, Smartphone, Maximize2, Minimize2 } from 'lucide-react';

interface BrowserPreviewProps {
  url?: string;
  htmlContent?: string;
  onClose: () => void;
  projectPath?: string;
}

type ViewMode = 'desktop' | 'mobile';

function BrowserPreview({ url, htmlContent, onClose, projectPath }: BrowserPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string>(url || '');

  // Detect HTML files in the project
  useEffect(() => {
    const detectHtmlFiles = async () => {
      // Try multiple common project paths
      const pathsToCheck = [
        projectPath,
        'projects',
        'examples',
        'web-ui',
        '.',
      ].filter(Boolean);
      
      for (const checkPath of pathsToCheck) {
        try {
          const response = await fetch(`/api/projects/files?path=${encodeURIComponent(checkPath || '.')}&ext=html`);
          if (response.ok) {
            const data = await response.json();
            if (data.files && Array.isArray(data.files) && data.files.length > 0) {
              setDetectedUrls(data.files);
              if (!selectedUrl) {
                // Prefer index.html, otherwise use first file
                const indexFile = data.files.find((f: string) => f.toLowerCase().includes('index.html'));
                setSelectedUrl(indexFile || data.files[0]);
              }
              return; // Found files, stop searching
            }
          }
        } catch (error) {
          // Continue to next path
          console.warn(`Failed to check path ${checkPath}:`, error);
        }
      }
    };

    detectHtmlFiles();
    
    // Refresh periodically
    const interval = setInterval(detectHtmlFiles, 5000);
    return () => clearInterval(interval);
  }, [projectPath]);

  // Auto-refresh when content changes
  useEffect(() => {
    if (htmlContent || url) {
      setRefreshKey(prev => prev + 1);
    }
  }, [htmlContent, url]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const getPreviewUrl = () => {
    if (selectedUrl) {
      // If it's a full URL, use it directly
      if (selectedUrl.startsWith('http://') || selectedUrl.startsWith('https://')) {
        return selectedUrl;
      }
      // Otherwise, construct a local preview URL
      return `/api/projects/preview?path=${encodeURIComponent(selectedUrl)}`;
    }
    
    if (url) {
      // If url is a file path, use preview API
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `/api/projects/preview?path=${encodeURIComponent(url)}`;
      }
      return url;
    }
    
    if (htmlContent) {
      // Create a blob URL for inline HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      return URL.createObjectURL(blob);
    }
    
    return null;
  };

  const previewUrl = getPreviewUrl();

  return (
    <div
      className="fixed bottom-0 right-0 flex flex-col z-30 transition-all duration-300"
      style={{
        width: isExpanded ? '100%' : '50%',
        height: isExpanded ? '100%' : '60%',
        maxWidth: isExpanded ? '100%' : '50%',
        background: 'var(--terminal-bg)',
        borderTop: '2px solid var(--terminal-border)',
        borderLeft: '2px solid var(--terminal-border)',
        backdropFilter: 'blur(var(--blur-lg))',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--terminal-border)' }}>
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold font-mono flex items-center gap-2" style={{ color: 'var(--terminal-accent)' }}>
            <Monitor size={16} />
            Browser Preview
          </h3>
          
          {/* URL Selector */}
          {detectedUrls.length > 1 && (
            <select
              value={selectedUrl}
              onChange={(e) => setSelectedUrl(e.target.value)}
              className="px-2 py-1 text-xs rounded"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--text-primary)',
                border: '1px solid var(--terminal-border)',
              }}
            >
              {detectedUrls.map((url) => (
                <option key={url} value={url}>
                  {url.split('/').pop()}
                </option>
              ))}
            </select>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-1.5 rounded transition-opacity ${
                viewMode === 'desktop' ? 'bg-white/10' : 'opacity-50'
              }`}
              style={{ color: 'var(--text-secondary)' }}
              title="Desktop View"
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-1.5 rounded transition-opacity ${
                viewMode === 'mobile' ? 'bg-white/10' : 'opacity-50'
              }`}
              style={{ color: 'var(--text-secondary)' }}
              title="Mobile View"
            >
              <Smartphone size={14} />
            </button>
          </div>
          
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:opacity-70 transition-opacity rounded"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:opacity-70 transition-opacity rounded"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          
          <button
            onClick={onClose}
            className="p-1.5 hover:opacity-70 transition-opacity rounded hover:bg-red-500/20"
            style={{ color: 'var(--text-secondary)' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden bg-gray-900 p-4">
        {previewUrl ? (
          <div
            className="w-full h-full bg-white rounded overflow-hidden shadow-2xl"
            style={{
              maxWidth: viewMode === 'mobile' ? '375px' : '100%',
              margin: '0 auto',
              transition: 'max-width 0.3s ease',
            }}
          >
            <iframe
              ref={iframeRef}
              key={refreshKey}
              src={previewUrl}
              className="w-full h-full border-0"
              style={{
                minHeight: '400px',
              }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              title="Browser Preview"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-center">
              <Monitor size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">No preview available</p>
              <p className="text-xs mt-2 opacity-70">Waiting for HTML files to be created...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(BrowserPreview);

