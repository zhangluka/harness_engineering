const { build } = require('vitepress')

const BASE_PATH = '/srd-b256fe7e81ec477f-1255000106/harness01/'

async function main() {
  await build('.', {
    config: '.vitepress/config.prod.mts',
    outDir: './dist/st/oa/harness01',
    base: BASE_PATH
  })
  console.log('Build complete! Output: ./dist/st/oa/harness01')
}

main()