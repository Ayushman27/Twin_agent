# Twin Agent Platform — Backend

Production-ready **FastAPI** backend for the Twin Agent Platform. Modular monolith architecture with SQLite (dev) / PostgreSQL (prod) support.

---

## Quick Start

### Option A: Local (Python venv)

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

→ API: http://localhost:8000  
→ Swagger UI: http://localhost:8000/docs  
→ ReDoc: http://localhost:8000/redoc  

---

### Option B: Docker (recommended)

```bash
cd backend
cp .env.example .env
docker compose up --build
```

→ API: http://localhost:8000  
→ Redis: localhost:6379  
→ MinIO (optional): `docker compose --profile minio up`  

---

## Environment Variables

Copy `.env.example` → `.env` and configure:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./twin_agent.db` | DB connection string |
| `JWT_SECRET_KEY` | `CHANGE_ME` | Secret for JWT signing |
| `LLM_PROVIDER` | `mock` | `mock` or `openai` |
| `LLM_API_KEY` | _(empty)_ | OpenAI API key (if `openai`) |
| `STORAGE_PROVIDER` | `local` | `local` or `s3` |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis URL |

---

## Database Migrations (Alembic)

```bash
# Apply all migrations
alembic upgrade head

# Generate a new migration after model changes
alembic revision --autogenerate -m "describe your change"

# Downgrade one step
alembic downgrade -1
```

> **Note:** On startup, the app auto-creates all tables via `init_db()` (dev convenience). Use Alembic for production deployments.

---

## API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | ❌ | Register new user |
| POST | `/api/v1/auth/login` | ❌ | Login → JWT tokens |
| POST | `/api/v1/auth/refresh` | ❌ | Refresh access token |
| GET  | `/api/v1/auth/me` | ✅ | Get current user |

### Organizations
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/organizations/` | ✅ | Register organization |
| GET  | `/api/v1/organizations/{id}` | ✅ | Get organization |
| PUT  | `/api/v1/organizations/{id}` | ✅ | Update organization |
| GET  | `/api/v1/organizations/{id}/members` | ✅ | List members |

### Applications
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/applications/` | ✅ | Create application |
| GET  | `/api/v1/applications/{id}` | ✅ | Get application |
| PUT  | `/api/v1/applications/{id}` | ✅ | Update application |
| POST | `/api/v1/applications/{id}/submit` | ✅ | Submit for review |

### Documents
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/applications/{id}/documents` | ✅ | Upload document |
| GET  | `/api/v1/applications/{id}/documents` | ✅ | List documents |
| GET  | `/api/v1/documents/{id}` | ✅ | Get document metadata |
| DELETE | `/api/v1/documents/{id}` | ✅ | Delete document |

### Desktop
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/desktop/releases` | ❌ | All releases |
| GET | `/api/v1/desktop/latest` | ❌ | Latest per platform |
| GET | `/api/v1/desktop/download/{platform}` | ❌ | Latest for platform |

### Demo Agent
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/demo-agent/session` | Optional | Start session |
| POST | `/api/v1/demo-agent/chat` | Optional | Send message |
| GET  | `/api/v1/demo-agent/session/{id}` | Optional | Get history |
| DELETE | `/api/v1/demo-agent/session/{id}` | Optional | End session |

### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Basic health |
| GET | `/api/v1/health/` | API health |
| GET | `/api/v1/health/database` | DB connectivity |

---

## Authentication Flow

```
POST /api/v1/auth/register
  → { access_token, refresh_token, user }

POST /api/v1/auth/login
  → { access_token, refresh_token, user }

GET /api/v1/auth/me
  Header: Authorization: Bearer <access_token>
  → { success: true, data: { user } }
```

---

## Demo Agent Flow

```
POST /api/v1/demo-agent/session        → { id, session_status: "ACTIVE" }
POST /api/v1/demo-agent/chat
  { session_id: "...", message: "What is Twin Agent?" }
  → { session_id, user_message, agent_reply }
GET  /api/v1/demo-agent/session/{id}  → { session, messages: [...] }
DELETE /api/v1/demo-agent/session/{id} → 204
```

**Demo Agent uses `MockLLMProvider` by default.** Set `LLM_PROVIDER=openai` + `LLM_API_KEY=sk-...` to use real OpenAI.

---

## Running Tests

```bash
# Activate venv first
pytest tests/ -v
pytest tests/ -v --cov=app --cov-report=term-missing
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app factory
│   ├── core/                   # Config, security, DB, logging
│   ├── api/                    # Router aggregator + dependencies
│   ├── modules/                # Feature modules (auth, orgs, etc.)
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── applications/
│   │   ├── documents/
│   │   ├── desktop/
│   │   ├── demo_agent/
│   │   └── health/
│   ├── ai/
│   │   └── llm/                # AIProvider interface + Mock + OpenAI
│   ├── integrations/
│   │   └── storage/            # StorageInterface + Local implementation
│   ├── db/                     # Base model + session dependency
│   └── utils/                  # Validators + helpers
├── alembic/                    # Database migrations
├── tests/                      # pytest tests
├── uploads/                    # Local file storage (dev)
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

## Future Integration Points

| Module | Planned Integration |
|---|---|
| `app/ai/llm/` | Anthropic, Local LLM, vLLM, Ollama |
| `app/ai/slm/` | Qwen 3 4B + LoRA adapters |
| `app/ai/rag/` | Vector DB (Chroma/Weaviate) + embeddings |
| `app/ai/orchestrator/` | Agent Orchestrator + task decomposition |
| `app/integrations/storage/` | AWS S3, MinIO |
| `app/integrations/email/` | SMTP / SendGrid |
| `app/integrations/future/` | GitHub, Jira, Slack, MCP, CI/CD |
| `app/modules/` | Human Twin, Role Twin, Work Twin |

To swap SQLite → PostgreSQL: change `DATABASE_URL` only. No code changes needed.
