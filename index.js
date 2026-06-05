const https=require("https");
const http=require("http");
const WEBHOOK="https://discord.com/api/webhooks/1512415420089372773/EkoBMX90Vox70mKnQeDQFrXy47xaNF8bUDvDvaojmIZ_vP8HfHGa7F5Le9aSy2G09RGv";
const seen=new Set();
let cookie="";
let scans=0;
let total=0;
const WATCHES=[
{q:"Casio G-Shock DW-5600",max:45,sell:75,e:"⚡"},
{q:"Casio G-Shock GA-100",max:50,sell:80,e:"⚡"},
{q:"Casio G-Shock GW-M5610",max:70,sell:110,e:"⚡"},
{q:"Casio Vintage A168",max:20,sell:38,e:"⚡"},
{q:"Casio F91W",max:15,sell:25,e:"⚡"},
{q:"G-Shock",max:50,sell:85,e:"⚡"},
{q:"Seiko SKX007",max:150,sell:230,e:"🎌"},
{q:"Seiko 5",max:55,sell:95,e:"🎌"},
{q:"Seiko automatic",max:70,sell:115,e:"🎌"},
{q:"Seiko Presage",max:120,sell:190,e:"🎌"},
{q:"Seiko Turtle",max:160,sell:250,e:"🎌"},
{q:"Orient Bambino",max:65,sell:110,e:"🧭"},
{q:"Citizen Eco-Drive",max:50,sell:90,e:"🧭"},
{q:"Citizen Promaster",max:100,sell:170,e:"🧭"},
{q:"Tissot PRX",max:170,sell:260,e:"🇨🇭"},
{q:"Hamilton Khaki",max:280,sell:420,e:"🇨🇭"},
{q:"TAG Heuer Aquaracer",max:700,sell:1100,e:"🏎️"},
{q:"TAG Heuer Formula 1",max:450,sell:720,e:"🏎️"},
{q:"Breitling Navitimer",max:2600,sell:4100,e:"✈️"},
{q:"Omega Seamaster",max:2400,sell:3800,e:"🌊"},
{q:"Omega Speedmaster",max:3000,sell:4700,e:"🌊"},
{q:"automatic watch",max:50,sell:90,e:"⌚"},
{q:"Swiss watch",max:150,sell:270,e:"⌚"},
];
function getSession(){return new Promise(r=>{const req=https.request({hostname:"www.vinted.co.uk",path:"/",method:"GET",headers:{"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15","Accept":"text/html","Accept-Language":"en-GB"}},res=>{const c=res.headers["set-cookie"]||[];cookie=c.map(x=>x.split(";")[0]).join("; ");console.log("Session:"+(cookie?"ok":"none"));res.on("data",()=>{});res.on("end",r);});req.on("error",()=>r());req.setTimeout(8000,()=>{req.destroy();r();});req.end();});}
function search(w){return new Promise(r=>{const q=encodeURIComponent(w.q);const req=https.request({hostname:"www.vinted.co.uk",path:"/api/v2/catalog/items?search_text="+q+"&price_to="+w.max+"&order=newest_first&per_page=20&currency=GBP",method:"GET",headers:{"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15","Accept":"application/json","Accept-Language":"en-GB","Referer":"https://www.vinted.co.uk/","Cookie":cookie}},res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{try{r(JSON.parse(d).items||[]);}catch{r([]);}});});req.on("error",()=>r([]));req.setTimeout(10000,()=>{req.destroy();r([]);});req.end();});}
function send(w,item,price,profit){return new Promise(r=>{const roi=Math.round((profit/price)*100);const hot=profit>=40;const mega=profit>=200;const thumb=item.photos&&item.photos[0]?item.photos[0].url:"";const body=JSON.stringify({content:mega?"🚨 MEGA FLIP £"+profit+" profit! "+w.e+" "+w.q:hot?"🔥 HOT FLIP £"+profit+" profit! "+w.e+" "+w.q:"🔔 "+w.e+" "+w.q+" at £"+price,embeds:[{title:item.title||w.q,url:"https://www.vinted.co.uk/items/"+item.id,color:mega?16711680:hot?65415:3883506,thumbnail:thumb?{url:thumb}:undefined,fields:[{name:"💰 Price",value:"£"+price,inline:true},{name:"📈 Profit",value:"£"+profit,inline:true},{name:"📊 ROI",value:roi+"%",inline:true},{name:"📦 Condition",value:item.status||"Unknown",inline:true},{name:"📍 Location",value:item.city||"UK",inline:true},{name:"🔗 Buy Now",value:"[Open on Vinted](https://www.vinted.co.uk/items/"+item.id+")",inline:true}],footer:{text:"VintedFlip Pro • Scan #"+scans+" • "+new Date().toLocaleTimeString("en-GB")}}]});const u=new URL(WEBHOOK);const req=https.request({hostname:u.hostname,path:u.pathname+u.search,method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}},res=>{res.on("data",()=>{});res.on("end",r);});req.on("error",e=>{console.error(e.message);r();});req.write(body);req.end();});}
async function scan(){scans++;console.log("\n[Scan #"+scans+"] "+new Date().toLocaleTimeString());let found=0;for(const w of WATCHES){try{const items=await search(w);console.log(w.e+" "+w.q+": "+items.length);for(const item of items){const id=String(item.id);if(seen.has(id))continue;seen.add(id);const price=parseFloat(item.price||0);if(price>0&&price<=w.max){const profit=Math.round((w.sell*0.9)-price);if(profit>0){console.log("MATCH £"+price+" profit £"+profit);await send(w,item,price,profit);total++;found++;await new Promise(r=>setTimeout(r,400));}}}await new Promise(r=>setTimeout(r,600));}catch(e){console.error(w.q+":"+e.message);}}console.log("Done. "+found+" new. Total:"+total);}
http.createServer((q,r)=>{r.writeHead(200);r.end("VintedFlip Scans:"+scans+" Found:"+total);}).listen(process.env.PORT||3000,()=>console.log("Server ready"));
getSession().then(()=>{scan();setInterval(scan,30000);setInterval(getSession,20*60*1000);});
