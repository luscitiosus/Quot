// Servidor estático sin dependencias para la calculadora de penas (apto para Render).
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { manejarMcp } = require('./mcp');

const PORT = process.env.PORT || 3000;
const RAIZ = __dirname;

// Solo se sirven estos archivos: el resto del proyecto (package.json, server.js…) no es público.
const PUBLICOS = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'application/javascript; charset=utf-8'],
  '/motor.js': ['motor.js', 'application/javascript; charset=utf-8'],
  '/delitos.js': ['delitos.js', 'application/javascript; charset=utf-8']
};

const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'"
};

const servidor = http.createServer((req, res) => {
  const ruta = decodeURIComponent((req.url || '/').split('?')[0]);

  // Conector MCP para Claude (Streamable HTTP)
  if (ruta === '/mcp' || ruta === '/mcp/') return manejarMcp(req, res);

  if (ruta === '/health' || ruta === '/salud') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ estado: 'ok' }));
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  const entrada = PUBLICOS[ruta];
  if (!entrada) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('No encontrado');
  }

  fs.readFile(path.join(RAIZ, entrada[0]), (err, datos) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Error interno');
    }
    res.writeHead(200, Object.assign({
      'Content-Type': entrada[1],
      'Cache-Control': entrada[0] === 'index.html' ? 'no-cache' : 'public, max-age=3600'
    }, CABECERAS));
    res.end(req.method === 'HEAD' ? undefined : datos);
  });
});

servidor.listen(PORT, () => {
  console.log('Calculadora de penas escuchando en el puerto ' + PORT);
});
