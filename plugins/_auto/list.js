let handler = async (m, { kiicode }) => {
  const db = global.db.data
  const id = m.chat
  const text = (m.text || '').toLowerCase()
  if (!db.groups[id] || !db.groups[id].list) return
  const data = db.groups[id].list[text]
  if (!data) return

  if (data.type === 'text') {
    await kiicode.sendMessage(m.chat, { text: data.content }, { quoted: m })
  } else if (data.type === 'media') {
    const url = data.url
    const mime = data.mime
    const caption = data.caption || ''
    if (/image/.test(mime)) await kiicode.sendMessage(m.chat, { image: { url }, caption }, { quoted: m })
    if (/video/.test(mime)) await kiicode.sendMessage(m.chat, { video: { url }, caption }, { quoted: m })
    if (/audio/.test(mime)) await kiicode.sendMessage(m.chat, { audio: { url }, mimetype: mime }, { quoted: m })
    if (/sticker/.test(mime)) await kiicode.sendMessage(m.chat, { sticker: { url } }, { quoted: m })
    if (/document/.test(mime)) await kiicode.sendMessage(m.chat, { document: { url }, fileName: url.split('/').pop(), mimetype: mime, caption }, { quoted: m })
  }
}

module.exports = handler