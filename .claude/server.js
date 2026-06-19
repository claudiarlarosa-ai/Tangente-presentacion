const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/claudia/Desktop/Claude/Tangente';
const PORT = 4521;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.md': 'text/plain' };

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/tangente-deck.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('tangente on ' + PORT));
