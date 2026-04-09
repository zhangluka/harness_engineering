const { build } = require('vitepress')

const BASE_PATH = '/'

async function main() {
  await build('.', {
    config: '.vitepress/config.prod.mts',
    outDir: './dist/st/oa/harness01',
    base: BASE_PATH
  })
  console.log('Build complete! Output: ./dist/st/oa/harness01')
}

main()