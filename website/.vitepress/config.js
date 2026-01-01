import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'MUSUBI',
  description: 'Ultimate Specification Driven Development Tool',
  
  // Ignore dead links for pages not yet created
  ignoreDeadLinks: true,
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'MUSUBI - SDD Framework' }],
    ['meta', { name: 'og:description', content: 'Ultimate Specification Driven Development Tool for 7 AI Coding Agents' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'CLI', link: '/reference/cli' },
      { text: 'Skills', link: '/skills/' },
      { text: 'Agents', link: '/agents/' },
      { text: 'Examples', link: '/examples/' },
      {
        text: 'v3.0.0',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'Contributing', link: '/contributing' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is MUSUBI?', link: '/guide/what-is-musubi' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Quick Start', link: '/guide/quick-start' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'SDD Workflow', link: '/guide/sdd-workflow' },
            { text: 'Constitutional Governance', link: '/guide/constitution' },
            { text: 'EARS Requirements', link: '/guide/ears-format' },
            { text: 'Traceability', link: '/guide/traceability' }
          ]
        },
        {
          text: 'AI Agents',
          items: [
            { text: 'Claude Code', link: '/guide/agents/claude-code' },
            { text: 'GitHub Copilot', link: '/guide/agents/copilot' },
            { text: 'Cursor', link: '/guide/agents/cursor' },
            { text: 'Other Agents', link: '/guide/agents/others' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Brownfield Projects', link: '/guide/brownfield' },
            { text: 'Change Management', link: '/guide/change-management' },
            { text: 'Team Onboarding', link: '/guide/onboarding' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'CLI Reference',
          items: [
            { text: 'musubi', link: '/reference/cli' },
            { text: 'musubi-requirements', link: '/reference/cli-requirements' },
            { text: 'musubi-design', link: '/reference/cli-design' },
            { text: 'musubi-tasks', link: '/reference/cli-tasks' },
            { text: 'musubi-validate', link: '/reference/cli-validate' },
            { text: 'musubi-trace', link: '/reference/cli-trace' }
          ]
        },
        {
          text: 'Templates',
          items: [
            { text: 'Requirements Template', link: '/reference/templates/requirements' },
            { text: 'Design Template', link: '/reference/templates/design' },
            { text: 'Tasks Template', link: '/reference/templates/tasks' },
            { text: 'ADR Template', link: '/reference/templates/adr' }
          ]
        },
        {
          text: 'Constitution',
          items: [
            { text: '9 Articles', link: '/reference/constitution/articles' },
            { text: 'Phase -1 Gates', link: '/reference/constitution/gates' }
          ]
        }
      ],
      '/skills/': [
        {
          text: 'Core Skills',
          items: [
            { text: 'Overview', link: '/skills/' },
            { text: 'Orchestrator', link: '/skills/orchestrator' },
            { text: 'Steering', link: '/skills/steering' },
            { text: 'Constitution Enforcer', link: '/skills/constitution-enforcer' }
          ]
        },
        {
          text: 'Development Skills',
          items: [
            { text: 'Requirements Analyst', link: '/skills/requirements-analyst' },
            { text: 'System Architect', link: '/skills/system-architect' },
            { text: 'Software Developer', link: '/skills/software-developer' },
            { text: 'Test Engineer', link: '/skills/test-engineer' }
          ]
        },
        {
          text: 'Quality Skills',
          items: [
            { text: 'Code Reviewer', link: '/skills/code-reviewer' },
            { text: 'Security Auditor', link: '/skills/security-auditor' },
            { text: 'Performance Optimizer', link: '/skills/performance-optimizer' }
          ]
        }
      ],
      '/agents/': [
        {
          text: 'AI Agents',
          items: [
            { text: 'Overview', link: '/agents/' },
            { text: 'Claude Code', link: '/agents/claude-code' },
            { text: 'GitHub Copilot', link: '/agents/copilot' },
            { text: 'Cursor', link: '/agents/cursor' },
            { text: 'Cline', link: '/agents/cline' },
            { text: 'OpenHands', link: '/agents/openhands' },
            { text: 'Roo Code', link: '/agents/roo-code' },
            { text: 'Windsurf', link: '/agents/windsurf' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Auth System', link: '/examples/auth-system' },
            { text: 'REST API', link: '/examples/rest-api' },
            { text: 'Microservices', link: '/examples/microservices' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Core API', link: '/api/core' },
            { text: 'Configuration', link: '/api/configuration' },
            { text: 'TypeScript', link: '/api/typescript' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nahisaho/MUSUBI' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/musubi-sdd' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-2025 MUSUBI Contributors'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/nahisaho/MUSUBI/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
