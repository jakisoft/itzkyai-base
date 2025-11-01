const fs = require('fs');
const chalk = require('chalk');
const { getBuffer, saveImageToFile } = require('./myfunc');
const { BufferJSON, WA_DEFAULT_EPHEMERAL, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, getContentType, downloadContentFromMessage, getDevice, generateMessageIDV2, generateWAMessageFromContent, proto } = require("@whiskeysockets/baileys")

async function downloadViewOnceMedia(m) {
    const type = Object.keys(m.quoted.message)[0];
    const quotedType = m.quoted.message[type];
    const mediaStream = await downloadContentFromMessage(quotedType, type === 'imageMessage' ? 'image' : 'video');
    
    let buffer = Buffer.from([]);
    for await (const chunk of mediaStream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

global.getBuffer = getBuffer
global.saveImageToFile = saveImageToFile
global.downloadContentFromMessage = downloadContentFromMessage
global.downloadViewOnceMedia = downloadViewOnceMedia

let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright(`Update ${__filename}`))
  delete require.cache[file]
  require(file)
})