let handler = async (m, { kiicode, text, participants }) => {
  await kiicode.sendMessage(m.chat, {
    text: text || '',
    mentions: participants.map(v => v.jid)
  }, { quoted: m })
}

handler.tags = ['group']
handler.command = /^(hidetag|ht|h)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler