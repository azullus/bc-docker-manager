# Claude Code Metrics Dashboard

Monitor your Claude Code usage, costs, and productivity with Grafana.

## Prerequisites

1. **Prometheus** - For metrics collection
2. **Grafana** - For visualization
3. **Claude Code Telemetry** - Enable metrics export

## Setup

### 1. Enable Claude Code Telemetry

Add to your Claude Code config:

```bash
claude config set telemetry.enabled true
claude config set telemetry.prometheus_port 9090
```

### 2. Configure Prometheus

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'claude-code'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 15s
```

### 3. Import Dashboard

1. Open Grafana
2. Go to Dashboards → Import
3. Upload `claude-code-metrics.json`
4. Select your Prometheus data source

## Metrics Available

| Metric | Description |
|--------|-------------|
| `claude_code_token_usage_tokens_total` | Token consumption by type (input/output/cache) |
| `claude_code_cost_usage_USD_total` | API costs in USD |
| `claude_code_commit_count_total` | Commits made via Claude |
| `claude_code_active_time_seconds_total` | Time spent (CLI vs user) |
| `claude_code_lines_of_code_count_total` | Lines of code accepted |

## Dashboard Panels

- **Sessions**: Total Claude Code sessions
- **Commits Made**: Commits created with Claude
- **Total Cost**: API spending in USD
- **Token Usage**: Input/Output/Cache tokens
- **Cache Efficiency**: % of input served from cache
- **Productivity Ratio**: CLI time vs user interaction time
- **Time Series**: Token usage and cost over time

## Reference

Based on [mikelane's Claude Code Metrics Dashboard](https://gist.github.com/mikelane/f6c3a175cd9f92410aba06b5ac24ba54)
