"use client";

import { useState } from "react";
import Header from "@/app/temp/components/Header";
import TemplateGrid from "@/app/temp/components/TemplateGrid";
import YamlViewer from "@/app/temp/components/YamlViewer";
import ChatBox from "@/app/temp/components/ChatBox";

export default function Home() {
  const [result, setResult] = useState({ yaml: "", docker: "", recommendedDevice: "", pipeline: "", pipelineFlow: "" });
  const [templatePrompt, setTemplatePrompt] = useState<string>();

  const handleTemplate = async (prompt: string) => {
    setTemplatePrompt(prompt);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setResult({ yaml: data.yaml, docker: data.docker || "", recommendedDevice: data.recommendedDevice || "", pipeline: data.pipeline || "", pipelineFlow: data.pipelineFlow || "" });
    } catch (err) { console.error(err); }
  };

  const handleGenerate = (yaml: string, docker?: string, device?: string, pipeline?: string, pipelineFlow?: string) => {
    setResult({ yaml, docker: docker || "", recommendedDevice: device || "", pipeline: pipeline || "", pipelineFlow: pipelineFlow || "" });
  };

  return (
    <main className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Header />

      {/* App Content Area */}
      <div className="flex-1 min-h-0 flex flex-col max-w-[1800px] mx-auto w-full p-4 lg:p-6 gap-6">
        
        <TemplateGrid onSelect={handleTemplate} />

        {/* 2-Column IDE Workspace */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: AI Copilot (Takes up 4 columns) */}
          <div className="lg:col-span-4 flex flex-col h-full min-h-0">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 shrink-0">AI Architect Copilot</h2>
            <ChatBox onGenerate={handleGenerate} initialPrompt={templatePrompt} />
          </div>

          {/* Right: Code Workspace (Takes up 8 columns) */}
          <div className="lg:col-span-8 flex flex-col h-full min-h-0">
             <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 shrink-0 flex justify-between items-center">
               <span>Deployment Workspace</span>
               {result.recommendedDevice && (
                 <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 normal-case tracking-normal font-semibold flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                   Target: {result.recommendedDevice}
                 </span>
               )}
             </h2>
             <YamlViewer data={result} />
          </div>

        </div>
      </div>
    </main>
  );
}