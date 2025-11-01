let handler = async (m, { db }) => {
  const id = m.chat
  if (!db.groups[id] || !db.groups[id].list || Object.keys(db.groups[id].list).length === 0)
    return m.reply('Belum ada list yang disimpan di grup ini.')
  
  const listKeys = Object.keys(db.groups[id].list).sort((a, b) => a.localeCompare(b))
  const list = listKeys
    .map((v, i) => {
      const item = db.groups[id].list[v]
      const type = item?.type || 'unknown'
      return `${i + 1}. ${v} (${type})`
    })
    .join('\n')

  const teks = `Daftar List di Grup Ini:\n\n${list}`
  m.reply(teks)
}

handler.tags = ['group']
handler.command = /^list$/i
handler.group = true
handler.admin = true
handler.botadmin = true

module.exports = handler