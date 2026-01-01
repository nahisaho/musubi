#!/bin/bash
# MUSUBI Demo Recording Script
# This script demonstrates MUSUBI's core features for a demo GIF
# 
# Prerequisites:
# - asciinema: brew install asciinema (or apt install asciinema)
# - agg (asciinema gif generator): cargo install --git https://github.com/asciinema/agg
# - Or use: https://dstein64.github.io/gifcast/ for online conversion
#
# Usage:
# 1. asciinema rec demo.cast --overwrite
# 2. Run this script manually (type commands shown below)
# 3. agg demo.cast demo.gif --font-size 14 --speed 2

echo "=== MUSUBI Demo ==="
echo ""

# Demo 1: Quick initialization
echo "📦 Initialize MUSUBI in 30 seconds..."
sleep 1

# Simulate npx command (don't actually run to avoid side effects)
echo "$ npx musubi-sdd init"
sleep 2
echo ""
echo "🎋 MUSUBI Initialized!"
echo "   ✅ Created steering/structure.md"
echo "   ✅ Created steering/tech.md"
echo "   ✅ Created steering/product.md"
echo "   ✅ Created 25 Claude Code skills"
echo "   ✅ Created constitutional governance"
echo ""
sleep 2

# Demo 2: Show available commands
echo "📋 Available SDD Commands:"
echo ""
echo "  /sdd-requirements  - Generate EARS requirements"
echo "  /sdd-design        - Create C4 + ADR designs"
echo "  /sdd-tasks         - Break down into tasks"
echo "  /sdd-implement     - Execute implementation"
echo "  /sdd-validate      - Validate constitution"
echo ""
sleep 2

# Demo 3: Workflow management
echo "🔄 Workflow Engine (v2.1.0):"
echo ""
echo "$ musubi-workflow status"
sleep 1
echo ""
echo "  Current Stage: requirements"
echo "  Started: 2025-12-07T10:00:00Z"
echo "  Time in Stage: 45 minutes"
echo "  Feedback Loops: 2"
echo ""
sleep 2

# Demo 4: Constitutional validation
echo "⚖️ Constitutional Validation:"
echo ""
echo "$ musubi-validate all"
sleep 1
echo ""
echo "  ✅ Article I:   Library-First Principle"
echo "  ✅ Article II:  CLI Interface Mandate"
echo "  ✅ Article III: Test-First Imperative (87% coverage)"
echo "  ✅ Article IV:  EARS Requirements Format"
echo "  ✅ Article V:   Traceability Mandate"
echo "  ✅ Article VI:  Project Memory"
echo "  ✅ Article VII: Simplicity Gate"
echo "  ✅ Article VIII: Anti-Abstraction Gate"
echo "  ✅ Article IX:  Integration-First Testing"
echo ""
echo "  📊 Constitutional Compliance: 100%"
echo ""
sleep 2

# Demo 5: Multi-agent support
echo "🤖 Supported AI Coding Agents:"
echo ""
echo "  • Claude Code    - Skills API (25 skills)"
echo "  • GitHub Copilot - AGENTS.md"
echo "  • Cursor IDE     - AGENTS.md"
echo "  • Gemini CLI     - GEMINI.md"
echo "  • Codex CLI      - AGENTS.md"
echo "  • Qwen Code      - AGENTS.md"
echo "  • Windsurf IDE   - AGENTS.md"
echo ""
sleep 2

echo "🎋 MUSUBI - Ultimate Specification Driven Development"
echo "   https://github.com/nahisaho/MUSUBI"
echo ""
