"use client";

import ChatPanel from "@/components/ChatPanel";

export default function WorkspacePage() {
  return (
    <div className="flex h-full">
      
      {/* Chat */}
      <div className="flex-1">
        <ChatPanel />
      </div>
    </div>
  );
}