const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', 'generated', 'prisma')
const dst = path.join(__dirname, '..', 'dist', 'generated', 'prisma')

function copyDir(from, to) {
  if (!fs.existsSync(from)) {
    console.log(`[copy-prisma] Source not found yet: ${from} — skipping`)
    return
  }
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name)
    const dstPath = path.join(to, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath)
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
  console.log(`✓ Copied pre-compiled Prisma client to dist/generated/prisma`)
}

copyDir(src, dst)
