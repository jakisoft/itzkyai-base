let handler = async (m, { db, text, prefix, command }) => {
  const id = m.chat
  if (!text) return m.reply(`Gunakan dengan cara ${prefix + command} *teks*\n\nContoh:\n${prefix + command} Selamat datang @user di grup @group`)
  if (!db.groups[id]) db.groups[id] = {}
  db.groups[id].welcome = text
  m.reply('Pesan welcome berhasil diatur.')
}

handler.tags = ['group']
handler.command = /^setwelcome$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler