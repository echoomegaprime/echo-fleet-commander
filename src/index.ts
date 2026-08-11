// ═══════════════════════════════════════════════════════════════════════════════
// ECHO FLEET COMMANDER v1.0.0 — Centralized Multi-Worker Orchestration Hub
// Commander: Bobby Don McWilliams II | Authority: 11.0 SUPREME SOVEREIGN
// Single pane of glass over 100+ Cloudflare Workers
// ═══════════════════════════════════════════════════════════════════════════════

const SERVICE = 'echo-fleet-commander';
const VERSION = '1.2.0';

// Constant-time string comparison — runtime must not depend on where (or
// whether) the inputs first differ, including a length mismatch, or an
// attacker can recover the key length/prefix via timing.
export function timingSafeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  const len = Math.max(bufA.length, bufB.length, 1);
  const padA = new Uint8Array(len);
  const padB = new Uint8Array(len);
  padA.set(bufA);
  padB.set(bufB);
  let mismatch = bufA.length ^ bufB.length;
  for (let i = 0; i < len; i++) {
    mismatch |= padA[i] ^ padB[i];
  }
  return mismatch === 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  // Core
  SHARED_BRAIN: Fetcher;
  SWARM_BRAIN: Fetcher;
  OMNISYNC: Fetcher;
  BUILD_ORCHESTRATOR: Fetcher;
  DAEMON: Fetcher;
  // Engine + Knowledge
  ENGINE_RUNTIME: Fetcher;
  KNOWLEDGE_FORGE: Fetcher;
  DOCTRINE_FORGE: Fetcher;
  SDK: Fetcher;
  // Bots
  X_BOT: Fetcher;
  LINKEDIN: Fetcher;
  TELEGRAM: Fetcher;
  SLACK: Fetcher;
  REDDIT: Fetcher;
  // Intelligence
  GRAPH_RAG: Fetcher;
  MEMORY_PRIME: Fetcher;
  AI_ORCHESTRATOR: Fetcher;
  QA_TESTER: Fetcher;
  // Utility
  VAULT_API: Fetcher;
  SPEAK_CLOUD: Fetcher;
  ECHO_CHAT: Fetcher;
  // T2 Feature Workers
  LANDMAN_PIPELINE: Fetcher;
  HEPHAESTION_FORGE: Fetcher;
  EPT_API: Fetcher;
  INSTAGRAM: Fetcher;
  WHATSAPP: Fetcher;
  MESSENGER: Fetcher;
  MESSAGING_GATEWAY: Fetcher;
  // T3 Scrapers & Peripheral
  NEWS_SCRAPER: Fetcher;
  REDDIT_MONITOR: Fetcher;
  PRICE_ALERT: Fetcher;
  SEC_EDGAR: Fetcher;
  CRYPTO_TRADER: Fetcher;
  KNOWLEDGE_HARVESTER: Fetcher;
  KNOWLEDGE_SCOUT: Fetcher;
  MODEL_HOST: Fetcher;
  DARKWEB_INTEL: Fetcher;
  GS343_CLOUD: Fetcher;
  PHOENIX_CLOUD: Fetcher;
  MEMORY_CORTEX: Fetcher;
  AGENT_COORDINATOR: Fetcher;
  A2A_PROTOCOL: Fetcher;
  PAYPAL: Fetcher;
  OPENCLAW_BRIDGE: Fetcher;
  // Infrastructure Fleet
  CONFIG_MANAGER: Fetcher;
  ALERT_ROUTER: Fetcher;
  LOG_AGGREGATOR: Fetcher;
  RATE_LIMITER: Fetcher;
  USAGE_TRACKER: Fetcher;
  CRON_ORCHESTRATOR: Fetcher;
  API_GATEWAY: Fetcher;
  NOTIFICATION_HUB: Fetcher;
  SECRETS_ROTATOR: Fetcher;
  DISTRIBUTED_TRACING: Fetcher;
  SERVICE_REGISTRY: Fetcher;
  INCIDENT_MANAGER: Fetcher;
  COST_OPTIMIZER: Fetcher;
  DEPLOYMENT_COORDINATOR: Fetcher;
  CIRCUIT_BREAKER: Fetcher;
  // Revenue Products (expanded 2026-03-28)
  CRM: Fetcher;
  HELPDESK: Fetcher;
  BOOKING: Fetcher;
  INVOICE: Fetcher;
  EMAIL_SENDER: Fetcher;
  LIVE_CHAT: Fetcher;
  FORMS: Fetcher;
  FINANCE_AI: Fetcher;
  PROJECT_MANAGER: Fetcher;
  HR: Fetcher;
  CALL_CENTER: Fetcher;
  HOME_AI: Fetcher;
  SHEPHERD_AI: Fetcher;
  INTEL_HUB: Fetcher;
  AUTO_BUILDER: Fetcher;
  ARCANUM: Fetcher;
  HEALTH_DASHBOARD: Fetcher;
  BOT_AUDITOR: Fetcher;
  ANALYTICS_PIPELINE: Fetcher;
  STATUS_PAGE: Fetcher;
  FLEET_COMMANDER_SELF: Fetcher;
  // Extended Products (2026-03-28)
  SURVEYS: Fetcher;
  KB: Fetcher;
  EMAIL_MARKETING: Fetcher;
  LMS: Fetcher;
  CONTRACTS: Fetcher;
  INVENTORY: Fetcher;
  WORKFLOW: Fetcher;
  SOCIAL_MEDIA: Fetcher;
  DOCUMENT_MANAGER: Fetcher;
  LINK_SHORTENER: Fetcher;
  FEEDBACK_BOARD: Fetcher;
  NEWSLETTER: Fetcher;
  WEB_ANALYTICS: Fetcher;
  WAITLIST: Fetcher;
  REVIEWS: Fetcher;
  PROPOSALS: Fetcher;
  AFFILIATE: Fetcher;
  SIGNATURES: Fetcher;
  QR_MENU: Fetcher;
  PODCAST: Fetcher;
  PAYROLL: Fetcher;
  CALENDAR: Fetcher;
  COMPLIANCE: Fetcher;
  RECRUITING: Fetcher;
  TIMESHEET: Fetcher;
  FEATURE_FLAGS: Fetcher;
  EXPENSE: Fetcher;
  OKR: Fetcher;
  GAMER: Fetcher;
  ANALYTICS_ENGINE: Fetcher;
  REPORT_GEN: Fetcher;
  DIAGNOSTICS: Fetcher;
  // Auth
  ECHO_API_KEY: string;
}

interface WorkerEntry {
  name: string;
  binding?: string;             // service binding name in this Worker
  publicUrl?: string;           // fallback public URL (only for non-bound workers)
  healthPath: string;
  category: 'core' | 'bot' | 'intelligence' | 'scraper' | 'infra' | 'product' | 'utility';
  critical: boolean;
  dependsOn: string[];
  secrets: string[];            // expected secret names
  crons: string[];
  description: string;
  tier: 'T0' | 'T1' | 'T2' | 'T3';  // T0=brain, T1=engines, T2=features, T3=peripheral
}

interface FleetHealthResult {
  worker: string;
  healthy: boolean;
  latencyMs: number;
  version?: string;
  status?: string;
  error?: string;
  checkedAt: string;
}

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'investigating' | 'mitigating' | 'resolved';
  affectedWorkers: string[];
  timeline: string[];
  createdAt: string;
  resolvedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(level: string, message: string, data?: Record<string, any>): void {
  const entry = { timestamp: new Date().toISOString(), level, service: SERVICE, message, ...data };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Echo-API-Key',
      'X-Fleet-Commander': VERSION,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLEET REGISTRY — EVERY WORKER IN THE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const FLEET_REGISTRY: WorkerEntry[] = [
  // ── T0: Brain Layer (System-Critical) ──────────────────────────────────────
  {
    name: 'echo-shared-brain', binding: 'SHARED_BRAIN', healthPath: '/health',
    category: 'core', critical: true, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Unified memory layer — D1+KV+R2+Vectorize, semantic search, mobile context',
    tier: 'T0',
  },
  {
    name: 'omniscient-sync', binding: 'OMNISYNC', healthPath: '/',
    category: 'core', critical: true, dependsOn: [],
    secrets: [], crons: [],
    description: 'Cross-instance sync — todos, policies, broadcasts, memory keys',
    tier: 'T0',
  },
  {
    name: 'echo-swarm-brain', binding: 'SWARM_BRAIN', healthPath: '/health',
    category: 'core', critical: true, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'MoltBook feed, inter-agent communication, swarm coordination',
    tier: 'T0',
  },
  {
    name: 'echo-vault-api', binding: 'VAULT_API', healthPath: '/health',
    category: 'core', critical: true, dependsOn: [],
    secrets: ['ECHO_API_KEY', 'ENCRYPTION_KEY'], crons: [],
    description: 'Credential vault — 1,527+ secrets, encrypted at rest, audit trail',
    tier: 'T0',
  },

  // ── T1: Engine Layer (Intelligence-Critical) ───────────────────────────────
  {
    name: 'echo-engine-runtime', binding: 'ENGINE_RUNTIME', healthPath: '/health',
    category: 'intelligence', critical: true, dependsOn: ['echo-shared-brain'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: '5,400+ engines, 697K+ doctrines, 940+ domains — primary intelligence',
    tier: 'T1',
  },
  {
    name: 'echo-knowledge-forge', binding: 'KNOWLEDGE_FORGE', healthPath: '/health',
    category: 'intelligence', critical: true, dependsOn: ['echo-shared-brain'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: '12K+ docs, 175+ categories, 75K+ chunks — knowledge retrieval',
    tier: 'T1',
  },
  {
    name: 'echo-doctrine-forge', binding: 'DOCTRINE_FORGE', healthPath: '/health',
    category: 'intelligence', critical: false, dependsOn: ['echo-engine-runtime'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Doctrine generation — 24 FREE LLM providers, TIE gold standard blocks',
    tier: 'T1',
  },
  {
    name: 'echo-chat', binding: 'ECHO_CHAT', healthPath: '/health',
    category: 'core', critical: true, dependsOn: ['echo-engine-runtime', 'echo-shared-brain'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: '14 AI personalities, 5 LLM providers, domain-aware conversation',
    tier: 'T1',
  },
  {
    name: 'echo-sdk-gateway', binding: 'SDK', healthPath: '/health',
    category: 'core', critical: true, dependsOn: ['echo-engine-runtime', 'echo-knowledge-forge'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Unified SDK — 23 endpoints, OpenAPI spec, engine+knowledge+brain access',
    tier: 'T1',
  },
  {
    name: 'echo-ai-orchestrator', binding: 'AI_ORCHESTRATOR', healthPath: '/health',
    category: 'intelligence', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: '29 LLM workers, multi-model inference, failover chains',
    tier: 'T1',
  },
  {
    name: 'echo-graph-rag', binding: 'GRAPH_RAG', healthPath: '/health',
    category: 'intelligence', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: '312K nodes, 3.3M edges, 93 domains — knowledge graph',
    tier: 'T1',
  },
  {
    name: 'echo-memory-prime', binding: 'MEMORY_PRIME', healthPath: '/health',
    category: 'intelligence', critical: false, dependsOn: ['echo-shared-brain'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: '9-pillar permanent archive, 44 endpoints',
    tier: 'T1',
  },

  // ── T2: Feature Layer (Revenue/Product-Critical) ───────────────────────────
  {
    name: 'echo-autonomous-daemon', binding: 'DAEMON', healthPath: '/health',
    category: 'infra', critical: true, dependsOn: ['echo-shared-brain', 'echo-swarm-brain'],
    secrets: ['ECHO_API_KEY'], crons: ['*/5 * * * *', '*/15 * * * *', '0 * * * *', '0 */6 * * *', '0 9 * * *', '0 0 * * SUN'],
    description: '464 capabilities, 130 expansion phases, fleet health monitoring',
    tier: 'T2',
  },
  {
    name: 'echo-build-orchestrator', binding: 'BUILD_ORCHESTRATOR', healthPath: '/status',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Engine build pipeline, task queue, quality gates, phase tracking',
    tier: 'T2',
  },
  {
    name: 'echo-speak-cloud', binding: 'SPEAK_CLOUD', healthPath: '/health',
    category: 'product', critical: false, dependsOn: ['echo-chat'],
    secrets: ['ECHO_API_KEY', 'ELEVENLABS_API_KEY'], crons: [],
    description: 'ConvoAI-level voice — TTS/STT, 6 voices, 19 emotions, WebSocket streaming',
    tier: 'T2',
  },
  {
    name: 'echo-landman-pipeline', binding: 'LANDMAN_PIPELINE', healthPath: '/health',
    category: 'product', critical: false, dependsOn: ['echo-shared-brain'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Title investigation pipeline, COUNTY_DB cascade, 80+ Texas counties',
    tier: 'T2',
  },
  {
    name: 'hephaestion-forge', binding: 'HEPHAESTION_FORGE', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: ['echo-engine-runtime'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'AI code factory — 13-stage pipeline, 6,546 engines built',
    tier: 'T2',
  },
  {
    name: 'echo-qa-tester', binding: 'QA_TESTER', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: ['echo-shared-brain'],
    secrets: ['ECHO_API_KEY'], crons: ['0 */4 * * *', '0 8 * * *', '0 2 * * SUN'],
    description: 'Autonomous website QA — 42-phase testing, 1100+ checkpoints',
    tier: 'T2',
  },

  // ── Infrastructure Fleet (autonomous build session) ────────────────────────
  {
    name: 'echo-config-manager', binding: 'CONFIG_MANAGER', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: ['echo-shared-brain'],
    secrets: ['ECHO_API_KEY'], crons: ['0 3 * * *'],
    description: 'Config management — feature flags, experiments, namespaced configs',
    tier: 'T2',
  },
  {
    name: 'echo-alert-router', binding: 'ALERT_ROUTER', healthPath: '/health',
    category: 'infra', critical: true, dependsOn: ['echo-shared-brain', 'echo-swarm-brain'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Alert routing — 4 rules, 2 channels, error rate + latency + service down monitoring',
    tier: 'T2',
  },
  {
    name: 'echo-log-aggregator', binding: 'LOG_AGGREGATOR', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: ['echo-shared-brain'],
    secrets: ['ECHO_API_KEY'], crons: ['0 * * * *', '*/15 * * * *', '0 3 * * *'],
    description: 'Log aggregation — 240+ logs, 30 services, hourly stats + retention cleanup',
    tier: 'T2',
  },
  {
    name: 'echo-rate-limiter', binding: 'RATE_LIMITER', healthPath: '/health',
    category: 'infra', critical: true, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Rate limiting — 6 active policies, per-user/per-service throttling',
    tier: 'T2',
  },
  {
    name: 'echo-usage-tracker', binding: 'USAGE_TRACKER', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Usage tracking — 5 quota plans, request metering, billing prep',
    tier: 'T2',
  },
  {
    name: 'echo-cron-orchestrator', binding: 'CRON_ORCHESTRATOR', healthPath: '/health',
    category: 'infra', critical: true, dependsOn: ['echo-shared-brain'],
    secrets: ['ECHO_API_KEY'], crons: ['* * * * *', '0 */6 * * *'],
    description: 'Centralized cron — 8 jobs, service binding dispatch, deadletter queue',
    tier: 'T2',
  },
  {
    name: 'echo-api-gateway', binding: 'API_GATEWAY', healthPath: '/health',
    category: 'infra', critical: true, dependsOn: ['echo-rate-limiter', 'echo-usage-tracker'],
    secrets: ['ECHO_API_KEY'], crons: ['0 4 * * *'],
    description: 'API gateway — key management, route config, versioned endpoints',
    tier: 'T2',
  },
  {
    name: 'echo-notification-hub', binding: 'NOTIFICATION_HUB', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: ['echo-shared-brain'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Notification hub — 3 channels, 5 templates, multi-channel delivery',
    tier: 'T2',
  },
  {
    name: 'echo-secrets-rotator', binding: 'SECRETS_ROTATOR', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: ['echo-vault-api'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Secrets rotation — 527 credentials, HIBP breach checking, health scoring',
    tier: 'T2',
  },
  {
    name: 'echo-distributed-tracing', binding: 'DISTRIBUTED_TRACING', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Distributed tracing — W3C Trace Context, anomaly detection, dependency mapping',
    tier: 'T2',
  },
  {
    name: 'echo-service-registry', binding: 'SERVICE_REGISTRY', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Service registry — 54 registered services, auto-discovery, stale detection',
    tier: 'T2',
  },

  // ── Bot Fleet ──────────────────────────────────────────────────────────────
  {
    name: 'echo-x-bot', binding: 'X_BOT', healthPath: '/health',
    category: 'bot', critical: false, dependsOn: ['echo-chat', 'echo-shared-brain'],
    secrets: ['API_KEY', 'API_SECRET', 'ACCESS_TOKEN', 'ACCESS_TOKEN_SECRET', 'BEARER_TOKEN', 'ECHO_API_KEY', 'GROK_API_KEY'],
    crons: ['0 15 * * *', '0 17 * * *', '0 22 * * *', '0 0 * * *', '0 16 * * 0', '0 17 1 * *'],
    description: 'X/Twitter bot — 107+ tweets, A/B testing, Grok images, post caps',
    tier: 'T2',
  },
  {
    name: 'echo-linkedin', binding: 'LINKEDIN', healthPath: '/health',
    category: 'bot', critical: false, dependsOn: ['echo-chat', 'echo-shared-brain'],
    secrets: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_PERSON_ID', 'ECHO_API_KEY', 'GROK_API_KEY'],
    crons: ['0 15 * * *', '0 18 * * *', '0 21 * * *', '0 0 * * *', '0 16 * * 0', '0 17 1 * *', '*/30 * * * *'],
    description: 'LinkedIn bot — 61+ posts, DM auto-reply, A/B testing, lead detection',
    tier: 'T2',
  },
  {
    name: 'echo-telegram', binding: 'TELEGRAM', healthPath: '/health',
    category: 'bot', critical: false, dependsOn: ['echo-chat', 'echo-shared-brain'],
    secrets: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'ECHO_API_KEY'],
    crons: ['0 14 * * *', '0 0 * * *', '0 16 * * 0', '0 15 1 * *', '0 8 * * *', '0 3 * * *'],
    description: 'Telegram bot — 32 personalities, Grok images, webhook mode',
    tier: 'T2',
  },
  {
    name: 'echo-slack', binding: 'SLACK', healthPath: '/health',
    category: 'bot', critical: false, dependsOn: ['echo-chat', 'echo-shared-brain'],
    secrets: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'ECHO_API_KEY', 'GROK_API_KEY'],
    crons: ['0 14 * * *', '0 0 * * *'],
    description: 'Slack bot — Events API, slash commands, Block Kit UI',
    tier: 'T2',
  },
  {
    name: 'echo-reddit-bot', binding: 'REDDIT', healthPath: '/health',
    category: 'bot', critical: false, dependsOn: ['echo-chat', 'echo-shared-brain'],
    secrets: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_USERNAME', 'REDDIT_PASSWORD', 'ECHO_API_KEY'],
    crons: ['0 */4 * * *', '0 18 * * *', '0 12 * * 3', '0 17 1 * *', '0 3 * * *'],
    description: 'Reddit bot — 11 subreddit monitoring, keyword replies',
    tier: 'T2',
  },

  // ── T3: Scrapers & Peripheral ──────────────────────────────────────────────
  {
    name: 'echo-darkweb-intelligence', binding: 'DARKWEB_INTEL', healthPath: '/health',
    category: 'scraper', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: ['*/10 * * * *', '0 */6 * * *', '0 8 * * *'],
    description: 'Dark web threat scraping + intelligence — threats, brand monitoring, breach detection',
    tier: 'T3',
  },
  {
    name: 'echo-news-scraper', binding: 'NEWS_SCRAPER', healthPath: '/health',
    category: 'scraper', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'News aggregation — 291+ articles, multi-source',
    tier: 'T3',
  },
  {
    name: 'echo-reddit-monitor', binding: 'REDDIT_MONITOR', healthPath: '/health',
    category: 'scraper', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Reddit monitoring — 132 posts, 70 alerts, 6 subreddits',
    tier: 'T3',
  },
  {
    name: 'echo-price-alerts', binding: 'PRICE_ALERT', healthPath: '/health',
    category: 'scraper', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: ['*/5 * * * *', '*/15 * * * *'],
    description: 'Price alerts — BTC/ETH/SOL, configurable thresholds',
    tier: 'T3',
  },
  {
    name: 'echo-sec-scraper', binding: 'SEC_EDGAR', healthPath: '/health',
    category: 'scraper', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: ['0 */4 * * *', '0 14 * * 1-5'],
    description: 'SEC EDGAR filing scraper — 10 watchlist companies',
    tier: 'T3',
  },
  {
    name: 'echo-crypto-trader', binding: 'CRYPTO_TRADER', healthPath: '/health',
    category: 'scraper', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Crypto trading — Grid+Momentum strategies, BTC-USDC',
    tier: 'T3',
  },
  {
    name: 'echo-knowledge-harvester', binding: 'KNOWLEDGE_HARVESTER', healthPath: '/health',
    category: 'intelligence', critical: false, dependsOn: ['echo-knowledge-forge'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Knowledge harvesting — 56 sources, 18 categories',
    tier: 'T3',
  },
  {
    name: 'echo-knowledge-scout', binding: 'KNOWLEDGE_SCOUT', healthPath: '/health',
    category: 'intelligence', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Daily discovery reports — GitHub, Reddit, HN, arXiv, RSS',
    tier: 'T3',
  },
  {
    name: 'echo-model-host', binding: 'MODEL_HOST', healthPath: '/health',
    category: 'intelligence', critical: false, dependsOn: [],
    secrets: ['BRAVO_INFERENCE_URL'], crons: [],
    description: 'Model inference proxy — BRAVO RTX 3070, 10 LoRA adapters',
    tier: 'T3',
  },
  {
    name: 'echo-gs343', binding: 'GS343_CLOUD', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Error healing templates — 722 patterns, D1+KV cache',
    tier: 'T3',
  },
  {
    name: 'echo-phoenix-cloud', binding: 'PHOENIX_CLOUD', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: ['echo-gs343'],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Auto-healer — dependency resolver, healing strategies',
    tier: 'T3',
  },
  {
    name: 'echo-memory-cortex', binding: 'MEMORY_CORTEX', healthPath: '/health',
    category: 'intelligence', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Cloud memory cortex — 8,251 memories, cognitive tiers',
    tier: 'T3',
  },
  {
    name: 'echo-agent-coordinator', binding: 'AGENT_COORDINATOR', healthPath: '/health',
    category: 'intelligence', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: '5 agent strategies, cross-domain analysis, self-improvement loop',
    tier: 'T3',
  },
  {
    name: 'echo-a2a-protocol', binding: 'A2A_PROTOCOL', healthPath: '/health',
    category: 'intelligence', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Agent-to-agent protocol — 7 agents, delegation chains',
    tier: 'T3',
  },
  {
    name: 'echo-paypal', binding: 'PAYPAL', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'], crons: [],
    description: 'PayPal integration — 26 endpoints, OAuth pending',
    tier: 'T3',
  },
  {
    name: 'ept-api', binding: 'EPT_API', healthPath: '/health',
    category: 'product', critical: true, dependsOn: [],
    secrets: ['STRIPE_SECRET_KEY', 'ECHO_API_KEY'], crons: [],
    description: 'echo-ept.com API — products, pricing, checkout, leads',
    tier: 'T2',
  },
  {
    name: 'openclaw-bridge', binding: 'OPENCLAW_BRIDGE', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'OpenClaw gateway bridge — 10 routes, D1+KV',
    tier: 'T3',
  },
  {
    name: 'echo-instagram', binding: 'INSTAGRAM', healthPath: '/health',
    category: 'bot', critical: false, dependsOn: ['echo-chat'],
    secrets: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_VERIFY_TOKEN', 'META_APP_SECRET', 'ECHO_API_KEY', 'GROK_API_KEY'],
    crons: ['0 15 * * *', '0 18 * * *', '0 21 * * *', '0 16 * * 0', '0 17 1 * *'],
    description: 'Instagram bot — 14 personalities, Meta webhook, OAuth flow',
    tier: 'T2',
  },
  {
    name: 'echo-whatsapp', binding: 'WHATSAPP', healthPath: '/health',
    category: 'bot', critical: false, dependsOn: ['echo-chat'],
    secrets: ['WHATSAPP_TOKEN', 'WHATSAPP_VERIFY_TOKEN', 'META_APP_SECRET', 'ECHO_API_KEY'],
    crons: [],
    description: 'WhatsApp Business bot — webhook, interactive messages, OTP pending',
    tier: 'T2',
  },
  {
    name: 'echo-messenger', binding: 'MESSENGER', healthPath: '/health',
    category: 'bot', critical: false, dependsOn: ['echo-chat'],
    secrets: ['FB_PAGE_ACCESS_TOKEN', 'FB_VERIFY_TOKEN', 'FB_APP_SECRET', 'ECHO_API_KEY'],
    crons: [],
    description: 'Facebook Messenger bot — persistent menu, quick replies',
    tier: 'T2',
  },
  {
    name: 'echo-messaging-gateway', binding: 'MESSAGING_GATEWAY', healthPath: '/health',
    category: 'bot', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Multi-platform messaging gateway — Telegram+WhatsApp+Messenger',
    tier: 'T2',
  },

  // ── Infrastructure Fleet (wrangler-bound, previously missing from registry) ─
  {
    name: 'echo-incident-manager', binding: 'INCIDENT_MANAGER', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Incident tracking — severity tiers, timeline, resolution workflow',
    tier: 'T2',
  },
  {
    name: 'echo-cost-optimizer', binding: 'COST_OPTIMIZER', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Cost optimization — resource analysis, waste detection, budget tracking',
    tier: 'T2',
  },
  {
    name: 'echo-deployment-coordinator', binding: 'DEPLOYMENT_COORDINATOR', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Deployment coordination — canary, rollback, blue-green orchestration',
    tier: 'T2',
  },
  {
    name: 'echo-circuit-breaker', binding: 'CIRCUIT_BREAKER', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Circuit breaker — failure detection, automatic service isolation',
    tier: 'T2',
  },

  // ── Revenue Products (expanded 2026-03-28) ────────────────────────────────
  {
    name: 'echo-crm', binding: 'CRM', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'CRM — contact management, pipeline tracking, deal stages',
    tier: 'T2',
  },
  {
    name: 'echo-helpdesk', binding: 'HELPDESK', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Helpdesk — ticket management, SLA tracking, knowledge base integration',
    tier: 'T2',
  },
  {
    name: 'echo-booking', binding: 'BOOKING', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Booking — appointment scheduling, availability management, reminders',
    tier: 'T2',
  },
  {
    name: 'echo-invoice', binding: 'INVOICE', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Invoicing — invoice generation, payment tracking, recurring billing',
    tier: 'T2',
  },
  {
    name: 'echo-email-sender', binding: 'EMAIL_SENDER', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Email sender — transactional email, templates, delivery tracking',
    tier: 'T2',
  },
  {
    name: 'echo-live-chat', binding: 'LIVE_CHAT', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Live chat — real-time customer support widget, agent routing',
    tier: 'T2',
  },
  {
    name: 'echo-forms', binding: 'FORMS', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Forms — dynamic form builder, submissions, conditional logic',
    tier: 'T2',
  },
  {
    name: 'echo-finance-ai', binding: 'FINANCE_AI', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Finance AI — financial analysis, forecasting, cash flow intelligence',
    tier: 'T2',
  },
  {
    name: 'echo-project-manager', binding: 'PROJECT_MANAGER', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Project manager — task boards, milestones, team collaboration',
    tier: 'T2',
  },
  {
    name: 'echo-hr', binding: 'HR', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'HR management — employee records, onboarding, leave tracking',
    tier: 'T2',
  },
  {
    name: 'echo-call-center', binding: 'CALL_CENTER', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Call center — IVR, call routing, agent dashboard, recording',
    tier: 'T2',
  },
  {
    name: 'echo-home-ai', binding: 'HOME_AI', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Home AI — smart home control, device management, automation rules',
    tier: 'T2',
  },
  {
    name: 'echo-shepherd-ai', binding: 'SHEPHERD_AI', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Shepherd AI — user onboarding, guided tours, feature adoption',
    tier: 'T2',
  },
  {
    name: 'echo-intel-hub', binding: 'INTEL_HUB', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Intel hub — competitive intelligence, market signals, trend analysis',
    tier: 'T2',
  },

  // ── Infrastructure (expanded 2026-03-28) ──────────────────────────────────
  {
    name: 'echo-autonomous-builder', binding: 'AUTO_BUILDER', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Autonomous builder — self-constructing Worker pipeline, code generation',
    tier: 'T2',
  },
  {
    name: 'echo-arcanum', binding: 'ARCANUM', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Arcanum — 194 sovereign templates, prompt library, build plan search',
    tier: 'T2',
  },
  {
    name: 'echo-health-dashboard', binding: 'HEALTH_DASHBOARD', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Health dashboard — unified monitoring UI, service status aggregation',
    tier: 'T2',
  },
  {
    name: 'echo-bot-auditor', binding: 'BOT_AUDITOR', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Bot auditor — bot fleet compliance, posting quality, engagement metrics',
    tier: 'T2',
  },
  {
    name: 'echo-analytics-pipeline', binding: 'ANALYTICS_PIPELINE', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Analytics pipeline — event ingestion, aggregation, dashboard data',
    tier: 'T2',
  },
  {
    name: 'echo-status-page', binding: 'STATUS_PAGE', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Status page — public service status, uptime display, incident feed',
    tier: 'T2',
  },
  {
    name: 'echo-fleet-commander', binding: 'FLEET_COMMANDER_SELF', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: ['*/5 * * * *', '0 * * * *', '0 */6 * * *', '0 9 * * *', '0 0 * * SUN'],
    description: 'Fleet commander — self-reference for recursive health monitoring',
    tier: 'T2',
  },

  // ── Extended Products (2026-03-28, T3) ────────────────────────────────────
  {
    name: 'echo-surveys', binding: 'SURVEYS', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Surveys — customer feedback, NPS, form-based data collection',
    tier: 'T3',
  },
  {
    name: 'echo-knowledge-base', binding: 'KB', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Knowledge base — self-service articles, search, category management',
    tier: 'T3',
  },
  {
    name: 'echo-email-marketing', binding: 'EMAIL_MARKETING', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Email marketing — campaigns, drip sequences, list management',
    tier: 'T3',
  },
  {
    name: 'echo-lms', binding: 'LMS', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'LMS — learning management, courses, progress tracking, quizzes',
    tier: 'T3',
  },
  {
    name: 'echo-contracts', binding: 'CONTRACTS', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Contracts — contract generation, e-signature, version tracking',
    tier: 'T3',
  },
  {
    name: 'echo-inventory', binding: 'INVENTORY', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Inventory — stock management, SKU tracking, reorder alerts',
    tier: 'T3',
  },
  {
    name: 'echo-workflow-automation', binding: 'WORKFLOW', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Workflow automation — trigger-action chains, conditional logic, integrations',
    tier: 'T3',
  },
  {
    name: 'echo-social-media', binding: 'SOCIAL_MEDIA', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Social media — multi-platform scheduling, analytics, content calendar',
    tier: 'T3',
  },
  {
    name: 'echo-document-manager', binding: 'DOCUMENT_MANAGER', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Document manager — file storage, versioning, access control, sharing',
    tier: 'T3',
  },
  {
    name: 'echo-link-shortener', binding: 'LINK_SHORTENER', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Link shortener — vanity URLs, click tracking, QR code generation',
    tier: 'T3',
  },
  {
    name: 'echo-feedback-board', binding: 'FEEDBACK_BOARD', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Feedback board — feature requests, upvoting, public roadmap',
    tier: 'T3',
  },
  {
    name: 'echo-newsletter', binding: 'NEWSLETTER', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Newsletter — subscriber management, scheduled sends, open tracking',
    tier: 'T3',
  },
  {
    name: 'echo-web-analytics', binding: 'WEB_ANALYTICS', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Web analytics — page views, sessions, funnels, privacy-first tracking',
    tier: 'T3',
  },
  {
    name: 'echo-waitlist', binding: 'WAITLIST', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Waitlist — launch signups, referral tracking, invite management',
    tier: 'T3',
  },
  {
    name: 'echo-reviews', binding: 'REVIEWS', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Reviews — customer reviews, ratings, sentiment analysis, moderation',
    tier: 'T3',
  },
  {
    name: 'echo-proposals', binding: 'PROPOSALS', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Proposals — proposal builder, templates, e-sign, client portal',
    tier: 'T3',
  },
  {
    name: 'echo-affiliate', binding: 'AFFILIATE', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Affiliate — partner tracking, commission management, payout automation',
    tier: 'T3',
  },
  {
    name: 'echo-signatures', binding: 'SIGNATURES', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Signatures — e-signature collection, document workflow, audit trail',
    tier: 'T3',
  },
  {
    name: 'echo-qr-menu', binding: 'QR_MENU', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'QR menu — digital menus, contactless ordering, restaurant management',
    tier: 'T3',
  },
  {
    name: 'echo-podcast', binding: 'PODCAST', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Podcast — RSS feed generation, episode management, analytics',
    tier: 'T3',
  },
  {
    name: 'echo-payroll', binding: 'PAYROLL', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Payroll — salary calculation, tax withholding, pay stub generation',
    tier: 'T3',
  },
  {
    name: 'echo-calendar', binding: 'CALENDAR', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Calendar — event scheduling, availability sharing, team coordination',
    tier: 'T3',
  },
  {
    name: 'echo-compliance', binding: 'COMPLIANCE', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Compliance — regulatory checks, policy management, audit preparation',
    tier: 'T3',
  },
  {
    name: 'echo-recruiting', binding: 'RECRUITING', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Recruiting — job postings, applicant tracking, interview scheduling',
    tier: 'T3',
  },
  {
    name: 'echo-timesheet', binding: 'TIMESHEET', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Timesheet — time tracking, project hours, billing integration',
    tier: 'T3',
  },
  {
    name: 'echo-feature-flags', binding: 'FEATURE_FLAGS', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Feature flags — gradual rollout, A/B testing, kill switches',
    tier: 'T3',
  },
  {
    name: 'echo-expense', binding: 'EXPENSE', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Expense — receipt capture, expense reports, approval workflows',
    tier: 'T3',
  },
  {
    name: 'echo-okr', binding: 'OKR', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'OKR — objectives and key results, goal alignment, progress tracking',
    tier: 'T3',
  },
  {
    name: 'echo-gamer-companion', binding: 'GAMER', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Gamer companion — game strategy, stat tracking, community features',
    tier: 'T3',
  },
  {
    name: 'echo-analytics-engine', binding: 'ANALYTICS_ENGINE', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Analytics engine — custom metrics, dashboards, data visualization',
    tier: 'T3',
  },
  {
    name: 'echo-report-generator', binding: 'REPORT_GEN', healthPath: '/health',
    category: 'product', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Report generator — automated reports, PDF export, scheduled delivery',
    tier: 'T3',
  },
  {
    name: 'echo-diagnostics-agent', binding: 'DIAGNOSTICS', healthPath: '/health',
    category: 'infra', critical: false, dependsOn: [],
    secrets: ['ECHO_API_KEY'], crons: [],
    description: 'Diagnostics agent — deep health analysis, root cause detection, remediation',
    tier: 'T3',
  },
];

// Build dependency map
const DEPENDENCY_MAP = new Map<string, string[]>();
for (const w of FLEET_REGISTRY) {
  for (const dep of w.dependsOn) {
    const existing = DEPENDENCY_MAP.get(dep) || [];
    existing.push(w.name);
    DEPENDENCY_MAP.set(dep, existing);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

async function ensureSchema(db: D1Database): Promise<void> {
  await db.batch([
    // Fleet health snapshots
    db.prepare(`CREATE TABLE IF NOT EXISTS fleet_health (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker TEXT NOT NULL,
      healthy INTEGER NOT NULL DEFAULT 1,
      latency_ms INTEGER DEFAULT 0,
      version TEXT,
      status TEXT,
      error TEXT,
      tier TEXT,
      category TEXT,
      checked_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_fh_worker ON fleet_health(worker, checked_at DESC)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_fh_time ON fleet_health(checked_at DESC)`),

    // Fleet snapshots (full fleet state at a point in time)
    db.prepare(`CREATE TABLE IF NOT EXISTS fleet_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_workers INTEGER NOT NULL,
      healthy INTEGER NOT NULL,
      degraded INTEGER DEFAULT 0,
      down INTEGER DEFAULT 0,
      avg_latency_ms REAL DEFAULT 0,
      fleet_score INTEGER DEFAULT 100,
      tier_scores TEXT DEFAULT '{}',
      category_scores TEXT DEFAULT '{}',
      snapshot_type TEXT DEFAULT 'quick',
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_fs_time ON fleet_snapshots(created_at DESC)`),

    // Incidents
    db.prepare(`CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'active',
      affected_workers TEXT DEFAULT '[]',
      timeline TEXT DEFAULT '[]',
      root_cause TEXT,
      resolution TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_inc_status ON incidents(status, created_at DESC)`),

    // Deploy tracking
    db.prepare(`CREATE TABLE IF NOT EXISTS deploys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker TEXT NOT NULL,
      old_version TEXT,
      new_version TEXT,
      trigger TEXT DEFAULT 'cron',
      status TEXT DEFAULT 'detected',
      canary_result TEXT,
      detected_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_dep_worker ON deploys(worker, detected_at DESC)`),

    // Command log
    db.prepare(`CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_worker TEXT NOT NULL,
      command TEXT NOT NULL,
      params TEXT DEFAULT '{}',
      result TEXT,
      status TEXT DEFAULT 'pending',
      issued_by TEXT DEFAULT 'commander',
      issued_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_cmd_status ON commands(status, issued_at DESC)`),

    // Briefings
    db.prepare(`CREATE TABLE IF NOT EXISTS briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      briefing_type TEXT NOT NULL,
      content TEXT NOT NULL,
      fleet_score INTEGER DEFAULT 100,
      highlights TEXT DEFAULT '[]',
      concerns TEXT DEFAULT '[]',
      recommendations TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_brief_type ON briefings(briefing_type, created_at DESC)`),

    // Fleet audit log (immutable)
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor TEXT DEFAULT 'fleet-commander',
      target TEXT,
      details TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(created_at DESC)`),

    // Uptime tracking (daily aggregates)
    db.prepare(`CREATE TABLE IF NOT EXISTS daily_uptime (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker TEXT NOT NULL,
      date TEXT NOT NULL,
      checks INTEGER DEFAULT 0,
      healthy_checks INTEGER DEFAULT 0,
      uptime_pct REAL DEFAULT 100.0,
      avg_latency_ms REAL DEFAULT 0,
      max_latency_ms INTEGER DEFAULT 0,
      min_latency_ms INTEGER DEFAULT 0,
      UNIQUE(worker, date)
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_du_date ON daily_uptime(date DESC, worker)`),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK ENGINE — Multi-tier parallel health scanning
// ═══════════════════════════════════════════════════════════════════════════════

async function checkWorkerHealth(worker: WorkerEntry, env: Env, perWorkerTimeoutMs = 6000): Promise<FleetHealthResult> {
  const start = Date.now();
  const now = new Date().toISOString();

  // Wrap the entire check in a timeout — service bindings ignore AbortSignal,
  // so we use Promise.race with a timer that resolves (not rejects) to a timeout result.
  const timeoutResult: FleetHealthResult = {
    worker: worker.name, healthy: false, latencyMs: perWorkerTimeoutMs,
    error: `Timeout after ${perWorkerTimeoutMs}ms`, checkedAt: now,
  };

  const check = async (): Promise<FleetHealthResult> => {
    try {
      let resp: Response;
      const fetcher = worker.binding ? (env as any)[worker.binding] as Fetcher : null;

      if (fetcher) {
        resp = await fetcher.fetch(new Request(`https://internal${worker.healthPath}`));
      } else if (worker.publicUrl) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), perWorkerTimeoutMs - 500);
        try {
          resp = await fetch(`${worker.publicUrl}${worker.healthPath}`, { signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
      } else {
        return { worker: worker.name, healthy: false, latencyMs: 0, error: 'No binding or URL', checkedAt: now };
      }

      const latency = Date.now() - start;
      if (!resp.ok) {
        return { worker: worker.name, healthy: false, latencyMs: latency, status: `HTTP ${resp.status}`, checkedAt: now };
      }

      const data = await resp.json().catch((e: unknown) => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', worker: 'echo-fleet-commander', msg: 'health check resp.json() failed', error: String(e) })); return {}; }) as any;
      return {
        worker: worker.name, healthy: true, latencyMs: latency,
        version: data.version || data.v || undefined, status: data.status || 'ok', checkedAt: now,
      };
    } catch (err: any) {
      return {
        worker: worker.name, healthy: false, latencyMs: Date.now() - start,
        error: err.message?.slice(0, 200) || 'Unknown error', checkedAt: now,
      };
    }
  };

  // Note: Service binding fetches block the event loop, so Promise.race won't truly
  // interrupt them. But it caps latency reporting and prevents cascading slowness.
  return Promise.race([
    check(),
    new Promise<FleetHealthResult>(resolve => setTimeout(() => resolve(timeoutResult), perWorkerTimeoutMs)),
  ]);
}

async function scanFleet(env: Env, tier?: string): Promise<FleetHealthResult[]> {
  const workers = tier
    ? FLEET_REGISTRY.filter(w => w.tier === tier)
    : FLEET_REGISTRY;

  const scanStart = Date.now();
  const GLOBAL_DEADLINE_MS = 25000; // Hard cap at 25s to stay under 30s CPU limit
  const PER_WORKER_TIMEOUT = tier ? 6000 : 5000; // Tighter timeout for full scans
  const results: FleetHealthResult[] = [];

  // Prioritize: critical workers first, then by tier weight
  const sorted = [...workers].sort((a, b) => {
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    const tierOrder: Record<string, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };
    return (tierOrder[a.tier] || 9) - (tierOrder[b.tier] || 9);
  });

  // Parallel health checks in batches of 15 (service bindings are fast for healthy workers)
  const batchSize = 15;
  for (let i = 0; i < sorted.length; i += batchSize) {
    // Check global deadline before starting next batch
    if (Date.now() - scanStart > GLOBAL_DEADLINE_MS) {
      log('warn', 'Fleet scan hit global deadline, marking remaining as timeout', {
        scanned: results.length, remaining: sorted.length - i,
      });
      // Mark remaining workers as timeout rather than skipping them
      for (let j = i; j < sorted.length; j++) {
        results.push({
          worker: sorted[j].name, healthy: false, latencyMs: 0,
          error: 'Scan deadline exceeded', checkedAt: new Date().toISOString(),
        });
      }
      break;
    }

    const batch = sorted.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(w => checkWorkerHealth(w, env, PER_WORKER_TIMEOUT))
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(r.value);
      else results.push({
        worker: 'unknown', healthy: false, latencyMs: 0,
        error: r.reason?.message, checkedAt: new Date().toISOString(),
      });
    }
  }

  log('info', 'Fleet scan complete', {
    total: sorted.length, scanned: results.length,
    healthy: results.filter(r => r.healthy).length,
    durationMs: Date.now() - scanStart,
  });

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE REGISTRY HEARTBEAT — Proxy scan results as heartbeats
// ═══════════════════════════════════════════════════════════════════════════════

async function reportHeartbeatsToRegistry(env: Env, results: FleetHealthResult[]): Promise<void> {
  try {
    const services = results.map(r => ({
      name: r.worker,
      status: r.healthy ? 'healthy' : 'unhealthy',
      metadata: {
        latency_ms: r.latencyMs,
        version: r.version || undefined,
        error: r.error || undefined,
        source: 'fleet-commander',
      },
    }));

    const resp = await env.SERVICE_REGISTRY.fetch(new Request('https://internal/heartbeat/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Echo-API-Key': env.ECHO_API_KEY || '',
      },
      body: JSON.stringify({ services }),
    }));

    if (resp.ok) {
      log('info', 'Batch heartbeat sent to service registry', {
        count: services.length,
        healthy: services.filter(s => s.status === 'healthy').length,
      });
    } else {
      log('warn', 'Service registry heartbeat returned non-OK', { status: resp.status });
    }
  } catch (err: any) {
    log('warn', 'Failed to send heartbeats to service registry', { error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLEET SCORING — weighted health score
// ═══════════════════════════════════════════════════════════════════════════════

function scoreFleet(results: FleetHealthResult[]): {
  fleetScore: number;
  tierScores: Record<string, number>;
  categoryScores: Record<string, number>;
  healthy: number;
  degraded: number;
  down: number;
} {
  const tierWeights: Record<string, number> = { T0: 4, T1: 3, T2: 2, T3: 1 };
  let totalWeight = 0;
  let healthyWeight = 0;
  let healthy = 0;
  let degraded = 0;
  let down = 0;

  const tierHealth: Record<string, { total: number; up: number }> = {};
  const catHealth: Record<string, { total: number; up: number }> = {};

  for (const r of results) {
    const entry = FLEET_REGISTRY.find(w => w.name === r.worker);
    const tier = entry?.tier || 'T3';
    const cat = entry?.category || 'utility';
    const weight = tierWeights[tier] || 1;

    totalWeight += weight;
    if (r.healthy) {
      healthyWeight += weight;
      if (r.latencyMs > 3000) degraded++;
      else healthy++;
    } else {
      down++;
    }

    if (!tierHealth[tier]) tierHealth[tier] = { total: 0, up: 0 };
    tierHealth[tier].total++;
    if (r.healthy) tierHealth[tier].up++;

    if (!catHealth[cat]) catHealth[cat] = { total: 0, up: 0 };
    catHealth[cat].total++;
    if (r.healthy) catHealth[cat].up++;
  }

  const fleetScore = totalWeight > 0 ? Math.round((healthyWeight / totalWeight) * 100) : 0;

  const tierScores: Record<string, number> = {};
  for (const [t, s] of Object.entries(tierHealth)) {
    tierScores[t] = s.total > 0 ? Math.round((s.up / s.total) * 100) : 0;
  }

  const categoryScores: Record<string, number> = {};
  for (const [c, s] of Object.entries(catHealth)) {
    categoryScores[c] = s.total > 0 ? Math.round((s.up / s.total) * 100) : 0;
  }

  return { fleetScore, tierScores, categoryScores, healthy, degraded, down };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INCIDENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

async function createIncident(env: Env, title: string, severity: string, affectedWorkers: string[]): Promise<string> {
  await ensureSchema(env.DB);
  const id = `INC-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();
  const timeline = JSON.stringify([`${now}: Incident created — ${title}`]);
  await env.DB.prepare(
    'INSERT INTO incidents (id, title, severity, status, affected_workers, timeline) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, title, severity, 'active', JSON.stringify(affectedWorkers), timeline).run();

  // Notify Shared Brain
  try {
    await env.SHARED_BRAIN.fetch(new Request('https://brain/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instance_id: 'fleet-commander',
        role: 'assistant',
        content: `INCIDENT ${id}: ${title} | Severity: ${severity} | Workers: ${affectedWorkers.join(', ')}`,
        importance: severity === 'critical' ? 10 : severity === 'high' ? 8 : 6,
        tags: ['incident', severity, 'fleet-commander'],
      }),
    }));
  } catch { /* non-critical */ }

  // MoltBook post
  try {
    await env.SWARM_BRAIN.fetch(new Request('https://swarm/moltbook/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author_id: 'fleet-commander', author_name: 'Fleet Commander', author_type: 'agent',
        content: `🚨 INCIDENT ${id}: ${title} | ${severity.toUpperCase()} | ${affectedWorkers.length} workers affected`,
        mood: 'alert', tags: ['incident', severity],
      }),
    }));
  } catch { /* non-critical */ }

  await auditLog(env, 'incident_created', id, { title, severity, affectedWorkers });
  return id;
}

async function autoDetectIncidents(env: Env, results: FleetHealthResult[]): Promise<void> {
  const criticalDown = results.filter(r => {
    const entry = FLEET_REGISTRY.find(w => w.name === r.worker);
    return !r.healthy && entry?.critical;
  });

  if (criticalDown.length > 0) {
    const names = criticalDown.map(r => r.worker);
    // Check if there's already an active incident for these workers
    const existing = await env.DB.prepare(
      "SELECT id FROM incidents WHERE status IN ('active', 'investigating', 'mitigating') AND created_at >= datetime('now', '-1 hour')"
    ).all();

    if ((existing.results || []).length === 0) {
      await createIncident(
        env,
        `Critical workers down: ${names.join(', ')}`,
        'critical',
        names
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

async function trackVersionChanges(env: Env, results: FleetHealthResult[]): Promise<void> {
  for (const r of results) {
    if (!r.version) continue;
    const cached = await env.CACHE.get(`version:${r.worker}`);
    if (cached && cached !== r.version) {
      await env.DB.prepare(
        'INSERT INTO deploys (worker, old_version, new_version, trigger, status) VALUES (?, ?, ?, ?, ?)'
      ).bind(r.worker, cached, r.version, 'detected', 'completed').run();
      log('info', `Deploy detected: ${r.worker} ${cached} → ${r.version}`);
      await auditLog(env, 'deploy_detected', r.worker, { oldVersion: cached, newVersion: r.version });
    }
    await env.CACHE.put(`version:${r.worker}`, r.version, { expirationTtl: 86400 * 30 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRIEFING GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

async function generateBriefing(env: Env, type: 'quick' | 'daily' | 'weekly'): Promise<Record<string, any>> {
  const results = await scanFleet(env);
  const scores = scoreFleet(results);
  const now = new Date().toISOString();

  const highlights: string[] = [];
  const concerns: string[] = [];
  const recommendations: string[] = [];

  // Analyze results
  const downWorkers = results.filter(r => !r.healthy);
  const slowWorkers = results.filter(r => r.healthy && r.latencyMs > 2000);
  const fastWorkers = results.filter(r => r.healthy && r.latencyMs < 100);

  if (downWorkers.length === 0) highlights.push('All fleet workers operational');
  else concerns.push(`${downWorkers.length} workers DOWN: ${downWorkers.map(r => r.worker).join(', ')}`);

  if (slowWorkers.length > 0) concerns.push(`${slowWorkers.length} workers slow (>2s): ${slowWorkers.map(r => `${r.worker}(${r.latencyMs}ms)`).join(', ')}`);
  if (fastWorkers.length > 10) highlights.push(`${fastWorkers.length} workers responding under 100ms`);

  // Tier analysis
  for (const [tier, score] of Object.entries(scores.tierScores)) {
    if (score < 80) concerns.push(`${tier} tier health at ${score}% — investigate`);
    if (score === 100) highlights.push(`${tier} tier: 100% healthy`);
  }

  // Recommendations
  if (downWorkers.length > 0) recommendations.push(`Investigate and restore: ${downWorkers.map(r => r.worker).join(', ')}`);
  if (slowWorkers.length > 3) recommendations.push('Consider scaling or optimizing slow workers');
  if (scores.fleetScore < 90) recommendations.push('Fleet below 90% — run deep diagnostic');

  const avgLatency = results.length > 0
    ? Math.round(results.filter(r => r.healthy).reduce((s, r) => s + r.latencyMs, 0) / Math.max(results.filter(r => r.healthy).length, 1))
    : 0;

  const briefing = {
    type, timestamp: now,
    fleetScore: scores.fleetScore,
    totalWorkers: FLEET_REGISTRY.length,
    healthy: scores.healthy, degraded: scores.degraded, down: scores.down,
    avgLatencyMs: avgLatency,
    tierScores: scores.tierScores,
    categoryScores: scores.categoryScores,
    highlights, concerns, recommendations,
    topPerformers: results.filter(r => r.healthy).sort((a, b) => a.latencyMs - b.latencyMs).slice(0, 5).map(r => ({ worker: r.worker, latencyMs: r.latencyMs })),
    worstPerformers: results.filter(r => r.healthy).sort((a, b) => b.latencyMs - a.latencyMs).slice(0, 5).map(r => ({ worker: r.worker, latencyMs: r.latencyMs })),
    downList: downWorkers.map(r => ({ worker: r.worker, error: r.error })),
  };

  // Store briefing
  await ensureSchema(env.DB);
  await env.DB.prepare(
    'INSERT INTO briefings (briefing_type, content, fleet_score, highlights, concerns, recommendations) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(type, JSON.stringify(briefing), scores.fleetScore, JSON.stringify(highlights), JSON.stringify(concerns), JSON.stringify(recommendations)).run();

  await env.CACHE.put('latest_briefing', JSON.stringify(briefing), { expirationTtl: 3600 });
  return briefing;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLEET SEARCH — Find any worker/capability/endpoint
// ═══════════════════════════════════════════════════════════════════════════════

function searchFleet(query: string): WorkerEntry[] {
  const q = query.toLowerCase();
  return FLEET_REGISTRY.filter(w =>
    w.name.toLowerCase().includes(q) ||
    w.description.toLowerCase().includes(q) ||
    w.category.toLowerCase().includes(q) ||
    w.tier.toLowerCase() === q
  ).sort((a, b) => {
    // Prioritize exact name matches
    const aExact = a.name.toLowerCase() === q ? 0 : 1;
    const bExact = b.name.toLowerCase() === q ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    // Then by tier
    return a.tier.localeCompare(b.tier);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND DISPATCH — Send commands to workers
// ═══════════════════════════════════════════════════════════════════════════════

async function dispatchCommand(env: Env, target: string, command: string, params: Record<string, any> = {}): Promise<Record<string, any>> {
  await ensureSchema(env.DB);
  const entry = FLEET_REGISTRY.find(w => w.name === target);
  if (!entry) return { error: `Worker "${target}" not found in registry` };

  let result: any = null;
  let status = 'completed';

  try {
    switch (command) {
      case 'health': {
        const r = await checkWorkerHealth(entry, env);
        result = r;
        break;
      }
      case 'trigger-cycle': {
        if (target === 'echo-autonomous-daemon' && entry.binding) {
          const fetcher = (env as any)[entry.binding] as Fetcher;
          const type = params.type || 'manual';
          const resp = await fetcher.fetch(new Request(`https://internal/cycle?type=${type}`, { method: 'POST' }));
          result = await resp.json().catch((e: unknown) => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', worker: 'echo-fleet-commander', msg: 'daemon cycle trigger resp.json() failed', error: String(e) })); return { status: resp.status }; });
        } else {
          result = { error: 'Cycle trigger only supported for daemon' };
          status = 'failed';
        }
        break;
      }
      case 'run-tests': {
        if (target === 'echo-qa-tester' && entry.binding) {
          const fetcher = (env as any)[entry.binding] as Fetcher;
          const resp = await fetcher.fetch(new Request('https://internal/run', { method: 'POST' }));
          result = await resp.json().catch((e: unknown) => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', worker: 'echo-fleet-commander', msg: 'QA test run resp.json() failed', error: String(e) })); return { status: resp.status }; });
        } else {
          result = { error: 'Test trigger only supported for QA tester' };
          status = 'failed';
        }
        break;
      }
      case 'stats': {
        const fetcher = entry.binding ? (env as any)[entry.binding] as Fetcher : null;
        if (fetcher) {
          const resp = await fetcher.fetch(new Request('https://internal/stats'));
          result = await resp.json().catch((e: unknown) => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', worker: 'echo-fleet-commander', msg: 'stats fetch via binding resp.json() failed', error: String(e) })); return { status: resp.status }; });
        } else if (entry.publicUrl) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          try {
            const resp = await fetch(`${entry.publicUrl}/stats`, { signal: controller.signal });
            result = await resp.json().catch((e: unknown) => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', worker: 'echo-fleet-commander', msg: 'stats fetch via public URL resp.json() failed', error: String(e) })); return { status: resp.status }; });
          } finally { clearTimeout(timeout); }
        }
        break;
      }
      default:
        result = { error: `Unknown command: ${command}` };
        status = 'failed';
    }
  } catch (err: any) {
    result = { error: err.message };
    status = 'failed';
  }

  // Record command
  await env.DB.prepare(
    'INSERT INTO commands (target_worker, command, params, result, status, completed_at) VALUES (?, ?, ?, ?, ?, datetime(?))'
  ).bind(target, command, JSON.stringify(params), JSON.stringify(result), status, new Date().toISOString()).run();

  await auditLog(env, 'command_dispatched', target, { command, params, status });
  return { target, command, status, result };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLEET TOPOLOGY — Dependency graph analysis
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeTopology(): Record<string, any> {
  const nodes = FLEET_REGISTRY.map(w => ({
    name: w.name, tier: w.tier, category: w.category, critical: w.critical,
    inDegree: w.dependsOn.length,
    outDegree: DEPENDENCY_MAP.get(w.name)?.length || 0,
  }));

  // Find single points of failure (critical + high out-degree)
  const spofs = nodes.filter(n => n.critical && n.outDegree > 2).sort((a, b) => b.outDegree - a.outDegree);

  // Find orphans (no dependencies and nothing depends on them)
  const orphans = nodes.filter(n => n.inDegree === 0 && n.outDegree === 0);

  // Critical path (T0 → T1 → T2 dependency chain)
  const criticalPath = FLEET_REGISTRY
    .filter(w => w.critical)
    .sort((a, b) => a.tier.localeCompare(b.tier))
    .map(w => ({ name: w.name, tier: w.tier, dependsOn: w.dependsOn, dependents: DEPENDENCY_MAP.get(w.name) || [] }));

  // Category breakdown
  const categories: Record<string, number> = {};
  const tiers: Record<string, number> = {};
  for (const w of FLEET_REGISTRY) {
    categories[w.category] = (categories[w.category] || 0) + 1;
    tiers[w.tier] = (tiers[w.tier] || 0) + 1;
  }

  return {
    totalWorkers: FLEET_REGISTRY.length,
    categories, tiers,
    criticalWorkers: FLEET_REGISTRY.filter(w => w.critical).length,
    totalEdges: FLEET_REGISTRY.reduce((s, w) => s + w.dependsOn.length, 0),
    spofs: spofs.map(n => ({ name: n.name, dependents: n.outDegree })),
    orphans: orphans.map(n => n.name),
    criticalPath,
    maxInDegree: Math.max(...nodes.map(n => n.inDegree)),
    maxOutDegree: Math.max(...nodes.map(n => n.outDegree)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRON HANDLER — Autonomous fleet monitoring
// ═══════════════════════════════════════════════════════════════════════════════

async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  const cron = event.cron;
  log('info', 'Fleet Commander cron triggered', { cron });

  try {
    await ensureSchema(env.DB);

    if (cron === '*/5 * * * *') {
      // Quick heartbeat — check critical workers only
      const results = await scanFleet(env, 'T0');
      const t1Results = await scanFleet(env, 'T1');
      const allResults = [...results, ...t1Results];

      // Store health data
      for (const r of allResults) {
        const entry = FLEET_REGISTRY.find(w => w.name === r.worker);
        await env.DB.prepare(
          'INSERT INTO fleet_health (worker, healthy, latency_ms, version, status, error, tier, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(r.worker, r.healthy ? 1 : 0, r.latencyMs, r.version || null, r.status || null, r.error || null, entry?.tier || 'T3', entry?.category || 'utility').run();
      }

      // Auto-detect incidents
      await autoDetectIncidents(env, allResults);

      // Track version changes
      await trackVersionChanges(env, allResults);

      // Cache latest T0+T1 health
      await env.CACHE.put('fleet_quick_health', JSON.stringify({
        timestamp: new Date().toISOString(),
        results: allResults,
        scores: scoreFleet(allResults),
      }), { expirationTtl: 600 });

      // Report heartbeats to service registry (T0+T1 only on quick scan)
      await reportHeartbeatsToRegistry(env, allResults);

    } else if (cron === '0 * * * *') {
      // Hourly — full fleet scan
      const results = await scanFleet(env);
      const scores = scoreFleet(results);

      // Store all health data
      for (const r of results) {
        const entry = FLEET_REGISTRY.find(w => w.name === r.worker);
        await env.DB.prepare(
          'INSERT INTO fleet_health (worker, healthy, latency_ms, version, status, error, tier, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(r.worker, r.healthy ? 1 : 0, r.latencyMs, r.version || null, r.status || null, r.error || null, entry?.tier || 'T3', entry?.category || 'utility').run();
      }

      // Store fleet snapshot
      const avgLatency = results.filter(r => r.healthy).length > 0
        ? Math.round(results.filter(r => r.healthy).reduce((s, r) => s + r.latencyMs, 0) / results.filter(r => r.healthy).length)
        : 0;
      await env.DB.prepare(
        'INSERT INTO fleet_snapshots (total_workers, healthy, degraded, down, avg_latency_ms, fleet_score, tier_scores, category_scores, snapshot_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(FLEET_REGISTRY.length, scores.healthy, scores.degraded, scores.down, avgLatency, scores.fleetScore, JSON.stringify(scores.tierScores), JSON.stringify(scores.categoryScores), 'hourly').run();

      await trackVersionChanges(env, results);
      await autoDetectIncidents(env, results);

      // Update daily uptime aggregates
      const today = new Date().toISOString().split('T')[0];
      for (const r of results) {
        await env.DB.prepare(`
          INSERT INTO daily_uptime (worker, date, checks, healthy_checks, avg_latency_ms, max_latency_ms, min_latency_ms, uptime_pct)
          VALUES (?, ?, 1, ?, ?, ?, ?, ?)
          ON CONFLICT(worker, date) DO UPDATE SET
            checks = checks + 1,
            healthy_checks = healthy_checks + ?,
            avg_latency_ms = (avg_latency_ms * checks + ?) / (checks + 1),
            max_latency_ms = MAX(max_latency_ms, ?),
            min_latency_ms = MIN(min_latency_ms, ?),
            uptime_pct = ROUND(CAST(healthy_checks + ? AS REAL) / (checks + 1) * 100, 2)
        `).bind(
          r.worker, today,
          r.healthy ? 1 : 0, r.latencyMs, r.latencyMs, r.latencyMs, r.healthy ? 100 : 0,
          r.healthy ? 1 : 0, r.latencyMs, r.latencyMs, r.latencyMs, r.healthy ? 1 : 0
        ).run();
      }

      // Cache full fleet state
      await env.CACHE.put('fleet_full_health', JSON.stringify({
        timestamp: new Date().toISOString(),
        results,
        scores,
        topology: analyzeTopology(),
      }), { expirationTtl: 3600 });

      // Report ALL worker heartbeats to service registry (full fleet on hourly)
      await reportHeartbeatsToRegistry(env, results);

    } else if (cron === '0 */6 * * *') {
      // Deep analysis + briefing
      const briefing = await generateBriefing(env, 'daily');

      // Push to Shared Brain
      try {
        await env.SHARED_BRAIN.fetch(new Request('https://brain/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instance_id: 'fleet-commander',
            role: 'assistant',
            content: `FLEET BRIEFING: Score ${briefing.fleetScore}/100 | ${briefing.healthy} healthy, ${briefing.down} down | Highlights: ${(briefing.highlights as string[]).join('; ')} | Concerns: ${(briefing.concerns as string[]).join('; ')}`,
            importance: 7,
            tags: ['fleet-briefing', 'fleet-commander'],
          }),
        }));
      } catch { /* non-critical */ }

    } else if (cron === '0 9 * * *') {
      // Morning report
      await generateBriefing(env, 'daily');

    } else if (cron === '0 0 * * SUN') {
      // Weekly review
      await generateBriefing(env, 'weekly');

      // Prune old health data (keep 14 days)
      await env.DB.prepare("DELETE FROM fleet_health WHERE checked_at < datetime('now', '-14 days')").run();
      await env.DB.prepare("DELETE FROM audit_log WHERE created_at < datetime('now', '-30 days')").run();
    }

    log('info', 'Fleet Commander cron completed', { cron });
  } catch (err: any) {
    log('error', 'Fleet Commander cron failed', { cron, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

async function auditLog(env: Env, action: string, target: string | null, details: Record<string, any> = {}): Promise<void> {
  try {
    await env.DB.prepare(
      'INSERT INTO audit_log (action, target, details) VALUES (?, ?, ?)'
    ).bind(action, target, JSON.stringify(details)).run();
  } catch { /* non-critical */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD BUILDER — Unified fleet view
// ═══════════════════════════════════════════════════════════════════════════════

async function buildDashboard(env: Env): Promise<Record<string, any>> {
  // Pull cached or fresh data
  let fleetHealth = await env.CACHE.get('fleet_full_health', 'json') as any;
  if (!fleetHealth) {
    const results = await scanFleet(env);
    const scores = scoreFleet(results);
    fleetHealth = { timestamp: new Date().toISOString(), results, scores, topology: analyzeTopology() };
    await env.CACHE.put('fleet_full_health', JSON.stringify(fleetHealth), { expirationTtl: 300 });
  }

  // Recent incidents
  await ensureSchema(env.DB);
  const incidents = await env.DB.prepare("SELECT * FROM incidents WHERE status != 'resolved' ORDER BY created_at DESC LIMIT 10").all();

  // Recent deploys
  const deploys = await env.DB.prepare("SELECT * FROM deploys WHERE detected_at >= datetime('now', '-7 days') ORDER BY detected_at DESC LIMIT 20").all();

  // Latest briefing
  const briefing = await env.CACHE.get('latest_briefing', 'json');

  // Fleet snapshot trend
  const snapshots = await env.DB.prepare("SELECT * FROM fleet_snapshots ORDER BY created_at DESC LIMIT 24").all();

  // Daemon intelligence (pull from daemon if available)
  let daemonStatus: any = null;
  try {
    const resp = await env.DAEMON.fetch(new Request('https://internal/status'));
    daemonStatus = await resp.json().catch((e: unknown) => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', worker: 'echo-fleet-commander', msg: 'daemon status resp.json() failed', error: String(e) })); return null; });
  } catch { /* daemon might be busy */ }

  return {
    service: SERVICE, version: VERSION,
    timestamp: new Date().toISOString(),
    fleet: {
      totalWorkers: FLEET_REGISTRY.length,
      ...fleetHealth.scores,
      lastScan: fleetHealth.timestamp,
    },
    topology: fleetHealth.topology,
    incidents: incidents.results || [],
    deploys: deploys.results || [],
    briefing,
    trend: (snapshots.results || []).map((s: any) => ({
      time: s.created_at, score: s.fleet_score,
      healthy: s.healthy, down: s.down, avgLatency: s.avg_latency_ms,
    })),
    daemon: daemonStatus ? {
      version: daemonStatus.state?.version,
      lastCycle: daemonStatus.state?.lastCycleType,
      fleetScore: daemonStatus.state?.fleetScore,
    } : null,
    workerDetails: fleetHealth.results?.map((r: any) => {
      const entry = FLEET_REGISTRY.find(w => w.name === r.worker);
      return {
        ...r,
        tier: entry?.tier, category: entry?.category, critical: entry?.critical,
        description: entry?.description, crons: entry?.crons?.length || 0,
      };
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP REQUEST HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Echo-API-Key',
      },
    });
  }

  // Auth check (except health). Fail-closed: an unconfigured ECHO_API_KEY
  // must never mean "no restriction" — previously `env.ECHO_API_KEY &&
  // apiKey !== env.ECHO_API_KEY` short-circuited to false (open) whenever
  // the secret was unset, letting any request through with no key at all.
  if (path !== '/health' && path !== '/') {
    if (!env.ECHO_API_KEY) {
      return json({ error: 'Service misconfigured: ECHO_API_KEY not set' }, 503);
    }
    const apiKey = request.headers.get('X-Echo-API-Key');
    if (!timingSafeEqual(apiKey, env.ECHO_API_KEY)) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  try {
    switch (path) {
      case '/':
      case '/health': {
        return json({
          status: 'ok', service: SERVICE, version: VERSION,
          timestamp: new Date().toISOString(),
          fleetSize: FLEET_REGISTRY.length,
          categories: {
            core: FLEET_REGISTRY.filter(w => w.category === 'core').length,
            intelligence: FLEET_REGISTRY.filter(w => w.category === 'intelligence').length,
            bot: FLEET_REGISTRY.filter(w => w.category === 'bot').length,
            product: FLEET_REGISTRY.filter(w => w.category === 'product').length,
            infra: FLEET_REGISTRY.filter(w => w.category === 'infra').length,
            scraper: FLEET_REGISTRY.filter(w => w.category === 'scraper').length,
            utility: FLEET_REGISTRY.filter(w => w.category === 'utility').length,
          },
          tiers: {
            T0: FLEET_REGISTRY.filter(w => w.tier === 'T0').length,
            T1: FLEET_REGISTRY.filter(w => w.tier === 'T1').length,
            T2: FLEET_REGISTRY.filter(w => w.tier === 'T2').length,
            T3: FLEET_REGISTRY.filter(w => w.tier === 'T3').length,
          },
          criticalWorkers: FLEET_REGISTRY.filter(w => w.critical).length,
          endpoints: 24,
        });
      }

      // ── Dashboard & Overview ───────────────────────────────────────────────
      case '/dashboard': {
        return json(await buildDashboard(env));
      }

      case '/scan':
      case '/fleet/scan': {
        const tier = url.searchParams.get('tier') || undefined;
        // Check for cached results first (avoid redundant scans within 60s)
        const cacheKey = `scan_result:${tier || 'all'}`;
        const cached = await env.CACHE.get(cacheKey, 'json') as any;
        if (cached && url.searchParams.get('force') !== 'true') {
          return json({ ...cached, fromCache: true });
        }
        const results = await scanFleet(env, tier);
        const scores = scoreFleet(results);
        const scanResult = {
          timestamp: new Date().toISOString(),
          total: results.length,
          healthy: results.filter(r => r.healthy).length,
          unhealthy: results.filter(r => !r.healthy).length,
          fleetScore: scores.fleetScore,
          results, scores,
          scanned: results.length,
          unhealthyWorkers: results.filter(r => !r.healthy).map(r => ({ worker: r.worker, error: r.error, latencyMs: r.latencyMs })),
        };
        // Cache for 60s to prevent hammering
        await env.CACHE.put(cacheKey, JSON.stringify(scanResult), { expirationTtl: 60 });
        // Report heartbeats to service registry on manual scans too
        reportHeartbeatsToRegistry(env, results).catch((e: unknown) => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', worker: 'echo-fleet-commander', msg: 'registry heartbeat report failed', error: String(e) })); });
        return json(scanResult);
      }

      case '/briefing': {
        const type = (url.searchParams.get('type') || 'quick') as 'quick' | 'daily' | 'weekly';
        const briefing = await generateBriefing(env, type);
        return json(briefing);
      }

      // ── Fleet Registry ─────────────────────────────────────────────────────
      case '/registry': {
        const category = url.searchParams.get('category');
        const tier = url.searchParams.get('tier');
        let workers = FLEET_REGISTRY;
        if (category) workers = workers.filter(w => w.category === category);
        if (tier) workers = workers.filter(w => w.tier === tier);
        return json({ total: workers.length, workers });
      }

      case '/search': {
        const q = url.searchParams.get('q') || '';
        if (!q) return json({ error: 'Missing ?q= parameter' }, 400);
        return json({ query: q, results: searchFleet(q) });
      }

      case '/topology': {
        return json(analyzeTopology());
      }

      // ── Incidents ──────────────────────────────────────────────────────────
      case '/incidents': {
        await ensureSchema(env.DB);
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const q = status
          ? 'SELECT * FROM incidents WHERE status = ? ORDER BY created_at DESC LIMIT ?'
          : 'SELECT * FROM incidents ORDER BY created_at DESC LIMIT ?';
        const rows = status
          ? await env.DB.prepare(q).bind(status, limit).all()
          : await env.DB.prepare(q).bind(limit).all();
        return json(rows.results || []);
      }

      case '/incidents/create': {
        if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
        const body: any = await request.json().catch((e: unknown) => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', worker: 'echo-fleet-commander', msg: 'incident create request body parse failed', error: String(e) })); return {}; });
        if (!body.title) return json({ error: 'Missing title' }, 400);
        const id = await createIncident(env, body.title, body.severity || 'medium', body.affectedWorkers || []);
        return json({ id, status: 'created' });
      }

      case '/incidents/resolve': {
        if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
        const body: any = await request.json().catch((e: unknown) => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', worker: 'echo-fleet-commander', msg: 'incident resolve request body parse failed', error: String(e) })); return {}; });
        if (!body.id) return json({ error: 'Missing incident id' }, 400);
        await ensureSchema(env.DB);
        await env.DB.prepare(
          "UPDATE incidents SET status = 'resolved', resolution = ?, resolved_at = datetime(?) WHERE id = ?"
        ).bind(body.resolution || 'Resolved', new Date().toISOString(), body.id).run();
        await auditLog(env, 'incident_resolved', body.id, { resolution: body.resolution });
        return json({ id: body.id, status: 'resolved' });
      }

      // ── Commands ───────────────────────────────────────────────────────────
      case '/command': {
        if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
        const body: any = await request.json().catch((e: unknown) => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', worker: 'echo-fleet-commander', msg: 'command dispatch request body parse failed', error: String(e) })); return {}; });
        if (!body.target || !body.command) return json({ error: 'Missing target or command' }, 400);
        return json(await dispatchCommand(env, body.target, body.command, body.params || {}));
      }

      case '/commands': {
        await ensureSchema(env.DB);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const rows = await env.DB.prepare('SELECT * FROM commands ORDER BY issued_at DESC LIMIT ?').bind(limit).all();
        return json(rows.results || []);
      }

      // ── Deploys ────────────────────────────────────────────────────────────
      case '/deploys': {
        await ensureSchema(env.DB);
        const days = parseInt(url.searchParams.get('days') || '7');
        const rows = await env.DB.prepare(`SELECT * FROM deploys WHERE detected_at >= datetime('now', '-${days} days') ORDER BY detected_at DESC LIMIT 100`).all();
        return json(rows.results || []);
      }

      // ── Uptime ─────────────────────────────────────────────────────────────
      case '/uptime': {
        await ensureSchema(env.DB);
        const days = parseInt(url.searchParams.get('days') || '7');
        const worker = url.searchParams.get('worker');
        const q = worker
          ? `SELECT * FROM daily_uptime WHERE date >= date('now', '-${days} days') AND worker = ? ORDER BY date DESC`
          : `SELECT * FROM daily_uptime WHERE date >= date('now', '-${days} days') ORDER BY worker, date DESC`;
        const rows = worker
          ? await env.DB.prepare(q).bind(worker).all()
          : await env.DB.prepare(q).all();
        return json(rows.results || []);
      }

      // ── Health History ─────────────────────────────────────────────────────
      case '/history': {
        await ensureSchema(env.DB);
        const worker = url.searchParams.get('worker');
        const hours = parseInt(url.searchParams.get('hours') || '24');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const q = worker
          ? `SELECT * FROM fleet_health WHERE worker = ? AND checked_at >= datetime('now', '-${hours} hours') ORDER BY checked_at DESC LIMIT ?`
          : `SELECT * FROM fleet_health WHERE checked_at >= datetime('now', '-${hours} hours') ORDER BY checked_at DESC LIMIT ?`;
        const rows = worker
          ? await env.DB.prepare(q).bind(worker, limit).all()
          : await env.DB.prepare(q).bind(limit).all();
        return json(rows.results || []);
      }

      // ── Snapshots ──────────────────────────────────────────────────────────
      case '/snapshots': {
        await ensureSchema(env.DB);
        const limit = parseInt(url.searchParams.get('limit') || '48');
        const rows = await env.DB.prepare('SELECT * FROM fleet_snapshots ORDER BY created_at DESC LIMIT ?').bind(limit).all();
        return json(rows.results || []);
      }

      // ── Briefing History ───────────────────────────────────────────────────
      case '/briefings': {
        await ensureSchema(env.DB);
        const type = url.searchParams.get('type');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const q = type
          ? 'SELECT id, briefing_type, fleet_score, highlights, concerns, recommendations, created_at FROM briefings WHERE briefing_type = ? ORDER BY created_at DESC LIMIT ?'
          : 'SELECT id, briefing_type, fleet_score, highlights, concerns, recommendations, created_at FROM briefings ORDER BY created_at DESC LIMIT ?';
        const rows = type
          ? await env.DB.prepare(q).bind(type, limit).all()
          : await env.DB.prepare(q).bind(limit).all();
        return json(rows.results || []);
      }

      // ── Audit Log ──────────────────────────────────────────────────────────
      case '/audit': {
        await ensureSchema(env.DB);
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const rows = await env.DB.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?').bind(limit).all();
        return json(rows.results || []);
      }

      // ── Worker Detail ──────────────────────────────────────────────────────
      case '/worker': {
        const name = url.searchParams.get('name');
        if (!name) return json({ error: 'Missing ?name= parameter' }, 400);
        const entry = FLEET_REGISTRY.find(w => w.name === name);
        if (!entry) return json({ error: `Worker "${name}" not found` }, 404);

        await ensureSchema(env.DB);
        const recentHealth = await env.DB.prepare(
          'SELECT * FROM fleet_health WHERE worker = ? ORDER BY checked_at DESC LIMIT 20'
        ).bind(name).all();
        const recentDeploys = await env.DB.prepare(
          'SELECT * FROM deploys WHERE worker = ? ORDER BY detected_at DESC LIMIT 10'
        ).bind(name).all();
        const uptime = await env.DB.prepare(
          "SELECT * FROM daily_uptime WHERE worker = ? AND date >= date('now', '-7 days') ORDER BY date DESC"
        ).bind(name).all();
        const version = await env.CACHE.get(`version:${name}`);

        return json({
          ...entry,
          currentVersion: version,
          dependents: DEPENDENCY_MAP.get(name) || [],
          recentHealth: recentHealth.results || [],
          recentDeploys: recentDeploys.results || [],
          uptime: uptime.results || [],
        });
      }

      // ── Quick Stats ────────────────────────────────────────────────────────
      case '/stats': {
        await ensureSchema(env.DB);
        const today = new Date().toISOString().split('T')[0];
        const healthChecks = await env.DB.prepare("SELECT COUNT(*) as c FROM fleet_health WHERE checked_at >= datetime('now', '-24 hours')").first<{ c: number }>();
        const incidentCount = await env.DB.prepare("SELECT COUNT(*) as c FROM incidents WHERE status != 'resolved'").first<{ c: number }>();
        const deployCount = await env.DB.prepare("SELECT COUNT(*) as c FROM deploys WHERE detected_at >= datetime('now', '-7 days')").first<{ c: number }>();
        const commandCount = await env.DB.prepare("SELECT COUNT(*) as c FROM commands WHERE issued_at >= datetime('now', '-24 hours')").first<{ c: number }>();

        return json({
          fleetSize: FLEET_REGISTRY.length,
          healthChecks24h: healthChecks?.c || 0,
          activeIncidents: incidentCount?.c || 0,
          deploys7d: deployCount?.c || 0,
          commands24h: commandCount?.c || 0,
          uptime: 'check /uptime for per-worker data',
        });
      }

      default:
        return json({
          error: 'Not found', service: SERVICE, version: VERSION,
          endpoints: [
            'GET  /health            — Fleet commander health + fleet size summary',
            'GET  /dashboard         — Full unified dashboard (health, incidents, deploys, briefing, trend)',
            'GET  /scan              — Live fleet scan (?tier=T0|T1|T2|T3)',
            'GET  /briefing          — Generate fleet briefing (?type=quick|daily|weekly)',
            'GET  /registry          — Fleet registry (?category=core|bot|...&tier=T0|T1|...)',
            'GET  /search            — Search fleet (?q=keyword)',
            'GET  /topology          — Fleet dependency topology + SPOFs + critical path',
            'GET  /incidents         — Incident list (?status=active|resolved&limit=50)',
            'POST /incidents/create  — Create incident ({title, severity, affectedWorkers})',
            'POST /incidents/resolve — Resolve incident ({id, resolution})',
            'POST /command           — Dispatch command ({target, command, params})',
            'GET  /commands          — Command history (?limit=50)',
            'GET  /deploys           — Deploy history (?days=7)',
            'GET  /uptime            — Daily uptime per worker (?days=7&worker=name)',
            'GET  /history           — Health check history (?worker=name&hours=24&limit=100)',
            'GET  /snapshots         — Fleet snapshots (?limit=48)',
            'GET  /briefings         — Briefing history (?type=quick|daily|weekly&limit=20)',
            'GET  /audit             — Audit log (?limit=100)',
            'GET  /worker            — Single worker detail (?name=echo-shared-brain)',
            'GET  /stats             — Quick fleet stats',
            'POST /cycle             — Trigger manual scan cycle',
          ],
        }, 404);
    }
  } catch (err: any) {
    log('error', 'Request handler error', { path, error: err.message, stack: err.stack?.slice(0, 500) });
    return json({ error: 'Internal error', message: err.message }, 500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(event, env, ctx));
  },
};
