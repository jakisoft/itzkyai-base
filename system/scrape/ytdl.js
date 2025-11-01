const axios = require("axios");

async function fetchFormat(url, type, maxRetries = 5) {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            const downloadResponse = await axios.get(
                `https://p.oceansaver.in/ajax/download.php?copyright=0&format=${type}&url=${url}&api=30de256ad09118bd6b60a13de631ae2cea6e5f9d`
            );

            if (!downloadResponse.data.id) {
                throw new Error(`Gagal mendapatkan ID untuk format ${type}`);
            }

            let processResponse;
            for (let i = 0; i < 10; i++) {
                processResponse = await axios.get(
                    `https://p.oceansaver.in/ajax/progress.php?id=${downloadResponse.data.id}`,
                    {
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
                            Referer: "https://loader.fo/en/",
                        },
                    }
                );

                if (processResponse.data.download_url) {
                    return processResponse.data.download_url;
                }

                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.warn(`Percobaan ${attempts + 1} gagal untuk ${type}, mencoba lagi...`);
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return null;
}

async function ytdl(url) {
    let mp3 = null;
    let mp4 = null;

    for (let i = 0; i < 5; i++) {
        mp3 = await fetchFormat(url, "mp3");
        if (mp3) break;
        console.warn(`Percobaan ${i + 1} mendapatkan MP3 gagal, mencoba lagi...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    for (let i = 0; i < 5; i++) {
        mp4 = await fetchFormat(url, "720");
        if (mp4) break;
        console.warn(`Percobaan ${i + 1} mendapatkan MP4 gagal, mencoba lagi...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!mp3 || !mp4) {
        return { error: "Gagal mendapatkan link MP3 dan/atau MP4 setelah beberapa percobaan." };
    }

    try {
        const metadataResponse = await axios.get(
            `https://p.oceansaver.in/ajax/download.php?copyright=0&format=mp3&url=${url}&api=30de256ad09118bd6b60a13de631ae2cea6e5f9d`
        );

        return {
            title: metadataResponse.data.title || "Tidak diketahui",
            image: metadataResponse.data.info?.image || null,
            url: {
                mp3,
                mp4,
            },
        };
    } catch (error) {
        return { error: error.message };
    }
}

async function ytmp3(url) {
    try {
        const mp3 = await fetchFormat(url, "mp3");
        if (!mp3) {
            return { error: "Gagal mendapatkan link MP3." };
        }

        const metadataResponse = await axios.get(
            `https://p.oceansaver.in/ajax/download.php?copyright=0&format=mp3&url=${url}&api=30de256ad09118bd6b60a13de631ae2cea6e5f9d`
        );

        return {
            title: metadataResponse.data.title || "Tidak diketahui",
            image: metadataResponse.data.info?.image || null,
            url: { mp3 },
        };
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = { ytdl, ytmp3 }