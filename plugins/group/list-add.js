const fs = require('fs')
const path = require('path')
const axios = require('axios')
const FormData = require('form-data')

let handler = async (m, { db, text, prefix, command }) => {
  const id = m.chat
  if (!text) return m.reply(`Gunakan dengan cara ${prefix + command} *key*\n\nContoh:\n${prefix + command} halo (balas teks/media untuk disimpan)`)
  if (!m.quoted) return m.reply('Reply pesan yang ingin dijadikan list')
  if (!db.groups[id]) db.groups[id] = {}
  if (!db.groups[id].list) db.groups[id].list = {}
  const key = text.toLowerCase()
  const dir = path.join(__dirname, '../../tmp', id)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const q = m.quoted
  const mime = (q.msg || q).mimetype || ''
  let data = { type: 'text', content: q.text || '' }

  if (/image|video|sticker|audio|document/.test(mime)) {
    const buffer = await q.download()
    const ext = mime.split('/')[1]
    const filePath = path.join(dir, `${key}.${ext}`)
    fs.writeFileSync(filePath, buffer)
    const form = new FormData()
    form.append('file', fs.createReadStream(filePath))
    const { data: result } = await axios.post('https://www.itzky.xyz/api/upload', form, { headers: form.getHeaders() })
    const url = result.url
    fs.unlinkSync(filePath)
    data = { type: 'media', url, mime, caption: q.text || '' }
  }

  db.groups[id].list[key] = data
  m.reply(`List dengan key "${key}" berhasil ditambahkan.`)
}

handler.tags = ['group']
handler.command = /^addlist$/i
handler.group = true
handler.admin = true
handler.botadmin = true

module.exports = handler