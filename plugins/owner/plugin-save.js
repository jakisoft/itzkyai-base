const fs = require('fs')
const path = require('path')

const handler = async (m, { text, prefix, command }) => {
  if (!text) return m.reply(`• Example: ${prefix + command} owner/menu`)
  if (!m.quoted || !m.quoted.text) return m.reply(`Reply message berisi kode plugin`)
  try {
    const baseDir = path.join(__dirname, '..')
    const filePath = path.join(baseDir, `${text.endsWith('.js') ? text : text + '.js'}`)
    const dirName = path.dirname(filePath)
    if (!fs.existsSync(dirName)) fs.mkdirSync(dirName, { recursive: true })
    fs.writeFileSync(filePath, m.quoted.text)
    m.reply(`Plugin berhasil disimpan di ${path.relative(baseDir, filePath)}`)
  } catch (error) {
    console.log(error)
    m.reply('Gagal menyimpan plugin')
  }
}

handler.tags = ['owner']
handler.command = /^(saveplugin|sp)$/i
handler.help = ['saveplugin <nama file plugin>']
handler.owner = true

module.exports = handler