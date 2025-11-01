const moment = require("moment-timezone")
const { performance } = require("perf_hooks")
const process = require("process")
const { getDevice } = require("@whiskeysockets/baileys")
const { readMore, clockString, toTitleCase } = require("../../lib/myfunc")

const handler = async (m, { kiicode, tagCategories, prefix, isOwner }) => {
  try {
    const userId = m.sender
    const pushName = m.pushName || "Pengguna"
    const nomor = userId.split("@")[0]
    const mentionUser = [userId]
    const botname = "YourBotName" // Declare botname variable here

    const start = performance.now()
    const end = performance.now()
    const latency = (end - start).toFixed(3)
    const uptime = process.uptime()
    const muptime = clockString(uptime)

    const collectAllCommands = () => {
      let total = 0
      for (const plugin of Object.values(global.plugins)) {
        if (!plugin.command) continue
        if (plugin.command instanceof RegExp) {
          total++
        } else {
          const cmdsArray = Array.isArray(plugin.command) ? plugin.command : [plugin.command]
          total += cmdsArray.length
        }
      }
      return total
    }

    const totalCommands = collectAllCommands()
    const totalAuto = global.autoPlugins ? global.autoPlugins.length : 0

    const totalUsers = global.chats ? global.chats.size : 0

    const collectCommands = (plugins = []) => {
      const cmds = new Set()
      for (const plugin of plugins) {
        if (!plugin.command) continue
        if (plugin.command instanceof RegExp) {
          const match = plugin.command.toString().match(/^\/\^\(?([^|$]+)/)
          if (match) cmds.add(`${prefix}${match[1]}`)
        } else {
          const cmdsArray = Array.isArray(plugin.command) ? plugin.command : [plugin.command]
          cmdsArray.forEach((cmd) => cmds.add(`${prefix}${cmd.replace(/\$/g, "")}`))
        }
      }
      return Array.from(cmds).sort()
    }

    const time = moment().tz("Asia/Jakarta").format("HH")
    const greet =
      time < 4
        ? "Selamat pagi"
        : time < 11
          ? "Selamat pagi"
          : time < 15
            ? "Selamat siang"
            : time < 18
              ? "Selamat sore"
              : "Selamat malam"

    const botInfo = [
      "> *乂 B O T - I N F O*",
      `> ∝ Total Fitur: ${totalCommands}`,
      `> ∝ Response: ${latency} ms`,
      `> ∝ Uptime: ${muptime}`,
      `> ∝ Total User: ${totalUsers}`,
      `> ∝ Auto Plugins: ${totalAuto}`,
    ].join("\n")

    const sortedTags = Object.keys(tagCategories).sort()
    let commandListText = ""
    for (const tag of sortedTags) {
      if (tag.toLowerCase() === "owner" && !isOwner) continue
      const commands = collectCommands(tagCategories[tag])
      if (!commands.length) continue
      commandListText += `\n> *乂 Menu - ${toTitleCase(tag)}*\n${commands.map((c) => `> ∝ ${c}`).join("\n")}\n`
    }

    let menuText = `Saya *${botname}* adalah sistem otomatis berbasis WhatsApp yang membantu Anda mengelola berbagai fitur seperti transaksi, informasi, dan utilitas harian.\n\nSilakan eksplorasi menu di bawah ini sesuai kebutuhanmu. Jika ada perintah yang tidak dikenal, ketik *${prefix}help* atau hubungi owner.\n\n`
    menuText += `${botInfo}\n${readMore()}${commandListText}\n`

    const mainSection = {
      title: "Menu Utama Bot",
      rows: [
        {
          header: "🛒  List Harga",
          title: "Melihat daftar harga dan produk",
          description: "Menampilkan semua produk & harga yang tersedia",
          id: ".listharga",
        },
        {
          header: "👤  Profil Pengguna",
          title: "Lihat profil akun Anda",
          description: "Menampilkan data, role, dan saldo",
          id: ".profile",
        },
        {
          header: "📘  Bantuan Order",
          title: "Cara melakukan pemesanan & melihat harga",
          description: "Panduan penggunaan dan daftar harga lengkap",
          id: ".listharga help",
        },
      ],
    }

    const ownerSection = isOwner
      ? {
          title: "Info Akun Atlantic",
          rows: [
            {
              header: "💰  Info Atlantic",
              title: "Lihat informasi akun Atlantic",
              description: "Menampilkan saldo, username, dan status akun",
              id: ".infoatl",
            },
            {
              header: "💸  Withdraw ATL",
              title: "Tarik saldo Atlantic Anda",
              description: "Withdraw ke DANA atau SHOPEE PAY",
              id: ".withdraw",
            },
          ],
        }
      : null

    const device = getDevice(m.key.id)

    if (device === "android" || device === "web") {
      const sections = [mainSection]
      if (ownerSection) {
        sections.push(ownerSection)
      }

      await kiicode.sendMessage(
        m.chat,
        {
          image: { url: `${global.thumbnail}` },
          caption: menuText.trim(),
          title: `Hai @${nomor} 👋🏻, ${greet}`,
          subtitle: "",
          footer: global.footer || "© KiiCode - 2025",
          interactiveButtons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Pilih Menu Berdasarkan Kategori",
                sections: sections,
              }),
            },
          ],
          mentions: mentionUser,
        },
        { quoted: m },
      )
    } else {
      const buttons = [
        {
          buttonId: ".profile",
          buttonText: {
            displayText: "Lihat Profil 👤",
          },
          type: 1,
        },
        {
          buttonId: ".listharga",
          buttonText: {
            displayText: "Daftar Harga 🛒",
          },
          type: 1,
        },
        {
          buttonId: ".listharga help",
          buttonText: {
            displayText: "📘  Bantuan Order",
          },
          type: 1,
        },
      ]

      if (isOwner) {
        buttons.push(
          {
            buttonId: ".infoatl",
            buttonText: {
              displayText: "Info Atlantic 💰",
            },
            type: 1,
          },
          {
            buttonId: ".withdraw",
            buttonText: {
              displayText: "Withdraw ATL 💸",
            },
            type: 1,
          },
        )
      }

      await kiicode.sendMessage(
        m.chat,
        {
          image: { url: `${global.thumbnail}` },
          caption: `*Hai @${nomor} 👋🏻, ${greet}*\n\n${menuText.trim()}`,
          footer: global.footer || "© KiiCode - 2025",
          buttons: buttons,
          headerType: 1,
          viewOnce: true,
          mentions: mentionUser,
        },
        { quoted: m },
      )
    }
  } catch (err) {
    console.error("Error in menu handler:", err)
  }
}

handler.tags = ["main"]
handler.command = /^menu$/i

module.exports = handler