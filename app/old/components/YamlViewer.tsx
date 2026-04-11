"use client";

import { useState, useMemo } from "react";
import YAML from "yaml";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Props = {
  data: {
    yaml: string;       // edge-config.yaml   — system + hardware + models
    docker: string;     // docker-compose.yaml — services + networks + deployment
    pipeline: string;   // pipeline.yaml       — steps + flow DAG
    recommendedDevice: string;
    pipelineFlow?: string;
  };
};

type Tab = "yaml" | "docker" | "pipeline";

interface PipelineStep {
  id: string;
  name: string;
  type: string;
  depends: string[];
  config?: Record<string, string | number>;
}

interface EdgeConfig {
  system?: { type?: string; use_case?: string; version?: string };
  hardware?: {
    device?: string; memory?: string; accelerator?: string;
    camera?: boolean; os?: string; storage?: string; connectivity?: string;
  };
  models?: Array<{ name?: string; task?: string; framework?: string; precision?: string; fps_target?: number }>;
}

interface PipelineYaml {
  pipeline?: {
    name?: string;
    version?: string;
    trigger?: string;
    steps?: PipelineStep[];
    flow?: string;
    on_error?: { strategy?: string; max_retries?: number };
  };
}

// ─────────────────────────────────────────────
// Syntax Highlighters
// ─────────────────────────────────────────────
function highlightYaml(yaml: string): React.ReactNode[] {
  return yaml.split("\n").map((line, i) => {
    if (/^[a-z_]+:/.test(line)) {
      const ci = line.indexOf(":");
      return <div key={i}><span className="text-purple-400 font-semibold">{line.slice(0, ci)}</span><span className="text-slate-500">:</span><span className="text-emerald-300">{line.slice(ci + 1)}</span></div>;
    }
    if (/^\s+[a-z_-]+:/.test(line)) {
      const indent = line.match(/^(\s+)/)?.[1] ?? "";
      const rest = line.trimStart();
      const ci = rest.indexOf(":");
      const key = rest.slice(0, ci);
      const val = rest.slice(ci + 1);
      let vc: React.ReactNode = val.trim()
        ? (val.trim() === "true" || val.trim() === "false")
          ? <span className="text-amber-400">{val}</span>
          : /^\s+\d/.test(val)
          ? <span className="text-blue-300">{val}</span>
          : val.trim().startsWith("[")
          ? <span className="text-cyan-300">{val}</span>
          : <span className="text-emerald-300">{val}</span>
        : null;
      return <div key={i}><span className="text-slate-600">{indent}</span><span className="text-sky-300">{key}</span><span className="text-slate-500">:</span>{vc}</div>;
    }
    if (/^\s+-/.test(line)) {
      const indent = line.match(/^(\s+)/)?.[1] ?? "";
      return <div key={i}><span className="text-slate-600">{indent}</span><span className="text-slate-400">-</span><span className="text-emerald-300">{line.trimStart().slice(1)}</span></div>;
    }
    if (line.trim().startsWith("#")) return <div key={i} className="text-slate-600 italic">{line}</div>;
    return <div key={i} className="text-slate-300">{line || "\u00A0"}</div>;
  });
}

function highlightDocker(docker: string): React.ReactNode[] {
  return docker.split("\n").map((line, i) => {
    if (line.trim().startsWith("#")) return <div key={i} className="text-slate-600 italic">{line || "\u00A0"}</div>;
    if (/^version:|^services:|^networks:|^volumes:/.test(line)) {
      const ci = line.indexOf(":");
      return <div key={i}><span className="text-purple-400 font-semibold">{line.slice(0, ci)}</span><span className="text-slate-500">:</span><span className="text-amber-300">{line.slice(ci + 1)}</span></div>;
    }
    if (/^  [a-z].*:$/.test(line)) return <div key={i}><span className="text-slate-600">{"  "}</span><span className="text-cyan-400 font-semibold">{line.trim().replace(":", "")}</span><span className="text-slate-500">:</span></div>;
    if (/image:/.test(line)) {
      const indent = line.match(/^(\s+)/)?.[1] ?? "";
      return <div key={i}><span className="text-slate-600">{indent}</span><span className="text-sky-300">image</span><span className="text-slate-500">: </span><span className="text-green-400 font-semibold">{line.replace(/.*image:\s*/, "")}</span></div>;
    }
    if (/^\s+- /.test(line)) {
      const indent = line.match(/^(\s+)/)?.[1] ?? "";
      const content = line.trimStart().slice(2);
      return <div key={i}><span className="text-slate-600">{indent}</span><span className="text-slate-500">- </span><span className={/^\d|^"/.test(content) ? "text-amber-300" : "text-emerald-300"}>{content}</span></div>;
    }
    if (/^\s+[a-z_-]+:/.test(line)) {
      const indent = line.match(/^(\s+)/)?.[1] ?? "";
      const rest = line.trimStart();
      const ci = rest.indexOf(":");
      return <div key={i}><span className="text-slate-600">{indent}</span><span className="text-sky-300">{rest.slice(0, ci)}</span><span className="text-slate-500">:</span><span className="text-emerald-300">{rest.slice(ci + 1)}</span></div>;
    }
    return <div key={i} className="text-slate-300">{line || "\u00A0"}</div>;
  });
}

// ─────────────────────────────────────────────
// Step Icon
// ─────────────────────────────────────────────
const STEP_TYPE_COLORS: Record<string, string> = {
  input:     "border-emerald-500/40 bg-emerald-950/30 text-emerald-300",
  process:   "border-blue-500/40 bg-blue-950/30 text-blue-300",
  inference: "border-indigo-500/40 bg-indigo-950/30 text-indigo-300",
  store:     "border-cyan-500/40 bg-cyan-950/30 text-cyan-300",
  output:    "border-purple-500/40 bg-purple-950/30 text-purple-300",
  notify:    "border-amber-500/40 bg-amber-950/30 text-amber-300",
  default:   "border-slate-500/40 bg-slate-800/30 text-slate-300",
};

function StepIcon({ type, id }: { type: string; id: string }) {
  const cls = "w-5 h-5 shrink-0";
  const s = (type + id).toLowerCase();
  if (s.includes("input") || s.includes("ingest") || s.includes("capture"))
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
  if (s.includes("infer") || s.includes("detect") || s.includes("model"))
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>;
  if (s.includes("store") || s.includes("db") || s.includes("data"))
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>;
  if (s.includes("process") || s.includes("track") || s.includes("categor"))
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
  if (s.includes("notify") || s.includes("alert") || s.includes("publish") || s.includes("mqtt"))
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
  if (s.includes("output") || s.includes("visual") || s.includes("predict"))
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
  return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>;
}

// ─────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────
function Badge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`flex flex-col px-3 py-1.5 rounded-lg border text-[11px] font-mono shrink-0 ${color}`}>
      <span className="opacity-40 text-[9px] uppercase tracking-widest">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Line Numbers wrapper
// ─────────────────────────────────────────────
function CodeView({ content, lines, showLines }: { content: React.ReactNode[]; lines: number; showLines: boolean }) {
  return (
    <div className="flex text-[13px] font-mono leading-relaxed">
      {showLines && (
        <div className="select-none shrink-0 px-3 pt-4 pb-4 text-right text-slate-700 border-r border-slate-800 bg-[#09090b]/40 min-w-[44px]">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="leading-relaxed">{i + 1}</div>
          ))}
        </div>
      )}
      <div className="flex-1 p-4 overflow-x-auto">{content}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pipeline Visual Tab
// ─────────────────────────────────────────────
function PipelineView({ pipelineYaml }: { pipelineYaml: string }) {
  const parsed = useMemo<PipelineYaml | null>(() => {
    try { return pipelineYaml ? YAML.parse(pipelineYaml) as PipelineYaml : null; }
    catch { return null; }
  }, [pipelineYaml]);

  const steps = parsed?.pipeline?.steps ?? [];
  const flow = parsed?.pipeline?.flow ?? "";
  const meta = parsed?.pipeline;

  if (steps.length === 0)
    return <div className="text-slate-600 text-[13px] font-mono flex items-center justify-center h-40">// No pipeline detected...</div>;

  // Layer assignment
  const layerOf: Record<string, number> = {};
  const stepMap: Record<string, PipelineStep> = {};
  steps.forEach((s) => { stepMap[s.id] = s; });
  function getLayer(id: string, visited = new Set<string>()): number {
    if (layerOf[id] !== undefined) return layerOf[id];
    if (visited.has(id)) return 0;
    visited.add(id);
    const step = stepMap[id];
    if (!step || !step.depends?.length) { layerOf[id] = 0; return 0; }
    layerOf[id] = Math.max(...step.depends.map((d) => getLayer(d, visited) + 1));
    return layerOf[id];
  }
  steps.forEach((s) => getLayer(s.id));
  const maxLayer = Math.max(...Object.values(layerOf), 0);
  const layers: PipelineStep[][] = Array.from({ length: maxLayer + 1 }, () => []);
  steps.forEach((s) => layers[layerOf[s.id] ?? 0].push(s));

  return (
    <div className="flex flex-col gap-8">

      {/* Pipeline metadata */}
      {meta && (
        <div className="flex gap-2 flex-wrap">
          {meta.name      && <Badge label="Pipeline" value={meta.name}    color="border-purple-800/40 bg-purple-950/20 text-purple-300" />}
          {meta.trigger   && <Badge label="Trigger"  value={meta.trigger} color="border-blue-800/40 bg-blue-950/20 text-blue-300" />}
          {meta.version   && <Badge label="Version"  value={meta.version} color="border-slate-700 bg-slate-800/30 text-slate-400" />}
        </div>
      )}

      {/* Flow diagram */}
      <section>
        <p className="text-[9px] font-mono uppercase tracking-widest text-slate-600 mb-4">Data Flow</p>
        <div className="flex items-center gap-3 flex-wrap">
          {layers.map((layer, li) => (
            <div key={li} className="flex items-center gap-3">
              <div className="flex flex-col gap-3">
                {layer.map((step) => {
                  const color = STEP_TYPE_COLORS[step.type] ?? STEP_TYPE_COLORS.default;
                  return (
                    <div key={step.id} className={`px-4 py-3 border rounded-xl flex items-center gap-3 min-w-[170px] ${color}`}>
                      <StepIcon type={step.type} id={step.id} />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">{step.id}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase opacity-60 ${color}`}>{step.type}</span>
                        </div>
                        <div className="text-[12px] font-semibold leading-tight">{step.name}</div>
                        {step.config?.model && (
                          <div className="text-[10px] opacity-50 mt-0.5 font-mono">{step.config.model as string}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {li < layers.length - 1 && (
                <div className="flex items-center self-center shrink-0">
                  <div className="h-px w-8 bg-gradient-to-r from-slate-700 to-slate-500" />
                  <div className="border-y-[5px] border-y-transparent border-l-[7px] border-l-slate-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Flow string */}
      {flow && (
        <div className="px-4 py-2.5 bg-[#09090b] border border-slate-800 rounded-lg font-mono text-[12px] text-slate-400 break-all">
          <span className="text-slate-600 mr-2">flow:</span>{flow}
        </div>
      )}

      {/* Step table */}
      <section>
        <p className="text-[9px] font-mono uppercase tracking-widest text-slate-600 mb-3">Step Details</p>
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="bg-[#09090b] border-b border-slate-800">
                {["#", "ID", "Name", "Type", "Source / Model", "Depends On"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-slate-500 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {steps.map((step, i) => (
                <tr key={step.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="px-3 py-2.5 text-slate-600">{i + 1}</td>
                  <td className="px-3 py-2.5 text-cyan-400">{step.id}</td>
                  <td className="px-3 py-2.5 text-slate-300">{step.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${STEP_TYPE_COLORS[step.type] ?? STEP_TYPE_COLORS.default}`}>{step.type}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {(step.config?.model as string) ?? (step.config?.source as string) ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {!step.depends?.length ? (
                      <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-500 rounded text-[10px] border border-emerald-800/30">START</span>
                    ) : (
                      <div className="flex gap-1">
                        {step.depends.map((d) => (
                          <span key={d} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">{d}</span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Error handling */}
      {meta?.on_error && (
        <section>
          <p className="text-[9px] font-mono uppercase tracking-widest text-slate-600 mb-3">Error Handling</p>
          <div className="flex gap-2">
            <Badge label="Strategy"    value={meta.on_error.strategy ?? "retry"}              color="border-rose-800/40 bg-rose-950/20 text-rose-300" />
            <Badge label="Max Retries" value={String(meta.on_error.max_retries ?? 3)}          color="border-amber-800/40 bg-amber-950/20 text-amber-300" />
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function YamlViewer({ data }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("yaml");
  const [copied, setCopied] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);

  const edgeConfig = useMemo<EdgeConfig | null>(() => {
    try { return data.yaml ? YAML.parse(data.yaml) as EdgeConfig : null; } catch { return null; }
  }, [data.yaml]);

  const yamlLines   = useMemo(() => data.yaml   ? highlightYaml(data.yaml)     : [], [data.yaml]);
  const dockerLines = useMemo(() => data.docker ? highlightDocker(data.docker) : [], [data.docker]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const activeContent = activeTab === "yaml" ? data.yaml : activeTab === "docker" ? data.docker : data.pipeline;

  const TABS = [
    { id: "yaml" as Tab,     label: "YAML",   file: "edge-config.yaml",    active: "text-emerald-400 border-t-emerald-500/50",  desc: "Hardware Spec" },
    { id: "docker" as Tab,   label: "DOCKER", file: "docker-compose.yaml", active: "text-blue-400 border-t-blue-500/50",        desc: "Services"      },
    { id: "pipeline" as Tab, label: "VISUAL", file: "pipeline.yaml",       active: "text-purple-400 border-t-purple-500/50",    desc: "Data Flow"     },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#18181b] border border-slate-800 rounded-xl overflow-hidden shadow-xl font-sans">

      {/* Tab Bar */}
      <div className="flex justify-between items-center bg-[#09090b] border-b border-[#27272a] pr-3 shrink-0">
        <div className="flex pt-2 px-2 gap-1">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-[12px] font-mono rounded-t-lg transition-all border border-b-0 ${
                activeTab === tab.id
                  ? `bg-[#18181b] border-[#27272a] ${tab.active}`
                  : "bg-transparent border-transparent text-slate-500 hover:bg-[#18181b]/50 hover:text-slate-300"
              }`}
            >
              <span className="mr-2 text-slate-600">{tab.label}</span>{tab.file}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== "pipeline" && (
            <button onClick={() => setLineNumbers((v) => !v)}
              className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${lineNumbers ? "text-slate-300 bg-slate-800" : "text-slate-600 hover:text-slate-400"}`}
            >
              # lines
            </button>
          )}
          {data.recommendedDevice && (
            <div className="px-3 py-1 bg-emerald-950/30 border border-emerald-800/30 text-emerald-400 rounded-full text-[10px] font-mono flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
              {data.recommendedDevice}
            </div>
          )}
        </div>
      </div>

      {/* Metadata strip — YAML tab: hardware badges */}
      {edgeConfig && activeTab === "yaml" && (
        <div className="shrink-0 flex gap-2 px-4 py-2.5 bg-[#09090b]/70 border-b border-slate-800/50 overflow-x-auto">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest self-center mr-1">edge-config</span>
          {edgeConfig.system?.type         && <Badge label="System"  value={edgeConfig.system.type}              color="border-purple-800/40 bg-purple-950/20 text-purple-300" />}
          {edgeConfig.hardware?.device     && <Badge label="Device"  value={edgeConfig.hardware.device}          color="border-emerald-800/40 bg-emerald-950/20 text-emerald-300" />}
          {edgeConfig.hardware?.memory     && <Badge label="Memory"  value={edgeConfig.hardware.memory}          color="border-blue-800/40 bg-blue-950/20 text-blue-300" />}
          {edgeConfig.hardware?.accelerator && <Badge label="Accel"  value={edgeConfig.hardware.accelerator}     color="border-amber-800/40 bg-amber-950/20 text-amber-300" />}
          {edgeConfig.hardware?.os         && <Badge label="OS"      value={edgeConfig.hardware.os}              color="border-cyan-800/40 bg-cyan-950/20 text-cyan-300" />}
          {edgeConfig.models?.[0]?.name    && <Badge label="Model"   value={edgeConfig.models[0].name ?? ""}     color="border-rose-800/40 bg-rose-950/20 text-rose-300" />}
        </div>
      )}

      {/* Metadata strip — Docker tab */}
      {activeTab === "docker" && data.docker && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-[#09090b]/70 border-b border-slate-800/50 overflow-x-auto">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mr-1">docker-compose</span>
          <span className="text-[11px] font-mono text-slate-500">
            {(data.docker.match(/^\s{2}[a-z]/gm) ?? []).length} services defined
          </span>
          {data.docker.includes("capabilities: [gpu]") && (
            <Badge label="GPU" value="enabled" color="border-green-800/40 bg-green-950/20 text-green-300" />
          )}
          {data.docker.includes("healthcheck:") && (
            <Badge label="Healthcheck" value="configured" color="border-blue-800/40 bg-blue-950/20 text-blue-300" />
          )}
          {data.docker.includes("volumes:") && (
            <Badge label="Volumes" value="persistent" color="border-amber-800/40 bg-amber-950/20 text-amber-300" />
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[#18181b]">
        {activeTab === "yaml" && (
          !data.yaml
            ? <div className="text-slate-600 text-[13px] font-mono flex items-center justify-center h-40">// Awaiting generation...</div>
            : <CodeView content={yamlLines} lines={data.yaml.split("\n").length} showLines={lineNumbers} />
        )}
        {activeTab === "docker" && (
          !data.docker
            ? <div className="text-slate-600 text-[13px] font-mono flex items-center justify-center h-40">// Docker compose will generate here...</div>
            : <CodeView content={dockerLines} lines={data.docker.split("\n").length} showLines={lineNumbers} />
        )}
        {activeTab === "pipeline" && (
          <div className="p-6">
            <PipelineView pipelineYaml={data.pipeline} />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-10 shrink-0 bg-[#09090b] border-t border-[#27272a] flex items-center justify-between px-4">
        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-3">
          {data.yaml ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-500">Validated</span>
              </span>
              <span className="text-slate-600">
                {TABS.find(t => t.id === activeTab)?.desc}
              </span>
              <span className="text-slate-700">
                {activeTab !== "pipeline"
                  ? `${activeContent?.split("\n").length ?? 0} lines`
                  : `${(data.pipeline?.match(/- id:/g) ?? []).length} steps`
                }
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600" /> Idle</span>
          )}
          <span className="text-slate-700">UTF-8</span>
        </div>

        {activeContent && (
          <div className="flex gap-2">
            <button onClick={() => copyToClipboard(activeContent)}
              className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              {copied ? "✓ Copied" : "Copy Source"}
            </button>
            <button
              onClick={() => {
                const names: Record<Tab, string> = { yaml: "edge-config.yaml", docker: "docker-compose.yaml", pipeline: "pipeline.yaml" };
                downloadFile(activeContent, names[activeTab]);
              }}
              className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
            >
              Export {TABS.find(t => t.id === activeTab)?.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}