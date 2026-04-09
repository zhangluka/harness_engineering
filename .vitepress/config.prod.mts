import { defineConfig } from 'vitepress'

const BASE_PATH = '/'

export default defineConfig({
  title: 'Harness Engineering',
  description: 'Harness Engineering 在实战项目中的落地记录',

  srcDir: '.',

  // 线上构建配置
  outDir: './dist/st/oa/harness01',
  base: BASE_PATH,

  appearance: false,

  markdown: {
    lineNumbers: true
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '笔记', link: '/notes/' }
    ],

    sidebar: {
      '/notes/': [
        {
          text: '笔记',
          items: [
            { text: 'OpenAI & Anthropic Harness 分析', link: '/notes/02-openai-vs-anthropic-harness-analysis-blog-style' }
          ]
        }
      ],
      '/tools/': [
        {
          text: '工具',
          items: [
            { text: '工具列表', link: '/tools/' }
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