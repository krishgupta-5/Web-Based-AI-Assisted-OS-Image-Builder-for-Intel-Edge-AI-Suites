"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ChatProvider } from "@/context/ChatContext";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <ChatProvider>
      <div className="fixed inset-0 flex bg-[#0e0e0e] text-white">

        {/* Sidebar */}
        {isSidebarOpen && (
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        )}

        {/* Main Area */}
        <div className="flex-1 flex flex-col">

          {/* Top Bar */}
          <div className="h-12 flex items-center px-4 border-b border-[#222]">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-400 hover:text-white"
              >
                ☰
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </ChatProvider>
  );
}