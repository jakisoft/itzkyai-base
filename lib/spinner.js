const spin = require("spinnies");
const fs = require("fs");
const chalk = require("chalk");

const spinner = {
  interval: 120,
  frames: [
    "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧",
    "⠋", "⠙", "⠹", "⠸", "⠼", "⠴"
  ]
};

let globalSpinner;

const getGlobalSpinner = (disableSpins = false) => {
  if (!globalSpinner) globalSpinner = new spin({ color: "blue", succeedColor: "yellow", spinner, disableSpins });
  return globalSpinner;
};

const spins = getGlobalSpinner(false);

const start = (id, text) => {
  spins.add(id, { text: text });
};

const info = (id, text) => {
  spins.update(id, { text: text });
};

const success = (id, text) => {
  spins.succeed(id, { text: text });
};

const close = (id, text) => {
  spins.fail(id, { text: text });
};

global.start = start
global.info = info
global.success = success
global.close = close

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})