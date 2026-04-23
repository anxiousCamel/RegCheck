# Documentation Generation Infrastructure Setup

## Overview

This document describes the documentation generation infrastructure for the RegCheck project.

## Components Created

### 1. Main Entry Point
- **File**: `scripts/generate-docs.ts`
- **Purpose**: Main orchestrator for documentation generation
- **Language**: TypeScript with ESM modules
- **Execution**: Via `pnpm generate:docs` command

### 2. Generator Modules Directory
- **Directory**: `scripts/docs/`
- **Purpose**: Contains modular generator components
- **Structure**: Each module handles a specific documentation file or extraction task

### 3. TypeScript Configuration
- **File**: `scripts/tsconfig.json`
- **Purpose**: TypeScript configuration for scripts directory
- **Extends**: Root `tsconfig.json`
- **Target**: ES2022 with ESNext modules

### 4. Output Directory
- **Directory**: `docs/`
- **Purpose**: Contains generated documentation files
- **Structure**: 11 Markdown files with Mermaid diagrams

### 5. Package Script
- **Script**: `generate:docs` in root `package.json`
- **Command**: `tsx scripts/generate-docs.ts`
- **Execution**: `pnpm generate:docs`

## Dependencies

- **tsx**: TypeScript execution engine (v4.7.0)
  - Added to root `devDependencies`
  - Enables direct execution of TypeScript files
  - No compilation step required

## File Structure

```
RegCheck/
├── docs/                          # Generated documentation output
│   ├── .gitkeep                   # Directory placeholder with info
│   ├── README.md                  # Documentation index (to be generated)
│   ├── 01-arquitetura.md         # Architecture (to be generated)
│   ├── 02-stack-tecnologica.md   # Tech stack (to be generated)
│   └── ...                        # Other docs (to be generated)
├── scripts/
│   ├── docs/                      # Generator modules
│   │   ├── .gitkeep              # Directory placeholder
│   │   ├── README.md             # Module documentation
│   │   └── SETUP.md              # This file
│   ├── generate-docs.ts          # Main entry point
│   └── tsconfig.json             # TypeScript config for scripts
└── package.json                   # Contains generate:docs script
```

## Usage

### Generate Documentation
```bash
pnpm generate:docs
```

### Development Workflow
1. Create generator modules in `scripts/docs/`
2. Import and use in `scripts/generate-docs.ts`
3. Run `pnpm generate:docs` to test
4. Generated files appear in `docs/` directory

## Next Steps

The following generator modules need to be implemented:

1. **markdown-formatter.ts** - Markdown generation utilities
2. **prisma-parser.ts** - Extract data model from Prisma schema
3. **route-parser.ts** - Extract API endpoints from routes
4. **error-parser.ts** - Extract error codes from handlers
5. **mermaid-generator.ts** - Generate Mermaid diagrams

Each module will be developed in subsequent tasks according to the implementation plan.

## Requirements Satisfied

This setup satisfies the following requirements from Task 1:

- ✅ Created `scripts/generate-docs.ts` as main entry point
- ✅ Created `scripts/docs/` directory for generator modules
- ✅ Set up TypeScript configuration for scripts
- ✅ Added `generate:docs` script to root package.json
- ✅ Requirements: 1.1, 2.1, 3.1

## Technical Notes

### Why tsx?
- Direct TypeScript execution without compilation
- Fast development iteration
- Consistent with existing project scripts (used in API dev script)
- Supports ESM modules natively

### Why ESM Modules?
- Modern JavaScript standard
- Better tree-shaking
- Native TypeScript support
- Consistent with project structure

### Directory Organization
- `scripts/` - All build/dev scripts
- `scripts/docs/` - Documentation-specific modules
- `docs/` - Generated output (committed to version control)
