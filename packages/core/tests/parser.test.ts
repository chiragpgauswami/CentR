import { describe, expect, it } from 'vitest';
import { parseFile, parseJSON, parseMarkdown, parseTypeScript } from '../src/parser/index.js';

describe('Parser Module', () => {
  describe('parseTypeScript', () => {
    it('extracts function declarations and exports', () => {
      const code = `
        export function calculateTotal(items: number[]): number {
          return items.reduce((a, b) => a + b, 0);
        }

        async function fetchUser(id: string) {
          return null;
        }
      `;
      const res = parseTypeScript(code);
      const totalFn = res.symbols.find((s) => s.name === 'calculateTotal');
      expect(totalFn).toBeDefined();
      expect(totalFn?.kind).toBe('function');
      expect(totalFn?.exported).toBe(true);

      const fetchFn = res.symbols.find((s) => s.name === 'fetchUser');
      expect(fetchFn).toBeDefined();
      expect(fetchFn?.kind).toBe('function');
      expect(fetchFn?.exported).toBe(false);
    });

    it('extracts class declarations and methods', () => {
      const code = `
        export class UserService {
          async getUser(id: string) {
            return null;
          }
          deleteUser(id: string) {
            return true;
          }
        }
      `;
      const res = parseTypeScript(code);
      const classSym = res.symbols.find((s) => s.name === 'UserService');
      expect(classSym).toBeDefined();
      expect(classSym?.kind).toBe('class');
      expect(classSym?.exported).toBe(true);

      const getMethod = res.symbols.find((s) => s.name === 'getUser');
      expect(getMethod).toBeDefined();
      expect(getMethod?.kind).toBe('method');
    });

    it('extracts interfaces and types', () => {
      const code = `
        export interface Config {
          port: number;
          host: string;
        }

        export type Status = 'active' | 'inactive';
      `;
      const res = parseTypeScript(code);
      const configInt = res.symbols.find((s) => s.name === 'Config');
      expect(configInt).toBeDefined();
      expect(configInt?.kind).toBe('interface');

      const statusType = res.symbols.find((s) => s.name === 'Status');
      expect(statusType).toBeDefined();
      expect(statusType?.kind).toBe('type');
    });

    it('extracts imports', () => {
      const code = `
        import express from 'express';
        import { useState, useEffect } from 'react';
        import * as path from 'path';
      `;
      const res = parseTypeScript(code);
      expect(res.imports.length).toBeGreaterThanOrEqual(3);

      const expressImp = res.imports.find((i) => i.source === 'express');
      expect(expressImp?.isDefault).toBe(true);

      const reactImp = res.imports.find((i) => i.source === 'react');
      expect(reactImp?.specifiers).toContain('useState');
      expect(reactImp?.specifiers).toContain('useEffect');

      const pathImp = res.imports.find((i) => i.source === 'path');
      expect(pathImp?.isNamespace).toBe(true);
    });

    it('extracts exports', () => {
      const code = `
        export const API_URL = 'http://localhost';
        export default class App {}
      `;
      const res = parseTypeScript(code);
      expect(res.exports.length).toBeGreaterThanOrEqual(1);
    });

    it('does not create symbols for functions or classes in comments or strings', () => {
      const code = `
        // function commentedOutFunction() { return 1; }
        /*
          class CommentedClass {}
        */
        const template = \`
          function functionInString() {}
          class ClassInString {}
        \`;
        export function realFunction(): number {
          return 42;
        }
      `;
      const res = parseTypeScript(code);
      const symbolNames = res.symbols.map((s) => s.name);
      expect(symbolNames).not.toContain('commentedOutFunction');
      expect(symbolNames).not.toContain('CommentedClass');
      expect(symbolNames).not.toContain('functionInString');
      expect(symbolNames).not.toContain('ClassInString');
      expect(symbolNames).toContain('realFunction');
    });

    it('extracts arrow functions and function expressions as functions', () => {
      const code = `
        export const compute = (x: number): number => x * 2;
        const handler = function(e: any) { return e; };
        const regularVar = 123;
      `;
      const res = parseTypeScript(code);
      const computeSym = res.symbols.find((s) => s.name === 'compute');
      expect(computeSym).toBeDefined();
      expect(computeSym?.kind).toBe('function');
      expect(computeSym?.exported).toBe(true);

      const handlerSym = res.symbols.find((s) => s.name === 'handler');
      expect(handlerSym).toBeDefined();
      expect(handlerSym?.kind).toBe('function');

      const varSym = res.symbols.find((s) => s.name === 'regularVar');
      expect(varSym).toBeDefined();
      expect(varSym?.kind).toBe('constant');
    });

    it('extracts multiline imports correctly', () => {
      const code = `
        import {
          alpha,
          beta as b,
          gamma,
        } from './alphabet.js';
      `;
      const res = parseTypeScript(code);
      expect(res.imports.length).toBe(1);
      const imp = res.imports[0];
      expect(imp.source).toBe('./alphabet.js');
      expect(imp.specifiers).toContain('alpha');
      expect(imp.specifiers).toContain('gamma');
    });

    it('extracts references to declared and imported symbols', () => {
      const code = `
        import { helper } from './utils.js';
        function calculate() {
          return helper() + 1;
        }
        export function run() {
          return calculate();
        }
      `;
      const res = parseTypeScript(code);
      expect(res.references.length).toBeGreaterThan(0);
      const refNames = res.references.map((r) => r.symbolName);
      expect(refNames).toContain('helper');
      expect(refNames).toContain('calculate');
    });
  });

  describe('parseJSON', () => {
    it('extracts top-level properties from json', () => {
      const json = JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        scripts: { build: 'tsc' },
      });
      const res = parseJSON(json);
      expect(res.symbols.some((s) => s.name === 'name')).toBe(true);
      expect(res.symbols.some((s) => s.name === 'version')).toBe(true);
      expect(res.symbols.some((s) => s.name === 'scripts')).toBe(true);
    });
  });

  describe('parseMarkdown', () => {
    it('extracts headings from markdown', () => {
      const md = `
# Project Title
Some text here
## Installation
Run npm install
### Prerequisites
Node 20+
      `;
      const res = parseMarkdown(md);
      expect(res.symbols.some((s) => s.name === 'Project Title')).toBe(true);
      expect(res.symbols.some((s) => s.name === 'Installation')).toBe(true);
      expect(res.symbols.some((s) => s.name === 'Prerequisites')).toBe(true);
    });
  });

  describe('parseFile', () => {
    it('dispatches to correct parser by language', () => {
      const tsResult = parseFile('test.ts', 'export const x = 1;', 'typescript');
      expect(tsResult.symbols.length).toBeGreaterThan(0);

      const mdResult = parseFile('README.md', '# Hello', 'markdown');
      expect(mdResult.symbols.length).toBeGreaterThan(0);
    });
  });
});
