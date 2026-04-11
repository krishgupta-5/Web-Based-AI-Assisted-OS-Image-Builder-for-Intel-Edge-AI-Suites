"use client";

import { useEffect, useState } from "react";

type Message = { role: "user" | "ai"; text: string };
type Props = { onGenerate: (yaml: string, docker?: string, device?: string, pipeline?: string, pipelineFlow?: string) => void; initialPrompt?: string; };

export default function ChatBox({ onGenerate, initialPrompt }: Props) {
  const [messages, setMessages] = useState<Message[]>([{ role: "ai", text: "Welcome to EdgeOS Builder. Describe your system constraints and goals." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialPrompt) {
      setMessages((prev) => [...prev, { role: "user", text: initialPrompt }]);
      generate(initialPrompt);
    }
  }, [initialPrompt]);

  const generate = async (prompt: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      onGenerate(data.yaml, data.docker, data.recommendedDevice, data.pipeline, data.pipelineFlow);
      setMessages((prev) => [...prev, { role: "ai", text: "Configuration generated successfully. See workspace." }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "Error generating config." }]);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    await generate(input);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`p-3 max-w-[85%] text-[13px] leading-relaxed shadow-sm ${
                msg.role === "user" ? "bg-indigo-600 text-white rounded-xl rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-xl rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="p-3 rounded-xl rounded-bl-sm bg-white border border-slate-200 text-slate-500 text-[13px] flex items-center gap-2 shadow-sm font-mono">
               <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
               Processing...
             </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-[13px] resize-none text-slate-800 placeholder:text-slate-400"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="e.g. Build an autonomous driving perception system with sensor fusion..."
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-medium ml-1">Shift + Enter for new line</span>
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white px-5 py-1.5 rounded-md text-[13px] font-bold transition-colors"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}