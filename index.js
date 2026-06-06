const https=require("https");
const http=require("http");
const WEBHOOK="https://discord.com/api/webhooks/1512415420089372773/EkoBMX90Vox70mKnQeDQFrXy47xaNF8bUDvDvaojmIZ_vP8HfHGa7F5Le9aSy2G09RGv";
const seen=new Set();
let cookie="";
let scans=0;
let total=0;

// Sell targets for profit calculation
const SELL_TARGETS={
  "casio g-shock":75,"casio vintage":35,"casio f91":22,"casio":50,
  "g-shock":75,"seiko skx":220,"seiko 5":90,"seiko presage":175,
  "seiko turtle":240,"seiko sarb":280,"seiko":100,"orient bambino":100,
  "orient mako":105,"orient":95,"citizen promaster":160,"citizen eco":80,
  "citizen":75,"tissot prx":240,"tissot le locle":290,"tissot seastar":320,
  "tissot":200,"hamilton khaki":390,"hamilton jazzmaster":430,"hamilton":350,
  "tag heuer aquaracer":1050,"tag heuer formula":680,"tag heuer carrera":1900,
  "tag heuer":850,"breitling navitimer":4000,"breitling superocean":2200,
  "breitling colt":1150,"breitling":1700,"omega seamaster":3600,
  "omega speedmaster":4500,"omega constellation":2300,"omega":2500,
};

function getSellTarget(title){
  const t=title.toLowerCase();
  for(const[k,v]of Object.entries(SELL_TARGETS)){
    if(t.includes(k))return v;
  }
  return null;
}

function tier(profit,roi){
  if(profit===null)return{label:"❓ UNKNOWN",color:8421504,desc:"No price data"};
  if(profit<-50)return{label:"🚫 AVOID",color:8388608,desc:"Big loss"};
  if(profit<0)return{label:"📉 LOSS",color:16711680,desc:"Would lose money"};
  if(profit<10)return{label:"😐 BREAK EVEN",color:8421504,desc:"Barely worth it"};
  if(roi>=60||profit>=200)return{label:"🚨 MEGA FLIP",color:16776960,desc:"Exceptional deal"};
  if(roi>=40||profit>=50)return{label:"🔥 HOT FLIP",color:65415,desc:"Strong profit"};
  if(roi>=25||profit>=20)return{label:"✅ GOOD FLIP",color:3901635,desc:"Worth buying"};
  return{label:"💡 SMALL FLIP",color:3407872,desc:"Small margin"};
}

const SEARCHES=[
  "Casio G-Shock","Casio Vintage","Casio watch",
  "Seiko watch","Seiko automatic","Seiko SKX","Seiko 5",
  "Orient watch","Orient Bambino",
  "Citizen watch","Citizen Eco-Drive",
  "Tissot watch","Tissot PRX",
  "Hamilton watch","Hamilton Khaki",
  "TAG Heuer","Breitling","Omega watch",
  "automatic watch","mechanical watch","Swiss watch","luxury watch",
];

function getSession(){return new Promise(r=>{const req=https.request({hostname:"www.vinted.co.uk",path:"/",method:"GET",headers:{"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1","Accept":"text/html","Accept-Language":"en-GB,en;q=0.9"}},res=>{const c=res.headers["set-cookie"]||[];cookie=c.map(x=>x.split(";")[0]).join("; ");console.log("Session:"+(cookie?"ok":"none"));res.on("data",()=>{});res.on("end",r);});req.on("error",()=>r());req.setTimeout(8000,()=>{req.destroy();r();});req.end();});}

function search(query){return new Promise(r=>{const q=encodeURIComponent(query);const req=https.request({hostname:"www.vinted.co.uk",path:"/api/v2/catalog/items?search_text="+q+"&order=newest_first&per_page=20&currency=GBP",method:"GET",headers:{"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1","Accept":"application/json","Accept-Language":"en-GB,en;q=0.9","Referer":"https://www.vinted.co.uk/","Cookie":cookie}},res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{try{r(JSON.parse(d).items||[]);}catch{r([]);}});});req.on("error",()=>r([]));req.setTimeout(10000,()=>{req.destroy();r([]);});req.end();});}

function send(item,price,sellTarget,profit,roi,t){return new Promise(r=>{const thumb=item.photos&&item.photos[0]?item.photos[0].url:"";
const profitStr=profit===null?"Unknown":"£"+profit;
const roiStr=roi===null?"Unknown":roi+"%";
const sellStr=sellTarget===null?"Unknown":"£"+sellTarget;
const body=JSON.stringify({
  content:t.label+" | **"+item.title+"** | Listed: £"+price,
  embeds:[{
    title:item.title,
    url:"https://www.vinted.co.uk/items/"+item.id,
    color:t.color,
    thumbnail:thumb?{url:thumb}:undefined,
    description:t.desc,
    fields:[
      {name:"💰 Listed Price",value:"£"+price,inline:true},
      {name:"🎯 Avg Sell",value:sellStr,inline:true},
      {name:"📈 Est. Profit",value:profitStr,inline:true},
      {name:"📊 ROI",value:roiStr,inline:true},
      {name:"📦 Condition",value:item.status||"Unknown",inline:true},
      {name:"📍 Location",value:item.city||"UK",inline:true},
      {name:"🔗 Buy Now",value:"[Open on Vinted](https://www.vinted.co.uk/items/"+item.id+")",inline:false},
    ],
    footer:{text:"VintedFlip Pro • "+new Date().toLocaleTimeString("en-GB")+" • Scan #"+scans}
  }]
});
const u=new URL(WEBHOOK);
const req=https.request({hostname:u.hostname,path:u.pathname+u.search,method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}},res=>{res.on("data",()=>{});res.on("end",r);});
req.on("error",e=>{console.error(e.message);r();});
req.write(body);req.end();});}

async function scan(){
  scans++;
  console.log("\n[Scan #"+scans+"] "+new Date().toLocaleTimeString());
  let found=0;
  for(const query of SEARCHES){
    try{
      const items=await search(query);
      console.log(query+": "+items.length+" results");
      for(const item of items){
        const id=String(item.id);
        if(seen.has(id))continue;
        seen.add(id);
        // Try all price fields Vinted uses
        const price=parseFloat(item.price_numeric||(item.price&&item.price.amount?item.price.amount:item.price)||0);
        if(price<=0)continue;
        const sellTarget=getSellTarget(item.title||"");
        let profit=null,roi=null;
        if(sellTarget){
          profit=Math.round((sellTarget*0.9)-price);
          roi=Math.round((profit/price)*100);
        }
        const t=tier(profit,roi);
        // Post everything except big losses
        if(t.label!=="🚫 AVOID"){
          console.log(t.label+" | "+item.title+" | £"+price+" | profit "+profit);
          await send(item,price,sellTarget,profit,roi,t);
          total++;found++;
          await new Promise(r=>setTimeout(r,500));
        }
      }
      await new Promise(r=>setTimeout(r,800));
    }catch(e){console.error(query+": "+e.message);}
  }
  console.log("Done. "+found+" new. Total: "+total);
}

http.createServer((q,r)=>{r.writeHead(200);r.end("VintedFlip Pro\nScans: "+scans+"\nFound: "+total);}).listen(process.env.PORT||3000,()=>console.log("Server ready ✅"));
getSession().then(()=>{scan();setInterval(scan,30000);setInterval(getSession,20*60*1000);});
