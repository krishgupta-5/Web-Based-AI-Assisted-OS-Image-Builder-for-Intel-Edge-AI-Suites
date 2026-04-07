"use client";

import { useEffect, useState } from "react";
import { useChat } from "@/context/ChatContext";
import ResponseBlock from "@/components/ResponseBlock";

export default function ChatPanel() {
  const {
    projects,
    activeProjectId,
    addMessage,
    addProject,
    templateInput,
  } = useChat();

  const [input, setInput] = useState("");

  const activeProject = projects.find(
    (p) => p.id === activeProjectId
  );

  // Autofill template
  useEffect(() => {
    if (templateInput) {
      setInput(templateInput);
    }
  }, [templateInput]);

  const send = () => {
    if (!input.trim()) return;

    let projectId = activeProjectId;

    // ✅ Create + send in ONE CLICK
    if (!projectId) {
      projectId = addProject(input);
    } else {
      addMessage({ role: "user", content: input }, projectId);
    }

    // TODO: Call backend to get yaml, docker, visual
    // For now, simulate backend response after a short delay
    setTimeout(() => {
      const mockOutput = {
        yaml: `system:\n  type: retail-analytics\n  device: jetson-nano\n  version: "1.0"`,
        docker: `version: "3.8"\nservices:\n  app:\n    build: .\n    ports:\n      - "8000:8000"`,
        visual: "Graph visualization will render here"
      };

      addMessage(
        {
          role: "assistant",
          content: "I've created your configuration. Here's what we set up:",
          output: mockOutput
        },
        projectId
      );
    }, 800);

    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeProject?.messages.map((m, i) => (
          <div key={i}>
            <div
              className={`p-3 rounded max-w-[80%] ${
                m.role === "user"
                  ? "bg-purple-600 ml-auto"
                  : "bg-[#1a1a1a]"
              }`}
            >
              {m.content}
            </div>
            
            {/* Show output block if assistant message has output */}
            {m.role === "assistant" && m.output && (
              <div className="mt-2">
                <ResponseBlock output={m.output} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#222] flex gap-2">
        <input
          className="flex-1 p-2 bg-[#111] border border-[#222] rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your system..."
        />
        <button
          onClick={send}
          className="px-4 bg-purple-600 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}