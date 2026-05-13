const mangayomiSources = [{
    "name": "PV Player",
    "lang": "en",
    "baseUrl": "https://pinayflixtv.ph",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=github.com",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.1",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": true,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://raw.githubusercontent.com/dito-dev/yomiextensionreal/main/nsfw/pv_player.js",
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "id": 123847569,
    "notes": "Generic PV Player",
    "pkgPath": "real/pv_player.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.baseUrl = "https://pinayflixtv.ph";
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": this.baseUrl + "/"
        };
    }

    parseShowList(html) {
        var list = [];
        var doc = new Document(html);
        var elements = doc.select('article.thumb-block');
        
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            var aTag = el.selectFirst("a");
            if (!aTag) continue;
            
            var titleEl = el.selectFirst(".title");
            var title = titleEl ? titleEl.text.trim() : aTag.attr("title");
            var link = aTag.attr("href");
            var imgTag = el.selectFirst("img");
            var imgUrl = imgTag ? imgTag.attr("src") : "";
            
            // High quality image: remove WordPress thumbnail dimensions
            if (imgUrl) {
                imgUrl = imgUrl.replace(/-[0-9]+x[0-9]+(\.[a-z]+)$/i, "$1");
            }
            
            list.push({
                name: title,
                imageUrl: imgUrl,
                link: link
            });
        }
        return list;
    }

    async getPopular(page) {
        console.log("PinayVids getPopular page=" + page);
        try {
            var url = this.baseUrl + "/page/" + page + "/";
            var res = await this.client.get(url, this.getHeaders());
            var list = this.parseShowList(res.body);
            return { list: list, hasNextPage: list.length > 0 };
        } catch (e) {
            console.log("PinayVids getPopular error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getLatestUpdates(page) {
        return await this.getPopular(page);
    }

    async search(query, page, filters) {
        console.log("PinayVids search: " + query + " page=" + page);
        try {
            var url = this.baseUrl + "/page/" + page + "/?s=" + encodeURIComponent(query);
            var res = await this.client.get(url, this.getHeaders());
            var list = this.parseShowList(res.body);
            return { list: list, hasNextPage: list.length > 0 };
        } catch (e) {
            console.log("PinayVids search error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        console.log("PinayVids getDetail: " + url);
        try {
            var res = await this.client.get(url, this.getHeaders());
            var doc = new Document(res.body);
            
            var titleEl = doc.selectFirst("h1.entry-title");
            var title = titleEl ? titleEl.text.trim() : "";
            var descEl = doc.selectFirst(".entry-content");
            var description = descEl ? descEl.text.trim() : "";
            var ogImg = doc.selectFirst("meta[property='og:image']");
            var imageUrl = ogImg ? ogImg.attr("content") : "";
            
            if (imageUrl) {
                imageUrl = imageUrl.replace(/-[0-9]+x[0-9]+(\.[a-z]+)$/i, "$1");
            }
            
            var genres = [];
            var genreElements = doc.select(".category a, .tag-link");
            for (var i = 0; i < genreElements.length; i++) {
                genres.push(genreElements[i].text.trim());
            }

            var episodes = [];
            episodes.push({
                name: "Watch Video",
                url: url
            });

            return {
                name: title,
                imageUrl: imageUrl,
                description: description,
                genre: genres,
                status: 1, // FINISHED
                episodes: episodes
            };
        } catch (e) {
            console.log("PinayVids getDetail error: " + e);
            return { name: "", imageUrl: "", description: "", genre: [], status: 5, episodes: [] };
        }
    }

    async getVideoList(url) {
        console.log("PinayVids getVideoList: " + url);
        try {
            var res = await this.client.get(url, this.getHeaders());
            var doc = new Document(res.body);
            var videoList = [];
            
            // Primary Source: Garpf / CDN
            var iframe = doc.selectFirst("iframe[src*='garpf.com']");
            if (iframe) {
                var iframeUrl = iframe.attr("src");
                var idMatch = iframeUrl.match(/\/pinayflix\/([a-zA-Z0-9]+)/);
                if (idMatch) {
                    var id = idMatch[1];
                    var videoUrl = "https://cdn.pinayflixtv.ph/" + id + "/master.m3u8";
                    videoList.push({
                        url: videoUrl,
                        originalUrl: videoUrl,
                        quality: "Multi-Quality (CDN)",
                        headers: {
                            "Referer": "https://garpf.com/",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        }
                    });
                }
            }
            
            // Secondary Sources: Other Buttons
            var sourceButtons = doc.select(".SourceButtons a");
            for (var i = 0; i < sourceButtons.length; i++) {
                var btn = sourceButtons[i];
                var btnName = btn.attr("name") || "";
                var btnHref = btn.attr("href") || "";
                
                if (btnHref && !btnHref.includes("garpf.com")) {
                    videoList.push({
                        url: btnHref,
                        originalUrl: btnHref,
                        quality: btnName || "Alternative Server",
                        headers: { "Referer": url }
                    });
                }
            }
            
            return videoList;
        } catch (e) {
            console.log("PinayVids getVideoList error: " + e);
            return [];
        }
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}


