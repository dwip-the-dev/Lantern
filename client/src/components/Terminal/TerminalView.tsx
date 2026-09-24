import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Trash2,
  Maximize2,
  RefreshCw,
  Play,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../../api/client';

export const TerminalView: React.FC = () => {
  const [output, setOutput] = useState<string[]>([]);
  const [inputCommand, setInputCommand] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message
  useEffect(() => {
    setOutput([
      "Lantern Interactive Shell v1.0 [Enlightened Console]",
      "Type any command or use the quick macro shortcuts below.",
      ""
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const runCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    setIsExecuting(true);
    const commandText = cmd.trim();
    setInputCommand('');

    // Append command prompt line
    setOutput(prev => [...prev, `$ ${commandText}`]);

    try {
      const res = await api.execCommand(commandText);
      const lines: string[] = [];
      if (res.stdout) {
        lines.push(...res.stdout.split('\n'));
      }
      if (res.stderr) {
        lines.push(...res.stderr.split('\n').map(l => `[err] ${l}`));
      }
      if (!res.stdout && !res.stderr) {
        lines.push('(command finished with no output)');
      }
      setOutput(prev => [...prev, ...lines, '']);
    } catch (err: any) {
      setOutput(prev => [...prev, `[error] ${err.message || 'Execution failed'}`, '']);
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      runCommand(inputCommand);
    }
  };

  const clearScreen = () => {
    setOutput([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const macros = [
    { label: 'df -h', cmd: 'df -h' },
    { label: 'free -h', cmd: 'free -h' },
    { label: 'docker ps', cmd: 'docker ps -a || echo "Docker daemon not active"' },
    { label: 'uptime', cmd: 'uptime' },
    { label: 'ip a', cmd: 'ip -brief addr show' },
    { label: 'uname -a', cmd: 'uname -a' },
    { label: 'ps aux (top 5)', cmd: 'ps aux --sort=-%cpu | head -n 6' }
  ];

  return (
    <div className="space-y-4 pb-12">

      {/* Header & Quick Macros */}
      <div className="glass-panel p-5 rounded-2xl border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <TerminalIcon className="w-5 h-5 text-lantern-400" />
            <h1 className="text-xl font-extrabold text-white">Browser Terminal</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Execute host commands and manage your server directly in the browser.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={copyOutput}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-obsidian-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={clearScreen}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-obsidian-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Quick Macro Buttons */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex-shrink-0">
          Macros:
        </span>
        {macros.map((m, i) => (
          <button
            key={i}
            onClick={() => runCommand(m.cmd)}
            className="px-2.5 py-1 rounded-lg bg-obsidian-900 hover:bg-slate-800 text-lantern-300 border border-slate-800/80 hover:border-lantern-500/40 text-xs font-mono transition-colors whitespace-nowrap"
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Terminal Window Container */}
      <div
        className="bg-obsidian-950 border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col h-[600px] overflow-hidden cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Window Chrome Title */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 select-none">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            <span className="text-xs font-mono text-slate-400 ml-2">lantern@server: ~</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">bash</span>
        </div>

        {/* Terminal Logs Output */}
        <div className="flex-1 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 scrollbar-none">
          {output.map((line, i) => (
            <div
              key={i}
              className={`leading-relaxed whitespace-pre-wrap ${
                line.startsWith('$')
                  ? 'text-lantern-400 font-bold'
                  : line.startsWith('[err]')
                  ? 'text-rose-400'
                  : line.startsWith('[error]')
                  ? 'text-rose-400 font-bold'
                  : 'text-slate-300'
              }`}
            >
              {line}
            </div>
          ))}

          {/* Active Input Line */}
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-lantern-400 font-bold font-mono">$</span>
            <input
              ref={inputRef}
              type="text"
              value={inputCommand}
              disabled={isExecuting}
              onChange={(e) => setInputCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent font-mono text-xs text-white focus:outline-none placeholder-slate-600"
              placeholder={isExecuting ? 'Running command...' : 'Type a command and press Enter...'}
              autoFocus
            />
            {isExecuting && (
              <span className="w-3 h-3 border-2 border-lantern-400 border-t-transparent rounded-full animate-spin"></span>
            )}
          </div>

          <div ref={bottomRef} />
        </div>
      </div>

    </div>
  );
};
