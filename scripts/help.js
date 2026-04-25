#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Cache simples em memória para evitar múltiplas leituras do package.json
// ---------------------------------------------------------------------------
let _packageJsonCache = null;

function loadPackageJson() {
  if (_packageJsonCache) return _packageJsonCache;

  const filePath = path.resolve(__dirname, '..', 'package.json');

  if (!fs.existsSync(filePath)) {
    console.error('\x1b[31m✖ package.json não encontrado em: %s\x1b[0m', filePath);
    process.exit(1);
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    _packageJsonCache = JSON.parse(raw);
    return _packageJsonCache;
  } catch (err) {
    console.error('\x1b[31m✖ Erro ao ler package.json: %s\x1b[0m', err.message);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Descrições manuais — sobrescreve a inferência automática
// ---------------------------------------------------------------------------
const scriptDescriptions = {
  // Desenvolvimento
  dev: 'Inicia API + Web em paralelo (turbo)',
  'dev:api': 'Inicia apenas a API com hot reload',
  'dev:web': 'Inicia apenas o frontend em modo dev',
  up: 'Sobe infra, configura env e inicia dev (tudo de uma vez)',
  'up:studio': 'Sobe infra + dev + Prisma Studio em paralelo',

  // Build & qualidade
  build: 'Build de produção de todos os pacotes',
  lint: 'Executa linter em todos os pacotes',
  'type-check': 'Verifica tipos TypeScript em todos os pacotes',
  format: 'Formata código com Prettier',
  clean: 'Remove artefatos de build (turbo clean)',

  // Infra (Docker)
  'infra:up': 'Sobe containers Docker em background (detached)',
  'infra:down': 'Para e remove containers Docker',
  'infra:logs': 'Sobe containers com logs visíveis no terminal',
  'wait:infra': 'Aguarda Postgres (5432) e Redis (6379) ficarem prontos',

  // Banco de dados
  'db:generate': 'Gera o Prisma Client a partir do schema',
  'db:push': 'Aplica schema do Prisma direto no banco (sem migration)',
  'db:migrate': 'Executa migrations pendentes do Prisma',
  'db:studio': 'Abre o Prisma Studio (interface visual do banco)',
  'db:export': 'Exporta dados do banco para backup',
  'db:import': 'Importa dados de um arquivo de backup',
  'db:restore': 'Restaura backup específico (2026-03-28)',
  'db:restore-pdfs': 'Restaura apenas os PDFs do backup (2026-03-28)',
  'db:safe-regenerate': 'Regenera Prisma Client de forma segura (cross-platform)',

  // Setup & utilitários
  'setup:env': 'Configura variáveis de ambiente automaticamente',
  'seed:balanças': 'Popula banco com dados de balanças (seed)',
  'generate:docs': 'Gera documentação do projeto via script TSX',
  'start:fresh': 'Limpa tudo e inicia do zero (cross-platform)',
  'start:restore': 'Inicia o projeto restaurando um backup',
  reinstall: 'Remove node_modules e reinstala tudo (cross-platform)',
  help: 'Exibe esta lista de scripts disponíveis',
};

// ---------------------------------------------------------------------------
// Definição dos grupos por prefixo
// ---------------------------------------------------------------------------
const GROUP_DEFINITIONS = [
  { prefix: 'dev', label: '🚀 Desenvolvimento' },
  { prefix: 'build', label: '📦 Build' },
  { prefix: 'lint', label: '🔍 Lint' },
  { prefix: 'type', label: '✅ Type Check' },
  { prefix: 'db:', label: '🗄️  Banco de Dados' },
  { prefix: 'infra', label: '🐳 Infraestrutura (Docker)' },
  { prefix: 'up', label: '⚡ Atalhos de Inicialização' },
  { prefix: 'start', label: '⚡ Atalhos de Inicialização' },
  { prefix: 'wait', label: '⚡ Atalhos de Inicialização' },
];

const OTHER_GROUP_LABEL = '🔧 Outros';

// ---------------------------------------------------------------------------
// Inferência automática de descrição a partir do nome do script
// ---------------------------------------------------------------------------
function inferDescription(name) {
  const clean = name.replace(/[:_-]/g, ' ').replace(/\s+/g, ' ').trim();

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function getDescription(name) {
  return scriptDescriptions[name] || inferDescription(name);
}

// ---------------------------------------------------------------------------
// Agrupamento dos scripts
// ---------------------------------------------------------------------------
function groupScripts(scripts) {
  const groups = new Map();
  const assigned = new Set();

  for (const def of GROUP_DEFINITIONS) {
    if (!groups.has(def.label)) {
      groups.set(def.label, []);
    }
  }

  const scriptNames = Object.keys(scripts);

  for (const name of scriptNames) {
    for (const def of GROUP_DEFINITIONS) {
      if (name === def.prefix || name.startsWith(def.prefix + ':') || name.startsWith(def.prefix)) {
        groups.get(def.label).push(name);
        assigned.add(name);
        break;
      }
    }
  }

  // Scripts que não encaixaram em nenhum grupo
  const others = scriptNames.filter((n) => !assigned.has(n));
  if (others.length > 0) {
    groups.set(OTHER_GROUP_LABEL, others);
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Formatação da saída no terminal
// ---------------------------------------------------------------------------
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

function formatOutput(groups, scripts) {
  const allNames = Object.keys(scripts);
  const maxLen = Math.max(...allNames.map((n) => n.length));

  const lines = [];

  lines.push('');
  lines.push(`${COLORS.bold}${COLORS.cyan}  📋 Scripts disponíveis — regcheck${COLORS.reset}`);
  lines.push(`${COLORS.dim}  ${'─'.repeat(50)}${COLORS.reset}`);

  for (const [label, names] of groups) {
    if (names.length === 0) continue;

    lines.push('');
    lines.push(`  ${COLORS.bold}${COLORS.yellow}${label}${COLORS.reset}`);
    lines.push('');

    for (const name of names) {
      const padded = name.padEnd(maxLen + 2);
      const desc = getDescription(name);
      lines.push(`    ${COLORS.green}${padded}${COLORS.reset}${COLORS.dim}${desc}${COLORS.reset}`);
    }
  }

  lines.push('');
  lines.push(
    `${COLORS.dim}  Uso: pnpm <script>  |  Total: ${allNames.length} scripts${COLORS.reset}`,
  );
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const pkg = loadPackageJson();

  if (!pkg.scripts || Object.keys(pkg.scripts).length === 0) {
    console.log('\x1b[33m⚠ Nenhum script encontrado no package.json.\x1b[0m');
    return;
  }

  const groups = groupScripts(pkg.scripts);
  const output = formatOutput(groups, pkg.scripts);

  console.log(output);
}

main();
