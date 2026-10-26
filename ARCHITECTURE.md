# DonateBridge — System Architecture & Engineering Documentation

This document provides a comprehensive technical overview of the **DonateBridge** system architecture, component relationships, data flow patterns, security mechanisms, and design decisions for local deployment and B.Tech academic evaluation.

---

## 1. High-Level Architecture Overview

DonateBridge is designed as a modular, decoupled full-stack web application. It follows a multi-tier client-server architecture consisting of a React Single-Page Application (SPA) frontend, a Django REST Framework (DRF) backend, an ASGI (Daphne) WebSocket server for real-time communication, a native PostgreSQL database for structured data storage, and a local AI engine (Ollama) providing Retrieval-Augmented Generation (RAG).

```mermaid
flowchart TB
    subgraph Client ["Client Tier (Browser)"]
        SPA[React 19 + Vite SPA]
        LM[Leaflet Map Visualizer]
        CT[Chat Terminal Widget]
        AI_UI[RAG AI Assistant Widget]
    end

    subgraph Server ["Application Server Tier (Django 5.2)"]
        WSGI[WSGI / REST API Controller]
        ASGI[Daphne ASGI Server / WebSockets]
        AUTH[Authentication & OTP Module]
        SM[Smart Match Engine]
        RAG[Dual-Path RAG Engine]
    end

    subgraph Storage ["Data Tier (PostgreSQL 17 & Vector Store)"]
        DB[(PostgreSQL 17 Database)]
        VS[JSON Vector Store index.json]
    end

    subgraph Integrations ["External & Local Integration Tier"]
        SMTP[Gmail SMTP Service :587]
        GEO[OpenStreetMap Nominatim Geocoding]
        OLLAMA[Local Ollama Server :11434 llama3:latest]
    end

    SPA -- HTTP REST --> WSGI
    SPA -- WebSockets --> ASGI
    
    WSGI --> DB
    ASGI --> DB
    
    AUTH -- Send OTP --> SMTP
    WSGI -- Reverse Geocode --> GEO
    
    WSGI --> RAG
    RAG -- Context Retrieval --> VS
    RAG -- LLM Inference --> OLLAMA
```

---

## 2. Component Architecture Breakdown

### 2.1 Frontend Architecture (`client/`)
The frontend is constructed with **React 19** using **Vite** as the build tool and bundler.

```text
client/src/
├── api/                # Axios HTTP client instance & API endpoints (index.js)
├── components/         # Modular UI components
│   ├── discover/       # Map visualizers & filter bars
│   ├── layout/         # Navbar, Footer, NavigationDrawer
│   └── ui/             # OtpInputField, AiMatchAssistant, Toast, Button
├── context/            # GlobalStateContext (Auth JWT, Sockets, Notifications)
├── pages/              # Primary view pages (AuthSuite, DonorDashboard, NgoConsole, ChatTerminal)
└── App.jsx             # React Router routing definition
```

* **State Management (`GlobalStateContext`):** Manages user session state, JWT tokens, active WebSocket instances, and global toast notifications.
* **API Service Layer (`client/src/api/index.js`):** Centralized Axios configuration equipped with request interceptors to automatically attach JWT Bearer tokens to outgoing HTTP requests.

### 2.2 Backend Architecture (`server/`)
The backend is built on **Django 5.2** and **Django REST Framework (DRF)**, structured into modular apps:

* **`authentication`**: CustomUser model, extended profile tables, JWT token management, 6-digit email OTP cache, and DB seed script (`seed_db`).
* **`ngo`**: NGO organization profiles, government registration document filings (`NGODocument`), Need broadcasts, and emergency campaigns.
* **`donation`**: Physical donation listing offers and the Multi-Factor Smart Match scoring engine.
* **`chat`**: WebSocket consumer (`ChatConsumer`), channels, direct message persistence, and available contact discovery.
* **`ai`**: Ollama LLM integration, custom vector store search, knowledge ingestion command (`ingest_knowledge`), and dual-path RAG processor (`rag_service.py`).
* **`logistics`**: 6-step cargo milestone tracking stream and secure hashed QR token verification.
* **`moderation`**: Admin document audit trail, platform audit logs, and fraud detection radar.
* **`notification`**: User-specific real-time event notification stream.

---

## 3. Database Architecture (PostgreSQL)

DonateBridge relies exclusively on a native **PostgreSQL 17** database instance (`donatebridge_db`).

```mermaid
erDiagram
    CustomUser ||--o| Profile : "has"
    CustomUser ||--o| NGO : "manages (role=ngo)"
    NGO ||--o{ Need : "broadcasts"
    NGO ||--o{ NGODocument : "submits"
    CustomUser ||--o{ Donation : "creates (role=donor)"
    Donation }|--|| Need : "fulfills (optional)"
    CustomUser ||--o{ ChatMember : "belongs to"
    ChatChannel ||--o{ ChatMember : "contains"
    ChatChannel ||--o{ ChatMessage : "holds"
    CustomUser ||--o{ ChatMessage : "sends"
    CustomUser ||--o{ Notification : "receives"
```

### Relational Constraints & Keys
* **Primary Keys:** Auto-incrementing BigAutoField or UUIDs on all models.
* **Foreign Keys & Cascade Rules:**
  * `NGO.user` -> `OneToOneField(CustomUser, on_delete=CASCADE)`
  * `Need.ngo` -> `ForeignKey(NGO, on_delete=CASCADE)`
  * `ChatMessage.channel` -> `ForeignKey(ChatChannel, on_delete=CASCADE)`
  * `ChatMessage.sender` -> `ForeignKey(CustomUser, on_delete=CASCADE)`
* **Unique Constraints:** `CustomUser.username`, `CustomUser.email`, `NGO.registration_number`, `NGO.gov_registration_number`.

---

## 4. Authentication & OTP Architecture

DonateBridge enforces a 2-stage verification model for registration and password recovery:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as React Frontend
    participant BE as Django API
    participant Cache as Django Cache (RAM)
    participant DB as PostgreSQL DB
    participant SMTP as Gmail SMTP Server

    User->>FE: Fills Registration Form
    FE->>BE: POST /api/auth/register/
    BE->>BE: Validate Input Constraints & Password Hashing
    BE->>DB: Save Unverified User (is_verified=False)
    BE->>BE: Generate Cryptographic 6-Digit OTP
    BE->>Cache: Save OTP (Key: email, TTL: 300s)
    BE->>SMTP: Dispatch Email with OTP
    SMTP-->>User: Delivers OTP Code to Inbox
    User->>FE: Types 6-Digit Code into OtpInputField
    FE->>BE: POST /api/auth/verify-otp/
    BE->>Cache: Retrieve & Match OTP
    alt Valid OTP
        BE->>DB: Set is_verified=True
        BE->>Cache: Delete Used OTP Key
        BE-->>FE: Return HTTP 200 + SimpleJWT Pair (Access & Refresh)
    else Invalid / Expired OTP
        BE-->>FE: Return HTTP 400 (Invalid or Expired OTP)
    end
```

### Security Safeguards
1. **Zero Exposure:** OTP codes are never returned in API payloads or printed to server logs.
2. **Time-To-Live (TTL):** OTPs expire automatically after 5 minutes (300 seconds).
3. **Resend Cooldown:** 60-second rate-limiting rule returns `HTTP 429 Too Many Requests` if resend is requested too quickly.
4. **Attempt Invalidation:** Maximum of 5 incorrect attempts before the code is forcibly purged from cache.

---

## 5. Smart Match Scoring Algorithm

The Smart Match engine (`server/apps/donation/views.py`) deterministically scores verified NGO demands against donor item offers using a multi-factor formula:

$$\text{Total Score} = S_{\text{category}} + S_{\text{distance}} + S_{\text{urgency}} + S_{\text{trust}} + S_{\text{quantity}}$$

| Scoring Factor | Weight / Max Points | Evaluation Logic |
| :--- | :--- | :--- |
| **Category Fit ($S_{\text{category}}$)** | 30 Points | Exact category match = 30 pts; related category = 15 pts. |
| **Distance ($S_{\text{distance}}$)** | 20 Points | Calculated via Haversine formula based on donor pickup coordinates and NGO coordinates. $0\text{ km} = 20\text{ pts}$, declining linearly to $0\text{ pts}$ at $>50\text{ km}$. |
| **Demand Urgency ($S_{\text{urgency}}$)** | 15 Points | `Critical` = 15 pts, `High` = 10 pts, `Medium` = 5 pts, `Low` = 2 pts. |
| **NGO Trust Score ($S_{\text{trust}}$)** | 10 Points | Derived directly from audited NGO Trust Score ($0–100\% \rightarrow 0–10\text{ pts}$). |
| **Quantity Fit ($S_{\text{quantity}}$)** | 25 Points | Ratio of offered quantity vs NGO requested quantity. |

---

## 6. Real-Time Chat Architecture

Real-time communication is facilitated by **Django Channels (Daphne ASGI server)** operating over WebSockets, with REST fallback endpoints.

```mermaid
sequenceDiagram
    autonumber
    actor Donor
    actor NGO
    participant FE_Donor as Donor React App
    participant ASGI as Daphne ASGI Server
    participant DB as PostgreSQL DB
    participant FE_NGO as NGO React App

    Donor->>FE_Donor: Opens Chat Channel
    FE_Donor->>ASGI: Connect ws://localhost:8000/ws/chat/<channel_id>/
    ASGI->>ASGI: Verify JWT Token & Channel Membership
    ASGI-->>FE_Donor: WebSocket Connection Accepted

    Donor->>FE_Donor: Type & Send Message
    FE_Donor->>ASGI: Transmit Socket Frame {message, sender_id}
    ASGI->>DB: Save ChatMessage (status=unread)
    ASGI->>FE_NGO: Broadcast Message Frame via Channel Group
    FE_NGO->>FE_NGO: Display Message & Trigger Notification Toast ("Message Arrived")
```

---

## 7. RAG (Retrieval-Augmented Generation) Architecture

DonateBridge deploys a local RAG engine (`server/apps/ai/services/rag_service.py`) powered by **Ollama (`llama3:latest`)**:

```text
User Question / Prompt
         │
         ▼
Query Classifier
   ├── Knowledge Query? ──► Searches Dense Vector Index (media/vector_store/index.json)
   └── Live Data Query?  ──► Executes Django ORM Queries against PostgreSQL (Needs/NGOs)
         │
         ▼
Context Assembly & Section Cleaning
         │
         ▼
Grounded System Prompt Injection
         │
         ▼
Local Ollama LLM Inference (http://localhost:11434)
         │
         ▼
Clean Response + Grounded Source Citations
```

---

## 8. Deployment & Environment Configuration

### Local Deployment Architecture
```text
Developer Machine / Laptop
├── React Frontend (Vite)        --> Port 5173
├── Django REST Backend (Daphne) --> Port 8000
├── PostgreSQL 17 Server         --> Port 5432 (Database: donatebridge_db)
├── Ollama AI Server             --> Port 11434 (Model: llama3:latest)
└── Gmail SMTP Service           --> Port 587 (TLS Enabled)
```

---

## 9. Security & Data Protection Controls

1. **Role Authorization:** Protected API views verify `request.user.role` from database records.
2. **Password Security:** Hashed using PBKDF2 with SHA256.
3. **Cross-Origin Resource Sharing (CORS):** Restricted explicitly to `FRONTEND_URL` (`http://localhost:5173`).
4. **Environment Isolation:** All passwords, tokens, and keys are stored in `server/.env` (excluded from Git via `.gitignore`).
