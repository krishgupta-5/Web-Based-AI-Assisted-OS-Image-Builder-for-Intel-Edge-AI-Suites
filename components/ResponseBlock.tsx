"use client";

import { useState } from "react";

type ResponseBlockProps = {
  output: {
    yaml: string;
    docker: string;
    visual: string;
  };
};

const tabs = ["YAML", "Docker", "Visual"];

export default function ResponseBlock({ output }: ResponseBlockProps) {
  const [active, setActive] = useState("YAML");

  return (
    <div className="max-w-[80%] border border-[#333] rounded overflow-hidden bg-[#0a0a0a]">
      
      {/* Tabs */}
      <div className="flex border-b border-[#333]">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-4 py-2 text-sm transition-colors ${
              active === t
                ? "border-b-2 border-purple-500 text-purple-400 bg-[#111]"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-[300px]">
        {active === "YAML" && (
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
            {output.yaml}
          </pre>
        )}

        {active === "Docker" && (
          <pre className="text-xs text-blue-400 font-mono whitespace-pre-wrap break-words">
            {output.docker}
          </pre>
        )}

        {active === "Visual" && (
          <div className="text-sm text-gray-400">
            {output.visual}
          </div>
        )}
      </div>
    </div>
  );
}
