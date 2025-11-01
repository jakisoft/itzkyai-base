require('./system/settings')
require('./lib/spinner')

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, jidDecode, downloadContentFromMessage, proto, generateWAMessageFromContent, generateForwardMessageContent } = require("@whiskeysockets/baileys")
const { Boom } = require("@hapi/boom")
const readline = require("readline")
const pino = require("pino")
const chalk = require("chalk")
const fs = require("fs")
const path = require("path")
const FileType = require('file-type')
const PhoneNumber = require('awesome-phonenumber')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep } = require("./lib/myfunc")
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeExif } = require('./lib/exif')
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) })
const handler = require("./handler")

const dbPath = path.join(__dirname, 'database', 'database.json')
if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true })
if (!global.db) global.db = {}
if (!global.db.data) {
  if (fs.existsSync(dbPath)) {
    try {
      global.db.data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    } catch {
      global.db.data = {}
    }
  } else {
    global.db.data = { users: {}, groups: {}, settings: {}, others: {} }
    fs.writeFileSync(dbPath, JSON.stringify(global.db.data, null, 2))
  }
}
setInterval(() => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(global.db.data, null, 2))
  } catch {}
}, 10000)

const usePairingCode = true
const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./sessions")
  const { version } = await fetchLatestBaileysVersion()

  const kiicode = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: !usePairingCode,
    auth: state,
    browser: ["Windows", "Chrome", "11"],
    version: [2, 3000, 1027934701],
  })
  
  kiicode.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {}
      return (decode.user && decode.server) ? decode.user + '@' + decode.server : jid
    } else return jid
  }

  kiicode.serializeM = (m) => smsg(kiicode, m, store)
  kiicode.ev.on("creds.update", saveCreds)

  if (usePairingCode && !kiicode.authState.creds.registered) {
    const phoneNumber = await question(chalk.white.bold("\nMasukkan Nomor WhatsApp Kamu Dengan Awalan 62:\n"))
    const code = await kiicode.requestPairingCode(phoneNumber.trim())
    console.log(chalk.yellow.bold("⚠︎ KODE PAIRING BOT WA ANDA :"), chalk.green.bold(`[ ${code} ]`))
  }

  kiicode.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      let m = chatUpdate.messages[0]
      if (!m.message) return
      if (Object.keys(m.message)[0] === "ephemeralMessage") m.message = m.message.ephemeralMessage.message
      if (m.key.remoteJid === "status@broadcast") {
          await kiicode.readMessages([m.key])
      }
      if (!kiicode.public && !m.key.fromMe && chatUpdate.type === "notify") return
      if (m.key.id.startsWith("BAE5") && m.key.id.length === 16) return
      m = smsg(kiicode, m, store)

      handler(kiicode, m)
    } catch (err) {
      console.error(chalk.red.bold("[ SYSTEM ]"), err)
    }
  })

  kiicode.ev.on('group-participants.update', async (update) => {
    try {
        const metadata = await kiicode.groupMetadata(update.id);
        const participants = update.participants;

        let groupData = global.db.data.groups[update.id] || { welcome: "", bye: "" };

        for (let num of participants) {
            try {
                const userTag = `@${num.split('@')[0]}`;

                if (update.action === 'add') {
                    const welcomeText = groupData.welcome
                        .replace('@user', userTag)
                        .replace('@group', metadata.subject);

                    if (groupData.welcome) {
                        await kiicode.sendMessage(update.id, { text: welcomeText, mentions: [num] });
                    }
                } else if (update.action === 'remove') {
                    const byeText = groupData.bye
                        .replace('@user', userTag)
                        .replace('@group', metadata.subject);

                    if (groupData.bye) {
                        await kiicode.sendMessage(update.id, { text: byeText, mentions: [num] });
                    }
                }
            } catch (err) {
                console.log(`Error processing participant update: ${err}`);
            }
        }
    } catch (err) {
        console.log(`Error fetching group metadata: ${err}`);
    }
  });

  kiicode.getName = (jid, withoutContact = false) => {
    id = kiicode.decodeJid(jid)
    withoutContact = kiicode.withoutContact || withoutContact 
    let v
    if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
      v = store.contacts[id] || {}
      if (!(v.name || v.subject)) v = kiicode.groupMetadata(id) || {}
      resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
    })
    else v = id === '0@s.whatsapp.net' ? {
      id,
      name: 'WhatsApp'
    } : id === kiicode.decodeJid(kiicode.user.id) ?
    kiicode.user :
    (store.contacts[id] || {})
    return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
  }

  kiicode.sendContact = async (jid, kon, quoted = '', opts = {}) => {
    let list = []
    for (let i of kon) {
      list.push({
        displayName: await kiicode.getName(i + '@s.whatsapp.net'),
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await kiicode.getName(i + '@s.whatsapp.net')}\nFN:${await kiicode.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem4.ADR:;;Indonesia;;;;\nitem4.X-ABLabel:Region\nEND:VCARD`
      })
    }
    kiicode.sendMessage(jid, { contacts: { displayName: `${list.length} Kontak`, contacts: list }, ...opts }, { quoted })
  }

  kiicode.public = true

  kiicode.downloadMediaMessage = async (message) => {
    let mime = (message.msg || message).mimetype || ''
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
    const stream = await downloadContentFromMessage(message, messageType)
    let buffer = Buffer.from([])
    for await(const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
  } 

  kiicode.sendStatusMention = async (content, jids = []) => {
    let users;
    for (let id of jids) {
      let userId = await kiicode.groupMetadata(id);
      users = await userId.participants.map(u => kiicode.decodeJid(u.id));
    }

    let message = await kiicode.sendMessage(
      "status@broadcast", content, {
        backgroundColor: "F54242",
        font: Math.floor(Math.random() * 9),
        statusJidList: users,
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: jids.map((jid) => ({
                  tag: "to",
                  attrs: { jid },
                  content: undefined,
                })),
              },
            ],
          },
        ],
      }
    );

    jids.forEach(id => {
      kiicode.relayMessage(id, {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: message.key,
              type: 25,
            },
          },
        },
      },
      {
        userJid: kiicode.user.jid,
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: "true" },
            content: undefined,
          },
        ],
      });
      setTimeout(() => {}, 2500);
    });

    return message;
  };

  kiicode.sendImage = async (jid, path, caption = '', quoted = '', options) => {
    let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
    return await kiicode.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted })
  }

  kiicode.sendText = (jid, text, quoted = '', options) => kiicode.sendMessage(jid, { text: text, ...options }, { quoted })

  kiicode.sendTextWithMentions = async (jid, text, quoted, options = {}) => kiicode.sendMessage(jid, { text: text, contextInfo: { mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net') }, ...options }, { quoted })

  kiicode.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
    let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
    let buffer
    if (options && (options.packname || options.author)) {
      buffer = await writeExifImg(buff, options)
    } else {
      buffer = await imageToWebp(buff)
    }
    await kiicode.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
    return buffer
  }

  kiicode.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
    let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
    let buffer
    if (options && (options.packname || options.author)) {
      buffer = await writeExifVid(buff, options)
    } else {
      buffer = await videoToWebp(buff)
    }
    await kiicode.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
    return buffer
  }

  kiicode.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
    let quoted = message.msg ? message.msg : message;
    let mime = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    let type = await FileType.fromBuffer(buffer);
    const trueFileName = attachExtension ? `${filename}.${type.ext}` : filename;
    
    const filePath = path.join(__dirname, 'src', trueFileName);
    await fs.writeFileSync(filePath, buffer);
    
    return filePath;
  };

  kiicode.cMod = (jid, copy, text = '', sender = kiicode.user.id, options = {}) => {
    let mtype = Object.keys(copy.message)[0]
    let isEphemeral = mtype === 'ephemeralMessage'
    if (isEphemeral) {
      mtype = Object.keys(copy.message.ephemeralMessage.message)[0]
    }
    let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message
    let content = msg[mtype]
    if (typeof content === 'string') msg[mtype] = text || content
    else if (content.caption) content.caption = text || content.caption
    else if (content.text) content.text = text || content.text
    if (typeof content !== 'string') msg[mtype] = {
      ...content,
      ...options
    }
    if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
    else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
    if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
    else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
    copy.key.remoteJid = jid
    copy.key.fromMe = sender === kiicode.user.id
    return proto.WebMessageInfo.fromObject(copy)
  }

  kiicode.sendFile = async(jid, PATH, fileName, quoted = {}, options = {}) => {
    let types = await kiicode.getFile(PATH, true)
    let { filename, size, ext, mime, data } = types
    let type = '', mimetype = mime, pathFile = filename
    if (options.asDocument) type = 'document'
    if (options.asSticker || /webp/.test(mime)) {
      let media = { mimetype: mime, data }
      pathFile = await writeExif(media, { packname: global.packname, author: global.packname2, categories: options.categories ? options.categories : [] })
      await fs.promises.unlink(filename)
      type = 'sticker'
      mimetype = 'image/webp'
    }
    else if (/image/.test(mime)) type = 'image'
    else if (/video/.test(mime)) type = 'video'
    else if (/audio/.test(mime)) type = 'audio'
    else type = 'document'
    await kiicode.sendMessage(jid, { [type]: { url: pathFile }, mimetype, fileName, ...options }, { quoted, ...options })
    return fs.promises.unlink(pathFile)
  }

  kiicode.parseMention = async(text) => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
  }

  kiicode.copyNForward = async (jid, message, forceForward = false, options = {}) => {
    let vtype
    if (options.readViewOnce) {
      message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
      vtype = Object.keys(message.message.viewOnceMessage.message)[0]
      delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
      delete message.message.viewOnceMessage.message[vtype].viewOnce
      message.message = {
        ...message.message.viewOnceMessage.message
      }
    }
    let mtype = Object.keys(message.message)[0]
    let content = await generateForwardMessageContent(message, forceForward)
    let ctype = Object.keys(content)[0]
    let context = {}
    if (mtype != "conversation") context = message.message[mtype].contextInfo
    content[ctype].contextInfo = {
      ...context,
      ...content[ctype].contextInfo
    }
    const waMessage = await generateWAMessageFromContent(jid, content, options ? {
      ...content[ctype],
      ...options,
      ...(options.contextInfo ? {
        contextInfo: {
          ...content[ctype].contextInfo,
          ...options.contextInfo
        }
      } : {})
    } : {})
    await kiicode.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id })
    return waMessage
  }

  kiicode.getFile = async (PATH, save) => {
    let res
    let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
    let type = await FileType.fromBuffer(data) || {
      mime: 'application/octet-stream',
      ext: '.bin'
    }
    filename = path.join(__filename, '../src/' + new Date * 1 + '.' + type.ext)
    if (data && save) fs.promises.writeFile(filename, data)
    return {
      res,
      filename,
      size: await getSizeMedia(data),
      ...type,
      data
    }
  }

  kiicode.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
    const errorMessage = lastDisconnect?.error?.message || lastDisconnect?.error?.stack || "Unknown Error"

    if (connection === "close") {
      console.log(chalk.red.bold("──────────────────────────────────────────────────"))
      console.log(chalk.red.bold("[ SYSTEM ] Connection closed"))
      console.log(chalk.yellow(`↳ Reason Code : ${reason}`))
      console.log(chalk.yellow(`↳ Error Info  : ${errorMessage}`))
      console.log(chalk.red.bold("──────────────────────────────────────────────────"))

      if (reason === DisconnectReason.badSession) {
        console.log(chalk.red.bold("[ SYSTEM ] Bad Session File, Please Delete Session and Scan Again"))
        process.exit();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log(chalk.red.bold("[ SYSTEM ] Connection closed, reconnecting..."))
        connectToWhatsApp();
      } else if (reason === DisconnectReason.connectionLost) {
        console.log(chalk.red.bold("[ SYSTEM ] Connection Lost from Server, reconnecting..."))
        connectToWhatsApp();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log(chalk.red.bold("[ SYSTEM ] Connection Replaced, Another New Session Opened, Please Restart Bot"))
        process.exit();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.red.bold("[ SYSTEM ] Device Logged Out, Please Delete Folder Session and Scan Again"))
        process.exit();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log(chalk.red.bold("[ SYSTEM ] Restart Required, Restarting..."))
        connectToWhatsApp();
      } else if (reason === DisconnectReason.timedOut) {
        console.log(chalk.red.bold("[ SYSTEM ] Connection TimedOut, Reconnecting..."))
        connectToWhatsApp();
      } else {
        console.log(chalk.red.bold(`[ SYSTEM ] Unknown DisconnectReason: ${reason} | ${connection}`))
        connectToWhatsApp();
      }
    } else if (connection === 'connecting') {
      console.log(chalk.cyan.bold('──────────────────────────────────────────────────'))
      console.log(chalk.green.bold(`› AUTHOR : KiiCode`))
      console.log(chalk.green.bold(`› DATE : ${new Date().toLocaleDateString()}`))
      start("1", chalk.yellow.bold("[ SYSTEM ] Connecting..."))
      console.log(chalk.cyan.bold('──────────────────────────────────────────────────'))
    } else if (connection === "open") {
      success("1", chalk.green.bold("[ SYSTEM ] Connected!"))
    }
  })
}

connectToWhatsApp()
const file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright.bold(`Update ${__filename}`))
  delete require.cache[file]
  require(file)
})