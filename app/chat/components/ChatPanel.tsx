'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getSessionId } from '@/app/api/generate/Sessionid';
import DbSchemaViewer from '@/app/chat/components/DbSchemaViewer';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tools?: string[];
  file?: {
    name: string;
    language: string;
    content: string;
    dbSchema?: {
      mermaid: string;
      diagram: string;
    };
  };
  options?: string[];
}

const initialMessages: Message[] = [];

interface ChatPanelProps {
  agentName: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

// ─────────────────────────────────────────────
// Pipeline YAML → visual nodes
// ─────────────────────────────────────────────
function parsePipelineYaml(yamlText: string): Array<{
  id: string; title: string; type: string;
  description: string; icon: string; color: string;
}> {
  const iconMap: Record<string, string> = {
    source: 'video',    ingest: 'video',    request: 'video',
    transform: 'refresh', process: 'target', validate: 'target',
    storage: 'database', store: 'database',  cache: 'database',
    output: 'bell',     respond: 'bell',    notify: 'bell',
  };
  const colorMap: Record<string, string> = {
    source: '#60a5fa',  ingest: '#60a5fa',  request: '#60a5fa',
    transform: '#a78bfa', process: '#f472b6', validate: '#f472b6',
    storage: '#34d399', store: '#34d399',   cache: '#34d399',
    output: '#fbbf24',  respond: '#fbbf24', notify: '#fbbf24',
  };

  try {
    const lines = yamlText.split('\n');
    const steps: Array<{ id: string; title: string; type: string; description: string; icon: string; color: string; }> = [];
    let inSteps = false;
    let current: Partial<typeof steps[0]> = {};

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line === 'steps:') { inSteps = true; continue; }
      if (!inSteps) continue;
      if (line.startsWith('flow:')) {
        if (current.id) steps.push(current as typeof steps[0]);
        break;
      }
      if (line.startsWith('- id:') || line.startsWith('-id:')) {
        if (current.id) steps.push(current as typeof steps[0]);
        const id = line.replace(/^-\s*id:\s*/, '').trim().replace(/^["']|["']$/g, '');
        current = { id, title: id, type: id, description: '', icon: iconMap[id] ?? 'target', color: colorMap[id] ?? '#94a3b8' };
        continue;
      }
      const clean = line.replace(/^-\s+/, '');
      if (clean.startsWith('title:')) {
        current.title = clean.replace('title:', '').trim().replace(/^["']|["']$/g, '');
        continue;
      }
      if (clean.startsWith('type:')) {
        const type = clean.replace('type:', '').trim().replace(/^["']|["']$/g, '');
        current.type = type;
        if (!iconMap[current.id ?? '']) {
          current.icon = iconMap[type] ?? 'target';
          current.color = colorMap[type] ?? '#94a3b8';
        }
        continue;
      }
      if (clean.startsWith('description:')) {
        current.description = clean.replace('description:', '').trim().replace(/^["']|["']$/g, '');
        continue;
      }
    }
    if (current.id && !steps.find(s => s.id === current.id)) {
      steps.push(current as typeof steps[0]);
    }
    return steps;
  } catch {
    return [];
  }
}

function parsePipelineMeta(yamlText: string): { name: string; version: string; trigger: string } {
  const get = (key: string) => {
    const match = new RegExp(`${key}:\\s*(.+)`).exec(yamlText);
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : '—';
  };
  return { name: get('name'), version: get('version'), trigger: get('trigger') };
}

type Step = 'config' | 'docker' | 'pipeline' | 'docs' | 'db';

export default function ChatPanel({ agentName, onToggleSidebar, isSidebarOpen = true }: ChatPanelProps) {
  const [messages, setMessages]           = useState<Message[]>(initialMessages);
  const [input, setInput]                 = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const [markdownMode, setMarkdownMode]   = useState<Record<string, 'code' | 'preview'>>({});
  const [generatedData, setGeneratedData] = useState<any>(null);
  const messagesEndRef                    = useRef<HTMLDivElement>(null);
  const textareaRef                       = useRef<HTMLTextAreaElement>(null);
  const [hasGeneratedConfig, setHasGeneratedConfig] = useState(false);
  const [isModifyMode, setIsModifyMode]   = useState(false);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const detectStep = (text: string): Step => {
    const lower = text.toLowerCase();
    if (isModifyMode) return 'config';
    if (lower.includes('db schema') || lower.includes('database schema') || lower.includes('view db') || lower.includes('show db') || lower.includes('show schema')) return 'db';
    if (lower.includes('docker') || lower.includes('continue')) return 'docker';
    if (lower.includes('pipeline') || lower.includes('show pipeline')) return 'pipeline';
    if (lower.includes('docs') || lower.includes('documentation') || lower.includes('readme') || lower.includes('generate docs')) return 'docs';
    return 'config';
  };

  const buildAssistantMessage = (
    step: Step,
    data: any,
    isFirstConfig: boolean,
    modifying: boolean
  ): { content: string; file: Message['file']; options: string[] } => {

    if (step === 'config') {
      return {
        content: modifying
          ? 'Configuration updated based on your changes.\n\nReady to continue whenever you are.'
          : isFirstConfig
          ? 'System config generated.\n\nLet me know if you want to modify anything, or continue to generate the Docker setup.'
          : 'Here is your system config.',
        file: { name: 'system-config.yaml', language: 'yaml', content: data.yaml },
        options: modifying ? ['Continue'] : ['Continue', 'Modify'],
      };
    }

    if (step === 'docker') {
      return {
        content: 'Docker Compose file generated. Services, volumes, and health checks are configured.',
        file: { name: 'docker-compose.yaml', language: 'yaml', content: data.docker },
        options: ['Show Pipeline'],
      };
    }

    if (step === 'pipeline') {
      return {
        content: "Pipeline architecture visualized. Each stage maps to your system's data flow.",
        file: { name: 'pipeline.yaml', language: 'pipeline', content: data.pipeline },
        options: ['Generate Docs'],
      };
    }

    if (step === 'docs') {
      // ── FIX: Always show "View DB Schema" button regardless of whether
      // n8n returned data. If dbSchema is null, the db step will show a
      // "still generating" message instead of hiding the button entirely.
      return {
        content: 'Project documentation generated. Switch between Code and Preview to read it.',
        file: { name: 'README.md', language: 'markdown', content: data.markdown },
        options: ['View DB Schema'],
      };
    }

    // ── db step ──
    // If n8n returned nothing, show a friendly retry message instead of failing silently
    if (!data.dbSchema) {
      return {
        content: '⚠️ DB schema is not ready yet.\n\nThis usually means:\n• n8n webhook timed out\n• The "Respond to Webhook" node is not connected\n• N8N_WEBHOOK_URL is not set in .env.local\n\nCheck your n8n workflow and try again in a moment.',
        file: undefined,
        options: ['View DB Schema'],
      };
    }

    return {
      content: 'Database schema generated via n8n → Gemini → Kroki. Switch between Diagram and Source views.',
      file: {
        name: 'schema.er',
        language: 'dbschema',
        content: data.dbSchema.diagram ?? '',
        dbSchema: {
          mermaid: data.dbSchema.mermaid ?? '',
          diagram: data.dbSchema.diagram ?? '',
        },
      },
      options: [],
    };
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = (overrideInput ?? input).trim();
    if (!textToSend) return;

    const step = detectStep(textToSend);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!overrideInput) setInput('');
    setIsTyping(true);

    if (textareaRef.current && !overrideInput) {
      textareaRef.current.style.height = '44px';
    }

    try {
      let data = generatedData;
      const needsFreshData = !data || isModifyMode || step === 'config';

      if (needsFreshData) {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSend,
            mode: isModifyMode ? 'modify' : 'generate',
            sessionId: getSessionId(),
          }),
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);
        data = await res.json();
        if (data.error) throw new Error(data.error);
        setGeneratedData(data);
      }

      const isFirstConfig = !hasGeneratedConfig;
      const { content, file, options } = buildAssistantMessage(step, data, isFirstConfig, isModifyMode);

      if (step === 'config' && isFirstConfig) setHasGeneratedConfig(true);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        file,
        options,
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsModifyMode(false);

    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Something went wrong. ${err instanceof Error ? err.message : ''}`.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = '44px';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  const renderPipelineVisual = (content: string) => {
    const nodes = parsePipelineYaml(content);
    const meta  = parsePipelineMeta(content);

    return (
      <div style={{ fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'PIPELINE', value: meta.name,    color: '#a78bfa', border: 'rgba(124,58,237,0.4)',  bg: 'rgba(124,58,237,0.05)' },
            { label: 'TRIGGER',  value: meta.trigger,  color: '#34d399', border: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.05)' },
            { label: 'VERSION',  value: meta.version,  color: '#fbbf24', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.05)' },
          ].map(chip => (
            <div key={chip.label} style={{ padding: '10px 16px', border: `1px solid ${chip.border}`, background: chip.bg, borderRadius: '10px' }}>
              <div style={{ fontSize: '9px', color: chip.color, fontWeight: 800, letterSpacing: '1.2px', marginBottom: '4px' }}>{chip.label}</div>
              <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: 600 }}>{chip.value}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1))' }} />
          DATA FLOW
          <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)' }} />
        </div>

        {nodes.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>Pipeline visualization unavailable</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Check the YAML source for step definitions</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', marginBottom: '40px' }}>
            {nodes.map((node, index) => (
              <React.Fragment key={node.id}>
                <div
                  style={{ padding: '16px 20px', border: `1px solid ${node.color}60`, borderRadius: '12px', background: `${node.color}08`, display: 'flex', alignItems: 'center', gap: '16px', minWidth: '260px', boxShadow: `0 0 20px -10px ${node.color}40`, transition: 'transform 0.2s, background 0.2s', cursor: 'default' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.background = `${node.color}12`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.background = `${node.color}08`; }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${node.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: node.color, flexShrink: 0 }}>
                    <NodeIcon icon={node.icon} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: node.color, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.9 }}>
                      {node.id} <span style={{ opacity: 0.5, marginLeft: '6px' }}>• {node.type}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: 600 }}>{node.title || node.id}</div>
                    {node.description && (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{node.description}</div>
                    )}
                  </div>
                </div>
                {index < nodes.length - 1 && (
                  <div style={{ color: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <div style={{ padding: '14px 16px', background: '#050505', border: '1px solid #1f2937', borderRadius: '6px', fontFamily: '"Fira Code", monospace', fontSize: '12px', color: '#9ca3af' }}>
          <span style={{ color: '#6b7280' }}>flow: </span>
          {nodes.length > 0 ? nodes.map(n => n.id).join(' → ') : '—'}
        </div>
      </div>
    );
  };

  const renderCode = (content: string) => {
    const keywords = ['import', 'from', 'const', 'let', 'var', 'export', 'default', 'function', 'return', 'type', 'interface', 'if', 'else', 'for', 'while', 'def', 'class', 'async', 'await', 'true', 'false'];
    const types    = ['string', 'number', 'boolean', 'any', 'void', 'React', 'useState', 'useEffect'];

    return (content ?? '').split('\n').map((line, i) => {
      const trimmedLine  = line.trim();
      const indentMatch  = line.match(/^\s*/);
      const indent       = indentMatch ? indentMatch[0] : '';

      if (trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
        return <div key={i}><span style={{ whiteSpace: 'pre' }}>{indent}</span><span style={{ color: '#8b949e', fontStyle: 'italic' }}>{trimmedLine}</span></div>;
      }

      const tokens = line.split(/(\s+|[:{}()[\],;."']|(?<=")|(?='))/);
      return (
        <div key={i} style={{ minHeight: '19px' }}>
          {tokens.map((token, j) => {
            if (!token) return null;
            const trimmed = token.trim();
            if (keywords.includes(trimmed)) return <span key={j} style={{ color: '#50fa7b', fontWeight: 600 }}>{token}</span>;
            if (types.includes(trimmed))    return <span key={j} style={{ color: '#8be9fd', fontStyle: 'italic' }}>{token}</span>;
            if (!isNaN(Number(trimmed)) && trimmed !== '' && !token.includes('"') && !token.includes("'")) return <span key={j} style={{ color: '#ffb86c' }}>{token}</span>;
            if (token.startsWith('"') || token.startsWith("'") || token.endsWith('"') || token.endsWith("'")) return <span key={j} style={{ color: '#f1fa8c' }}>{token}</span>;
            const nextToken       = tokens[j + 1]?.trim() ?? '';
            const nextActualToken = tokens.slice(j + 1).find(t => t.trim() !== '') ?? '';
            if (/^[a-zA-Z_]\w*$/.test(trimmed) && nextToken === '(')      return <span key={j} style={{ color: '#50fa7b', fontWeight: 500 }}>{token}</span>;
            if (/^[a-zA-Z_]\w*$/.test(trimmed) && nextActualToken === ':') return <span key={j} style={{ color: '#bd93f9' }}>{token}</span>;
            if ([':', '{', '}', '(', ')', '[', ']', '=', '+', '-', '*', '/', ';', ','].includes(trimmed)) return <span key={j} style={{ color: '#ff79c6' }}>{token}</span>;
            return <span key={j} style={{ color: '#f8f8f2' }}>{token}</span>;
          })}
        </div>
      );
    });
  };

  const renderMarkdownPreview = (content: string) => {
    return (content ?? '').split('\n').map((line, i) => {
      const tLine = line.trim();
      if (tLine.startsWith('# '))   return <div key={i} style={{ color: '#ffffff', fontSize: '1.4em', fontWeight: 'bold', marginTop: '14px', marginBottom: '8px' }}>{tLine.substring(2)}</div>;
      if (tLine.startsWith('## '))  return <div key={i} style={{ color: '#a5d6ff', fontSize: '1.15em', fontWeight: 'bold', marginTop: '12px', marginBottom: '6px' }}>{tLine.substring(3)}</div>;
      if (tLine.startsWith('### ')) return <div key={i} style={{ color: '#c9b8ff', fontSize: '1em', fontWeight: 600, marginTop: '10px', marginBottom: '4px' }}>{tLine.substring(4)}</div>;
      if (tLine.startsWith('- '))   return <div key={i} style={{ color: '#e1e1e9', marginLeft: '14px', marginBottom: '4px' }}><span style={{ color: '#ffffff', marginRight: '6px' }}>•</span>{tLine.substring(2)}</div>;
      if (/^\d+\./.test(tLine))     return <div key={i} style={{ color: '#e1e1e9', marginLeft: '14px', marginBottom: '4px' }}><span style={{ color: '#ffffff', marginRight: '6px', fontWeight: 'bold' }}>{tLine.substring(0, tLine.indexOf('.') + 1)}</span>{tLine.substring(tLine.indexOf('.') + 1)}</div>;
      return <div key={i} style={{ color: '#e1e1e9', marginBottom: '6px', lineHeight: '1.5', minHeight: '19px' }}>{line}</div>;
    });
  };

  const renderFileContent = (msg: Message) => {
    if (!msg.file) return null;
    const { language, content } = msg.file;

    if (language === 'dbschema') {
      return (
        <DbSchemaViewer
          mermaid={msg.file.dbSchema?.mermaid ?? ''}
          diagram={msg.file.dbSchema?.diagram ?? content}
        />
      );
    }

    if (language === 'image') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img src={content} alt={msg.file.name} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
      );
    }

    if (language === 'pipeline') return renderPipelineVisual(content);

    if (language === 'markdown') {
      return markdownMode[msg.id] === 'code'
        ? <pre style={{ margin: 0, fontSize: '13px', fontFamily: '"Fira Code", monospace', lineHeight: '1.6', whiteSpace: 'pre' }}>{renderCode(content)}</pre>
        : <pre style={{ margin: 0, fontSize: '13px', fontFamily: '"Fira Code", monospace', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{renderMarkdownPreview(content)}</pre>;
    }

    return (
      <pre style={{ margin: 0, fontSize: '13px', fontFamily: '"Fira Code", monospace', lineHeight: '1.6', whiteSpace: 'pre' }}>
        {renderCode(content)}
      </pre>
    );
  };

  const renderInputArea = () => (
    <div
      className="glass-panel"
      style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-end', gap: '12px', transition: 'var(--transition-smooth)' }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-light)'; e.currentTarget.style.boxShadow = '0 0 25px var(--accent-glow)'; }}
      onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'var(--shadow-premium)'; }}
    >
      <button
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', marginBottom: '6px' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-light)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';   (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        title="Upload file (Coming soon)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>

      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Describe your system…"
        rows={1}
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'Inter, sans-serif', resize: 'none', lineHeight: '1.5', height: '44px', maxHeight: '140px', overflowY: 'auto', paddingTop: '11px' }}
      />

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingBottom: '6px' }}>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          title="Voice input (Coming soon)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
        </button>

        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          title="Audio mode (Coming soon)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5v14M7 5v14M2 10v4M22 10v4M14.5 7.5v9M9.5 7.5v9" />
          </svg>
        </button>

        <button
          onClick={() => handleSend()}
          style={{ width: '32px', height: '32px', borderRadius: '50%', background: input.trim() ? '#fff' : 'rgba(255,255,255,0.1)', border: 'none', color: input.trim() ? '#000' : 'rgba(255,255,255,0.3)', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'transparent', overflow: 'hidden', minWidth: 0, position: 'relative' }}>

      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.015, backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent', flexShrink: 0, zIndex: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <button style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', transition: 'var(--transition-smooth)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
            Edge-OS
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          <button style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.08)'; b.style.borderColor = 'rgba(255,255,255,0.2)'; b.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.03)'; b.style.borderColor = 'rgba(255,255,255,0.1)'; b.style.color = 'var(--text-secondary)'; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
          <button style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = '0.9'; b.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = '1'; b.style.transform = 'translateY(0)'; }}>
            Log in
          </button>
        </div>
      </div>

      {messages.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 5, padding: '0 20px', width: '100%' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em', opacity: 0.9 }}>Ready when you are.</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '40px', fontWeight: 400 }}>Describe your system and I'll generate the full config stack.</p>

          <div style={{ width: '100%', maxWidth: '750px', position: 'relative' }}>
            {renderInputArea()}
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { icon: 'search', title: 'Design analysis',    sub: 'Review component structure' },
                { icon: 'layers', title: 'Select materials',   sub: 'Generate tech stack' },
                { icon: 'cpu',    title: 'Calculation of cost', sub: 'Estimate compute needs' },
              ].map(chip => (
                <button key={chip.title} className="glass-panel"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.08)'; b.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.03)'; b.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChipIcon name={chip.icon} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{chip.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{chip.sub}</div>
                  </div>
                </button>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '24px' }}>
              By messaging Edge-OS, an AI chatbot, you agree to our Terms and have read our Privacy Policy.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 5 }}>
            <div style={{ maxWidth: '850px', width: '100%', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>

              {messages.map((msg, idx) => (
                <div key={msg.id} className="animate-fade-in-up"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '10px', animationDelay: `${idx * 0.05}s` }}>

                  {msg.tools && (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      {msg.tools.map(tool => (
                        <span key={tool} style={{ fontSize: '10px', fontWeight: 500, color: 'var(--accent-light)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px', padding: '2px 8px' }}>
                          🔧 {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="glass-panel" style={{ maxWidth: '88%', padding: '12px 15px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px', background: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : undefined, borderColor: msg.role === 'user' ? 'var(--accent-light)' : undefined, color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.65', whiteSpace: 'pre-line' }}>
                    {msg.content}

                    {msg.file && (
                      <div className="glass-panel" style={{ marginTop: '16px', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                            </svg>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e1e1e9', fontFamily: 'monospace', letterSpacing: '0.3px' }}>{msg.file.name}</span>

                            {msg.file.language === 'markdown' && (
                              <div style={{ display: 'flex', gap: '4px', marginLeft: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '3px' }}>
                                {(['code', 'preview'] as const).map(mode => (
                                  <button key={mode} onClick={() => setMarkdownMode(prev => ({ ...prev, [msg.id]: mode }))}
                                    style={{ background: (markdownMode[msg.id] ?? 'preview') === mode ? 'rgba(255,255,255,0.15)' : 'transparent', border: (markdownMode[msg.id] ?? 'preview') === mode ? '1px solid rgba(255,255,255,0.20)' : '1px solid transparent', color: (markdownMode[msg.id] ?? 'preview') === mode ? '#fff' : 'var(--text-muted)', fontSize: '11px', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}>
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {!['image', 'pipeline', 'dbschema'].includes(msg.file.language) && (
                            <button
                              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 600 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                              onClick={() => navigator.clipboard.writeText(msg.file!.content)}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              Copy
                            </button>
                          )}
                        </div>

                        <div style={{ padding: msg.file.language === 'pipeline' || msg.file.language === 'dbschema' ? '24px' : '16px', overflowX: 'auto', background: '#111111' }}>
                          {renderFileContent(msg)}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.options && msg.options.length > 0 && msg.role === 'assistant' && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {msg.options.map((option, i) => (
                        <button key={i}
                          onClick={() => {
                            if (option.toLowerCase() === 'modify') {
                              setIsModifyMode(true);
                              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Tell me what you want to change in the configuration.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
                              return;
                            }
                            handleSend(option);
                          }}
                          style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#cccccc', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.1)'; b.style.borderColor = 'rgba(255,255,255,0.3)'; b.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(255,255,255,0.05)'; b.style.borderColor = 'rgba(255,255,255,0.2)'; b.style.transform = 'translateY(0)'; }}>
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>{msg.timestamp}</span>
                </div>
              ))}

              {isTyping && (
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ padding: '12px 16px', borderRadius: '4px 14px 14px 14px', background: 'rgba(20,20,20,0.85)', border: '1px solid var(--border-subtle)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-light)', display: 'block', animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div style={{ padding: '0 20px 20px', flexShrink: 0, position: 'relative', zIndex: 10 }}>
            <div style={{ maxWidth: '750px', width: '100%', margin: '0 auto' }}>
              {renderInputArea()}
              <p style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Edge-OS can make mistakes. Consider checking important information.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NodeIcon({ icon }: { icon: string }) {
  const props = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (icon === 'video')    return <svg {...props}><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>;
  if (icon === 'refresh')  return <svg {...props}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>;
  if (icon === 'target')   return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="12" cy="12" r="3" /></svg>;
  if (icon === 'database') return <svg {...props}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>;
  if (icon === 'bell')     return <svg {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="10" /></svg>;
}

function ChipIcon({ name }: { name: string }) {
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'search') return <svg {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
  if (name === 'layers') return <svg {...props}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
  if (name === 'cpu')    return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="10" /></svg>;
}