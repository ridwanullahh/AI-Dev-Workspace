import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { devContainer } from '../services/devContainer';
import type { Terminal as TerminalType } from '../database/schema';

interface TerminalProps {
  terminal: TerminalType;
  onClose?: () => void;
}

export function Terminal({ terminal, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    xterm.writeln('Welcome to AI Dev Workspace Terminal');
    xterm.writeln('');
    writePrompt(xterm, terminal.cwd);

    let currentLine = '';
    let cursorPosition = 0;

    xterm.onData(async (data) => {
      if (isExecuting) return;

      const code = data.charCodeAt(0);

      if (code === 13) {
        xterm.writeln('');
        
        if (currentLine.trim()) {
          setIsExecuting(true);
          await executeCommand(xterm, terminal.id, currentLine, terminal.cwd);
          setIsExecuting(false);
        }

        currentLine = '';
        cursorPosition = 0;
        writePrompt(xterm, terminal.cwd);
      } else if (code === 127) {
        if (cursorPosition > 0) {
          currentLine = currentLine.slice(0, cursorPosition - 1) + currentLine.slice(cursorPosition);
          cursorPosition--;
          xterm.write('\b \b');
        }
      } else if (code === 27) {
        // Arrow keys and other escape sequences
      } else if (code >= 32) {
        currentLine = currentLine.slice(0, cursorPosition) + data + currentLine.slice(cursorPosition);
        cursorPosition++;
        xterm.write(data);
      }

      setCurrentCommand(currentLine);
    });

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, [terminal.id, terminal.cwd, isExecuting]);

  const writePrompt = (xterm: XTerm, cwd: string) => {
    xterm.write(`\x1b[32m➜\x1b[0m \x1b[36m${cwd}\x1b[0m $ `);
  };

  const executeCommand = async (xterm: XTerm, terminalId: string, command: string, cwd: string) => {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    try {
      const result = await devContainer.executeCommand(terminalId, {
        command: cmd,
        args,
        cwd,
        env: terminal.environment
      });

      if (result.output) {
        xterm.writeln(result.output);
      }

      if (result.error) {
        xterm.writeln(`\x1b[31m${result.error}\x1b[0m`);
      }

      if (result.exitCode !== 0) {
        xterm.writeln(`\x1b[31mExit code: ${result.exitCode}\x1b[0m`);
      }
    } catch (error) {
      xterm.writeln(`\x1b[31mError: ${error instanceof Error ? error.message : 'Command failed'}\x1b[0m`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3e3e3e]">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{terminal.name}</span>
          <span className="text-xs text-gray-500">{terminal.cwd}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close terminal"
          >
            ✕
          </button>
        )}
      </div>
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
}
