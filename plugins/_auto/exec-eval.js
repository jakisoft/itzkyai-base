const { exec } = require('child_process');
const util = require('util');

module.exports = async (m, { kiicode }) => {
    const sender = m.sender;
    const budy = typeof m.text === 'string' ? m.text : '';
    const owner = global.owner;
    const isOwner = [`${owner}@s.whatsapp.net`] == sender ? true : [`${owner}@s.whatsapp.net`].includes(sender);

    if (!isOwner) return;

    if (budy.startsWith('<')) {
        const text = budy.slice(1).trim();
        if (!text) return;
        try {
            let evaled = await eval(text);
            if (typeof evaled !== 'string') evaled = util.inspect(evaled);
            m.reply(evaled);
        } catch (err) {
            m.reply(String(err));
        }
        return;
    }

    if (budy.startsWith('$')) {
        exec(budy.slice(1), (err, stdout) => {
            if (err) return m.reply(`${err}`);
            if (stdout) return m.reply(stdout);
        });
    }
};