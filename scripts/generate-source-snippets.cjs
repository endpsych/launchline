const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(projectRoot, 'src', 'ui-showcase', 'sourceSnippets.generated.js');

const files = [
  'src/pages/UIElements/boards/cards.jsx',
  'src/pages/UIElements/boards/primitives.jsx',
  'src/pages/UIElements/boards/nav-tables.jsx',
  'src/pages/UIElements/boards/modals-data.jsx',
  'src/pages/UIElements/boards/feedback.jsx',
  'src/pages/UIElements/boards/shared.jsx',
  'src/ui-patterns/surfaces/FeatureHeroGrid.jsx',
  'src/ui-kit/display/StatsRibbon.jsx',
];

function toTemplateLiteral(value) {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

const entries = files.map((file) => {
  const absolutePath = path.join(projectRoot, file);
  const source = fs.readFileSync(absolutePath, 'utf8');
  return `  ${JSON.stringify(file)}: \`\n${toTemplateLiteral(source)}\n\`,`; 
});

const contents = `export const SOURCE_SNIPPETS = {\n${entries.join('\n')}\n};\n`;

fs.writeFileSync(outputPath, contents, 'utf8');
console.log(`Generated source snippet registry at ${outputPath}`);
