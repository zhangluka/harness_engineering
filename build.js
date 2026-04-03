const { build } = require('vitepress')
const fs = require('fs')
const path = require('path')

const BASE_PATH = '/srd-b256fe7e81ec477f-1255000106/harness01'
const DOMAIN = 'https://s3gw.paasst.cmbchina.cn'

async function main() {
  await build('.', {
    config: '.vitepress/config.prod.mts',
    outDir: './dist/st/oa/harness01',
    base: BASE_PATH
  })

  // 替换绝对路径
  const dist = path.resolve('./dist/st/oa/harness01')

  function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8')
    const fullDomain = DOMAIN + BASE_PATH  // https://s3gw.paasst.cmbchina.cn/srd-xxx/harness01
    const baseWithoutSlash = '/srd-b256fe7e81ec477f-1255000106/harness01'

    // 先修复 VitePress base 路径缺少斜杠的 bug
    // /srd-xxx/harness01assets -> /srd-xxx/harness01/assets
    content = content.replace(new RegExp(baseWithoutSlash + '([a-z])', 'g'), baseWithoutSlash + '/$1')

    // 统一替换：把所有 base 开头的路径都换成完整域名
    // 1. href 属性
    content = content.replace(/href="\/srd-b256fe7e81ec477f-1255000106\/harness01\//g, `href="${fullDomain}/`)
    // 2. src 属性
    content = content.replace(/src="\/srd-b256fe7e81ec477f-1255000106\/harness01\//g, `src="${fullDomain}/`)
    // 3. CSS url()
    content = content.replace(/url\(\/srd-b256fe7e81ec477f-1255000106\/harness01\/assets\//g, `url(${fullDomain}/assets/`)
    // 4. JS 中 base 值（确保尾部有斜杠）
    content = content.replace(/\\"base\\":\s*\\"\/srd-b256fe7e81ec477f-1255000106\/harness01\\"/g, `\\"base\\": \\"${BASE_PATH}/\\"`)

    fs.writeFileSync(filePath, content)
  }

  function walk(dir) {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (file.endsWith('.html') || file.endsWith('.css')) {
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