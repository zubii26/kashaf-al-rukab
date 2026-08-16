import fs from 'fs'
import path from 'path'

function replaceInFile(filePath: string) {
  const ext = path.extname(filePath)
  if (!['.tsx', '.css'].includes(ext)) return

  const content = fs.readFileSync(filePath, 'utf-8')
  if (content.match(/#C53030/i)) {
    const newContent = content.replace(/#C53030/gi, '#7d333b')
    fs.writeFileSync(filePath, newContent, 'utf-8')
    console.log('Updated:', filePath)
  }
}

function walk(dir: string) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath)
    } else {
      replaceInFile(fullPath)
    }
  }
}

walk(path.join(process.cwd(), 'app'))
console.log('Done.')
