import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Harness Engineering',
  description: 'Harness Engineering 在实战项目中的落地记录',

  srcDir: '.',
  base: '/harness_engineering/',

  appearance: false,

  markdown: {
    lineNumbers: true
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '实战项目', link: '/projects/' },
      { text: '工具', link: '/tools/' },
      { text: '模板', link: '/templates/' },
      { text: '笔记', link: '/notes/' },
      { text: '核心概念', link: '/concepts/' },
      { text: '演进思考', link: '/thinking/' }
    ],

    sidebar: {
      '/notes/': [
        {
          text: '笔记',
          items: [
            { text: 'OpenAI vs Anthropic Harness 分析', link: '/notes/01-openai-vs-anthropic-harness-analysis' },
            { text: 'OpenAI & Anthropic Harness 分析（博客风格）', link: '/notes/02-openai-vs-anthropic-harness-analysis-blog-style' },
            { text: 'Archon 笔记', link: '/notes/archon' }
          ]
        }
      ],
      '/tools/': [
        {
          text: '工具',
          items: [
            { text: '工具列表', link: '/tools/' },
            { text: 'Harness Proposal', link: '/tools/harness-proposal' },
            { text: 'OpenSpec', link: '/tools/openspec' },
            { text: 'Ralph Loop', link: '/tools/ralph-loop' },
            { text: 'Archon', link: '/tools/archon/' }
          ]
        }
      ],
      '/concepts/': [
        {
          text: '核心概念',
          items: [
            { text: 'Harness Engineer', link: '/concepts/harness-engineer' }
          ]
        }
      ],
      '/thinking/': [
        {
          text: '演进思考',
          items: [
            { text: '建设行动计划', link: '/thinking/action-plan' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zhangluka/harness_engineering' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 zhangluka'
    }
  }
})
