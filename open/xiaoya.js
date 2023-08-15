import { Crypto, load, _ } from './lib/cat.js';

let key = 'xiaoya-tv';
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
    const part = id.split('$')
    const api = url + '?ids=' + part[0] + '$' + part[1];
    return await request(api);
}

async function play(flag, id, flags) {
    const api = url.replace('/vod1', '/play') + '?id=' + id + '&from=open';
    return await request(api);
}

async function search(wd, quick) {
    const api = url + '?wd=' + wd;
    return await request(api);
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        search: search,
    };
}
