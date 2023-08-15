import { sortListByCN } from "./sortName.js";
import { pdfa, pdfh } from "./pdf.js";
import { _ } from './lib/cat.js';
import { findBestLCS } from './lib/similarity.js';

String.prototype.rstrip = function(chars) {
    let regex = new RegExp(chars + "$");
    return this.replace(regex, "")
};


let key = 'xiaoya';
let url = 'https://xy.omii.link/';
let device = {};
let siteKey = '';
let siteType = 0;

var showMode = "single";
var searchDriver = "";
var limit_search_show = 200;
var search_type = "";
var detail_order = "name";
const request_timeout = 5000;
const VERSION = "xiaoya_open v2/v3 20230721";

function print(any) {
//    any = any || "";
//    if (typeof any == "object" && Object.keys(any).length > 0) {
//        try {
//            any = JSON.stringify(any);
//            /console.log(any)
//        } catch (e) {
//            console.log(typeof any + ":" + any.length)
//        }
//    } else if (typeof any == "object" && Object.keys(any).length < 1) {
//        console.log("null object")
//    } else {
//        console.log(any)
//    }
}

const http = async function(url, options = {}) {
    if (options.method === "POST" && options.data) {
        options.body = JSON.stringify(options.data);
        options.headers = Object.assign({
            "content-type": "application/json"
        }, options.headers);
        options.headers = Object.assign({
            'Authorization': 'alist-09ceb38a-f143-47f7-b255-c3eec819cd7b0lSmqjgBRIMJakAkbJIE2KzO6h2CUVBuEkqrLiA5cJJzOzYxJtCTIGBXXnhrg7Av'
        }, options.headers);
    }
    options.timeout = request_timeout;
    try {
        const res = await req(url, options);
        res.json = () => res && res.content ? JSON.parse(res.content) : null;
        res.text = () => res && res.content ? res.content : "";
        return res
    } catch (e) {
        return {
            json() {
                return null
            },
            text() {
                return ""
            }
        }
    }
};
["get", "post"].forEach(method => {
    http[method] = function(url, options = {}) {
        return http(url, Object.assign(options, {
            method: method.toUpperCase()
        }))
    }
});
const __drives = {};
const __subtitle_cache = {};

function isMedia(file) {
    return /\.(dff|dsf|mp3|aac|wav|wma|cda|flac|m4a|mid|mka|mp2|mpa|mpc|ape|ofr|ogg|ra|wv|tta|ac3|dts|tak|webm|wmv|mpeg|mov|ram|swf|mp4|avi|rm|rmvb|flv|mpg|mkv|m3u8|ts|3gp|asf)$/.test(file.toLowerCase())
}


//  tid = 'drivename$path'
async function get_drives_path(tid) {
    const index = tid.indexOf("$");
    const name = tid.substring(0, index);
    const path = tid.substring(index + 1);
    return {
        drives: await get_drives(name),
        path: path
    }
}

//  根据 drviename 获取相应alist的配置信息
async function get_drives(name) {
    const {
        settings,
        api,
        server
    } = __drives[name];
    if (settings.v3 == null) {
        settings.v3 = false;
        const data = (await http.get(server + "/api/public/settings")).json().data;
        if (Array.isArray(data)) {
            settings.title = data.find(x => x.key === "title")?.value;
            settings.v3 = false;
            settings.version = data.find(x => x.key === "version")?.value;
            settings.enableSearch = data.find(x => x.key === "enable search")?.value === "true"
        } else {
            settings.title = data.title;
            settings.v3 = true;
            settings.version = data.version;
            settings.enableSearch = false
        }
        api.path = settings.v3 ? "/api/fs/list" : "/api/public/path";
        api.file = settings.v3 ? "/api/fs/get" : "/api/public/path";
        api.search = settings.v3 ? "/api/public/search" : "/api/public/search";
        api.other = settings.v3 ? '/api/fs/other' : null;
    }
    return __drives[name]
}

async function init(cfg) {
    console.log("当前版本号:" + VERSION);
    let data;
    var ext = url + "/tvbox/json/alist_open.json";
    if (typeof ext == "object") {
        data = ext;
        print("alist ext:object")
    } else if (typeof ext == "string") {
        if (ext.startsWith("http")) {
            let alist_data = ext.split(";");
            let alist_data_url = alist_data[0];
            limit_search_show = alist_data.length > 1 ? Number(alist_data[1]) || limit_search_show : limit_search_show;
            search_type = alist_data.length > 2 ? alist_data[2] : search_type;
            print(alist_data_url);
            data = (await http.get(alist_data_url)).json();
        } else {
            print("alist ext:json string");
            data = JSON.parse(ext)
        }
    }
    let drives = [];
    if (Array.isArray(data) && data.length > 0 && data[0].hasOwnProperty("server") && data[0].hasOwnProperty("name")) {
        drives = data
    } else if (!Array.isArray(data) && data.hasOwnProperty("drives") && Array.isArray(data.drives)) {
        drives = data.drives.filter(it => it.type && it.type === "alist" || !it.type)
    }
    print(drives);
    searchDriver = (drives.find(x => x.search) || {}).name || "";
    if (!searchDriver && drives.length > 0) {
        searchDriver = drives[0].name
    }
    print(searchDriver);
    drives.forEach(item => {
        let _path_param = [];
        if (item.params) {
            _path_param = Object.keys(item.params);
            _path_param.sort((a, b) => a.length - b.length)
        }
        __drives[item.name] = {
            name: item.name,
            server: item.server.endsWith("/") ? item.server.rstrip("/") : item.server,
            startPage: item.startPage || "/",
            showAll: item.showAll === true,
            search: !!item.search,
            params: item.params || {},
            _path_param: _path_param,
            settings: {},
            api: {},
            getParams(path) {
                const key = this._path_param.find(x => path.startsWith(x));
                return Object.assign({}, this.params[key], {
                    path: path
                })
            },
            async getPath(path) {  //get path files
                const res = (await http.post(this.server + this.api.path, {
                    data: this.getParams(path)
                })).json();
                return this.settings.v3 ? res.data.content : res.data.files
            },
            async getFile(path) {  // path is pathfile
                const res = (await http.post(this.server + this.api.file, { data: this.getParams(path) })).json();
                const data = this.settings.v3 ? res.data : res.data.files[0];
                if (!this.settings.v3) data.raw_url = data.url; //v2 的url和v3不一样
                return data;
            },
            async getOther(method, path) {
                const data = this.getParams(path);
                data.method = method;
                const res = (await http.post(this.server + this.api.other, { data: data })).json();
                return res;
            },
            isFolder(data) {
                return data.type === 1
            },
            isVideo(data) {
                return this.settings.v3 ? data.type === 2 || data.type === 0 || data.type === 3 : data.type === 3 || data.type === 0 || data.type === 4
            },
            isSubtitle(data) {
                if (data.type == 1) return false;
                const ext = ['.srt', '.ass', '.scc', '.stl', '.ttml'];
                return ext.some((x) => data.name.endsWith(x));
            },
            getType(data) {
                const isVideo = this.isVideo(data);
                return this.isFolder(data) ? 0 : isVideo ? 10 : 1;
            },
            getPic(data) {
                let pic = this.settings.v3 ? data.thumb : data.thumbnail;
                return pic || (this.isFolder(data) ? "http://img1.3png.com/281e284a670865a71d91515866552b5f172b.png" : "")
            },
            getSize(data) {
                let sz = data.size || 0;
                if (sz <= 0) return '';
                let filesize = '';
                if (sz > 1024 * 1024 * 1024 * 1024.0) {
                    sz /= 1024 * 1024 * 1024 * 1024.0;
                    filesize = 'TB';
                } else if (sz > 1024 * 1024 * 1024.0) {
                    sz /= 1024 * 1024 * 1024.0;
                    filesize = 'GB';
                } else if (sz > 1024 * 1024.0) {
                    sz /= 1024 * 1024.0;
                    filesize = 'MB';
                } else {
                    sz /= 1024.0;
                    filesize = 'KB';
                }
                return sz.toFixed(2) + filesize;
            },
            getRemark(data) {
                return '';
            },
            getTime(data, isStandard) {
                isStandard = isStandard || false;
                try {
                    let tTime = data.updated_at || data.time_str || data.modified || "";
                    let date = "";
                    if (tTime) {
                        tTime = tTime.split("T");
                        date = tTime[0];
                        if (isStandard) {
                            date = date.replace(/-/g, "/")
                        }
                        tTime = tTime[1].split(/Z|\./);
                        date += " " + tTime[0]
                    }
                    return date
                } catch (e) {
                    return ""
                }
            }
        }
    });
    print("init执行完毕")
}

function home(filter) {
    let classes = Object.keys(__drives).map(key => ({
        type_id: `${key}$${__drives[key].startPage}`,
        type_name: key,
        type_flag: "1"
    }));
    let filter_dict = {};
    let filters = [{
        key: "order",
        name: "排序",
        value: [{
            n: "名称⬆️",
            v: "vod_name_asc"
        }, {
            n: "名称⬇️",
            v: "vod_name_desc"
        }, {
            n: "中英⬆️",
            v: "vod_cn_asc"
        }, {
            n: "中英⬇️",
            v: "vod_cn_desc"
        }, {
            n: "时间⬆️",
            v: "vod_time_asc"
        }, {
            n: "时间⬇️",
            v: "vod_time_desc"
        }, {
            n: "大小⬆️",
            v: "vod_size_asc"
        }, {
            n: "大小⬇️",
            v: "vod_size_desc"
        }, {
            n: "无",
            v: "none"
        }]
    }, {
        key: "show",
        name: "播放展示",
        value: [{
            n: "单集",
            v: "single"
        }, {
            n: "全集",
            v: "all"
        }]
    }];
    classes.forEach(it => {
        filter_dict[it.type_id] = filters
    });
    print("----home----");
    print(classes);
    return JSON.stringify({
        class: classes,
        filters: filter_dict
    })
}

async function homeVod(params) {
    let driver = __drives[searchDriver];
    print(driver);
    let surl = driver.server + "/sou?filter=last&num=50&type=video";
    print("搜索链接:" + surl);
    let html = (await http.get(surl)).text();
    let lists = [];
    try {
        lists = pdfa(html, "div&&ul&&a")
    } catch (e) {}
    print(`搜索结果数:${lists.length},搜索结果显示数量限制:${limit_search_show}`);
    let vods = [];
    let excludeReg = /\.(pdf|epub|mobi|txt|doc|lrc)$/;
    let cnt = 0;
    lists.forEach(it => {
        let vhref = pdfh(it, "a&&href");
        if (vhref) {
            vhref = unescape(vhref)
        }
        if (excludeReg.test(vhref)) {
            return
        }
        const parts = vhref.split('#')
        if (parts.length >= 2) {
            vhref = parts[0]
        }		
        if (cnt < limit_search_show) {
            print(vhref)
        }
        cnt++;
        let vid = searchDriver + "$" + vhref + "#search#";
        if (showMode === "all") {
            vid += "#all#"
        }

        let have_pic = 0;
        let poster = '';
        let douban_rate = '';
	    let display_path = '';
        if (parts.length === 5) {                         
	    let uri_parts = parts[4].split('://')
	    poster = url + "/image/" + uri_parts[1];
                have_pic = 1;
         }
        if (parts.length >= 4) {                                   
                douban_rate = parts[3] ;
         }	    	
        if (parts.length < 2) {
	    let path_list = parts[0].split('/');
                display_path = path_list[path_list.length - 2] + '/' + path_list[path_list.length - 1];
         }
        vods.push({
            //vod_name: pdfh(it, "a&&Text"),
            vod_id: vid,
	        vod_name: parts.length <2 ? display_path :parts[1],
            vod_tag: isMedia(vhref) ? "file" : "folder",
    	    vod_pic: have_pic ? poster : "http://img.xiaoya.pro/xiaoya.jpg",
    	    vod_remarks: douban_rate == '' ? "" : "豆瓣:" + douban_rate
        })
    });
    return JSON.stringify({
        list: vods
    })
}

async function subcategory(tid) {
    let orid = tid.replace(/#all#|#search#/g, "");
    let {
        drives,
        path
    } = await get_drives_path(orid);
    
    const id = orid.endsWith("/") ? orid : orid + "/";
    const list = await drives.getPath(path);
    let subList = [];
    let vodFiles = [];
    let allList = [];
   
    
    for (const k in list) {
        var item = list[k];
        if (drives.isSubtitle(item)) {
            subList.push(item.name)
        }
        if (!drives.showAll && !drives.isFolder(item) && !(drives.isVideo(item) && isMedia(item.name))) {
            continue;
        }
        let vod_time = drives.getTime(item);
        let vod_size = get_size(item.size);
        let remark = vod_time.split(" ")[0].substr(2) + "\t" + vod_size;
        let vod_id = id + item.name + (drives.isFolder(item) ? "/" : "");
        if (showMode === "all") {
            vod_id += "#all#"
        }
        print(vod_id);
        const vod = {
            vod_id: vod_id,
            vod_name: item.name.replaceAll("$", "").replaceAll("#", ""),
            vod_pic: drives.getPic(item),
            vod_time: vod_time,
            vod_size: item.size,
            vod_tag: drives.isFolder(item) ? "folder" : "file",
            vod_remarks: drives.isFolder(item) ? remark + " 文件夹" : remark
        };
        if (drives.isVideo(item) && isMedia(vod_id)) {
            vodFiles.push(vod);
            allList.push(vod);
        } else if (vod.vod_tag == "folder"){
//            const subcontent = await subcategory(x.vod_id);
//            const {
//                subAllList
//            } = JSON.parse(subcontent);
//            for (const j in subAllList){
//                var y = subAllList[j];
//                allList.push(y);
//            }
        }
    };
    if (subList.length > 0) {
        vodFiles.forEach((item) => {
            var sbust = findBestLCS(item.vod_name, subList);
            // __subtitle_cache[drivename$pathvideofile] = drivename$pathsubtitlefile
            if (sbust.bestMatch) __subtitle_cache[item.vod_id] = [id + sbust.bestMatch.target];
        });
    }

    return JSON.stringify({
        subAllList: allList
    })
}

// tid = drviename$path  pg=pagenumber   filter,  extend
async function category(tid, pg, filter, extend) {
    for (const k in __subtitle_cache) {
        delete __subtitle_cache[k];
    }
    let isSearch = tid.includes("#search#");
    let isAll = tid.includes("#all#");
    let orid = tid.replace(/#all#|#search#/g, "");
    const id = orid.endsWith("/") ? orid : orid + "/";
    let allList = [];
    let subList = [];
    let vodFiles = [];
    let fl = filter ? extend : {};
    if (fl.show) {
        showMode = fl.show
    }
 
    let {
        drives,
        path
    } = await get_drives_path(orid);
    
    if(path=="/"){
        const homevod = await homeVod(null);
        const {
            list
        } = JSON.parse(homevod);
        allList = list;
    } else {
        const list = await drives.getPath(path);
        list.forEach(item => {
            if (drives.isSubtitle(item)) {
                subList.push(item.name)
            }
            if (!drives.showAll && !drives.isFolder(item) && !(drives.isVideo(item) && isMedia(item.name))) {
                return
            }
            let vod_time = drives.getTime(item);
            let vod_size = get_size(item.size);
            let remark = vod_time.split(" ")[0].substr(2) + "\t" + vod_size;
            let vod_id = id + item.name + (drives.isFolder(item) ? "/" : "");
            if (showMode === "all") {
                vod_id += "#all#"
            }
            print(vod_id);
            const vod = {
            vod_id: vod_id,
            vod_name: item.name.replaceAll("$", "").replaceAll("#", ""),
            vod_pic: drives.getPic(item),
            vod_time: vod_time,
            vod_size: item.size,
            vod_tag: drives.isFolder(item) ? "folder" : "file",
            vod_remarks: drives.isFolder(item) ? remark + " 文件夹" : remark
            };
            if (drives.isVideo(item) && isMedia(vod_id)) {
                vodFiles.push(vod)
            }
            allList.push(vod)
        });
        if (subList.length > 0) {
            vodFiles.forEach((item) => {
                var sbust = findBestLCS(item.vod_name, subList);
                // __subtitle_cache[drivename$pathvideofile] = drivename$pathsubtitlefile
                if (sbust.bestMatch) __subtitle_cache[item.vod_id] = [id + sbust.bestMatch.target];
            });
        }
    }

    if (fl.order) {
        let key = fl.order.split("_").slice(0, -1).join("_");
        let order = fl.order.split("_").slice(-1)[0];
        print(`排序key:${key},排序order:${order}`);
        if (key.includes("name")) {
            detail_order = "name";
            allList = sortListByName(allList, key, order)
        } else if (key.includes("cn")) {
            detail_order = "cn";
            allList = sortListByCN(allList, "vod_name", order)
        } else if (key.includes("time")) {
            detail_order = "time";
            allList = sortListByTime(allList, key, order)
        } else if (key.includes("size")) {
            detail_order = "size";
            allList = sortListBySize(allList, key, order)
        } else if (fl.order.includes("none")) {
            detail_order = "none";
            print("不排序")
        }
    } else {
        if (detail_order !== "none") {
            allList = sortListByName(allList, "vod_name", "asc")
        }
    }
    if (pg && vodFiles.length > 1) {
        const vod = {
            vod_id: id + "~playlist",
            vod_name: "播放列表",
            vod_pic: "http://img1.3png.com/3063ad894f04619af7270df68a124f129c8f.png",
            vod_tag: "file",
            vod_remarks: "共" + vodFiles.length + "集"
        };
        allList.unshift(vod)
    }
    print("----category----" + `tid:${tid},detail_order:${detail_order},showMode:${showMode}`);
    return JSON.stringify({
        parent: id,
        page: 1,
        pagecount: 1,
        limit: allList.length,
        total: allList.length,
        list: allList
    })
}

// otid = tid#all#search#   tid = drivename$path, drives, path
async function getAll(otid, tid, drives, path) {
    try {
        let isSearch = otid.includes("#search#");
        let isAll = otid.includes("#all#");
        const content = await category(otid, null, false, null);
        const isFile = isMedia(otid.replace(/#all#|#search#/g, "").split("@@@")[0]);
        const {
            list
        } = JSON.parse(content);
        let vod_play_url = [];
        
        for (const k in list){
            var x = list[k];
            if (x.vod_tag === "file") {
                let vid = x.vod_id.replace(/#all#|#search#/g, "");
                vod_play_url.push(`${x.vod_name}$${vid.substring(vid.indexOf("$")+1)}`)
            } else {
                const subcontent = await subcategory(x.vod_id);
                const {
                    subAllList
                } = JSON.parse(subcontent);
                for (const j in subAllList){
                    var y = subAllList[j];
                    if (y.vod_tag === "file") {
                        let vid = y.vod_id.replace(/#all#|#search#/g, "");
                        vod_play_url.push(`${y.vod_name}$${vid.substring(vid.indexOf("$")+1)}`)
                    }
                }
            }
        }
        
        const pl = path.split("/").filter(it => it);
        let vod_name = pl[pl.length - 1] || drives.name;
        if (vod_name === drives.name) {
            print(pl)
        }
        if (otid.includes("#search#")) {
            vod_name += "[搜]"
        }
        let vod = {
            vod_id: otid,
            vod_name: vod_name,
            type_name: "文件夹",
            vod_pic: "https://avatars.githubusercontent.com/u/97389433?s=120&v=4",
            vod_content: tid,
            vod_tag: "folder",
            vod_play_from: drives.name,
            vod_play_url: vod_play_url.join("#"),
            vod_remarks: drives.settings.title
        };
        print("----detail1----");
        print(vod);
        return JSON.stringify({
            list: [vod]
        })
    } catch (e) {
        print(e.message);
        return JSON.stringify({
            list: [{}]
        })
    }
}

async function playlist(otid, tid, drives, path) {
    tid = tid.replace('/~playlist', '')
    otid = otid.replace('/~playlist', '')
    path = path.replace('/~playlist', '')
    return await getAll(otid, tid, drives, path)
}

// tid = 'drviename$path‘  or 'drviename$pathvideofile'
async function detail(tid) {
    let isSearch = tid.includes("#search#");
    let isAll = tid.includes("#all#");
    let otid = tid;
    tid = tid.replace(/#all#|#search#/g, "");
    let isFile = isMedia(tid.split("@@@")[0]);
    print(`isFile:${tid}?${isFile}`);
    let {
        drives,
        path
    } = await get_drives_path(tid);
    print(`drives:${drives},path:${path}`);
    if (path.endsWith("/")) {
        return getAll(otid, tid, drives, path)
    } else if (path.endsWith("/~playlist")) {
        return playlist(otid, tid, drives, path)
    } else {
        if (isSearch && !isFile) {
            return getAll(otid, tid, drives, path)
        } else if (isAll) {
            let new_tid;
            if (isFile) {
                new_tid = tid.split("/").slice(0, -1).join("/") + "/"
            } else {
                new_tid = tid
            }
            print(`全集模式 tid:${tid}=>tid:${new_tid}`);
            let {
                drives,
                path
            } = await get_drives_path(new_tid);
            return getAll(otid, new_tid, drives, path)
        } else if (isFile) {
            let paths = path.split("@@@");
            let vod_name = paths[0].substring(paths[0].lastIndexOf("/") + 1);
            let vod_title = vod_name;
            if (otid.includes("#search#")) {
                vod_title += "[搜]"
            }
            let vod = {
                vod_id: otid,
                vod_name: vod_title,
                type_name: "文件",
                vod_pic: "https://avatars.githubusercontent.com/u/97389433?s=120&v=4",
                vod_content: tid,
                vod_play_from: drives.name,
                vod_play_url: vod_name + "$" + path,
                vod_remarks: drives.settings.title
            };
            print("----detail2----");
            print(vod);
            return JSON.stringify({
                list: [vod]
            })
        } else {
            return JSON.stringify({
                list: []
            })
        }
    }
}

// flag = drivename    id = 'pathvideofile@@@pathsubtitlefile'
async function play(flag, id, flags) {
    if (id==null) return;
    const drives = await get_drives(flag);
    const urls = id.split("@@@");
    var pathfile = urls[0];
    const item = await drives.getFile(pathfile);
    const subs = [];
    let vod = {
        parse: 0,
        playUrl: "",
        url: item.raw_url,
        size: 0,
        remark: "",
        header: {},
        extra: {
            subt: subs,
        }
    }
    
    // __subtitle_cache[drivename$pathvideofile] = drivename$pathsubtitlefile
    var path = drives.name + '$' + pathfile;
    if (__subtitle_cache[path]) {
        for (const sub of __subtitle_cache[path]) {
            try {
                let subP = await get_drives_path(sub);
                const subItem = await drives.getFile(subP.path);
                subs.push(subItem.raw_url);
            } catch (error) {}
        }
    }
    if (item.provider === 'AliyundriveShare2Open' && drives.api.other) {
        const urlss = ['原画', item.raw_url];
        try {
            const res = await drives.getOther('video_preview', urls[0]);
            for (const live of res.data.video_preview_play_info.live_transcoding_task_list) {
                if (live.status === 'finished') {
                    urlss.push(live.template_id);
                    urlss.push(live.url);
                }
            }
        } catch (error) {}
        vod.url = urlss;
        vod.name = item.name;
        vod.header = {},
        vod.extra.subt = subs;
        vod.size = drives.getSize(item);
        vod.remark = drives.name + '$' + pathfile;
    } else if (item.provider === '123Pan') {
        let url = item.raw_url;
        try {
            url = (await http.get(url)).json().data.redirect_url;
        } catch (error) {}
        vod.url = url;
        vod.name = item.name;
        vod.size = drives.getSize(item);
        vod.remark = drives.name + '$' + pathfile;
        vod.header = {},
        vod.extra.subt = subs;
    }
    else {
        vod.url = item.raw_url;
        vod.name = item.name;
        vod.size = drives.getSize(item);
        vod.remark = drives.name + '$' + pathfile;
        vod.header = {},
        vod.extra.subt = subs;
    }
    print("----play----");
    print(vod);
    return JSON.stringify(vod)
}

async function search(wd, quick) {
    print(__drives);
    print("可搜索的alist驱动:" + searchDriver);
    if (!searchDriver || !wd) {
        return JSON.stringify({
            list: []
        })
    } else {
        let driver = __drives[searchDriver];
        wd = wd.split(" ").filter(it => it.trim()).join("+");
        print(driver);
        let surl = driver.server + "/sou?box=" + wd + "&url=";
        if (search_type) {
            surl += "&type=" + search_type
        }
        print("搜索链接:" + surl);
        let html = (await http.get(surl)).text();
        let lists = [];
        try {
            lists = pdfa(html, "div&&ul&&a")
        } catch (e) {}
        print(`搜索结果数:${lists.length},搜索结果显示数量限制:${limit_search_show}`);
        let vods = [];
        let excludeReg = /\.(pdf|epub|mobi|txt|doc|lrc)$/;
        let cnt = 0;
        lists.forEach(it => {
            let vhref = pdfh(it, "a&&href");
            if (vhref) {
                vhref = unescape(vhref)
            }
            if (excludeReg.test(vhref)) {
                return
            }
            const parts = vhref.split('#')
            if (parts.length >= 2) {
                vhref = parts[0]
            }		
            if (cnt < limit_search_show) {
                print(vhref)
            }
            cnt++;
            let vid = searchDriver + "$" + vhref + "#search#";
            if (showMode === "all") {
                vid += "#all#"
            }

            let have_pic = 0;
            let poster = '';
            let douban_rate = '';
	        let display_path = '';
            if (parts.length === 5) {                         
		    let uri_parts = parts[4].split('://')
		    poster = url + "/image/" + uri_parts[1];
                    have_pic = 1;
             }
            if (parts.length >= 4) {                                   
                    douban_rate = parts[3] ;
             }	    	
            if (parts.length < 2) {
		    let path_list = parts[0].split('/');
                    display_path = path_list[path_list.length - 2] + '/' + path_list[path_list.length - 1];
             }
            vods.push({
                //vod_name: pdfh(it, "a&&Text"),
                vod_id: vid,
		        vod_name: parts.length <2 ? display_path :parts[1],
                vod_tag: isMedia(vhref) ? "file" : "folder",
    		    vod_pic: have_pic ? poster : "http://img.xiaoya.pro/xiaoya.jpg",
    		    vod_remarks: douban_rate == '' ? searchDriver :searchDriver + " /豆瓣:" + douban_rate
            })
        });
        vods = vods.slice(0, limit_search_show);
        print(vods);
        return JSON.stringify({
            list: vods
        })
    }
}

function get_size(sz) {
    if (sz <= 0) {
        return ""
    }
    let filesize = "";
    if (sz > 1024 * 1024 * 1024 * 1024) {
        sz /= 1024 * 1024 * 1024 * 1024;
        filesize = "TB"
    } else if (sz > 1024 * 1024 * 1024) {
        sz /= 1024 * 1024 * 1024;
        filesize = "GB"
    } else if (sz > 1024 * 1024) {
        sz /= 1024 * 1024;
        filesize = "MB"
    } else if (sz > 1024) {
        sz /= 1024;
        filesize = "KB"
    } else {
        filesize = "B"
    }
    let sizeStr = sz.toFixed(2) + filesize,
        index = sizeStr.indexOf("."),
        dou = sizeStr.substr(index + 1, 2);
    if (dou === "00") {
        return sizeStr.substring(0, index) + sizeStr.substr(index + 3, 2)
    } else {
        return sizeStr
    }
}

function naturalSort(options) {
    if (!options) {
        options = {}
    }
    return function(a, b) {
        if (options.key) {
            a = a[options.key];
            b = b[options.key]
        }
        var EQUAL = 0;
        var GREATER = options.order === "desc" ? -1 : 1;
        var SMALLER = -GREATER;
        var re = /(^-?[0-9]+(\.?[0-9]*)[df]?e?[0-9]?$|^0x[0-9a-f]+$|[0-9]+)/gi;
        var sre = /(^[ ]*|[ ]*$)/g;
        var dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/;
        var hre = /^0x[0-9a-f]+$/i;
        var ore = /^0/;
        var normalize = function normalize(value) {
            var string = "" + value;
            return options.caseSensitive ? string : string.toLowerCase()
        };
        var x = normalize(a).replace(sre, "") || "";
        var y = normalize(b).replace(sre, "") || "";
        var xN = x.replace(re, "\0$1\0").replace(/\0$/, "").replace(/^\0/, "").split("\0");
        var yN = y.replace(re, "\0$1\0").replace(/\0$/, "").replace(/^\0/, "").split("\0");
        if (!x && !y) return EQUAL;
        if (!x && y) return GREATER;
        if (x && !y) return SMALLER;
        var xD = parseInt(x.match(hre)) || xN.length != 1 && x.match(dre) && Date.parse(x);
        var yD = parseInt(y.match(hre)) || xD && y.match(dre) && Date.parse(y) || null;
        var oFxNcL, oFyNcL;
        if (yD) {
            if (xD < yD) return SMALLER;
            else if (xD > yD) return GREATER
        }
        for (var cLoc = 0, numS = Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {
            oFxNcL = !(xN[cLoc] || "").match(ore) && parseFloat(xN[cLoc]) || xN[cLoc] || 0;
            oFyNcL = !(yN[cLoc] || "").match(ore) && parseFloat(yN[cLoc]) || yN[cLoc] || 0;
            if (isNaN(oFxNcL) !== isNaN(oFyNcL)) return isNaN(oFxNcL) ? GREATER : SMALLER;
            else if (typeof oFxNcL !== typeof oFyNcL) {
                oFxNcL += "";
                oFyNcL += ""
            }
            if (oFxNcL < oFyNcL) return SMALLER;
            if (oFxNcL > oFyNcL) return GREATER
        }
        return EQUAL
    }
}
const sortListByName = (vodList, key, order) => {
    if (!key) {
        return vodList
    }
    order = order || "asc";
    return vodList.sort(naturalSort({
        key: key,
        order: order,
        caseSensitive: true
    }))
};
const getTimeInt = timeStr => {
    return new Date(timeStr).getTime()
};
const sortListByTime = (vodList, key, order) => {
    if (!key) {
        return vodList
    }
    let ASCarr = vodList.sort((a, b) => {
        a = a[key];
        b = b[key];
        return getTimeInt(a) - getTimeInt(b)
    });
    if (order === "desc") {
        ASCarr.reverse()
    }
    return ASCarr
};
const sortListBySize = (vodList, key, order) => {
    if (!key) {
        return vodList
    }
    let ASCarr = vodList.sort((a, b) => {
        a = a[key];
        b = b[key];
        return (Number(a) || 0) - (Number(b) || 0)
    });
    if (order === "desc") {
        ASCarr.reverse()
    }
    return ASCarr
};
export default {
    init: init,
    home: home,
    homeVod: homeVod,
    category: category,
    detail: detail,
    play: play,
    search: search
};

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

