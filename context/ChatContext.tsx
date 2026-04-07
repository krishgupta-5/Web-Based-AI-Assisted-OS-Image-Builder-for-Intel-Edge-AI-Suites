"use client";

import { createContext, useContext, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;

  output?: {
    yaml: string;
    docker: string;
    visual: string;
  };
};

type Project = {
  id: string;
  title: string;
  messages: Message[];
};

type ChatContextType = {
  projects: Project[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  addProject: (firstMessage?: string) => string;
  addMessage: (msg: Message, projectId: string) => void;
  deleteProject: (id: string) => void;
  setInputFromTemplate: (text: string) => void;
  templateInput: string;
};

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("ChatContext missing");
  return ctx;
};

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [templateInput, setTemplateInput] = useState("");

  // ✅ Create project (optionally with first message)
  const addProject = (firstMessage?: string) => {
    const newId = Date.now().toString();

    const newProject: Project = {
      id: newId,
      title: firstMessage
        ? firstMessage.slice(0, 25)
        : "New Chat",
      messages: firstMessage
        ? [{ role: "user", content: firstMessage }]
        : [],
    };

    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newId);

    return newId;
  };

  // ✅ Add message safely
  const addMessage = (msg: Message, projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, messages: [...p.messages, msg] }
          : p
      )
    );
  };

  // ✅ Delete chat
  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));

    setActiveProjectId((prev) => (prev === id ? null : prev));
  };

  const setInputFromTemplate = (text: string) => {
    setTemplateInput(text);
  };

  return (
    <ChatContext.Provider
      value={{
        projects,
        activeProjectId,
        setActiveProjectId,
        addProject,
        addMessage,
        deleteProject,
        setInputFromTemplate,
        templateInput,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}