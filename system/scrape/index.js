const fs = require("fs");
const chalk = require("chalk");

const { tiktok, tiktoks, ttslide, cobalt, spotifydl, igdl } = require("./download");
const { ytdl, ytmp3 } = require("./ytdl");

global.tiktok = tiktok
global.instagram = igdl
global.ytmp3 = ytmp3
global.ytdl = ytdl
global.spotify = spotifydl

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})