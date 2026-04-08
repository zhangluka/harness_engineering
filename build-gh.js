const { build } = require('vitepress')

async function main() {
  await build('.', {
    config: '.vitepress/config.gh.mjs',
    base: '/harness_engineering/'
  })
  console.log('Build complete!')
}

main()
