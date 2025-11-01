const axios = require('axios');
const cheerio = require('cheerio');
const formData = require('form-data')
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function tiktoks(query) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios({
        method: 'POST',
        url: 'https://tikwm.com/api/feed/search',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': 'current_language=en',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
        },
        data: {
          keywords: query,
          count: 10,
          cursor: 0,
          HD: 1
        }
      });
      const videos = response.data.data.videos;
      if (videos.length === 0) {
        reject("Tidak ada video ditemukan.");
      } else {
        const gywee = Math.floor(Math.random() * videos.length);
        const videorndm = videos[gywee]; 

        const result = {
          title: videorndm.title,
          cover: videorndm.cover,
          origin_cover: videorndm.origin_cover,
          no_watermark: videorndm.play,
          watermark: videorndm.wmplay,
          music: videorndm.music
        };
        resolve(result);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function tiktok(url) {
  return new Promise(async (resolve) => {
  try{
  function formatNumber(integer) {
  let numb = parseInt(integer)
  return Number(numb).toLocaleString().replace(/,/g, '.')
  }
  function formatDate(n, locale = 'en') {
  let d = new Date(n)
  return d.toLocaleDateString(locale, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
  })
  }
  let domain = 'https://www.tikwm.com/api/';
  let res = await (await axios.post(domain, {}, {
  headers: {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Origin': 'https://www.tikwm.com',
  'Referer': 'https://www.tikwm.com/',
  'Sec-Ch-Ua': '"Not)A;Brand" ;v="24" , "Chromium" ;v="116"',
  'Sec-Ch-Ua-Mobile': '?1',
  'Sec-Ch-Ua-Platform': 'Android',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest'
  },
  params: {
  url: url,
  count: 12,
  cursor: 0,
  web: 1,
  hd: 1
  }
  })).data.data
  if (!res.play) return resolve({
  status: false
  })
  let data = []
  if (!res.size) {
  res.images.map(v => {
  data.push({ type: 'photo', url: v })
  })
  } else {
  data.push({
  type: 'nowatermark',
  url: 'https://www.tikwm.com' + res.play,
  }, {
  type: 'nowatermark_hd',
  url: 'https://www.tikwm.com' + res.hdplay
  })
  }
  let json = {
  status: true,
  title: res.title,
  taken_at: formatDate(res.create_time).replace('1970', ''),
  region: res.region,
  id: res.id,
  durations: res.duration,
  duration: res.duration + ' Seconds',
  cover: 'https://www.tikwm.com' + res.cover,
  size_nowm: res.size,
  size_nowm_hd: res.hd_size,
  data: data,
  music_info: {
  id: res.music_info.id,
  title: res.music_info.title,
  author: res.music_info.author,
  album: res.music_info.album ? res.music_info.album : 'Unknown',
  url: 'https://www.tikwm.com' + res.music || res.music_info.play
  },
  stats: {
  views: formatNumber(res.play_count),
  likes: formatNumber(res.digg_count),
  comment: formatNumber(res.comment_count),
  share: formatNumber(res.share_count),
  download: formatNumber(res.download_count)
  },
  author: {
  id: res.author.id,
  fullname: res.author.unique_id,
  nickname: res.author.nickname,
  avatar: 'https://www.tikwm.com' + res.author.avatar
  }
  }
  return resolve(json)
  } catch (e) {
  console.log(e)
  return resolve({
  status: false,
  msg: e.message
  })
  }
  })
  }


async function ttslide(url) {
    try {
        const res = await axios({
            method: 'POST',
            url: 'https://tikvideo.app/api/ajaxSearch',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            },
            data: {
                "q": url,
                "lang": "id"
            }
        });
        var result = [];
        if (res.data.status === 'ok') {
            let $ = cheerio.load(res.data.data);
            $('img').each((index, element) => {
                const a = $(element).attr('src');
                if (!a.includes('.webp')) {
                    result.push(a);
                }
            });
        }
        if (result.length > 0) {
            return result;
        } else {
            return null;
        }
    } catch (e) {
        console.error(e);
        return null;
    }
}

async function cobalt(config) {
  try {
    return await new Promise(async(resolve, reject) => {
      if(!(typeof config === "object")) return reject("invalid config input, config must be json object!")
      config = {
        url: config?.url || null,
        videoQuality: config?.videoQuality || "720",
        audioFormat: config?.audioFormat || "mp3",
        audioBitrate: config?.audioBitrate || "128",
        filenameStyle: config?.filenameStyle || "classic",
        downloadMode: config?.downloadMode || "auto",
        youtubeVideoCodec: config?.youtubeVideoCodec || "h264",
        youtubeDubLang: config?.youtubeDubLang || "en",
        alwaysProxy: config?.alwaysProxy || false,
        disableMetadata: config?.disableMetadata || false,
        tiktokFullAudio: config?.tiktokFullAudio || true, 
        tiktokH265: config?.tiktokH265 || true,
        twitterGif: config?.twitterGif || true,
        youtubeHLS: config?.youtubeHLS || false
      }
      if(!config.url) return reject("missing url input!");
      axios.post("https://co.eepy.today/", config, {
        headers: {
          accept: "application/json",
          contentType: "application/json"
        }
      }).then(res => {
        const data = res.data
        if(data.status === "error") return reject("failed fetch content");
        resolve({
          success: true,
          result: data
        })
      }).catch(e => {
        if(e?.response?.data) return reject(e.response.data.error)
        else return reject(e)
      })
    })
  } catch (e) {
    return {
      success: false,
      errors: e
    }
  }
}

async function ytmp3(url) {
  const result = await cobalt({
    url: url,
    downloadMode: 'audio',
    audioFormat: 'mp3',
    audioBitrate: '128'
  })
  
  return result.result
};

async function ytmp4(url) {
  const result = await cobalt({
    url: url,
    videoQuality: '720',
    audioFormat: 'mp3',
    youtubeVideoCodec: 'h264',
    youtubeDubLang: 'en',
    youtubeHLS: false
  })
  
  return result.result
};

function spotifydl(url) {
  return new Promise((resolve, reject) => {
    const metadataUrl = `https://spotify-down.com/api/metadata?link=${encodeURIComponent(url)}`;
    axios.post(metadataUrl, null, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://spotify-down.com/'
      }
    })
    .then(response => {
      const data = response.data.data;
      if (!data) {
        return reject(new Error('Metadata not found'));
      }
      const downloadUrl = `https://spotify-down.com/api/download?link=${encodeURIComponent(data.link)}&n=${encodeURIComponent(data.title)}&a=${encodeURIComponent(data.artists)}`;
      axios.get(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://spotify-down.com/'
        }
      })
        .then(downloadResponse => {
          const downloadData = downloadResponse.data.data;
          if (!downloadData || !downloadData.success || !downloadData.link) {
            return reject(new Error('Download link not found'));
          }
          resolve({ metadata: data, downloadLink: downloadData.link });
        })
        .catch(reject);
    })
    .catch(reject);
  });
}

async function igdl(url) {
    const options = {
        method: 'POST',
        url: 'https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink',
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': '6a9259358bmshba34d148ba324e8p12ca27jsne16ce200ce10',
            'X-RapidAPI-Host': 'social-download-all-in-one.p.rapidapi.com'
        },
        data: {
            url: url
        }
    };
    try {
        const response = await axios.request(options);
     
        return response.data
    } catch (error) {
        return error
    }
}


module.exports = { tiktok, tiktoks, ttslide, cobalt, ytmp4, ytmp3, spotifydl, igdl } 

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})