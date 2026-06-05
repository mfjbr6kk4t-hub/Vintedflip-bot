const https = require("https");
const http = require("http");

const WEBHOOK = process.env.DISCORD_WEBHOOK;

if (!WEBHOOK) {
  console.error("ERROR: DISCORD_WEBHOOK environment variable is not set!");
  process.exit(1);
}

console.log("✅ Webhook found, starting bot...");

const WATCHES = [
  { model: "Casio G-Shock DW-5600", maxPrice: 35, sell: 70 },
  { model: "Casio Vintage A168W", maxPrice: 15, sell: 35 },
  { model: "Casio F-91W", maxPrice: 10, sell: 22 },
  { model: "Seiko SKX007", maxPrice: 130, sell: 220 },
  { model: "Seiko 5 SNXS79", maxPrice: 50, sell: 90 },
  { model: "Orient Bambino", maxPrice: 55, sell: 100 },
  { model: "Tissot PRX", maxPrice: 150, sell: 240 },
  { model: "Hamilton Khaki Field", maxPrice: 250, sell: 390 },
  { model: "TAG Heuer Aquaracer", maxPrice: 650, sell: 1050 },
  { model: "Omega Seamaster", maxPrice: 2200, sell: 3600 },
];

const seen = new Set();

function sendToDiscord(message) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ content: message });
    const url = new URL(WEBHOOK);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      }
    }, (res) => {
      res.on("data", () => {});
      res.on("end", resolve);
    });
    req.on("error", (e) => { console.error("Discord error:", e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

function searchVinted(watch) {
  return new Promise((resolve) => {
    const query = encodeURIComponent(watch.model);
    const req = https.request({
      hostname: "www.vinted.co.uk",
      path: `/api/v2/catalog/items?search_text=${query}&price_to=${watch.maxPrice}&order=newest_first&per_page=5`,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "application/json",
        "Accept-Language": "en-GB,en;q=0.9",
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
    req.setTimeout(8000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

async function scan() {
  console.log(`[${new Date().toLocaleTimeString()}] Scanning...`);
  for (const watch of WATCHES) {
    try {
      const items = await searchVinted(watch);
      for (const item of items) {
        if (seen.has(String(item.id))) continue;
        seen.add(String(item.id));
        const price = parseFloat(item.price || 0);
        if (price > 0 && price <= watch.maxPrice) {
          const profit = Math.round((watch.sell * 0.9) - price);
          const msg = [
            `🔔 **NEW LISTING — ${watch.model}**`,
            `💰 Price: £${price} (max buy: £${watch.maxPrice})`,
            `📈 Est. profit: £${profit}`,
            `📦 Condition: ${item.status || "Unknown"}`,
            `🔗 https://www.vinted.co.uk/items/${item.id}`,
          ].join("\n");
          console.log(`MATCH: ${watch.model} at £${price}`);
          await sendToDiscord(msg);
          await new Promise(r => setTimeout(r, 500));
        }
      }
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error(`Error on ${watch.model}:`, e.message);
    }
  }
  console.log("Scan done. Next in 2 mins.");
}

// Keep alive for Render
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("VintedFlip Bot running ✅");
}).listen(process.env.PORT || 3000, () => {
  console.log("Keep-alive server started");
});

// Start scanning
scan();
setInterval(scan, 2 * 60 * 1000);