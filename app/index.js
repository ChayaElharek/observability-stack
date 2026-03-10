const express = require('express');
const client  = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP recebidas',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Número de conexões ativas no momento',
  registers: [register],
});

app.use((req, res, next) => {
  if (req.path === '/metrics') return next();
  activeConnections.inc();
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    end();
    activeConnections.dec();
  });
  next();
});

app.get('/', (req, res) => res.json({ message: 'API funcionando!', timestamp: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ status: 'healthy', uptime: process.uptime() }));
app.get('/slow', async (req, res) => {
  await new Promise(r => setTimeout(r, Math.random() * 2000));
  res.json({ message: 'Resposta lenta simulada' });
});
app.get('/error', (req, res) => res.status(500).json({ error: 'Erro simulado para testes' }));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => console.log(`API rodando na porta ${PORT} | Métricas: http://localhost:${PORT}/metrics`));
