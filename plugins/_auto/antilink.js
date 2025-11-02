let handler = async (m, { kiicode, isAdmins, botNumber }) => {
  const id = m.chat
  const db = global.db.data
  if (!db.groups[id] || !db.groups[id].antilink) return
  if (isAdmins && botNumber) return
  const content = m.text || m.caption || ''
  if (!content) return
  const regex = /(chat\.whatsapp\.com\/[A-Za-z0-9]+)/i
  if (regex.test(content)) {
    await kiicode.sendMessage(m.chat, { delete: m.key })
    await kiicode.sendMessage(m.chat, {
      text: `@${m.sender.split('@')[0]} jangan kirim link yang terlarang lagi!`,
      mentions: [m.sender]
    })
  }
}

module.exports = handler
