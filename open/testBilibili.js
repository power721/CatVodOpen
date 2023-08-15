import { __jsEvalReturn } from './bilibili.js';

var spider = __jsEvalReturn();

async function test() {
    var spType = null;
    var spVid = null;
    //spType = '1$/每日更新$0';
    // spVid = '95873';

    await spider.init({ skey: 'bilibili', ext: "https://tv.har01d.cn/bilibili/Harold" });
    var classes = JSON.parse(await spider.home(true));
    console.log('home', classes);
    var homeVod = JSON.parse(await spider.homeVod());
    console.log('homeVod', homeVod);
    if (classes.class && classes.class.length > 0) {
        var page = JSON.parse(await spider.category(spType || classes.class[0].type_id, 0, true, {}));
        console.log('category', page);
        if (page.list && page.list.length > 0) {
            for (const k in page.list) {
                if (k > 1) break;
                var detail = JSON.parse(await spider.detail(spVid || page.list[k].vod_id));
                console.log('detail result', detail);
                if (detail.list && detail.list.length > 0) {
                    var pFlag = detail.list[0].vod_play_from.split('$$$');
                    var pUrls = detail.list[0].vod_play_url.split('$$$');
                    console.log('flag and urls', pFlag, pUrls)
                    if (pFlag.length > 0 && pUrls.length > 0) {
                        for (const i in pFlag) {
                            var flag = pFlag[i];
                            var urls = pUrls[i].split('#');
                            if (urls.length > 0) {
                                var url = urls[0].split('$')[1];
                                console.log(flag, url);
                                var playUrl = await spider.play(flag, url, []);
                                console.log('playUrl', playUrl);
                            }
                        }
                    }
                }
                if (spVid) break;
            }
        }
    }
    // var search = JSON.parse(await spider.search('奥特曼'));
    // console.log('search', search);

    // search = JSON.parse(await spider.search('喜欢'));
    // console.log(search);
}

export { test };