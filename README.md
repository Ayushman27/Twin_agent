# AI Twin Agent Platform

Organizational AI Operating System powered by Digital Twins and Autonomous Agentic Execution.

---

## 🏛 Architecture Overview

```
Twin_Agent1.0/
├── backend/            # Shared FastAPI Backend (Port 8000)
├── company-portal/     # Company Registration & Org Admin (Port 3000)
├── employee-portal/    # Employee Digital Twin & Daily Workflows (Port 3001)
├── shared/             # Shared UI components, types, services, and utils
├── docker-compose.yml  # Docker orchestration (Postgres, Redis, API)
└── README.md
```

### Core Components

1. **Company Portal (`company-portal/`)**
   - **Port:** `3000` (`npm run dev` in `company-portal`)
   - **Purpose:** Company registration, admin login, department/team configuration, role definitions, and project portfolios.

2. **Employee Portal (`employee-portal/`)**
   - **Port:** `3001` (`npm run dev` in `employee-portal`)
   - **Purpose:** Employee login, personal digital twin calibration, live agent activity monitoring, task boards, human-in-the-loop approvals, and knowledge ingestion.

3. **Shared FastAPI Backend (`backend/`)**
   - **Port:** `8000` (`uvicorn app.main:app --reload --port 8000` in `backend`)
   - **Database:** Shared PostgreSQL (Port `5432`)
   - **CORS:** Configured to permit requests from both `http://localhost:3000` and `http://localhost:3001`.

4. **Shared Frontend Library (`shared/`)**
   - **Components:** UI primitives (Button, Card, Badge, DataTable, Modal, Status, Charts, Breadcrumbs, etc.)
   - **Types:** TypeScript definitions for User, Organization, Employee, Twin, Agent, Task, Approval, Knowledge, etc.
   - **Services & Lib:** API client, Auth service, WebSocket service, config, utilities.

---

## 🚀 Quick Start

### 1. Start Shared Services (PostgreSQL & Redis)

```bash
docker compose up -d postgres redis
```

### 2. Start FastAPI Backend (Port 8000)

```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 3. Start Company Portal (Port 3000)

```bash
cd company-portal
npm install
npm run dev
```
- Access at: `http://localhost:3000`

### 4. Start Employee Portal (Port 3001)

```bash
cd employee-portal
npm install
npm run dev
```
- Access at: `http://localhost:3001`
