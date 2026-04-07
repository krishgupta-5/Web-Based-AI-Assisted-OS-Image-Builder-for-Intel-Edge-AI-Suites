"use client";

import { useState } from "react";

const tabs = ["YAML", "Docker", "Visual"];

export default function Output() {
  const [active, setActive] = useState("YAML");

  return (
    <div className="h-full flex flex-col">
      
      {/* Tabs */}
      <div className="flex border-b border-[#222]">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-4 py-2 ${
              active === t
                ? "border-b-2 border-purple-500 text-purple-400"
                : "text-gray-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {active === "YAML" && (
          <pre className="text-sm text-green-400">
{`system:
  type: retail-analytics
  device: jetson-nano`}
          </pre>
        )}

        {active === "Docker" && (
          <pre className="text-sm text-blue-400">
{`version: "3"
services:
  app:
    build: .`}
          </pre>
        )}

        {active === "Visual" && (
          <div className="text-gray-400">
            Graph / pipeline will go here
          </div>
        )}
      </div>
    </div>
  );
}