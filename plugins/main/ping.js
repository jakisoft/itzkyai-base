const { performance } = require("perf_hooks")
const process = require("process")
const { clockString } = require('../../lib/myfunc')

const handler = async (m, { kiicode }) => {
  const start = performance.now()
  await m.reply('Running test...')
  const end = performance.now()
  const latency = (end - start).toFixed(3)
  const uptime = process.uptime()
  const muptime = clockString(uptime)
  
  const text = `乂  *P I N G - R E S U L T*

◈ *Response* : ${latency} ms
◈ *Uptime*   : ${muptime}
  `.trim()
  m.reply(text)
}

handler.tags = ['main'];
handler.command = /^ping$/i;
handler.category = 'main';

module.exports = handler