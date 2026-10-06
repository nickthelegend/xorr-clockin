// Dev-only command queue for driving the CLOCK IN app on a simulator: node tools/clockin/remote.mjs
//   curl -s 'http://127.0.0.1:4405/push?path=/today&auto=checkin'
import http from 'node:http';
const q = [];
let id = 0;
http
  .createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/push') {
      q.push({ id: ++id, path: u.searchParams.get('path') ?? '/', auto: u.searchParams.get('auto') ?? undefined });
      res.end(`queued ${id}\n`);
    } else if (u.pathname === '/next') {
      const c = q.shift();
      if (!c) return res.writeHead(204).end();
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(c));
    } else res.writeHead(404).end();
  })
  .listen(Number(process.env.PORT ?? 4405), '127.0.0.1');
