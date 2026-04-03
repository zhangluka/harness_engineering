const { build } = require('vitepress')
const fs = require('fs')
const path = require('path')

const BASE_PATH = '/srd-b256fe7e81ec477f-1255000106'
const DOMAIN = 'https://s3gw.paasst.cmbchina.cn'

async function main() {
  await build('.', {
    config: '.vitepress/config.prod.mts',
    outDir: './dist/st/oa/harness01'
  })

  // 替换绝对路径
  const dist = path.resolve('./dist/st/oa/harness01')

  function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8')
    content = content.replace(/href="\//g, `href="${DOMAIN}${BASE_PATH}/`)
    content = content.replace(/src="\//g, `src="${DOMAIN}${BASE_PATH}/`)
    fs.writeFileSync(filePath, content)
  }

  function walk(dir) {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (file.endsWith('.html')) {
        processFile(fullPath)
      }
    }
  }

  if (fs.existsSync(dist)) {
    walk(dist)
    console.log('Build complete! Output:', dist)
  }
}

main()