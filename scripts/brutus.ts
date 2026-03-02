#!/usr/bin/env npx tsx
/**
 * 🪲 Brutus QA Bot — CardVault Caesar
 * Round 5: Build Your Own Brutus
 *
 * Checks:
 * 1. TypeScript compilation (tsc --noEmit)
 * 2. Page route scan (valid default exports)
 * 3. Design token audit (colors, radii, widths)
 * 4. Import validation (all imports resolve)
 * 5. Empty state check (loading/empty patterns)
 * 6. BottomNav consistency (present on every page)
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')

interface Issue {
  check: string
  severity: 'ERROR' | 'WARN'
  file: string
  line?: number
  message: string
}

const issues: Issue[] = []
let passCount = 0

function log(msg: string) { process.stdout.write(msg + '\n') }
function pass(check: string, detail: string) { passCount++; log(`  ✅ ${detail}`) }
function fail(issue: Issue) { issues.push(issue); log(`  ❌ [${issue.severity}] ${issue.file}${issue.line ? ':' + issue.line : ''} — ${issue.message}`) }

// ─── Helpers ───
function getAllFiles(dir: string, ext: string[]): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...getAllFiles(full, ext))
    else if (ext.some(e => entry.name.endsWith(e))) results.push(full)
  }
  return results
}

function rel(f: string) { return path.relative(ROOT, f) }

// ═══════════════════════════════════════════
// CHECK 1: TypeScript Compilation
// ═══════════════════════════════════════════
log('\n🔍 CHECK 1: TypeScript Compilation')
log('─'.repeat(50))
try {
  execSync('npx tsc --noEmit 2>&1', { cwd: ROOT, encoding: 'utf-8' })
  pass('tsc', 'TypeScript compiles with zero errors')
} catch (e: any) {
  const output = (e.stdout || e.message || '').toString()
  const errors = output.split('\n').filter((l: string) => l.includes('error TS'))
  for (const err of errors) {
    const match = err.match(/^(.+?)\((\d+),\d+\):\s*error\s+TS\d+:\s*(.+)/)
    if (match) {
      fail({ check: 'tsc', severity: 'ERROR', file: match[1], line: parseInt(match[2]), message: match[3] })
    } else {
      fail({ check: 'tsc', severity: 'ERROR', file: 'unknown', message: err.trim() })
    }
  }
  if (errors.length === 0) {
    fail({ check: 'tsc', severity: 'ERROR', file: 'project', message: 'tsc failed: ' + output.slice(0, 200) })
  }
}

// ═══════════════════════════════════════════
// CHECK 2: Page Route Scan
// ═══════════════════════════════════════════
log('\n🔍 CHECK 2: Page Route Scan')
log('─'.repeat(50))
const appDir = path.join(SRC, 'app')
const pageDirs = fs.readdirSync(appDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
  .map(d => d.name)

// Check root page
const rootPage = path.join(appDir, 'page.tsx')
if (fs.existsSync(rootPage)) {
  const content = fs.readFileSync(rootPage, 'utf-8')
  if (/export\s+default\s+function/.test(content)) {
    pass('routes', `/ — valid default export`)
  } else {
    fail({ check: 'routes', severity: 'ERROR', file: rel(rootPage), message: 'Missing default export function' })
  }
} else {
  fail({ check: 'routes', severity: 'ERROR', file: 'src/app/page.tsx', message: 'Root page missing' })
}

for (const dir of pageDirs) {
  const pageFile = path.join(appDir, dir, 'page.tsx')
  if (!fs.existsSync(pageFile)) {
    fail({ check: 'routes', severity: 'WARN', file: `src/app/${dir}/`, message: 'Directory exists but no page.tsx' })
    continue
  }
  const content = fs.readFileSync(pageFile, 'utf-8')
  if (/export\s+default\s+function/.test(content)) {
    pass('routes', `/${dir} — valid default export`)
  } else {
    fail({ check: 'routes', severity: 'ERROR', file: rel(pageFile), message: 'Missing default export function' })
  }
}

// ═══════════════════════════════════════════
// CHECK 3: Design Token Audit
// ═══════════════════════════════════════════
log('\n🔍 CHECK 3: Design Token Audit')
log('─'.repeat(50))

const ALLOWED_HEX = new Set([
  '#f59e0b', '#0a0f1c', '#ffffff', '#fff', '#000', '#000000',
  // Standard grays
  '#111', '#222', '#333', '#444', '#555', '#666', '#777', '#888', '#999', '#aaa', '#bbb', '#ccc', '#ddd', '#eee',
  // Tailwind grays
  '#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb',
  // Status colors (green/red for up/down indicators)
  '#22c55e', '#ef4444', '#a855f7',
])

const ALLOWED_RADII = new Set(['16px', '12px', '10px', '999px', '9999px', '24px', '2px', '8px'])
const allSrcFiles = getAllFiles(SRC, ['.tsx', '.ts', '.css'])
let designIssueCount = 0

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf-8')
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Hex color check — skip CSS variable definitions and comments
    const hexMatches = line.match(/#[0-9a-fA-F]{3,8}\b/g)
    if (hexMatches) {
      for (const hex of hexMatches) {
        const lower = hex.toLowerCase()
        if (!ALLOWED_HEX.has(lower) && !line.includes('var(') && !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*')) {
          fail({ check: 'design-tokens', severity: 'WARN', file: rel(file), line: lineNum, message: `Non-standard hex color: ${hex}` })
          designIssueCount++
        }
      }
    }

    // Border-radius check (inline styles only, skip CSS class definitions)
    const radiusMatch = line.match(/borderRadius:\s*(\d+)/g)
    if (radiusMatch) {
      for (const rm of radiusMatch) {
        const val = rm.match(/borderRadius:\s*(\d+)/)
        if (val) {
          const px = val[1] + 'px'
          if (!ALLOWED_RADII.has(px)) {
            fail({ check: 'design-tokens', severity: 'WARN', file: rel(file), line: lineNum, message: `Non-standard border-radius: ${val[1]}px (allowed: 16, 12, 10, 999, 24, 8, 2)` })
            designIssueCount++
          }
        }
      }
    }

    // CSS border-radius property
    const cssBrMatch = line.match(/border-radius:\s*(\d+)px/g)
    if (cssBrMatch) {
      for (const rm of cssBrMatch) {
        const val = rm.match(/border-radius:\s*(\d+)px/)
        if (val) {
          const px = val[1] + 'px'
          if (!ALLOWED_RADII.has(px)) {
            fail({ check: 'design-tokens', severity: 'WARN', file: rel(file), line: lineNum, message: `Non-standard CSS border-radius: ${val[1]}px` })
            designIssueCount++
          }
        }
      }
    }

    // Hardcoded widths over 500px
    const widthMatch = line.match(/(?:width|maxWidth|max-width|min-width|minWidth):\s*['"]?(\d+)(?:px)?/gi)
    if (widthMatch) {
      for (const wm of widthMatch) {
        const val = wm.match(/(\d+)/)
        if (val && parseInt(val[1]) > 500 && !line.includes('max-width: 480px')) {
          fail({ check: 'design-tokens', severity: 'ERROR', file: rel(file), line: lineNum, message: `Hardcoded width > 500px: ${wm.trim()} (breaks mobile)` })
          designIssueCount++
        }
      }
    }
  }
}

if (designIssueCount === 0) pass('design-tokens', 'All design tokens within spec')

// ═══════════════════════════════════════════
// CHECK 4: Import Validation
// ═══════════════════════════════════════════
log('\n🔍 CHECK 4: Import Validation')
log('─'.repeat(50))

let importIssues = 0
for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf-8')
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const importMatch = line.match(/import\s+.*from\s+['"](.+?)['"]/)
    if (!importMatch) continue

    const importPath = importMatch[1]

    // Skip node_modules imports
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue

    // Resolve @/ alias
    let resolved: string
    if (importPath.startsWith('@/')) {
      resolved = path.join(SRC, importPath.slice(2))
    } else {
      resolved = path.resolve(path.dirname(file), importPath)
    }

    // Check if file exists (with common extensions)
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']
    const exists = extensions.some(ext => fs.existsSync(resolved + ext))

    if (!exists) {
      fail({ check: 'imports', severity: 'ERROR', file: rel(file), line: i + 1, message: `Broken import: ${importPath} — file not found` })
      importIssues++
    }
  }
}

if (importIssues === 0) pass('imports', 'All imports resolve correctly')

// ═══════════════════════════════════════════
// CHECK 5: Empty State Check
// ═══════════════════════════════════════════
log('\n🔍 CHECK 5: Empty / Loading State Check')
log('─'.repeat(50))

const EMPTY_PATTERNS = /loading|skeleton|empty|no data|no cards|no results|spinner|placeholder|fetching/i
const pageFiles = [rootPage, ...pageDirs.map(d => path.join(appDir, d, 'page.tsx'))].filter(f => fs.existsSync(f))

for (const pageFile of pageFiles) {
  const content = fs.readFileSync(pageFile, 'utf-8')
  const pageName = rel(pageFile)

  if (EMPTY_PATTERNS.test(content)) {
    pass('empty-states', `${pageName} — has empty/loading state`)
  } else {
    fail({ check: 'empty-states', severity: 'WARN', file: pageName, message: 'No empty/loading state pattern detected' })
  }
}

// ═══════════════════════════════════════════
// CHECK 6: BottomNav Consistency
// ═══════════════════════════════════════════
log('\n🔍 CHECK 6: BottomNav Consistency')
log('─'.repeat(50))

for (const pageFile of pageFiles) {
  const content = fs.readFileSync(pageFile, 'utf-8')
  const pageName = rel(pageFile)

  // Skip layout.tsx
  if (pageFile.includes('layout.tsx')) continue

  if (content.includes('BottomNav')) {
    pass('bottomnav', `${pageName} — BottomNav present`)
  } else {
    fail({ check: 'bottomnav', severity: 'ERROR', file: pageName, message: 'BottomNav not imported/rendered' })
  }
}

// ═══════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════
log('\n' + '═'.repeat(50))
log('🪲 BRUTUS QA REPORT — CardVault Caesar')
log('═'.repeat(50))

const errors = issues.filter(i => i.severity === 'ERROR')
const warns = issues.filter(i => i.severity === 'WARN')

log(`\n✅ Passed: ${passCount}`)
log(`❌ Errors: ${errors.length}`)
log(`⚠️  Warnings: ${warns.length}`)
log(`📊 Total Issues: ${issues.length}`)

if (issues.length > 0) {
  log('\n── Issue Details ──')
  for (const issue of issues) {
    log(`  [${issue.severity}] ${issue.check} | ${issue.file}${issue.line ? ':' + issue.line : ''} | ${issue.message}`)
  }
}

log(`\n${issues.length === 0 ? '🟢 ALL CLEAR — CardVault is clean!' : `🔴 ${issues.length} issue(s) found — fix required`}`)
log(`\nTimestamp: ${new Date().toISOString()}`)

process.exit(issues.length > 0 ? 1 : 0)
