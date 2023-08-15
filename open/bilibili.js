import { Crypto, load, _ } from './lib/cat.js';

let key = 'bilibili';
let url = '';
let siteKey = '';
let siteType = 0;

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

const cookie = {};

async function request(reqUrl, referer, mth, data, hd) {
    const headers = {
        'User-Agent': UA,
        Cookie: _.map(cookie, (value, key) => {
            return `${key}=${value}`;
        }).join(';'),
    };
    if (referer) headers.referer = encodeURIComponent(referer);
    let res = await req(reqUrl, {
        method: mth || 'get',
        headers: headers,
        data: data,
        postType: mth === 'post' ? 'form' : '',
    });
    return res.content;
}

// cfg = {skey: siteKey, ext: extend}
async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
    url = cfg.ext;
}

async function home(filter) {
    const api = url;
    const json = await request(api);
    return json.replaceAll('1$/$1', '1$/$0');
}

async function homeVod() {
    return '{}';
    //return await request(url + '?ids=recommend');
}

async function category(tid, pg, filter, extend) {
    if (pg <= 0) pg = 1;
    let api = url + '?t=' + tid + '&pg=' + pg;
    if (extend) {
        let data = Object.entries(extend).map( ([key, val] = entry) => {
          return '&' + key + '=' + val;
        })
        api += data;
        api += '&f=' + encodeURIComponent(JSON.stringify(extend));
    }
    return await request(api);
}

async function detail(id) {
    const api = url + '?ids=' + id;
    return await request(api);
}

async function play(flag, id, flags) {
    const api = url.replace('/bilibili', '/play') + '?bvid=' + id + '&from=open&flag=' + flag;
    const json = await request(api);
    const body = JSON.parse(json)
    if (body.dash) {
        const playHeaders = { Referer: 'https://www.bilibili.com', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' };
        const js2Base = await js2Proxy(true, siteType, siteKey, 'dash/', {});
        return JSON.stringify({
            parse: 0,
            url: js2Base + base64Encode(body.dash),
            header: playHeaders,
        });
    }
    return json;
}

async function search(wd, quick) {
    const api = url + '?wd=' + wd;
    return await request(api);
}

async function proxy(segments, headers) {
    let what = segments[0];
    let url = base64Decode(segments[1]);
    if (what == 'dash') {
        const ids = url.split('+');
        const aid = ids[0];
        const cid = ids[1];
        const str5 = ids[2];
        const urls = `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=${str5}&fnval=4048&fourk=1`;
        let videoList = '';
        let audioList = '';

        let resp = JSON.parse(await request(urls, getHeaders()));
        const dash = resp.data.dash;
        const video = dash.video;
        const audio = dash.audio;

        for (let i = 0; i < video.length; i++) {
            // if (i > 0) continue; // 只取一个
            const dashjson = video[i];
            if (dashjson.id == str5) {
                videoList += getDashMedia(dashjson);
            }
        }

        for (let i = 0; i < audio.length; i++) {
            // if (i > 0) continue;
            const ajson = audio[i];
            for (const key in vod_audio_id) {
                if (ajson.id == key) {
                    audioList += getDashMedia(ajson);
                }
            }
        }

        let mpd = getDash(resp, videoList, audioList);
        return JSON.stringify({
            code: 200,
            content: mpd,
            headers: {
                'Content-Type': 'application/dash+xml',
            },
        });
    }
    return JSON.stringify({
        code: 500,
        content: '',
    });
}

function getDashMedia(dash) {
    try {
        let qnid = dash.id;
        const codecid = dash.codecid;
        const media_codecs = dash.codecs;
        const media_bandwidth = dash.bandwidth;
        const media_startWithSAP = dash.startWithSap;
        const media_mimeType = dash.mimeType;
        const media_BaseURL = dash.baseUrl.replace(/&/g, '&amp;');
        const media_SegmentBase_indexRange = dash.SegmentBase.indexRange;
        const media_SegmentBase_Initialization = dash.SegmentBase.Initialization;
        const mediaType = media_mimeType.split('/')[0];
        let media_type_params = '';

        if (mediaType == 'video') {
            const media_frameRate = dash.frameRate;
            const media_sar = dash.sar;
            const media_width = dash.width;
            const media_height = dash.height;
            media_type_params = `height='${media_height}' width='${media_width}' frameRate='${media_frameRate}' sar='${media_sar}'`;
        } else if (mediaType == 'audio') {
            for (const key in vod_audio_id) {
                if (qnid == key) {
                    const audioSamplingRate = vod_audio_id[key];
                    media_type_params = `numChannels='2' sampleRate='${audioSamplingRate}'`;
                }
            }
        }
        qnid += '_' + codecid;

        return `<AdaptationSet lang="chi">
        <ContentComponent contentType="${mediaType}"/>
        <Representation id="${qnid}" bandwidth="${media_bandwidth}" codecs="${media_codecs}" mimeType="${media_mimeType}" ${media_type_params} startWithSAP="${media_startWithSAP}">
          <BaseURL>${media_BaseURL}</BaseURL>
          <SegmentBase indexRange="${media_SegmentBase_indexRange}">
            <Initialization range="${media_SegmentBase_Initialization}"/>
          </SegmentBase>
        </Representation>
      </AdaptationSet>`;
    } catch (e) {
        // Handle exceptions here
    }
}

function getDash(ja, videoList, audioList) {
    const duration = ja.data.dash.duration;
    const minBufferTime = ja.data.dash.minBufferTime;
    return `<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:mpeg:dash:schema:mpd:2011" xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd" type="static" mediaPresentationDuration="PT${duration}S" minBufferTime="PT${minBufferTime}S" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011">
      <Period duration="PT${duration}S" start="PT0S">
        ${videoList}
        ${audioList}
      </Period>
    </MPD>`;
}

function base64Encode(text) {
    return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(text));
}

function base64Decode(text) {
    return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(text));
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        proxy: proxy,
        search: search,
    };
}
