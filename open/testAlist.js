import { __jsEvalReturn } from './alist_open.js';

var spider = __jsEvalReturn();

async function test() {
    await spider.init({
        skey: 'siteKey',
        ext: [
            {
                name: '🙋丫仙女',
                server: 'http://192.168.50.60:5344',
                startPage: '/',
                showAll: false,
                search: true,
                headers: {
                    Authorization: 'alist-4945272b-658f-4be7-a20e-98af1c2be973kAUC1tcZ7EsJi4PyovGRwPVReLto0XxKA4QXfciAR4W4G0XwqWRLr1euFY9W2NnE',
                },
                params: {
                    '/abc': {
                        password: '123',
                    },
                    '/abc/abc': {
                        password: '123',
                    },
                },
            },
            {
                name: '🐋一只鱼',
                server: 'https://alist.youte.ml',
            },
            {
                name: '🌊七米蓝',
                server: 'https://al.chirmyram.com',
            },
            {
                name: '🐉神族九帝',
                server: 'https://alist.shenzjd.com',
            },
            {
                name: '☃️姬路白雪',
                server: 'https://pan.jlbx.xyz',
            },
            {
                name: '✨星梦',
                server: 'https://pan.bashroot.top',
            },
            {
                name: '💢repl',
                server: 'https://ali.liucn.repl.co',
            },
            {
                name: '💦讯维云盘',
                server: 'https://pan.xwbeta.com',
            },
        ],
    });

    var files = JSON.parse(await spider.dir('/'));
    console.log(files);

    files = JSON.parse(await spider.dir(files.list[0].path));
    console.log(files);

    files = JSON.parse(await spider.dir('/🙋丫仙女/每日更新/电视剧/国产剧/家有姐妹/'));
    console.log(files);

    var fileInfo = JSON.parse(await spider.file('/🙋丫仙女/每日更新/电视剧/国产剧/家有姐妹/01.mp4'));
    console.log(fileInfo);

}

export { test };
