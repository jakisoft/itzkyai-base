let handler = async (m, { db, args, command }) => {
  const id = m.chat
  const option = args[0] ? args[0].toLowerCase() : ''
  if (!db.groups[id]) db.groups[id] = {}

  if (option === 'on') {
    db.groups[id].antilink = true
    m.reply('Antilink berhasil diaktifkan.')
  } else if (option === 'off') {
    db.groups[id].antilink = false
    m.reply('Antilink berhasil dimatikan.')
  } else {
    m.reply(`Gunakan dengan cara ${command} (on|off)\n\nContoh:\n${command} on`)
  }
}

handler.tags = ['group']
handler.command = /^antilink$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler