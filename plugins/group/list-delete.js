const fs = require('fs')
const path = require('path')

let handler = async (m, { db, text, prefix, command }) => {
  const id = m.chat
  if (!text) return m.reply(`Gunakan dengan cara ${prefix + command} *key*\n\nContoh:\n${prefix + command} halo`)
  if (!db.groups[id] || !db.groups[id].list) return m.reply('Belum ada list yang disimpan.')
  const key = text.toLowerCase()
  const data = db.groups[id].list[key]
  if (!data) return m.reply(`List dengan key "${key}" tidak ditemukan.`)
  delete db.groups[id].list[key]
  m.reply(`List dengan key "${key}" berhasil dihapus.`)
}

handler.tags = ['group']
handler.command = /^dellist$/i
handler.group = true
handler.admin = true
handler.botadmin = true

module.exports = handler