const https=require("https");
const http=require("http");
const WEBHOOK="https://discord.com/api/webhooks/1512415420089372773/EkoBMX90Vox70mKnQeDQFrXy47xaNF8bUDvDvaojmIZ_vP8HfHGa7F5Le9aSy2G09RGv";
const seen=new Set();
let cookie="";
let scans=0;
let total=0;

const WATCHES=[
{q:"Casio G-Shock DW-5600",max:60,sell:75,e:"⚡"},
{q:"Casio G-Shock GA-100",max:65,sell:80,e:"⚡"},
{q:"Casio G-Shock GW-M5610",max:90,sell:110,e:"⚡"},
{q:"Casio Vintage A168",max:30,sell:38,e:"⚡"},
{q:"Casio F91W",max:20,sell:25,e:"⚡"},
{q:"G-Shock",max:70,sell:90,e:"⚡"},
{q:"Casio watch",max:40,sell:55,e:"⚡"},
{q:"Seiko SKX007",max:190,sell:230,e:"🎌"},
{q:"Seiko 5",max:80,sell:95,e:"🎌"},
{q:"Seiko automatic",max:95,sell:115,e:"🎌"},
{q:"Seiko Presage",max:160,sell:190,e:"🎌"},
{q:"Seiko Turtle",max:210,sell:250,e:"🎌"},
{q:"Seiko watch",max:80,sell:100,e:"🎌"},
{q:"Orient Bambino",max:90,sell:110,e:"🧭"},
{q:"Orient watch",max:75,sell:95,e:"🧭"},
{q:"Citizen Eco-Drive",max:70,sell:90,e:"🧭"},
{q:"Citizen Promaster",max:140,sell:170,e:"🧭"},
{q:"Tissot PRX",max:210,sell:260,e:"🇨🇭"},
{q:"Tissot watch",max:180,sell:220,e:"🇨🇭"},
{q:"Hamilton Khaki",max:350,sell:420,e:"🇨🇭"},
{q:"Hamilton watch",max:300,sell:370,e:"🇨🇭"},
{q:"TAG Heuer Aquaracer",max:880,sell:1100,e:"🏎️"},
{q:"TAG Heuer Formula 1",max:580,sell:720,e:"🏎️"},
{q:"TAG Heuer",max:650,sell:820,e:"🏎️"},
{q:"Breitling Navitimer",max:3300,sell:4100,e:"✈️"},
{q:"Breitling Superocean",max:1850,sell:2300,e:"✈️"},
{q:"Breitling",max:1200,sell:1600,e:"✈️"},
{q:"Omega Seamaster",max:3000,sell:3800,e:"🌊"},
{q:"Omega Speedmaster",max:3800,sell:4700,e:"🌊"},
{q:"Omega watch",max:1800,sell:2300,e:"🌊"},
{q:"automatic watch",max:60,sell:80,e:"⌚"},
{q:"mechanical watch",max:50,sell:70,e:"⌚"},
{q:"Swiss watch",max:180,sell:240,e:"⌚"},
{q:"dress watch",max:50,sell:70,e:"⌚"},
{q:"dive watch",max:70,sell:95,e:"⌚"},
{q:"luxury watch",max:250,sell:350,e:"⌚"},
];

// MIN profit to post — set low to get more alerts
const MIN_PROFIT=5;

function tier(profit,roi){
  if(profit>=200||roi>=60)return{label:"🚨 MEGA FLIP",color:16711680};
  if(profit>=50||roi>=40)return{label:"🔥 HOT FLIP",color:65415};
  if(profit>=20||roi>=25)return{label:"✅ GOOD FLIP",color:3901635};
  return{label:"💡 SMALL FLIP",color:8421504};
}

function getSession(){return new Promise(r=>{const req=https.request({hostname:"www.vinted.co.uk",path:"/",method:"GET",headers:{"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1","Accept":"text/html","Accept-Language":"en-GB,en;q=0.9"}},res=>{const c=res.headers["set-cookie"]||[];cookie=c.map(x=>x.split(";")[0]).join("; ");console.log("Session:"+(cookie?"ok":"none"));res.on("data",()=>{});res.on("end",r);});req.on("error",()=>r());req.setTimeout(8000,()=>{req.destroy();r();});req.end();});}

function search(w){return new Promise(r=>{const q=encodeURIComponent(w.q);const req=https.request({hostname:"www.vinted.co.uk",path:"/api/v2/catalog/items?search_text="+q+"&price_to="+w.max+"&order=newest_first&per_page=20&currency=GBP",method:"GET",headers:{"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1","Accept":"application/json","Accept-Language":"en-GB,en;q=0.9","Referer":"https://www.vinted.co.uk/","Cookie":cookie}},res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{try{r(JSON.parse(d).items||[]);}catch{r([]);}});});req.on("error",()=>r([]));req.setTimeout(10000,()=>{req.destroy();r([]);});req.end();});}

function send(w,item,price,profit,roi,t){return new Promise(r=>{const thumb=item.photos&&item.photos[0]?item.photos[0].url:"";const body=JSON.stringify({content:t.label+" | "+w.e+" **"+w.q+"** | £"+price+" | +£"+profit+" profit ("+roi+"%)",embeds:[{title:item.title||w.q,url:"https://www.vinted.co.uk/items/"+item.id,color:t.color,thumbnail:thumb?{url:thumb}:undefined,fields:[{name:"💰 Buy for",value:"£"+price,inline:true},{name:"📈 Profit",value:"£"+profit,inline:true},{name:"📊 ROI",value:roi+"%",inline:true},{name:"📦 Condition",value:item.status||"Unknown",inline:true},{name:"📍 Location",value:item.city||"UK",inline:true},{name:"🔗 Link",value:"[Buy on Vinted](https://www.vinted.co.uk/items/"+item.id+")",inline:true}],footer:{text:"VintedFlip Pro • "+new Date().toLocaleTimeString("en-GB")}}]});const u=new URL(WEBHOOK);const req=https.request({hostname:u.hostname,path:u.pathname+u.search,method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}},res=>{res.on("data",()=>{});res.on("end",r);});req.on("error",e=>{console.error(e.message);r();});req.write(body);req.end();});}

async function scan(){scans++;console.log("\n[Scan #"+scans+"] "+new Date().toLocaleTimeString());let found=0;for(const w of WATCHES){try{const items=await search(w);console.log(w.e+" "+w.q+": "+items.length);for(const item of items){const id=String(item.id);if(seen.has(id))continue;seen.add(id);const price=parseFloat(item.price||0);if(price>0&&price<=w.max){const profit=Math.round((w.sell*0.9)-price);const roi=Math.round((profit/price)*100);if(profit>=MIN_PROFIT){const t=tier(profit,roi);console.log(t.label+" £"+price+" profit £"+profit+" ROI "+roi+"%");await send(w,item,price,profit,roi,t);total++;found++;await new Promise(r=>setTimeout(r,400));}}}await new Promise(r=>setTimeout(r,600));}catch(e){console.error(w.q+":"+e.message);}}console.log("Done. "+found+" new. Total:"+total);}

http.createServer((q,r)=>{r.writeHead(200);r.end("VintedFlip Scans:"+scans+" Found:"+total);}).listen(process.env.PORT||3000,()=>console.log("Server ready"));
getSession().then(()=>{scan();setInterval(scan,30000);setInterval(getSession,20*60*1000);});
