mkdir -p /home/claude/vinted-final && cat > /home/claude/vinted-final/index.js << 'ENDOFFILE'
const https = require("https");
const http = require("http");

const WEBHOOK = process.env.DISCORD_WEBHOOK;
if (!WEBHOOK) { console.error("ERROR: DISCORD_WEBHOOK not set!"); process.exit(1); }
console.log("✅ VintedFlip Bot v4 starting...");

// Every watch we want to monitor - wide net, lower thresholds for more alerts
const WATCHES = [
  // Casio - very high volume
  { model: "Casio G-Shock", maxPrice: 80, sell: 120, emoji: "⚡", cat: "Casio" },
  { model: "Casio G-Shock DW-5600", maxPrice: 45, sell: 75, emoji: "⚡", cat: "Casio" },
  { model: "Casio G-Shock GA-100", maxPrice: 50, sell: 80, emoji: "⚡", cat: "Casio" },
  { model: "Casio G-Shock GW-M5610", maxPrice: 70, sell: 110, emoji: "⚡", cat: "Casio" },
  { model: "Casio Vintage A168", maxPrice: 20, sell: 38, emoji: "⚡", cat: "Casio" },
  { model: "Casio F91W", maxPrice: 15, sell: 25, emoji: "⚡", cat: "Casio" },
  { model: "Casio watch", maxPrice: 30, sell: 55, emoji: "⚡", cat: "Casio" },
  // Seiko
  { model: "Seiko watch", maxPrice: 60, sell: 100, emoji: "🎌", cat: "Seiko" },
  { model: "Seiko automatic", maxPrice: 70, sell: 120, emoji: "🎌", cat: "Seiko" },
  { model: "Seiko SKX", maxPrice: 150, sell: 230, emoji: "🎌", cat: "Seiko" },
  { model: "Seiko 5", maxPrice: 55, sell: 95, emoji: "🎌", cat: "Seiko" },
  { model: "Seiko Presage", maxPrice: 120, sell: 190, emoji: "🎌", cat: "Seiko" },
  { model: "Seiko Turtle", maxPrice: 160, sell: 250, emoji: "🎌", cat: "Seiko" },
  { model: "Seiko SARB", maxPrice: 180, sell: 290, emoji: "🎌", cat: "Seiko" },
  { model: "Seiko diver", maxPrice: 100, sell: 170, emoji: "🎌", cat: "Seiko" },
  // Orient
  { model: "Orient Bambino", maxPrice: 65, sell: 110, emoji: "🧭", cat: "Orient" },
  { model: "Orient watch", maxPrice: 60, sell: 100, emoji: "🧭", cat: "Orient" },
  { model: "Orient Mako", maxPrice: 70, sell: 115, emoji: "🧭", cat: "Orient" },
  // Citizen
  { model: "Citizen Eco-Drive", maxPrice: 50, sell: 90, emoji: "🧭", cat: "Citizen" },
  { model: "Citizen Promaster", maxPrice: 100, sell: 170, emoji: "🧭", cat: "Citizen" },
  { model: "Citizen automatic", maxPrice: 60, sell: 100, emoji: "🧭", cat: "Citizen" },
  // Tissot
  { model: "Tissot PRX", maxPrice: 170, sell: 260, emoji: "🇨🇭", cat: "Tissot" },
  { model: "Tissot watch", maxPrice: 150, sell: 240, emoji: "🇨🇭", cat: "Tissot" },
  { model: "Tissot Le Locle", maxPrice: 200, sell: 310, emoji: "🇨🇭", cat: "Tissot" },
  { model: "Tissot Seastar", maxPrice: 220, sell: 340, emoji: "🇨🇭", cat: "Tissot" },
  // Hamilton
  { model: "Hamilton Khaki", maxPrice: 280, sell: 420, emoji: "🇨🇭", cat: "Hamilton" },
  { model: "Hamilton watch", maxPrice: 250, sell: 380, emoji: "🇨🇭", cat: "Hamilton" },
  { model: "Hamilton Jazzmaster", maxPrice: 300, sell: 460, emoji: "🇨🇭", cat: "Hamilton" },
  // TAG Heuer
  { model: "TAG Heuer", maxPrice: 500, sell: 850, emoji: "🏎️", cat: "TAG Heuer" },
  { model: "TAG Heuer Aquaracer", maxPrice: 700, sell: 1100, emoji: "🏎️", cat: "TAG Heuer" },
  { model: "TAG Heuer Formula 1", maxPrice: 450, sell: 720, emoji: "🏎️", cat: "TAG Heuer" },
  { model: "TAG Heuer Carrera", maxPrice: 1300, sell: 2000, emoji: "🏎️", cat: "TAG Heuer" },
  // Breitling
  { model: "Breitling", maxPrice: 1000, sell: 1700, emoji: "✈️", cat: "Breitling" },
  { model: "Breitling Navitimer", maxPrice: 2600, sell: 4100, emoji: "✈️", cat: "Breitling" },
  { model: "Breitling Superocean", maxPrice: 1500, sell: 2300, emoji: "✈️", cat: "Breitling" },
  { model: "Breitling Colt", maxPrice: 750, sell: 1200, emoji: "✈️", cat: "Breitling" },
  // Omega
  { model: "Omega Seamaster", maxPrice: 2400, sell: 3800, emoji: "🌊", cat: "Omega" },
  { model: "Omega Speedmaster", maxPrice: 3000, sell: 4700, emoji: "🌊", cat: "Omega" },
  { model: "Omega watch", maxPrice: 1500, sell: 2500, emoji: "🌊", cat: "Omega" },
  { model: "Omega De Ville", maxPrice: 1300, sell: 2100, emoji: "🌊", cat: "Omega" },
  // Bonus - generic high volume searches
  { model: "automatic watch", maxPrice: 50, sell: 90, emoji: "⌚", cat: "Generic" },
  { model: "mechanical watch", maxPrice: 40, sell: 75, emoji: "⌚", cat: "Generic" },
  { model: "luxury watch", maxPrice: 200, sell: 350, emoji: "⌚", cat: "Generic" },
  { model: "Swiss watch", maxPrice: 150, sell: 270, emoji: "⌚", cat: "Generic" },
  { model: "dress watch", maxPrice: 60, sell: 100, emoji: "⌚", cat: "Generic" },
];

const seen = new Set();
let sessionCookie = "";
let scanCount = 0;
let totalFound = 0;

function getSession() {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: "www.vinted.co.uk", path: "/", method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Connection": "keep-alive",
      }
    }, (res) => {
      const cookies = res.headers["set-cookie"] || [];
      sessionCookie = cookies.map(c => c.split(";")[0]).join("; ");
      console.log(`🍪 Session: ${sessionCookie ? "got it ✅" : "none ❌"}`);
      res.on("data", () => {}); res.on("end", resolve);
    });
    req.on("error", () => resolve());
    req.setTimeout(8000, () => { req.destroy(); resolve(); });
    req.end();
  });
}

function searchVinted(watch) {
  return new Promise((resolve) => {
    const query = encodeURIComponent(watch.model);
    const req = https.request({
      hostname: "www.vinted.co.uk",
      path: `/api/v2/catalog/items?search_text=${query}&price_to=${watch.maxPrice}&order=newest_first&per_page=20&currency=GBP&catalog_ids=2&material_ids=`,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-GB,en;q=0.9",
        "Referer": `https://www.vinted.co.uk/catalog?search_text=${query}`,
        "Cookie": sessionCookie,
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      }
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data).items || []); }
        catch { resolve([]); }
      });
    });
    req.on("error", () => resolve([]));
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

function sendToDiscord(watch, item, price, profit) {
  return new Promise((resolve) => {
    const roi = Math.round((profit / price) * 100);
    const isHot = profit >= 40;
    const isMega = profit >= 200;
    const thumb = item.photos?.[0]?.url || item.photo?.url || item.photos?.[0]?.full_size_url || "";

    const body = JSON.stringify({
      content: isMega
        ? `🚨 @everyone **MEGA FLIP** — £${profit} profit! ${watch.emoji} ${watch.model}`
        : isHot
        ? `🔥 **HOT FLIP** — £${profit} profit! ${watch.emoji} ${watch.model}`
        : `🔔 ${watch.emoji} **${watch.model}** at £${price}`,
      embeds: [{
        title: item.title || watch.model,
        url: `https://www.vinted.co.uk/items/${item.id}`,
        color: isMega ? 0xff0000 : isHot ? 0x00ff87 : 0x3b82f6,
        ...(thumb ? { thumbnail: { url: thumb } } : {}),
        fields: [
          { name: "💰 Listed", value: `£${price}`, inline: true },
          { name: "📈 Profit", value: `£${profit}`, inline: true },
          { name: "📊 ROI", value: `${roi}%`, inline: true },
          { name: "📦 Condition", value: item.status || "Not stated", inline: true },
          { name: "📍 Location", value: item.city || item.country_title || "UK", inline: true },
          { name: "🏷️ Category", value: watch.cat, inline: true },
        ],
        footer: { text: `VintedFlip Pro • Scan #${scanCount} • ${new Date().toLocaleTimeString("en-GB")}` },
      }]
    });

    const url = new URL(WEBHOOK);
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, (res) => { res.on("data", () => {}); res.on("end", resolve); });
    req.on("error", (e) => { console.error("Discord error:", e.message); resolve(); });
    req.write(body); req.end();
  });
}

async function scan() {
  scanCount++;
  console.log(`\n[Scan #${scanCount}] ${new Date().toLocaleTimeString()} — checking ${WATCHES.length} searches...`);
  let found = 0;

  for (const watch of WATCHES) {
    try {
      const items = await searchVinted(watch);
      console.log(`  ${watch.emoji} ${watch.model}: ${items.length} results`);

      for (const item of items) {
        const id = String(item.id);
        if (seen.has(id)) continue;
        seen.add(id);

        const price = parseFloat(item.price || 0);
        if (price > 0 && price <= watch.maxPrice) {
          const profit = Math.round((watch.sell * 0.9) - price);
          if (profit > 0) {
            console.log(`  ✅ MATCH: £${price} — profit £${profit}`);
            await sendToDiscord(watch, item, price, profit);
            totalFound++;
            found++;
            await new Promise(r => setTimeout(r, 400));
          }
        }
      }
      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      console.error(`  ❌ ${watch.model}: ${e.message}`);
    }
  }

  console.log(`[Scan #${scanCount}] Done — ${found} new, ${totalFound} total. Next in 30s.`);
}

// Keep Render alive
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`VintedFlip Bot ✅\nScans: ${scanCount}\nListings found: ${totalFound}\nUptime: ${Math.floor(process.uptime())}s`);
}).listen(process.env.PORT || 3000, () => console.log("✅ Keep-alive server ready"));

// Boot
getSession().then(() => {
  scan();
  setInterval(scan, 30 * 1000);
  setInterval(getSession, 20 * 60 * 1000); // refresh session every 20 mins
});
ENDOFFILE
echo "done"