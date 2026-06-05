const https=require("https");
const http=require("http");
const W="PASTE_YOUR_WEBHOOK_URL_HERE";
console.log("starting");
http.createServer((q,r)=>r.end("ok")).listen(process.env.PORT||3000);
function send(){
const b=JSON.stringify({content:"🔔 VintedFlip bot is live!"});
const u=new URL(W);
const o={hostname:u.hostname,path:u.pathname+u.search,method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(b)}};
const r=https.request(o,res=>{res.on("data",()=>{});res.on("end",()=>console.log("sent!"));});
r.on("error",e=>console.error(e.message));
r.write(b);r.end();
}
send();
setInterval(send,30000);