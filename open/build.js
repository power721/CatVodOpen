import fs from 'node:fs';
import path from 'path';
import {zip} from 'zip-a-folder';
import uglifyjs from 'uglify-js';

const copySpider = ['app', 'xiaoya', 'bilibili', 'bili_open', 'kunyu77_open', 'czzy_open', 'czzy2_open',
    'czzy3_open', 'duboku2_open', 'subaibai_open', 'ikanbot_open', 'kkys_open', 'duboku_open', 'alist_open',
    'nivod_op', 'wogg', 'xiaoya_open', '230ts_open', 'kuqimv_open', 'boosj_open', 'ubestkid_open', 'cntv_open',
    'tuxiaobei_open', 'dj0898_open', 'zxzj_open', 'libvio_open', 'ng_open', 'sharenice_open', 'bookan_open'];

const root = process.cwd();

const src = path.join(root);
const out = path.join(root, 'dist');

function minify(s, d) {
    let jsContent = fs.readFileSync(s).toString();
    jsContent = jsContent.replace('./lib/cat.js', 'assets://js/lib/cat.js');
    jsContent = jsContent.replace('./cat.js', 'assets://js/lib/cat.js');
    jsContent = uglifyjs.minify(jsContent, {
        mangle: false,
    });
    fs.writeFileSync(d, jsContent.code);
}

function listAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + '/' + file).isDirectory()) {
            arrayOfFiles = listAllFiles(dirPath + '/' + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, '/', file));
        }
    });

    return arrayOfFiles;
}

function src2Out() {
    if (fs.existsSync(out)) fs.rmSync(out, {recursive: true, force: true});

    fs.mkdirSync(out, {recursive: true});
    const libSrc = path.join(src, 'lib');
    const libOut = path.join(out, 'lib');
    fs.mkdirSync(libOut, {recursive: true});
    const libs = listAllFiles(libSrc);
    for (let index = 0; index < libs.length; index++) {
        const element = libs[index];
        const relative = path.relative(libSrc, element);
        minify(element, path.join(libOut, relative));
    }

    for (const sp of copySpider) {
        minify(path.join(src, sp + '.js'), path.join(out, sp + '.js'));
    }
}

src2Out();

fs.copyFileSync(path.join(src, 'config_open.json'), path.join(out, 'config_open.json'));

await zip('dist', 'cat_open.zip');

console.log('build done');
