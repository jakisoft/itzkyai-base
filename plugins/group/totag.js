let handler = async (m, { kiicode, participants }) => {
  if (!m.quoted) return m.reply('Reply pesan yang ingin ditag.')
  await kiicode.sendMessage(m.chat, {
    forward: m.quoted.fakeObj,
    mentions: participants.map(v => v.jid)
  }, { quoted: m })
}

handler.tags = ['group']
handler.command = /^totag$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler