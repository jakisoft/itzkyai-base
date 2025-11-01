let handler = async (m, { db, text, prefix, command }) => {
  const id = m.chat
  if (!text) return m.reply(`Gunakan dengan cara ${prefix + command} *teks*\n\nContoh:\n${prefix + command} Selamat tinggal @user, semoga betah di luar sana!`)
  if (!db.groups[id]) db.groups[id] = {}
  db.groups[id].bye = text
  m.reply('Pesan bye berhasil diatur.')
}

handler.tags = ['group']
handler.command = /^setbye$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler