#!/usr/bin/env npx tsx
/**
 * 🪲 BRUTUS — CardVault QA Bot
 * Built by Theokoles, The Shadow of Death
 * 
 * Scans the CardVault codebase for:
 * 1. TypeScript errors (tsc --noEmit)
 * 2. Page route validation (default exports)
 * 3. Design token violations (colors, border-radius, pixel widths)
 * 4. Import resolution
 * 5. Empty/loading state checks
 * 6. BottomNav consistency
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const APP = path.join(SRC, 'app')

interface Issue {
  check: string
  severity: 'ERROR' | 'WARN'
  file: string
  message: string
  line?: number
}

const issues: Issue[] = []

function log(msg: string) {
  console.log(msg)
}

function addIssue(check: string, severity: 'ERROR' | 'WARN', file: string, message: string, line?: number) {
  issues.push({ check, severity, file, message, line })
}

// ─────────────────────────────────────────────
// 1. TypeScript Check
// ─────────────────────────────────────────────
log('\n🔍 CHECK 1: TypeScript Compilation (tsc --noEmit)')
log('─'.repeat(50))
try {
  execSync('npx tsc --noEmit 2>&1', { cwd: ROOT, encoding: 'utf-8' })
  log('  ✅ No TypeScript errors')
} catch (e: any) {
  const output = (e.stdout || e.stderr || '').toString()
  const errors = output.trim().split('\n').filter((l: string) => l.includes('error TS'))
  errors.forEach((err: string) => {
    const match = err.match(/^(.+?)\((\d+),\d+\): error TS\d+: (.+)$/)
    if (match) {
      addIssue('TypeScript', 'ERROR', match[1], match[3], parseInt(match[2]))
    } else {
      addIssue('TypeScript', 'ERROR', 'unknown', err)
    }
  })
  log(`  ❌ ${errors.length} TypeScript error(s) found`)
  errors.forEach((err: string) => log(`    ${err}`))
}

// ─────────────────────────────────────────────
// 2. Page Route Scan
// ─────────────────────────────────────────────
log('\n🔍 CHECK 2: Page Route Validation')
log('─'.repeat(50))

function findPages(dir: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findPages(full))
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      results.push(full)
    }
  }
  return results
}

const pages = findPages(APP)
log(`  Found ${pages.length} page routes`)

for (const page of pages) {
  const content = fs.readFileSync(page, 'utf-8')
  const rel = path.relative(ROOT, page)

  // Check for default export
  if (!content.includes('export default')) {
    addIssue('PageRoute', 'ERROR', rel, 'Missing default export')
    log(`  ❌ ${rel}: Missing default export`)
  } else {
    log(`  ✅ ${rel}: Has default export`)
  }
}

// ─────────────────────────────────────────────
// 3. Design Token Audit
// ─────────────────────────────────────────────
log('\n🔍 CHECK 3: Design Token Audit')
log('─'.repeat(50))

const ALLOWED_HEX = new Set([
  '#f59e0b', '#0a0f1c', '#ffffff', '#fff',
  '#22c55e', '#ef4444', // success/danger from spec
  '#000', '#000000',
])

// Common gray shades allowed
const GRAY_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

function isGray(hex: string): boolean {
  const h = hex.replace('#', '').toLowerCase()
  if (h.length === 3) {
    return h[0] === h[1] && h[1] === h[2]
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return Math.abs(r - g) < 10 && Math.abs(g - b) < 10
  }
  return false
}

const ALLOWED_RADII = new Set(['16px', '12px', '10px', '999px', '24px'])

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const rel = path.relative(ROOT, filePath)
  const lines = content.split('\n')

  lines.forEach((line, idx) => {
    // Hex color check
    const hexMatches = line.match(/#[0-9a-fA-F]{3,8}\b/g)
    if (hexMatches) {
      for (const hex of hexMatches) {
        const lower = hex.toLowerCase()
        if (!ALLOWED_HEX.has(lower) && !isGray(lower)) {
          addIssue('DesignToken', 'WARN', rel, `Off-spec hex color: ${hex}`, idx + 1)
        }
      }
    }

    // Border-radius check (CSS style, not tailwind)
    const radiusMatches = line.match(/border-?[Rr]adius:\s*(\d+px)/g)
    if (radiusMatches) {
      for (const match of radiusMatches) {
        const val = match.match(/(\d+px)/)
        if (val && !ALLOWED_RADII.has(val[1])) {
          addIssue('DesignToken', 'WARN', rel, `Off-spec border-radius: ${val[1]} (allowed: 16px, 12px, 10px, 999px, 24px)`, idx + 1)
        }
      }
    }

    // Also check borderRadius in JS style objects
    const jsRadiusMatches = line.match(/borderRadius:\s*(\d+)/g)
    if (jsRadiusMatches) {
      for (const match of jsRadiusMatches) {
        const val = match.match(/borderRadius:\s*(\d+)/)
        if (val) {
          const px = `${val[1]}px`
          if (!ALLOWED_RADII.has(px)) {
            addIssue('DesignToken', 'WARN', rel, `Off-spec borderRadius: ${val[1]} (allowed: 16, 12, 10, 999, 24)`, idx + 1)
          }
        }
      }
    }

    // Hardcoded pixel widths > 500px
    const widthMatches = line.match(/(?:width|maxWidth|max-width):\s*['"]?(\d+)(?:px)?/g)
    if (widthMatches) {
      for (const match of widthMatches) {
        const val = match.match(/(\d+)/)
        if (val && parseInt(val[1]) > 500) {
          addIssue('DesignToken', 'WARN', rel, `Hardcoded width > 500px: ${match.trim()}`, idx + 1)
        }
      }
    }
  })
}

function scanDir(dir: string) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      scanDir(full)
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      scanFile(full)
    }
  }
}

scanDir(SRC)

const tokenIssues = issues.filter(i => i.check === 'DesignToken')
if (tokenIssues.length === 0) {
  log('  ✅ All design tokens are on-spec')
} else {
  log(`  ❌ ${tokenIssues.length} design token violation(s)`)
  tokenIssues.forEach(i => log(`    ${i.file}:${i.line} — ${i.message}`))
}

// ─────────────────────────────────────────────
// 4. Import Validation
// ─────────────────────────────────────────────
log('\n🔍 CHECK 4: Import Validation')
log('─'.repeat(50))

function validateImports(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const rel = path.relative(ROOT, filePath)
  const dir = path.dirname(filePath)

  const importLines = content.match(/import .+ from ['"](.+?)['"]/g) || []
  for (const line of importLines) {
    const match = line.match(/from ['"](.+?)['"]/)
    if (!match) continue
    const spec = match[1]

    // Skip node_modules imports
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue

    let resolved: string
    if (spec.startsWith('@/')) {
      resolved = path.join(SRC, spec.slice(2))
    } else {
      resolved = path.join(dir, spec)
    }

    // Try with extensions
    const exts = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']
    const found = exts.some(ext => fs.existsSync(resolved + ext))
    if (!found) {
      addIssue('Import', 'ERROR', rel, `Unresolved import: ${spec}`)
      log(`  ❌ ${rel}: Cannot resolve "${spec}"`)
    }
  }
}

function validateImportsDir(dir: string) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      validateImportsDir(full)
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      validateImports(full)
    }
  }
}

validateImportsDir(SRC)

const importIssues = issues.filter(i => i.check === 'Import')
if (importIssues.length === 0) {
  log('  ✅ All imports resolve correctly')
}

// ─────────────────────────────────────────────
// 5. Empty State Check
// ─────────────────────────────────────────────
log('\n🔍 CHECK 5: Empty/Loading State Check')
log('─'.repeat(50))

const EMPTY_PATTERNS = /loading|empty|skeleton|no data|no cards|no trades|no items|no stats|no results|spinner/i

for (const page of pages) {
  const content = fs.readFileSync(page, 'utf-8')
  const rel = path.relative(ROOT, page)

  if (!EMPTY_PATTERNS.test(content)) {
    addIssue('EmptyState', 'WARN', rel, 'No empty/loading state pattern detected')
    log(`  ⚠️  ${rel}: No empty/loading state found`)
  } else {
    log(`  ✅ ${rel}: Has empty/loading state`)
  }
}

// ─────────────────────────────────────────────
// 6. BottomNav Consistency
// ─────────────────────────────────────────────
log('\n🔍 CHECK 6: BottomNav Consistency')
log('─'.repeat(50))

for (const page of pages) {
  const content = fs.readFileSync(page, 'utf-8')
  const rel = path.relative(ROOT, page)

  if (!content.includes('BottomNav')) {
    addIssue('BottomNav', 'ERROR', rel, 'BottomNav not imported/used on this page')
    log(`  ❌ ${rel}: Missing BottomNav`)
  } else {
    log(`  ✅ ${rel}: Has BottomNav`)
  }
}

// ─────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────
log('\n' + '═'.repeat(50))
log('🪲 BRUTUS REPORT SUMMARY')
log('═'.repeat(50))

const errors = issues.filter(i => i.severity === 'ERROR')
const warnings = issues.filter(i => i.severity === 'WARN')

log(`  Total issues: ${issues.length}`)
log(`  ❌ Errors: ${errors.length}`)
log(`  ⚠️  Warnings: ${warnings.length}`)

if (issues.length === 0) {
  log('\n  🏆 CLEAN PASS — Zero issues found!')
  log('  Theokoles stands undefeated. 🗡️')
} else {
  log('\n  Issues by category:')
  const categories = Array.from(new Set(issues.map(i => i.check)))
  for (const cat of categories) {
    const catIssues = issues.filter(i => i.check === cat)
    log(`    ${cat}: ${catIssues.length}`)
  }

  log('\n  Detailed issues:')
  for (const issue of issues) {
    const loc = issue.line ? `${issue.file}:${issue.line}` : issue.file
    log(`    [${issue.severity}] ${issue.check} | ${loc} | ${issue.message}`)
  }
}

log('\n🪲 Brutus signing off.')
process.exit(issues.length > 0 ? 1 : 0)
