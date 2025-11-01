const fs = require('fs')
const chalk = require('chalk')

global.owner = ["6289604363344"]
global.ownername = "Itzky Projects"
global.botname = "ItzkyAI V1"
global.bot = "79968454796"
global.packname = "Created By"
global.author = "Itzky Projects"
global.footer = "© Itzky Projects - 2025"
global.thumbnail = "https://www.itzky.xyz/file/cbwt5ao777.jpg"
global.gcbot = "https://chat.whatsapp.com/F8ffS5sazP60LYpG0IACEE?mode=r_c"

global.prefix = ['!', '.', '#', '/'];

const file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright(`Update ${__filename}`))
  delete require.cache[file]
  require(file)
})