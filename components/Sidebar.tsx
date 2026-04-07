"use client";

import { useState } from "react";
import { useChat } from "@/context/ChatContext";

export default function Sidebar({
  onClose,
}: {
  onClose: () => void;
}) {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    addProject,
    deleteProject,
    setInputFromTemplate,
  } = useChat();

  const [showProfile, setShowProfile] = useState(false);

  const templates = [
    {
      title: "Retail AI",
      prompt:
        "Retail AI system for real-time footfall tracking using camera on Jetson Nano",
    },
    {
      title: "Smart City",
      prompt:
        "Traffic monitoring system using camera on Raspberry Pi with edge AI",
    },
  ];

  return (
    <div className="w-64 bg-[#111] border-r border-[#222] p-4 flex flex-col justify-between">

      {/* TOP */}
      <div>
        {/* Header + Close */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">EdgeOS</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* New Chat */}
        <button
          onClick={() => addProject()}
          className="mb-4 p-2 bg-purple-600 rounded w-full"
        >
          + New Chat
        </button>

        {/* Templates */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2 uppercase">
            Templates
          </p>

          {templates.map((t, i) => (
            <div
              key={i}
              onClick={() => setInputFromTemplate(t.prompt)}
              className="p-2 rounded cursor-pointer hover:bg-[#1a1a1a]"
            >
              {t.title}
            </div>
          ))}
        </div>

        {/* Your Chats */}
        <div>
          <p className="text-xs text-gray-400 mb-2 uppercase">
            Your Chats
          </p>

          <div className="space-y-1">
            {projects.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2 rounded group ${
                  activeProjectId === p.id
                    ? "bg-[#222]"
                    : "hover:bg-[#1a1a1a]"
                }`}
              >
                <div
                  onClick={() => setActiveProjectId(p.id)}
                  className="flex-1 cursor-pointer truncate"
                >
                  {p.title}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(p.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 ml-2"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PROFILE */}
      <div>
        <div
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[#1a1a1a]"
        >
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
            B
          </div>
          <div>
            <p className="text-sm">Bhushan</p>
          </div>
        </div>

        {showProfile && (
          <div className="mt-2 p-3 bg-[#1a1a1a] rounded">
            <p className="text-sm">Profile</p>
            <button className="mt-2 text-red-400 text-sm">
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}