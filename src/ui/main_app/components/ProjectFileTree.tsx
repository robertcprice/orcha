"use client";

import { useState, useEffect } from "react";
import { Folder, File, ChevronRight, ChevronDown, Code, FileText } from "lucide-react";
import { GlassPanel, designTokens } from "@/components/design-system";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  size?: number;
}

export default function ProjectFileTree() {
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFileTree = async () => {
      try {
        const response = await fetch("/api/files/tree");
        if (response.ok) {
          const data = await response.json();
          setFileTree(data.tree);
        }
      } catch (error) {
        console.error("Failed to fetch file tree:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFileTree();
  }, []);

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.path);
    const isDirectory = node.type === "directory";

    return (
      <div key={node.path}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: designTokens.spacing.xs,
            padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
            paddingLeft: `calc(${designTokens.spacing.sm} + ${depth * 20}px)`,
            cursor: isDirectory ? "pointer" : "default",
            borderRadius: "4px",
            transition: "background-color 0.2s",
          }}
          onClick={() => isDirectory && toggleExpand(node.path)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = designTokens.colors.structure.surface.secondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {isDirectory && (
            <>
              {isExpanded ? (
                <ChevronDown style={{ width: "14px", height: "14px", color: designTokens.colors.text.tertiary }} />
              ) : (
                <ChevronRight style={{ width: "14px", height: "14px", color: designTokens.colors.text.tertiary }} />
              )}
              <Folder style={{ width: "16px", height: "16px", color: designTokens.colors.accent.brown }} />
            </>
          )}
          {!isDirectory && (
            <>
              <div style={{ width: "14px" }} />
              {node.name.match(/\.(ts|tsx|js|jsx|py)$/) ? (
                <Code style={{ width: "16px", height: "16px", color: designTokens.colors.accent.blue }} />
              ) : (
                <FileText style={{ width: "16px", height: "16px", color: designTokens.colors.text.tertiary }} />
              )}
            </>
          )}
          <span
            style={{
              fontSize: designTokens.typography.sizes.sm,
              fontFamily: designTokens.typography.fonts.mono,
              color: designTokens.colors.text.primary,
            }}
          >
            {node.name}
          </span>
          {!isDirectory && node.size && (
            <span
              style={{
                fontSize: designTokens.typography.sizes.xs,
                color: designTokens.colors.text.tertiary,
                marginLeft: "auto",
              }}
            >
              {(node.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>
        {isDirectory && isExpanded && node.children && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <GlassPanel
      bordered
      borderColor={designTokens.colors.structure.border.primary}
      rounded="md"
      shadow
      style={{ padding: designTokens.spacing.lg, maxHeight: "600px", overflow: "auto" }}
    >
      <h3
        style={{
          fontSize: designTokens.typography.sizes.xl,
          fontFamily: designTokens.typography.fonts.header,
          fontWeight: designTokens.typography.weights.semibold,
          color: designTokens.colors.accent.brown,
          marginBottom: designTokens.spacing.md,
        }}
      >
        Project Files
      </h3>

      {loading ? (
        <div
          style={{
            padding: designTokens.spacing.xl,
            textAlign: "center",
            color: designTokens.colors.text.tertiary,
            fontFamily: designTokens.typography.fonts.mono,
            fontSize: designTokens.typography.sizes.sm,
          }}
        >
          Loading file tree...
        </div>
      ) : fileTree ? (
        <div>{fileTree.children?.map((child) => renderNode(child, 0))}</div>
      ) : (
        <div
          style={{
            padding: designTokens.spacing.xl,
            textAlign: "center",
            color: designTokens.colors.text.tertiary,
            fontFamily: designTokens.typography.fonts.mono,
            fontSize: designTokens.typography.sizes.sm,
          }}
        >
          No files found
        </div>
      )}
    </GlassPanel>
  );
}
