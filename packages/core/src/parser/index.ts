import ts from 'typescript';
import type { SymbolKind } from '../types.js';

export interface ParseResult {
  symbols: ParsedSymbol[];
  imports: ParsedImport[];
  exports: ParsedExport[];
  references: ParsedReference[];
}

export interface ParsedSymbol {
  name: string;
  qualifiedName: string;
  kind: SymbolKind;
  signature: string | null;
  line: number;
  endLine: number | null;
  column: number;
  exported: boolean;
}

export interface ParsedImport {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
  line: number;
}

export interface ParsedExport {
  name: string;
  kind: string;
  isDefault: boolean;
  line: number;
}

export interface ParsedReference {
  symbolName: string;
  line: number;
  column: number;
}

function hasModifier(node: ts.Node, modifierKind: ts.SyntaxKind): boolean {
  if (ts.canHaveModifiers(node)) {
    const modifiers = ts.getModifiers(node);
    if (modifiers) {
      return modifiers.some((m) => m.kind === modifierKind);
    }
  }
  return false;
}

function getSignature(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  const text = node.getText(sourceFile);
  const braceIdx = text.indexOf('{');
  if (braceIdx !== -1) {
    return text.substring(0, braceIdx).trim();
  }
  const semicolonIdx = text.indexOf(';');
  if (semicolonIdx !== -1) {
    return text.substring(0, semicolonIdx).trim();
  }
  return text.split('\n')[0]?.trim() ?? null;
}

export function parseFile(filePath: string, content: string, language: string): ParseResult {
  if (language === 'typescript' || language === 'javascript') {
    return parseTypeScript(content, filePath);
  } else if (language === 'json') {
    return parseJSON(content);
  } else if (language === 'markdown') {
    return parseMarkdown(content);
  }
  return { symbols: [], imports: [], exports: [], references: [] };
}

export function parseTypeScript(content: string, fileName = 'temp.ts'): ParseResult {
  const result: ParseResult = { symbols: [], imports: [], exports: [], references: [] };
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') || fileName.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const declaredNames = new Set<string>();
  const referencePositions = new Set<string>();

  function recordSymbol(symbol: ParsedSymbol) {
    result.symbols.push(symbol);
    declaredNames.add(symbol.name);
    if (symbol.exported) {
      result.exports.push({
        name: symbol.name,
        kind: symbol.kind,
        isDefault: false,
        line: symbol.line,
      });
    }
  }

  function visit(node: ts.Node) {
    // 1. Function Declaration
    if (ts.isFunctionDeclaration(node)) {
      const name = node.name?.text || 'default';
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
      const isDefault = hasModifier(node, ts.SyntaxKind.DefaultKeyword);

      const symbol: ParsedSymbol = {
        name,
        qualifiedName: name,
        kind: 'function',
        signature: getSignature(node, sourceFile),
        line: line + 1,
        endLine,
        column: character,
        exported: isExported || isDefault,
      };
      recordSymbol(symbol);
      if (isDefault) {
        result.exports.push({
          name,
          kind: 'function',
          isDefault: true,
          line: line + 1,
        });
      }
    }

    // 2. Class Declaration
    else if (ts.isClassDeclaration(node)) {
      const className = node.name?.text || 'default';
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
      const isDefault = hasModifier(node, ts.SyntaxKind.DefaultKeyword);

      const classSymbol: ParsedSymbol = {
        name: className,
        qualifiedName: className,
        kind: 'class',
        signature: getSignature(node, sourceFile),
        line: line + 1,
        endLine,
        column: character,
        exported: isExported || isDefault,
      };
      recordSymbol(classSymbol);
      if (isDefault) {
        result.exports.push({
          name: className,
          kind: 'class',
          isDefault: true,
          line: line + 1,
        });
      }

      // Class Members (methods, accessors, constructor, properties)
      for (const member of node.members) {
        const memberStart = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile));
        const memberEnd = sourceFile.getLineAndCharacterOfPosition(member.getEnd());
        const memberLine = memberStart.line + 1;
        const memberEndLine = memberEnd.line + 1;

        if (ts.isMethodDeclaration(member)) {
          const methodName = member.name.getText(sourceFile);
          result.symbols.push({
            name: methodName,
            qualifiedName: `${className}.${methodName}`,
            kind: 'method',
            signature: getSignature(member, sourceFile),
            line: memberLine,
            endLine: memberEndLine,
            column: memberStart.character,
            exported: false,
          });
        } else if (ts.isConstructorDeclaration(member)) {
          result.symbols.push({
            name: 'constructor',
            qualifiedName: `${className}.constructor`,
            kind: 'method',
            signature: getSignature(member, sourceFile),
            line: memberLine,
            endLine: memberEndLine,
            column: memberStart.character,
            exported: false,
          });
        } else if (ts.isGetAccessor(member) || ts.isSetAccessor(member)) {
          const accessorName = member.name.getText(sourceFile);
          result.symbols.push({
            name: accessorName,
            qualifiedName: `${className}.${accessorName}`,
            kind: 'method',
            signature: getSignature(member, sourceFile),
            line: memberLine,
            endLine: memberEndLine,
            column: memberStart.character,
            exported: false,
          });
        } else if (ts.isPropertyDeclaration(member)) {
          const propName = member.name.getText(sourceFile);
          result.symbols.push({
            name: propName,
            qualifiedName: `${className}.${propName}`,
            kind: 'property',
            signature: null,
            line: memberLine,
            endLine: memberEndLine,
            column: memberStart.character,
            exported: false,
          });
        }
      }
    }

    // 3. Interface Declaration
    else if (ts.isInterfaceDeclaration(node)) {
      const name = node.name.text;
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);

      recordSymbol({
        name,
        qualifiedName: name,
        kind: 'interface',
        signature: null,
        line: line + 1,
        endLine,
        column: character,
        exported: isExported,
      });
    }

    // 4. Type Alias Declaration
    else if (ts.isTypeAliasDeclaration(node)) {
      const name = node.name.text;
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);

      recordSymbol({
        name,
        qualifiedName: name,
        kind: 'type',
        signature: null,
        line: line + 1,
        endLine,
        column: character,
        exported: isExported,
      });
    }

    // 5. Enum Declaration
    else if (ts.isEnumDeclaration(node)) {
      const name = node.name.text;
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);

      recordSymbol({
        name,
        qualifiedName: name,
        kind: 'enum',
        signature: null,
        line: line + 1,
        endLine,
        column: character,
        exported: isExported,
      });
    }

    // 6. Variable Statement (const, let, var, arrow functions, function expressions)
    else if (ts.isVariableStatement(node)) {
      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
      const isConst = (node.declarationList.flags & ts.NodeFlags.Const) !== 0;

      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            decl.getStart(sourceFile),
          );
          const endLine = sourceFile.getLineAndCharacterOfPosition(decl.getEnd()).line + 1;

          let kind: SymbolKind = isConst ? 'constant' : 'variable';
          let signature: string | null = null;

          if (decl.initializer) {
            if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
              kind = 'function';
              signature = getSignature(decl, sourceFile);
            } else if (ts.isClassExpression(decl.initializer)) {
              kind = 'class';
            }
          }

          recordSymbol({
            name,
            qualifiedName: name,
            kind,
            signature,
            line: line + 1,
            endLine,
            column: character,
            exported: isExported,
          });
        }
      }
    }

    // 7. Import Declaration (including multiline, default, namespace, named)
    else if (ts.isImportDeclaration(node)) {
      const source = (node.moduleSpecifier as ts.StringLiteral).text;
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      let isDefault = false;
      let isNamespace = false;
      const specifiers: string[] = [];

      if (node.importClause) {
        if (node.importClause.name) {
          isDefault = true;
          specifiers.push(node.importClause.name.text);
          declaredNames.add(node.importClause.name.text);
        }

        if (node.importClause.namedBindings) {
          if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            isNamespace = true;
            specifiers.push(node.importClause.namedBindings.name.text);
            declaredNames.add(node.importClause.namedBindings.name.text);
          } else if (ts.isNamedImports(node.importClause.namedBindings)) {
            for (const elem of node.importClause.namedBindings.elements) {
              const specName = elem.name.text;
              specifiers.push(specName);
              declaredNames.add(specName);
            }
          }
        }
      }

      result.imports.push({
        source,
        specifiers,
        isDefault,
        isNamespace,
        line: line + 1,
      });
    }

    // 8. Standalone Export Declarations (export { a, b as c } from '...')
    else if (ts.isExportDeclaration(node)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const elem of node.exportClause.elements) {
          const exportName = elem.name.text;
          const isDefault = exportName === 'default';
          result.exports.push({
            name: exportName,
            kind: 'unknown',
            isDefault,
            line: line + 1,
          });
        }
      }
    }

    // 9. Export Default Assignment (export default expr)
    else if (ts.isExportAssignment(node)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const expName = node.expression.getText(sourceFile);
      result.exports.push({
        name: expName.length < 50 ? expName : 'default',
        kind: 'default',
        isDefault: true,
        line: line + 1,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Second pass: extract references
  function findReferences(node: ts.Node) {
    if (ts.isIdentifier(node)) {
      const identName = node.text;
      if (declaredNames.has(identName)) {
        // Skip identifier if it is the declaration name itself
        const parent = node.parent;
        const isDeclarationName =
          (ts.isFunctionDeclaration(parent) && parent.name === node) ||
          (ts.isClassDeclaration(parent) && parent.name === node) ||
          (ts.isInterfaceDeclaration(parent) && parent.name === node) ||
          (ts.isTypeAliasDeclaration(parent) && parent.name === node) ||
          (ts.isEnumDeclaration(parent) && parent.name === node) ||
          (ts.isVariableDeclaration(parent) && parent.name === node) ||
          (ts.isImportSpecifier(parent) && parent.name === node) ||
          (ts.isImportClause(parent) && parent.name === node) ||
          (ts.isNamespaceImport(parent) && parent.name === node);

        if (!isDeclarationName) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(sourceFile),
          );
          const lineNum = line + 1;
          const key = `${identName}:${lineNum}:${character}`;
          if (!referencePositions.has(key)) {
            referencePositions.add(key);
            result.references.push({
              symbolName: identName,
              line: lineNum,
              column: character,
            });
          }
        }
      }
    }
    ts.forEachChild(node, findReferences);
  }

  findReferences(sourceFile);

  return result;
}

export function parseJSON(content: string): ParseResult {
  const result: ParseResult = { symbols: [], imports: [], exports: [], references: [] };
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      for (const key of Object.keys(parsed)) {
        result.symbols.push({
          name: key,
          qualifiedName: key,
          kind: 'property',
          signature: null,
          line: 1,
          endLine: null,
          column: 0,
          exported: true,
        });
      }
    }
  } catch {
    // Ignore invalid JSON
  }
  return result;
}

export function parseMarkdown(content: string): ParseResult {
  const result: ParseResult = { symbols: [], imports: [], exports: [], references: [] };
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.*)/);
    if (match) {
      result.symbols.push({
        name: match[2].trim(),
        qualifiedName: match[2].trim(),
        kind: 'property',
        signature: null,
        line: i + 1,
        endLine: null,
        column: 0,
        exported: false,
      });
    }
  }
  return result;
}
