import { CentrDatabase, initializeProject, loadConfig, saveConfig } from '@centr-ai/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleTool, TOOLS } from '../src/index.js';

describe('MCP Server & Tools', () => {
  let tmpDir: string;
  const fixturePath = path.resolve('fixtures/sample-project');

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centr-mcp-test-'));
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

  it('exposes all expected MCP tools', () => {
    const toolNames = TOOLS.map((t) => t.name);
    expect(toolNames).toContain('project_status');
    expect(toolNames).toContain('project_search');
    expect(toolNames).toContain('project_context');
    expect(toolNames).toContain('project_symbol');
    expect(toolNames).toContain('project_dependencies');
    expect(toolNames).toContain('project_architecture');
    expect(toolNames).toContain('learning_search');
    expect(toolNames).toContain('learning_record');
    expect(toolNames).toContain('skill_search');
  });

  it('executes project_status tool', async () => {
    const res = await handleTool('project_status', {}, tmpDir);
    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.project.name).toBe('sample-project');
    expect(parsed.counts.files).toBeGreaterThan(0);
    expect(parsed.counts.symbols).toBeGreaterThan(0);
  });

  it('executes project_search tool', async () => {
    const res = await handleTool('project_search', { query: 'UserController' }, tmpDir);
    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it('executes project_context tool with token budget', async () => {
    const res = await handleTool(
      'project_context',
      { task: 'Add authentication middleware', maxTokens: 3000 },
      tmpDir,
    );
    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.task).toBe('Add authentication middleware');
    expect(parsed.budget).toBe(3000);
    expect(parsed.estimatedTokens).toBeLessThanOrEqual(3000);
    expect(Array.isArray(parsed.items)).toBe(true);
  });

  it('executes project_symbol tool', async () => {
    const res = await handleTool('project_symbol', { name: 'UserController' }, tmpDir);
    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.symbol.name).toBe('UserController');
    expect(parsed.symbol.kind).toBe('class');
  });

  it('executes project_dependencies tool', async () => {
    const res = await handleTool('project_dependencies', {}, tmpDir);
    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((d: any) => d.name === 'express')).toBe(true);
  });

  it('executes project_architecture tool', async () => {
    const res = await handleTool('project_architecture', {}, tmpDir);
    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.project.name).toBe('sample-project');
    expect(parsed.languages).toBeDefined();
    expect(parsed.entryPoints).toBeDefined();
  });

  it('records and searches learning via MCP tools', async () => {
    const recRes = await handleTool(
      'learning_record',
      {
        lesson: 'Verify JWT tokens against expiration date',
        category: 'security',
        trigger: 'auth failure',
        recommendedAction: 'Check token exp claim',
        sourceExperience: 'Debugging token validation',
      },
      tmpDir,
    );
    expect(recRes.content).toHaveLength(1);
    const recParsed = JSON.parse(recRes.content[0].text);
    expect(recParsed.id).toBeGreaterThan(0);
    expect(recParsed.status).toBe('candidate');

    const searchRes = await handleTool('learning_search', { query: 'JWT' }, tmpDir);
    const searchParsed = JSON.parse(searchRes.content[0].text);
    expect(Array.isArray(searchParsed)).toBe(true);
    expect(searchParsed.length).toBeGreaterThan(0);
    expect(searchParsed[0].lesson).toContain('JWT');
  });

  it('validates tool arguments and rejects invalid inputs safely', async () => {
    // Empty query rejected
    await expect(handleTool('project_search', { query: '' }, tmpDir)).rejects.toThrow();

    // Null bytes rejected
    await expect(handleTool('project_search', { query: 'test\0drop' }, tmpDir)).rejects.toThrow();

    // Unknown tool rejected
    await expect(handleTool('non_existent_tool', {}, tmpDir)).rejects.toThrow();
  });

  it('executes brain_analyze_failure and project_context with brain', async () => {
    // Write brain mock config into .centr/config.json
    const cfg = loadConfig(tmpDir);
    cfg.brain = {
      enabled: true,
      provider: 'mock',
      model: 'mock-model',
    };
    saveConfig(tmpDir, cfg);

    // Test brain_analyze_failure
    const failRes = await handleTool(
      'brain_analyze_failure',
      {
        task: 'Fix database connection',
        attemptedChange: 'Updated port to 5432',
        error: 'ECONNREFUSED 127.0.0.1:5432 - environment config missing',
      },
      tmpDir,
    );
    expect(failRes.content).toHaveLength(1);
    const failParsed = JSON.parse(failRes.content[0].text);
    expect(failParsed.failureType).toBe('configuration');
    expect(failParsed.rootCause).toBeDefined();

    // Test project_context with useBrain: true
    const ctxRes = await handleTool(
      'project_context',
      {
        task: 'Authenticate user controller',
        useBrain: true,
      },
      tmpDir,
    );
    expect(ctxRes.content).toHaveLength(1);
    const ctxParsed = JSON.parse(ctxRes.content[0].text);
    expect(ctxParsed.items).toBeDefined();
    expect(ctxParsed.items.length).toBeGreaterThan(0);
  });
});
