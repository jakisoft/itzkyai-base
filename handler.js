require("./system/settings")
require("./lib/index")
require("./system/scrape/index")
const fs = require("fs")
const path = require("path")
const chalk = require("chalk")

const plugins = new Map()
const autoPlugins = []
const tagCategories = {}

const getAllPluginFiles = (dir) => {
  let results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) results = results.concat(getAllPluginFiles(fullPath))
    else if (file.endsWith(".js")) results.push(fullPath)
  }
  return results
}

const clearRequireCache = (filePath) => {
  try {
    const modulePath = require.resolve(filePath)
    delete require.cache[modulePath]
  } catch {}
}

const loadPlugins = () => {
  plugins.clear()
  autoPlugins.length = 0
  Object.keys(tagCategories).forEach((tag) => (tagCategories[tag] = []))

  const pluginFiles = getAllPluginFiles(path.join(__dirname, "plugins"))
  for (const file of pluginFiles) {
    clearRequireCache(file)
    try {
      const plugin = require(file)
      if (plugin && plugin.command instanceof RegExp) {
        plugin.help = plugin.help || [`${plugin.command}`]
        plugin.tags = plugin.tags || ["general"]
        plugin.owner = plugin.owner || false
        plugins.set(plugin.command, plugin)
        if (plugin.tags && Array.isArray(plugin.tags)) {
          plugin.tags.forEach((tag) => {
            if (!tagCategories[tag]) tagCategories[tag] = []
            tagCategories[tag].push(plugin)
          })
        }
      } else if (typeof plugin === "function" || typeof plugin.before === "function") {
        autoPlugins.push(plugin)
      }
    } catch (err) {
      console.error(chalk.red(`Failed to load plugin ${file}:`), err)
    }
  }

  global.plugins = Object.fromEntries(plugins.entries())
  global.autoPlugins = autoPlugins
  console.log(chalk.cyan(`Plugins Reloaded: ${plugins.size} command plugins, ${autoPlugins.length} auto plugins`))
}

loadPlugins()

const dbPath = path.join(__dirname, "database", "database.json")
if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true })
if (!global.db) global.db = {}
if (!global.db.data) {
  try {
    global.db.data = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, "utf-8")) : {}
  } catch {
    global.db.data = {}
  }
}
const db = global.db.data
db.users = db.users || {}
db.groups = db.groups || {}
db.others = db.others || {}
db.settings = db.settings || {}

const saveDB = () => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(global.db.data, null, 2))
  } catch {}
}
setInterval(saveDB, 10000)

const handler = async (kiicode, m) => {
  try {
    if (m.key.fromMe) return

    const body =
      typeof m.message === "object"
        ? m.mtype === "conversation"
          ? m.message.conversation
          : m.mtype === "imageMessage"
            ? m.message.imageMessage?.caption
            : m.mtype === "videoMessage"
              ? m.message.videoMessage?.caption
              : m.mtype === "extendedTextMessage"
                ? m.message.extendedTextMessage?.text
                : m.mtype === "buttonsResponseMessage"
                  ? m.message.buttonsResponseMessage?.selectedButtonId
                  : m.mtype === "listResponseMessage"
                    ? m.message.listResponseMessage?.singleSelectReply?.selectedRowId
                    : m.mtype === "templateButtonReplyMessage"
                      ? m.message.templateButtonReplyMessage?.selectedId
                      : m.mtype === "interactiveResponseMessage"
                        ? (() => {
                            try {
                              return JSON.parse(m.msg?.nativeFlowResponseMessage?.paramsJson)?.id
                            } catch {
                              return ""
                            }
                          })()
                        : m.mtype === "messageContextInfo"
                          ? m.message.buttonsResponseMessage?.selectedButtonId ||
                            m.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
                            m.text
                          : ""
        : ""

    const budy = typeof m.text == "string" ? m.text : ""
    const sender = m.sender
    const pushname = m.pushName || "-"
    const isGroup = m.isGroup
    const idGroup = isGroup ? m.chat : "-"
    const idUser = sender
    const ownerJid = `${owner}@s.whatsapp.net`
    const botNumber = await kiicode.decodeJid(kiicode.user.id)
    const metadata = isGroup ? await kiicode.groupMetadata(m.chat).catch(() => null) : null
    const groupName = metadata?.subject || "-"
    const participants = metadata?.participants || []
    const groupAdmins = isGroup ? participants.filter((v) => v.admin).map((v) => v.jid) : []
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber) : false
    const isAdmins = isGroup ? groupAdmins.includes(sender) : false
    const isOwner =
      [`${owner}@s.whatsapp.net`] == sender ? true : [`${owner}@s.whatsapp.net`].includes(sender) ? true : false

    if (!db.users[idUser]) {
      db.users[idUser] = {
        id: idUser,
        balance: 0,
        role: "member",
        transactions: [],
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reff_id: require("crypto").randomBytes(5).toString("hex").toUpperCase(),
        ref_by: null,
        referrals: [],
        referral_bonus: 0,
      }
      saveDB()
    } else db.users[idUser].updated_at = new Date().toISOString()

    const typeChat = m.mtype
    const typeInfo = /image|video|audio|sticker|document/.test(typeChat) ? `Media (${typeChat})` : `Text: ${body}`
    const logStyle = isGroup ? chalk.cyan : chalk.white

    console.log(chalk.cyan(`──────────────────────`))
    console.log(logStyle(`• Sender  : ${idUser}`))
    console.log(logStyle(`• Name    : ${pushname}`))
    console.log(logStyle(`• Group   : ${isGroup ? groupName + " (" + idGroup + ")" : "Private Chat"}`))
    console.log(logStyle(`• Message : ${typeInfo}`))
    console.log(chalk.cyan(`──────────────────────`))

    for (const plugin of autoPlugins) {
      if (typeof plugin === "function") await plugin(m, { kiicode })
      else if (typeof plugin.before === "function") {
        const result = await plugin.before(m, { kiicode, isAdmins, db })
        if (!result) return
      }
    }

    const prefixList = Array.isArray(prefix) ? prefix : [prefix]
    const usedPrefix = prefixList.find((p) => body.startsWith(p))
    if (!usedPrefix) return
    const args = body.slice(usedPrefix.length).trim().split(/\s+/)
    const commandName = args.shift().toLowerCase()
    const text = args.join(" ")
    const quoted = m.quoted ? m.quoted : m
    const mentionUser = [...new Set([...(m.mentionedJid || []), ...(m.quoted ? [m.quoted.sender] : [])])]

    for (const [regex, plugin] of plugins.entries()) {
      if (regex.test(commandName)) {
        if (plugin.owner && sender !== ownerJid) return m.reply("*Command ini khusus Owner!*")
        if (plugin.group && !isGroup) return m.reply("*Command ini hanya untuk Group!*")
        if (plugin.admin && !isAdmins) return m.reply("*Command ini hanya untuk Admin!*")
        if (plugin.botadmin && !isBotAdmins) return m.reply("*Bot harus Admin untuk menjalankan perintah ini!*")
        await plugin(m, {
          kiicode,
          args,
          text,
          prefix: usedPrefix,
          command: commandName,
          tagCategories,
          mentionUser,
          quoted,
          budy,
          botNumber,
          db,
          isOwner,
          participants,
          isAdmins,
        })
        break
      }
    }

    saveDB()
  } catch (err) {
    console.error(chalk.redBright("[ ERROR HANDLER ]"), err)
  }
}

module.exports = handler

const pluginDir = path.join(__dirname, "plugins")

const debounce = (fn, delay = 500) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

const watchDirectory = (dir) => {
  fs.readdirSync(dir).forEach((file) => {
    const full = path.join(dir, file)
    if (fs.statSync(full).isDirectory()) watchDirectory(full)
  })
  try {
    fs.watch(
      dir,
      debounce((event, filename) => {
        if (!filename || !filename.endsWith(".js")) return
        console.log(chalk.green(`Plugin Updated: ${filename}`))
        loadPlugins()
      }),
    )
  } catch {
    fs.watchFile(dir, debounce(loadPlugins))
  }
}
watchDirectory(pluginDir)

const file = require.resolve(__filename)
fs.watchFile(
  file,
  debounce(() => {
    console.log(chalk.redBright(`Handler updated: reloading ${__filename}`))
    clearRequireCache(file)
    try {
      const newHandler = require(file)
      module.exports = newHandler
    } catch (err) {
      console.error(chalk.red(`Failed to reload handler:`), err)
    }
  }),
)
