"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, CheckCircle, SkipForward } from "lucide-react";

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface ProjectInitializationChatProps {
  projectId: string;
  projectName: string;
  onComplete: (readme: string) => void;
  onSkip: () => void;
}

export default function ProjectInitializationChat({
  projectId,
  projectName,
  onComplete,
  onSkip,
}: ProjectInitializationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Start initialization chat
    startInitialization();
  }, []);

  const startInitialization = async () => {
    setIsInitializing(true);

    const response = await fetch("/api/projects/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        projectName,
        action: "start",
      }),
    });

    const data = await response.json();

    if (data.ok) {
      setMessages([
        {
          role: "assistant",
          content: data.message,
        },
      ]);
    }

    setIsInitializing(false);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage = userInput.trim();
    setUserInput("");

    // Add user message to chat
    const updatedMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Send full conversation to ChatGPT
      const response = await fetch("/api/projects/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectName,
          action: "continue",
          messages: updatedMessages,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        // Check if ChatGPT thinks we're done
        if (data.isComplete) {
          setMessages([
            ...updatedMessages,
            {
              role: "assistant",
              content: data.message,
            },
          ]);
          setIsComplete(true);

          // Generate README
          setTimeout(() => {
            generateReadme(updatedMessages);
          }, 1000);
        } else {
          // Continue conversation
          setMessages([
            ...updatedMessages,
            {
              role: "assistant",
              content: data.message,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReadme = async (conversationHistory: Message[]) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/projects/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectName,
          action: "generate_readme",
          messages: conversationHistory,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        // README generated, call completion callback
        onComplete(data.readme);
      }
    } catch (error) {
      console.error("Error generating README:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipInitialization = async () => {
    // Generate minimal README
    const response = await fetch("/api/projects/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        projectName,
        action: "skip",
      }),
    });

    const data = await response.json();

    if (data.ok) {
      onSkip();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
      <div className="bg-background border border-border rounded-xl shadow-2xl max-w-4xl w-full h-[700px] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Project Initialization: {projectName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Let's gather some information to set up your project
            </p>
          </div>
          {!isComplete && (
            <button
              onClick={handleSkipInitialization}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-colors text-sm"
            >
              <SkipForward className="w-4 h-4" />
              Skip & Use Default
            </button>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isInitializing ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 border border-border"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 border border-border rounded-lg p-4">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                </div>
              )}

              {isComplete && (
                <div className="flex justify-center">
                  <div className="bg-success/20 border border-success rounded-lg px-6 py-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm font-medium text-success">
                      Initialization complete! Generating project README...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        {!isComplete && !isInitializing && (
          <div className="px-6 py-4 border-t border-border">
            <div className="flex gap-3">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your response..."
                className="flex-1 px-4 py-3 rounded-lg bg-secondary/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !userInput.trim()}
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
