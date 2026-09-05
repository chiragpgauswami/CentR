import { CentrDatabase, initializeProject } from '@centr/core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('MCP Server Stdio Process Validation', () => {
  let tmpDir: string;
  const fixturePath = path.resolve('fixtures/sample-project');
  const serverPath = path.resolve('packages/mcp/dist/index.js');

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-mcp-stdio-'));
    fs.cpSync(fixturePath, tmpDir, { recursive: true });

    // Initialize CentR in tmpDir
    const centrDir = path.join(tmpDir, '.centr');
    fs.mkdirSync(centrDir, { recursive: true });
    const db = new CentrDatabase(path.join(centrDir, 'centr.db'));
    db.initialize();
    await initializeProject(tmpDir, db);
    db.close();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('handles JSON-RPC initialization and tools/list over stdio with pure JSON stdout', async () => {
    const child = spawn(process.execPath, [serverPath], {
      cwd: tmpDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let stdoutBuffer = '';
    const receivedMessages: any[] = [];

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString('utf-8');
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Verify stdout contains ONLY valid JSON-RPC frames (no stray console.log)
        let parsed: any;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          throw new Error(`Non-JSON text detected on MCP stdout: "${trimmed}"`);
        }
        receivedMessages.push(parsed);
      }
    });

    // Helper to send message and wait for specific id response
    function send(msg: any) {
      child.stdin.write(JSON.stringify(msg) + '\n');
    }

    async function waitForResponse(id: number, timeoutMs = 5000): Promise<any> {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const found = receivedMessages.find((m) => m.id === id);
        if (found) return found;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error(`Timeout waiting for response to id ${id}`);
    }

    // 1. Send initialize request
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    const initResponse = await waitForResponse(1);
    expect(initResponse.jsonrpc).toBe('2.0');
    expect(initResponse.result).toBeDefined();
    expect(initResponse.result.serverInfo.name).toBe('centr');
    expect(initResponse.result.serverInfo.version).toBe('0.1.0');

    // 2. Send initialized notification
    send({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });

    // 3. Request tools list
    send({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    });

    const toolsResponse = await waitForResponse(2);
    expect(toolsResponse.jsonrpc).toBe('2.0');
    expect(toolsResponse.result).toBeDefined();
    const toolNames = toolsResponse.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('project_status');
    expect(toolNames).toContain('project_search');
    expect(toolNames).toContain('project_context');
    expect(toolNames).toContain('learning_search');

    // Terminate cleanly
    child.kill('SIGTERM');
  });
});
