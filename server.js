// Servidor solo para probar en local: node server.js
const http = require('http'), fs = require('fs'), path = require('path');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(__dirname, rel === '/' ? 'index.html' : rel);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'text/plain' });
    res.end(data);
  });
}).listen(4173, () => console.log('http://localhost:4173'));
