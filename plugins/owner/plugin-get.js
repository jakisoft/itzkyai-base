const fs = require('fs')
const path = require('path')

const handler = async (m, { text }) => {
  if (!text) return m.reply('Masukkan nama atau path plugin yang ingin diambil!')

  const baseDir = path.join(__dirname, '..')
  const inputPath = text.endsWith('.js') ? text : `${text}.js`
  const targetPath = path.join(baseDir, inputPath)

  if (fs.existsSync(targetPath)) {
    const content = fs.readFileSync(targetPath, 'utf-8')
    return m.reply(content)
  }

  const findFile = (dir, filename) => {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        const res = findFile(fullPath, filename)
        if (res) return res
      } else if (file === filename) return fullPath
    }
    return null
  }

  const filename = path.basename(inputPath)
  const foundFile = findFile(baseDir, filename)

  if (foundFile && fs.existsSync(foundFile)) {
    const content = fs.readFileSync(foundFile, 'utf-8')
    return m.reply(content)
  }

  const getAllPlugins = (dir) => {
    let result = []
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) result = result.concat(getAllPlugins(fullPath))
      else if (file.endsWith('.js')) result.push(path.relative(baseDir, fullPath))
    }
    return result
  }

  const allPlugins = getAllPlugins(baseDir)
  const listPlugins = allPlugins.map(p => `• ${p}`).join('\n')
  m.reply(`Plugin *${inputPath}* tidak ditemukan!\n\nDaftar plugin yang tersedia:\n${listPlugins}`)
}

handler.command = /^(getplugin|gp)$/i
handler.help = ['getplugin <nama atau path plugin>']
handler.tags = ['owner']
handler.owner = true

module.exports = handler