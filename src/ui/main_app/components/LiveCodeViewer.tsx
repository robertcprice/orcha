"use client";

import { useState, useEffect, useRef } from "react";
import { Code, Play, Terminal } from "lucide-react";
import { GlassPanel, designTokens } from "@/components/design-system";

interface CodeEvent {
  timestamp: string;
  file_path: string;
  operation: "write" | "edit" | "delete";
  content: string;
  language: string;
}

export default function LiveCodeViewer() {
  const [codeEvents, setCodeEvents] = useState<CodeEvent[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to code events stream
    const eventSource = new EventSource("/api/code/stream");

    eventSource.onmessage = (event) => {
      try {
        const rawEvent: CodeEvent = JSON.parse(event.data);
        const safePath = rawEvent.file_path || "(untitled)";
        const codeEvent: CodeEvent = { ...rawEvent, file_path: safePath };

        setCodeEvents((prev) => [...prev, codeEvent].slice(-10)); // Keep last 10 events

        if (!currentFile || safePath === currentFile) {
          setCurrentFile(safePath);
          setCurrentContent(codeEvent.content || "");
        }
      } catch (error) {
        console.error("Failed to parse code event:", error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentFile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentContent]);

  return (
    <GlassPanel
      bordered
      borderColor={designTokens.colors.structure.border.primary}
      rounded="md"
      shadow
      style={{ padding: designTokens.spacing.lg }}
    >
      <div style={{ marginBottom: designTokens.spacing.md }}>
        <h3
          style={{
            fontSize: designTokens.typography.sizes.xl,
            fontFamily: designTokens.typography.fonts.header,
            fontWeight: designTokens.typography.weights.semibold,
            color: designTokens.colors.accent.blue,
            display: "flex",
            alignItems: "center",
            gap: designTokens.spacing.sm,
          }}
        >
          <Code style={{ width: "20px", height: "20px" }} />
          Live Code Editor
        </h3>
        <p
          style={{
            color: designTokens.colors.text.tertiary,
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fonts.mono,
          }}
        >
          Watch agents write code in real-time
        </p>
      </div>

      {/* Recent Files */}
      {codeEvents.length > 0 && (
        <div style={{ marginBottom: designTokens.spacing.md }}>
          <div
            style={{
              display: "flex",
              gap: designTokens.spacing.xs,
              flexWrap: "wrap",
            }}
          >
            {Array.from(
              new Set(
                codeEvents
                  .map((e) => e.file_path)
                  .filter((path): path is string => typeof path === "string" && path.length > 0)
              )
            ).map((filePath) => (
              <button
                key={filePath}
                onClick={() => {
                  setCurrentFile(filePath);
                  const latestEvent = codeEvents
                    .filter((e) => e.file_path === filePath)
                    .slice(-1)[0];
                  if (latestEvent) {
                    setCurrentContent(latestEvent.content || "");
                  }
                }}
                style={{
                  padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
                  backgroundColor:
                    currentFile === filePath
                      ? designTokens.colors.accent.blue
                      : designTokens.colors.structure.surface.secondary,
                  color: currentFile === filePath ? "#000" : designTokens.colors.text.secondary,
                  border: `1px solid ${designTokens.colors.structure.border.primary}`,
                  borderRadius: "4px",
                  fontSize: designTokens.typography.sizes.xs,
                  fontFamily: designTokens.typography.fonts.mono,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {(filePath && filePath.split("/").pop()) || "(untitled)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Code Display */}
      <GlassPanel
        bordered
        borderColor={designTokens.colors.structure.border.secondary}
        rounded="sm"
        style={{
          backgroundColor: "#0a0a0a",
          padding: designTokens.spacing.md,
          minHeight: "400px",
          maxHeight: "600px",
          overflow: "auto",
          fontFamily: designTokens.typography.fonts.mono,
          fontSize: designTokens.typography.sizes.sm,
        }}
      >
        {currentContent ? (
          <>
            {currentFile && (
              <div
                style={{
                  color: designTokens.colors.text.tertiary,
                  marginBottom: designTokens.spacing.sm,
                  paddingBottom: designTokens.spacing.sm,
                  borderBottom: `1px solid ${designTokens.colors.structure.border.tertiary}`,
                }}
              >
                {currentFile}
              </div>
            )}
            <pre
              style={{
                margin: 0,
                color: designTokens.colors.text.primary,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {currentContent}
            </pre>
            <div ref={bottomRef} />
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: designTokens.colors.text.tertiary,
              gap: designTokens.spacing.md,
            }}
          >
            <Terminal style={{ width: "48px", height: "48px", opacity: 0.3 }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: designTokens.spacing.xs }}>
                Waiting for agents to write code...
              </div>
              <div style={{ fontSize: designTokens.typography.sizes.xs, opacity: 0.7 }}>
                Code will appear here in real-time as agents work
              </div>
            </div>
          </div>
        )}
      </GlassPanel>
    </GlassPanel>
  );
}
