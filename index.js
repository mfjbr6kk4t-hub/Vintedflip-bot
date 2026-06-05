const https=require("https");
const http=require("http");
const W=process.env.DISCORD_WEBHOOK;
if(!W){console.error("NO WEBHOOK");process.exit(1);}
console.log("Bot starting");
http.createServer((q,r)=>r.end("OK")).listen(process.env.PORT||3000);
function ping(){
const b=JSON.stringify({content:"✅ VintedFlip bot is alive!"});
const u=new URL(W);
const r=https.request({hostname:u.hostname,path:u.pathname+u.search,method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(b)}},(x)=>{x.on("data",()=>{});x.on("end",()=>console.log("pinged"));});
r.on("error",e=>console.error(e));
r.write(b);r.end();
}
ping();
setInterval(ping,30000);
