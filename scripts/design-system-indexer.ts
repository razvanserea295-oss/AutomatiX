/**
 * Design System Indexer
 * Scans the codebase and auto-generates documentation for components, design tokens, and styles.
 * Used by the premium redesign system to provide context for AI agents and developers.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, relative, sep } from 'path';

// Native glob implementation (no external dependency)
function globSync(pattern: string, options: { absolute?: boolean } = {}): string[] {
  const baseDir = process.cwd();
  const fullPattern = pattern.startsWith('src/') ? pattern : join(baseDir, pattern);
  const [dir, filePattern] = fullPattern.replace(/\\/g, '/').split('/**/*.{');
  const extensions = filePattern?.replace('}', '').split(',') || ['.tsx'];
  
  const results: string[] = [];
  
  function scan(currentPath: string) {
    const entries = readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(options.absolute ? fullPath : relative(baseDir, fullPath));
      }
    }
  }
  
  const startPath = dir || baseDir;
  if (existsSync(startPath)) {
    scan(startPath);
  }
  
  return results;
}

interface ComponentDoc {
  name: string;
  filePath: string;
  purpose: string;
  props: string[];
  usage: string;
  examples: string[];
  relationships: string[];
}

interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'spacing' | 'font' | 'border' | 'shadow' | 'radius';
  source: string;
}

interface DesignSystemIndex {
  components: ComponentDoc[];
  tokens: DesignToken[];
  generatedAt: string;
}

const SRC_DIR = 'src/redesign/ui';
const CSS_FILES = [
  'src/redesign/tokens/design-tokens.css',
  'src/redesign/tokens/legacy-aliases.css',
  'src/redesign/index.css',
  'src/index.css',
  'src/styles/dashboard.css',
];

// Extract JSDoc-style purpose from component file
function extractPurpose(content: string): string {
  const match = content.match(/\/\*\*[\s\S]*?\n \*\/|^[^{]+\/\*\*([\s\S]*?)\*\//);
  if (match) {
    return match[1]
      .replace(/\*?\s?/g, '')
      .trim()
      .split('\n')[0] || 'Reusable UI component';
  }
  // Check for comment at top of file
  const topComment = content.match(/\/\/\s*(.+?)(?:\n|$)/);
  return topComment?.[1] || 'UI component';
}

// Extract props from TypeScript interface or type
function extractProps(content: string): string[] {
  const props: string[] = [];
  const interfaceMatch = content.match(/interface\s+\w*Props[^{]*\{([^}]+)\}/);
  if (interfaceMatch) {
    const propsContent = interfaceMatch[1];
    const propMatches = propsContent.matchAll(/(\w+)\s*[\?{:]/g);
    for (const match of propMatches) {
      if (match[1] && !['children', 'className'].includes(match[1])) {
        props.push(match[1]);
      }
    }
  }
  return props.length > 0 ? props : ['No explicit props interface found'];
}

// Extract usage examples (look for .usage or similar patterns in comments)
function extractExamples(content: string): string[] {
  const examples: string[] = [];
  const exampleMatches = content.matchAll(/\/\/\s*Example:\s*`([^`]+)`/g);
  for (const match of exampleMatches) {
    examples.push(match[1]);
  }
  return examples;
}

// Extract component relationships (imports and potential parents/children)
function extractRelationships(content: string, imports: string[]): string[] {
  return imports.filter(i => 
    i.includes('/ui/') || 
    i.includes('redesign/ui')
  ).map(i => i.split('/').pop()?.replace(/['"]/g, '') || i);
}

// Extract design tokens from CSS
function extractTokens(cssFiles: string[]): DesignToken[] {
  const tokens: DesignToken[] = [];
  
  for (const file of cssFiles) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf-8');
    
    // Extract CSS variables
    const varMatches = content.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g);
    for (const match of varMatches) {
      const name = match[1];
      const value = match[2].trim();
      
      let type: DesignToken['type'] = 'color';
      if (name.includes('radius')) type = 'radius';
      else if (name.includes('shadow')) type = 'shadow';
      else if (name.includes('font')) type = 'font';
      else if (name.includes('size') || name.includes('spacing') || name.includes('gap') || name.includes('pad')) type = 'spacing';
      else if (name.includes('border')) type = 'border';
      
      tokens.push({ name, value, type, source: file });
    }
  }
  
  return tokens;
}

// Main indexer function
export function buildDesignSystemIndex(): DesignSystemIndex {
  const components: ComponentDoc[] = [];
  const files = globSync(`${SRC_DIR}/**/*.{tsx,ts}`, { absolute: true });
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const relPath = relative(process.cwd(), file);
    const componentName = relPath.split('/').pop()?.replace(/\.(tsx|ts)$/, '') || 'Unknown';
    
    // Get imports for relationship mapping
    const importMatches = content.matchAll(/import[^'"]+from\s+['"]([^'"]+)['"]/g);
    const imports = [...importMatches].map(m => m[1]);
    
    components.push({
      name: componentName,
      filePath: relPath,
      purpose: extractPurpose(content),
      props: extractProps(content),
      usage: `import ${componentName} from '${relPath.replace(/\\/g, '/')}';`,
      examples: extractExamples(content),
      relationships: extractRelationships(content, imports),
    });
  }
  
  const tokens = extractTokens(CSS_FILES);
  
  return {
    components,
    tokens,
    generatedAt: new Date().toISOString(),
  };
}

// Write index to JSON file
export function writeDesignSystemIndex(outputPath = 'public/design-system-index.json'): void {
  const index = buildDesignSystemIndex();
  const dir = outputPath.split('/').slice(0, -1).join('/');
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(outputPath, JSON.stringify(index, null, 2));
  console.log(`Design system index generated: ${index.components.length} components, ${index.tokens.length} tokens`);
  console.log(`Index saved to ${outputPath}`);
}

// Generate markdown documentation for components
export function generateComponentDocs(outputDir = 'docs/design-system'): void {
  const index = buildDesignSystemIndex();
  
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate individual component docs
  for (const component of index.components) {
    const docPath = join(outputDir, `${component.name}.md`);
    const doc = `# ${component.name}

${component.purpose}

## Usage

\`\`\`tsx
${component.usage}
\`\`\`

## Props

${component.props.length > 0 ? component.props.map(p => `- \`${p}\``).join('\n') : 'No explicit props'}

## Relationships

Used by/with: ${component.relationships.length > 0 ? component.relationships.join(', ') : 'Standalone component'}

---
*Source: \`${component.filePath}\`*
`;
    writeFileSync(docPath, doc);
  }
  
  // Generate tokens doc
  const tokensDoc = `# Design Tokens

${index.tokens.map(t => `## ${t.name}
- **Value**: \`${t.value}\`
- **Type**: ${t.type}
- **Source**: \`${t.source}\``).join('\n\n')}
`;
  writeFileSync(join(outputDir, 'tokens.md'), tokensDoc);
  
  console.log(`Component docs generated in ${outputDir}`);
}

// Run as CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  writeDesignSystemIndex();
  generateComponentDocs();
}