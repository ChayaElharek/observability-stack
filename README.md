# 📊 observability-stack

Stack de observabilidade com **Prometheus + Grafana**, pronta para uso com Docker Compose.
Inclui uma API Node.js de exemplo com métricas customizadas e dashboards pré-configurados.

## Arquitetura

```
                    ┌─────────────────────────┐
                    │        Grafana           │  :3001
                    │  Dashboards + Alertas   │
                    └────────────┬────────────┘
                                 │ consulta
                    ┌────────────▼────────────┐
                    │        Prometheus        │  :9090
                    │   Coleta e armazena     │
                    └──┬──────────┬───────────┘
                       │ scrape   │ scrape
          ┌────────────▼──┐  ┌───▼──────────────┐
          │   API Node.js  │  │   Node Exporter   │
          │   :3000/metrics│  │   :9100/metrics   │
          │ (app customiz.)│  │ (CPU, RAM, Disco) │
          └───────────────┘  └──────────────────-┘
```

## Métricas coletadas

| Métrica | Tipo | Descrição |
|---|---|---|
| `http_requests_total` | Counter | Total de requisições por rota e status |
| `http_request_duration_seconds` | Histogram | Latência das requisições (p50, p95, p99) |
| `active_connections` | Gauge | Conexões ativas no momento |
| `node_cpu_seconds_total` | Counter | Uso de CPU do host |
| `node_memory_MemAvailable_bytes` | Gauge | Memória disponível |
| `node_filesystem_avail_bytes` | Gauge | Espaço em disco |

## Alertas configurados

| Alerta | Condição | Severidade |
|---|---|---|
| `APIDown` | API inacessível por > 1min | Critical |
| `HighErrorRate` | Taxa de 5xx > 5% | Warning |
| `HighLatency` | p95 > 1 segundo | Warning |
| `HighCPU` | CPU > 80% por 5min | Warning |
| `DiskSpaceLow` | Disco < 15% livre | Critical |

## Como usar

### DEV — subir a stack completa

```bash
# Clone o repositório
git clone https://github.com/ChayaElharek/observability-stack
cd observability-stack

# Suba a stack de dev (build incluído)
cd environments/dev
docker compose up -d --build

# Verifique os serviços
docker compose ps
```

Acesse:
- **API**: http://localhost:3000
- **Métricas raw**: http://localhost:3000/metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin / admin123)

### PROD — variáveis de ambiente

```bash
cd environments/prod
cp .env.example .env
# Edite o .env com suas credenciais reais

docker compose --env-file .env up -d
```

### Testar os alertas

```bash
# Gera tráfego na API
for i in $(seq 1 100); do curl -s http://localhost:3000/ > /dev/null; done

# Gera erros (para testar alerta de error rate)
for i in $(seq 1 20); do curl -s http://localhost:3000/error > /dev/null; done

# Gera latência alta (para testar alerta de p95)
for i in $(seq 1 10); do curl -s http://localhost:3000/slow > /dev/null & done
```

### Recarregar config do Prometheus sem restart

```bash
curl -X POST http://localhost:9090/-/reload
```

## Estrutura do projeto

```
observability-stack/
├── app/
│   ├── index.js          # API Node.js com métricas Prometheus
│   ├── package.json
│   └── Dockerfile
├── prometheus/
│   ├── prometheus.yml    # Configuração de scrape e jobs
│   └── alerts.yml        # Regras de alerta
├── grafana/
│   ├── dashboards/
│   │   └── api-overview.json   # Dashboard provisionado automaticamente
│   └── provisioning/
│       ├── datasources/        # Prometheus como datasource padrão
│       └── dashboards/         # Carregamento automático de dashboards
└── environments/
    ├── dev/docker-compose.yml  # Dev: portas abertas, logs verbosos
    └── prod/docker-compose.yml # Prod: restart, retenção 30d, .env
```

## Decisões técnicas

**Por que Node Exporter?**
Complementa as métricas de aplicação com métricas de infraestrutura (CPU, memória, disco), dando visibilidade end-to-end — da aplicação ao servidor.

**Por que dashboards em JSON no repositório?**
Permite versionamento dos dashboards como código (GitOps). Qualquer alteração no Grafana pode ser exportada e comitada, facilitando replicação entre ambientes.

**Por que ambientes separados (dev/prod)?**
Dev e prod têm necessidades diferentes: dev prioriza visibilidade e facilidade de debug; prod prioriza segurança (portas fechadas), estabilidade (restart automático) e retenção maior de dados.

## Melhorias futuras

- [ ] Alertmanager com notificações (Slack, Telegram)
- [ ] Loki para centralização de logs
- [ ] NGINX como reverse proxy para Grafana em prod
- [ ] Dashboard de infraestrutura (Node Exporter Full)
- [ ] GitHub Actions para lint e validação dos configs

---
## 📸 Screenshots

### Grafana Dashboard — API Overview
![Grafana Dashboard](https://raw.githubusercontent.com/ChayaElharek/observability-stack/main/Grafana.png)

Feito com por [Chaya Elharar](https://chayacode.com.br) | DevOps & Cloud Infrastructure
