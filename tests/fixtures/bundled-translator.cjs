const http=require('node:http'),readline=require('node:readline');
const input=readline.createInterface({input:process.stdin});
input.once('line',line=>{
 const {token}=JSON.parse(line);
 if(process.argv.includes('fail')){process.exit(1);return;}
 if(process.argv.includes('hang'))return;
 const server=http.createServer(async(req,res)=>{
  if(req.headers.authorization!==`Bearer ${token}`){res.writeHead(403);res.end();return;}
  if(req.url==='/languages'){res.end(JSON.stringify([{code:'en',targets:['ru']}])) ;return;}
  let body='';for await(const chunk of req)body+=chunk;
  res.end(JSON.stringify({translatedText:JSON.parse(body).q.map(()=> 'Пробный перевод.')}));
 });
 input.on('close',()=>server.close(()=>process.exit(0)));
 server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));
});
