import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'

const BASE_PATH = '/srd-b256fe7e81ec477f-1255000106'
const DOMAIN = 'https://s3gw.paasst.cmbchina.cn'

export default defineConfig({
  title: 'Harness Engineering',
  description: 'Harness Engineering 在实战项目中的落地记录',

  srcDir: '.',

  // 本地预览用相对路径
  base: '/',

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
            { text: 'OpenAI vs Anthropic', link: '/notes/01-openai-vs-anthropic-harness-analysis' },
            { text: 'Harness 分析（博客风）', link: '/notes/02-openai-vs-anthropic-harness-analysis-blog-style' }
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
      { icon: 'github', link: 'https://github.com/zhangluka/harness_engineering' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 zhangluka'
    }
  }
})