const ms = (str) => {
  let s = 0
  const regex = /(\d+)([hms])/gi
  let match
  while ((match = regex.exec(str))) {
    let val = parseInt(match[1])
    let unit = match[2]
    if (unit === 'h') s += val * 3600000
    if (unit === 'm') s += val * 60000
    if (unit === 's') s += val * 1000
  }
  return s
}

let handler = async (m, { kiicode, args, command, metadata }) => {
  const participants = metadata?.participants || []
  const option = args[0] ? args[0].toLowerCase() : ''
  const timeArg = args[1] ? ms(args[1]) : 0

  if (option === 'open') {
    await kiicode.groupSettingUpdate(m.chat, 'not_announcement')
    m.reply(timeArg ? `Grup dibuka, akan ditutup otomatis dalam ${args[1]}.` : 'Grup berhasil dibuka.')
    if (timeArg) setTimeout(async () => {
      await kiicode.groupSettingUpdate(m.chat, 'announcement')
      kiicode.sendMessage(m.chat, { text: 'Grup telah otomatis ditutup.' })
    }, timeArg)
  } else if (option === 'close') {
    await kiicode.groupSettingUpdate(m.chat, 'announcement')
    m.reply(timeArg ? `Grup ditutup, akan dibuka otomatis dalam ${args[1]}.` : 'Grup berhasil ditutup.')
    if (timeArg) setTimeout(async () => {
      await kiicode.groupSettingUpdate(m.chat, 'not_announcement')
      kiicode.sendMessage(m.chat, { text: 'Grup telah otomatis dibuka.' })
    }, timeArg)
  } else {
    m.reply(`Gunakan dengan cara ${command} (open|close) [durasi]\n\nContoh:\n${command} open 5m`)
  }
}

handler.tags = ['group']
handler.command = /^(group|grup|gc)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler