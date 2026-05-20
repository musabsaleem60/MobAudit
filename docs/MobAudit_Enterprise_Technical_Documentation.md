# MobAudit Enterprise Technical Documentation and Project Report

## Mobile Application Security Evaluation Platform Powered by MASE

**Prepared by:** Musab Saleem  
**Project Repository:** `musabsaleem60/MobAudit`  
**Department:** Department of Computer Science / Software Engineering / Cybersecurity  
**Submission Type:** Final Year Project, Professional Technical Documentation, Academic Defense, Internship / Client Presentation  
**Academic Session:** 2025-2026  
**Organization / Institute:** To be added by student  
**Document Version:** 1.0  
**Date:** 20 May 2026  

---

# Table of Contents

1. [Abstract](#1-abstract)  
2. [Introduction](#2-introduction)  
3. [System Overview](#3-system-overview)  
4. [Complete End-to-End Workflow](#4-complete-end-to-end-workflow)  
5. [Frontend Documentation](#5-frontend-documentation)  
6. [Backend Documentation](#6-backend-documentation)  
7. [Database Documentation](#7-database-documentation)  
8. [API Documentation](#8-api-documentation)  
9. [Scanning Engine Deep Explanation](#9-scanning-engine-deep-explanation)  
10. [Report Generation System](#10-report-generation-system)  
11. [Authentication and Security](#11-authentication-and-security)  
12. [System Architecture](#12-system-architecture)  
13. [Use Cases](#13-use-cases)  
14. [Challenges and Solutions](#14-challenges-and-solutions)  
15. [Performance Optimization](#15-performance-optimization)  
16. [Testing](#16-testing)  
17. [Deployment](#17-deployment)  
18. [Future Enhancements](#18-future-enhancements)  
19. [Conclusion](#19-conclusion)  
20. [Appendix](#20-appendix)  

---

# 1. Abstract

MobAudit is a full-stack cybersecurity platform designed to evaluate Android application packages through automated static analysis, custom APK inspection, reputation checking, dynamic analysis orchestration, vulnerability normalization, risk scoring, AI-assisted remediation, and professional report generation. The project addresses a practical security problem: Android applications often contain weak permissions, insecure storage, unprotected communication, exposed components, hardcoded credentials, unsafe cryptographic choices, and runtime behaviors that are difficult to review manually.

The system provides a web-based workflow where an authenticated user uploads an APK file, starts an analysis, reviews scan history, opens detailed findings, inspects source snippets, checks secrets and privacy risks, maps findings to OWASP Mobile Top 10 and MITRE ATT&CK-style categories, generates remediation suggestions, runs dynamic analysis against an emulator environment, and exports professional security reports in JSON, CSV, and PDF formats.

The platform is implemented using React for the frontend, Express.js and Node.js for the backend, MongoDB for persistence, JSON Web Tokens for authentication, bcrypt for password hashing, Multer for file ingestion, PDFKit for PDF report generation, WebSocket streaming for live dynamic analysis telemetry, Dockerized MASE services for core Android application security analysis, a custom APK parsing layer for privacy and malware indicators, VirusTotal integration for reputation intelligence, and Groq-compatible AI completion APIs for remediation generation.

The expected outcome is a professional and academically defensible mobile security audit system that demonstrates secure software engineering, vulnerability analysis, API design, full-stack development, asynchronous job orchestration, report generation, and practical cybersecurity automation.

---

# 2. Introduction

## 2.1 What MASE Is

MASE stands for **MobAudit Security Engine**. In this project, MASE represents the Android application analysis engine integrated with the MobAudit platform. Its role is to receive uploaded Android packages, perform static and dynamic analysis operations, extract security findings, expose structured report JSON, and provide source-code viewing support for decompiled application files.

Within MobAudit, MASE is not presented as a standalone command-line tool. It is wrapped by a web application that adds authentication, dashboard management, scan history, custom parsing, risk scoring, additional threat intelligence, AI remediation, and export-ready reporting. This separation allows the system to behave like a professional security product rather than a raw scanner.

## 2.2 Why the System Was Developed

Mobile applications are now used for banking, healthcare, education, communication, identity verification, and enterprise operations. A single insecure Android application can expose user credentials, location data, messages, financial information, business logic, backend API keys, and private files. Manual reverse engineering and security review require specialized expertise and significant time. Many organizations do not have a repeatable workflow for APK security testing before release.

MobAudit was developed to solve these issues by providing a complete web-based security audit pipeline. The user does not need to manually run multiple tools, decode APKs, calculate risk, format reports, or organize findings. The system automates the technical workflow and presents results in a structured, understandable, and professional format.

## 2.3 Cybersecurity Problem Being Solved

The project focuses on Android application security risks, including:

| Risk Area | Problem |
|---|---|
| Insecure permissions | Apps may request sensitive permissions without necessity. |
| Insecure storage | Data may be stored in plaintext files, logs, or SQLite databases. |
| Insecure communication | Apps may use HTTP, weak TLS, or unsafe certificates. |
| Weak cryptography | Apps may use MD5, SHA-1, DES, predictable randomness, or hardcoded keys. |
| Exposed components | Activities, services, receivers, and providers may be exported insecurely. |
| Hardcoded secrets | API keys, tokens, passwords, and endpoints may be embedded in the APK. |
| Debug configurations | Release apps may accidentally ship with debug flags and logs. |
| Runtime leakage | Dynamic behavior may expose domains, URLs, trackers, databases, and API traces. |
| Poor reporting | Raw scanner output is often not suitable for management, clients, or viva defense. |

## 2.4 Existing Issues in Traditional Vulnerability Scanning

Traditional scanning workflows usually suffer from several limitations:

1. They require security analysts to manually run multiple tools.
2. They produce raw output that is difficult for developers and non-security reviewers to understand.
3. They lack a unified dashboard for scan history and report retrieval.
4. They do not always connect static findings with practical remediation guidance.
5. They often require manual report writing after every scan.
6. They may not combine static analysis, custom inspection, reputation analysis, and dynamic analysis into one workflow.
7. They frequently lack user-based access control and project-level organization.

MobAudit improves this workflow by integrating scan execution, result processing, persistence, visualization, remediation, and export into one platform.

## 2.5 Benefits of the System

| Benefit | Explanation |
|---|---|
| Centralized security dashboard | Users can upload APKs, review history, and open reports from one interface. |
| Automated scan lifecycle | The backend handles file upload, MASE submission, scan triggering, result fetching, parsing, and storage. |
| Multiple analysis layers | Static findings, custom APK parsing, secrets analysis, reputation intelligence, and dynamic analysis are combined. |
| Professional reporting | Reports can be exported as JSON, CSV, and PDF. |
| AI remediation | Findings can be converted into fix guidance and secure code examples. |
| Academic and professional value | The system demonstrates full-stack engineering and practical cybersecurity automation. |

## 2.6 Scope of the Project

The current scope includes:

- User authentication and registration.
- JWT-based protected dashboard access.
- APK upload and validation.
- Static APK security analysis through MASE.
- Custom manifest, permission, privacy, malware, and hardcoded-secret checks.
- VirusTotal reputation checking when an API key is configured.
- Dynamic analysis orchestration using an Android emulator or ADB-connected device.
- WebSocket-based live screen and log streaming.
- Risk score computation.
- OWASP Mobile Top 10 categorization.
- MITRE and CVE-style mapping.
- AI-assisted vulnerability remediation.
- Scan history and report retrieval.
- Export in JSON, CSV, and PDF.

Out of scope for the current implementation:

- Multi-tenant organization management.
- Advanced role hierarchy beyond basic user/admin fields.
- Distributed worker clusters.
- Full production-grade rate limiting.
- Full refresh-token rotation.
- Centralized SIEM integration.

## 2.7 Target Users

| User Type | Purpose |
|---|---|
| Students | Demonstrate final year cybersecurity and full-stack development project. |
| Security analysts | Automate Android security assessment workflows. |
| Developers | Identify and fix insecure mobile coding practices. |
| QA teams | Add APK security scanning to release validation. |
| Internship reviewers | Evaluate practical software engineering and cybersecurity implementation. |
| Clients | Receive professional mobile application audit reports. |

## 2.8 Real-World Applications

- Pre-release Android security testing.
- Academic cybersecurity labs.
- Internal application security review.
- Client-facing APK audit services.
- CI/CD security gates for mobile applications.
- Demonstration platform for OWASP Mobile Top 10 education.

---

# 3. System Overview

## 3.1 High-Level Explanation

MobAudit is a client-server application. The React frontend provides the user interface. The Express backend exposes REST APIs and coordinates scan execution. MongoDB stores users, scan reports, dynamic status, custom analysis, reputation results, and AI fix cache entries. MASE performs the core Android package analysis. Optional external services enrich the result, including VirusTotal for reputation checking and Groq-compatible AI APIs for remediation suggestions.

## 3.2 Primary System Modules

| Module | Responsibility | Main Files |
|---|---|---|
| Authentication module | Login, registration, token verification, route protection | `server/server.js`, `client/src/pages/Login.jsx`, `client/src/App.js` |
| Dashboard module | APK upload, scan initiation, scan history, analytics | `client/src/pages/Dashboard.jsx` |
| Analysis API module | File upload, MASE communication, report persistence | `server/server.js` |
| Custom APK parser | Manifest parsing, permission checks, privacy risks, malware indicators | `server/server.js` |
| Report parser | Normalizes raw scan data into frontend-ready findings | `server/server.js` |
| Report viewer | Multi-tab report UI with findings, secrets, dynamic results, MITRE, privacy, compliance | `client/src/pages/Report.jsx` |
| Export module | JSON, CSV, PDF generation and downloads | `server/server.js` |
| AI fix module | Caches and generates remediation guidance | `server/server.js`, `client/src/pages/Report.jsx` |
| Dynamic analysis module | Emulator detection, dynamic start/stop, background status update, WebSocket stream | `server/server.js`, `client/src/pages/Report.jsx` |
| Startup automation | Docker services, MASE key sync, backend/frontend launch | `start.ps1`, `start.sh` |

## 3.3 High-Level Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         User / Security Analyst                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         React Frontend                               │
│  Login │ Dashboard │ Upload │ Analytics │ Report Viewer │ Export UI  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP/JSON, multipart upload, WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Node.js / Express Backend                       │
│ Auth │ Scan APIs │ Parser │ Risk Scoring │ AI Fix │ PDF Export       │
└───────────────┬───────────────┬───────────────────────┬─────────────┘
                │               │                       │
                ▼               ▼                       ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────┐
│       MongoDB         │ │      MASE Engine      │ │ External Services │
│ Users, reports,       │ │ APK scan, reports,    │ │ VirusTotal, AI    │
│ dynamic status, cache │ │ source view, dynamic  │ │ remediation API   │
└──────────────────────┘ └───────────┬──────────┘ └──────────────────┘
                                     │
                                     ▼
                         ┌──────────────────────┐
                         │ Android Emulator/ADB  │
                         │ Dynamic runtime data  │
                         └──────────────────────┘
```

## 3.4 Component Interaction Flow

```text
User Action
   │
   ▼
React Page Component
   │ builds request
   ▼
Express Route
   │ validates token/input
   ▼
Service Logic inside backend
   │ calls MASE / database / external API
   ▼
MongoDB Persistence
   │ stores report and metadata
   ▼
Normalized JSON Response
   │
   ▼
React State Update
   │
   ▼
Dashboard / Report UI Rendering
```

## 3.5 Scan Lifecycle Summary

1. User selects an APK from the dashboard.
2. Frontend creates a `FormData` request.
3. Backend receives the APK using Multer.
4. Backend checks MASE readiness.
5. Backend uploads APK to MASE.
6. MASE returns a scan hash.
7. Backend triggers static scan.
8. Backend waits briefly, then requests structured report JSON.
9. Backend parses and normalizes findings.
10. Backend runs custom APK checks.
11. Backend checks reputation intelligence when configured.
12. Backend stores raw and enriched results in MongoDB.
13. Frontend receives normalized results and stores the hash locally.
14. Report page fetches report details, risk score, secrets, mappings, and compliance checks.
15. User can export the report or start dynamic analysis.

## 3.6 Report Lifecycle Summary

```text
Raw MASE JSON
   │
   ▼
Backend Parser
   │ extracts app metadata, findings, permissions, files
   ▼
Normalized Report Object
   │
   ├── Risk score endpoint
   ├── Secrets endpoint
   ├── MITRE/CVE endpoint
   ├── Compliance endpoint
   ├── Dynamic analysis attachment
   └── Export endpoints
          ├── JSON
          ├── CSV
          └── PDF
```

---

# 4. Complete End-to-End Workflow

This section explains the entire system from the moment a user opens the application until a report is downloaded.

## 4.1 Step 1: User Opens the Application

### Component Handling the Step

- Frontend entry point: `client/src/index.js`
- Main application router: `client/src/App.js`

### Technical Flow

1. Browser loads the React application from `http://localhost:3000`.
2. `index.js` mounts the React component tree into the root DOM element.
3. `App.js` initializes session validation state.
4. The application checks `localStorage` for `mobaudit_token`.
5. If a token exists, the frontend sends a verification request to the backend.
6. If the token is invalid or missing, the user is redirected to `/login`.
7. If the token is valid, protected routes become accessible.

### API Involved

`GET /api/auth/verify`

### Validation

- Token must exist in browser storage.
- Authorization header must use Bearer format.
- Backend must verify JWT signature and expiration.

### Database Interaction

This route does not query the database. It verifies the JWT cryptographically using the server secret.

## 4.2 Step 2: Authentication Starts

### Component Handling the Step

- Login UI: `client/src/pages/Login.jsx`
- Backend route: `POST /api/auth/login`
- User model: `User` Mongoose model in `server/server.js`

### Request Lifecycle

```text
Login Form Submit
   │
   ▼
Frontend validates required username/password
   │
   ▼
POST /api/auth/login
   │
   ▼
Backend finds user by username
   │
   ▼
bcrypt compares plaintext password with stored hash
   │
   ▼
JWT generated for valid user
   │
   ▼
Frontend stores token and username in localStorage
   │
   ▼
Navigate to /dashboard
```

### Database Collection Affected

`users`

### Fields Used

| Field | Purpose |
|---|---|
| `username` | Login identifier. |
| `password` | bcrypt hashed password. |
| `role` | User role, default `user`; default admin can be created. |
| `created_at` | Account creation timestamp. |

### Error Handling

| Condition | Response |
|---|---|
| User not found | `401 Invalid credentials` |
| Password mismatch | `401 Invalid credentials` |
| Server/database failure | `500 Login failed` |

## 4.3 Step 3: Token and Session Validation

### Component Handling the Step

- `ProtectedRoute` in `client/src/App.js`
- `authenticateJWT` middleware in `server/server.js`

### Technical Details

The frontend uses a route guard pattern. Protected pages are wrapped inside `ProtectedRoute`. The route guard checks browser storage before rendering the protected page. The backend performs the actual trusted verification. A user cannot access protected API data unless the request contains a valid JWT signed with the backend secret.

### Middleware Execution

```text
Incoming Request
   │
   ▼
Read Authorization header
   │
   ├── Missing header: 401
   ├── Header not Bearer: 401
   └── Bearer token found
           │
           ▼
       jwt.verify()
           │
           ├── Invalid/expired: 401
           └── Valid: req.user = decoded payload
                   │
                   ▼
               Continue to route handler
```

## 4.4 Step 4: Dashboard Rendering

### Component Handling the Step

- Dashboard UI: `client/src/pages/Dashboard.jsx`
- API: `GET /api/scans/history`

### Technical Flow

1. Dashboard component mounts.
2. It reads `mobaudit_token` from `localStorage`.
3. It sends an authenticated request to fetch scan history.
4. Backend queries the `scanreports` collection for current user reports and legacy reports with `user_id: null`.
5. Backend parses each stored report to extract application name, package, version, finding count, risk score, risk level, dynamic status, and scan timestamp.
6. Frontend renders:
   - upload panel
   - scan analytics
   - recent scans
   - risk distribution charts
   - top vulnerable applications

### Files Involved

| File | Role |
|---|---|
| `Dashboard.jsx` | Fetches history, handles APK upload, renders charts and cards. |
| `server.js` | Implements scan history endpoint and parsing logic. |

### Database Collections Affected

`scanreports`

### Important Implementation Detail

The scan history endpoint updates legacy reports whose `user_id` is `null` and assigns them to the current user. This allows older unauthenticated or migration-era reports to become associated with the logged-in account.

## 4.5 Step 5: User Creates a Scan

### Component Handling the Step

- Frontend: `Dashboard.jsx`
- Backend: `POST /api/analyze`
- Upload middleware: Multer disk storage

### Input Validation

Frontend validation:

- User must select a file.
- Drag-and-drop handler accepts `.apk` files.
- UI displays selected filename.

Backend validation:

- Request must include a file in field name `apk`.
- Request must pass JWT middleware.
- File is temporarily stored in `uploads/`.

### Request Generation

The frontend creates:

```text
FormData
└── apk: selected APK file
```

Headers:

```text
Authorization: Bearer <JWT>
Content-Type: generated automatically by browser for multipart/form-data
```

## 4.6 Step 6: Backend Processing Begins

### Backend Route

`POST /api/analyze`

### Internal Logic

1. The route verifies authentication using `authenticateJWT`.
2. Multer stores the uploaded APK temporarily.
3. Backend checks whether the file exists in the request.
4. Backend waits for MASE readiness by polling the analysis service documentation endpoint.
5. Backend creates a multipart form and streams the APK to MASE.
6. MASE returns a unique `hash`.
7. Backend triggers a scan using the hash.
8. Backend waits briefly for the analysis to complete.
9. Backend requests structured report JSON.
10. Backend parses raw report JSON into MobAudit format.
11. Backend runs custom APK parser on the uploaded file.
12. Backend runs reputation intelligence lookup.
13. Backend persists report and enrichment objects in MongoDB.
14. Backend deletes the temporary uploaded file in `finally`.
15. Backend returns parsed report JSON to frontend.

### Data Written to Database

Collection: `scanreports`

| Field | Value |
|---|---|
| `hash` | Hash returned by MASE. |
| `report_data` | Raw structured report from MASE. |
| `user_id` | Current authenticated user's ID. |
| `custom_analysis` | Output from custom APK parser. |
| `virustotal` | Reputation result object. |
| `dynamic_status` | Defaults to `not_started`. |

## 4.7 Step 7: Scan Execution and Logical Queue Initialization

The current implementation does not use a separate queue framework such as BullMQ, RabbitMQ, or Kafka. Instead, it implements two scan execution styles:

| Flow | Processing Style |
|---|---|
| Normal dashboard scan | Synchronous request lifecycle with MASE call, parse, persistence, and response. |
| CI/CD scan start | Non-blocking scan trigger that returns `202 Accepted`. |
| Dynamic analysis | Immediate response followed by an in-process background asynchronous orchestrator. |

For documentation and system design purposes, the backend behaves as a **logical scan orchestrator**. It receives work, validates it, delegates heavy scanning to MASE, stores state in MongoDB, and exposes status/report endpoints for retrieval.

### Logical Queue Model

```text
Scan Request
   │
   ▼
Validation Layer
   │
   ▼
Temporary Upload Storage
   │
   ▼
MASE Upload
   │
   ▼
Scan Hash Created
   │
   ▼
Analysis Triggered
   │
   ▼
Report Fetch / Status Poll
   │
   ▼
MongoDB Persistence
```

## 4.8 Step 8: Target Scanning Stages

### Stage 1: File Upload

The APK is uploaded to the backend and then forwarded to MASE. The backend uses streaming file handling to avoid loading the entire APK into memory.

### Stage 2: Static Analysis

MASE analyzes:

- Manifest metadata.
- Package name and version.
- Activities, services, receivers, and providers.
- Permissions.
- Certificates.
- Decompiled code.
- Resources.
- API usage.
- Security findings.

### Stage 3: Custom APK Parser

The backend performs additional custom analysis:

- Decodes APK using configured APK tooling when available.
- Parses Android manifest XML.
- Extracts declared permissions.
- Identifies dangerous permissions.
- Detects privacy risks in plain language.
- Detects manifest security issues such as debug mode or backup enabled.
- Scans string resources for secrets.
- Checks ZIP entries for malware indicators such as root-related files, hooking frameworks, excessive native libraries, and suspicious encryption libraries.

### Stage 4: Reputation Intelligence

The backend calculates SHA-256 and queries VirusTotal when configured. If the hash is known, it returns engine statistics and threat classification. If not known and upload is available, the file can be submitted for later analysis.

### Stage 5: Result Aggregation

The backend stores:

- Raw report JSON.
- Custom analysis output.
- Reputation data.
- Scan ownership.
- Dynamic status metadata.

## 4.9 Step 9: Vulnerability Analysis and Severity Calculation

### Parser Responsibilities

The report parser normalizes inconsistent scanner fields into one frontend-friendly structure:

| Output Field | Meaning |
|---|---|
| `title` | Vulnerability title. |
| `description` | Explanation of the issue. |
| `severity` | High, Medium, Low, or similar classification. |
| `file` | Affected file path when available. |
| `line` | Line number when available. |
| `owasp` | OWASP Mobile Top 10 mapping. |
| `cvss` | CVSS score if available. |
| `cwe` | CWE mapping or inferred CWE. |

### Risk Score Logic

Risk points are assigned as follows:

| Severity | Points |
|---|---:|
| High / Critical | 3 |
| Medium / Warning | 2 |
| Low / Info | 1 |

The final score is capped at `100`.

Risk level:

| Score Range | Risk Level |
|---|---|
| `0-30` | Low |
| `31-70` | Medium |
| `71-100` | High |

## 4.10 Step 10: Report Viewing

### Component Handling the Step

- Frontend: `client/src/pages/Report.jsx`
- Backend APIs:
  - `GET /api/report/:hash`
  - `GET /api/risk-score/:hash`
  - `GET /api/secrets/:hash`
  - `GET /api/mitre-cve/:hash`
  - `GET /api/custom-analysis/:hash`
  - `GET /api/virustotal/:hash`
  - `GET /api/playstore-check/:hash`

### Report Page Data Loading

```text
Report.jsx mounted
   │
   ▼
Resolve hash from props or localStorage
   │
   ▼
Fetch report, risk score, and secrets in parallel
   │
   ▼
Fetch MITRE, custom analysis, reputation, and compliance data
   │
   ▼
Populate report tabs
   │
   ▼
User reviews overview, findings, AI fixer, secrets, dynamic, mappings, privacy, compliance
```

## 4.11 Step 11: Dynamic Analysis Flow

### Component Handling the Step

- Frontend: `Report.jsx`
- Backend routes:
  - `POST /api/analyze/dynamic/:hash`
  - `GET /api/analyze/dynamic/:hash/status`
  - `POST /api/analyze/dynamic/:hash/reset`
- WebSocket server: port `5002`

### Dynamic Analysis Workflow

```text
User clicks Start Dynamic Analysis
   │
   ▼
Backend verifies report hash
   │
   ▼
Backend checks ADB emulator/device
   │
   ├── No device: 503 error
   └── Device ready
           │
           ▼
       Respond immediately: { status: "started" }
           │
           ▼
       Background task starts
           │
           ├── Mark dynamic_status = running
           ├── Start dynamic session in MASE
           ├── Wait collection window
           ├── Stop dynamic session
           ├── Fetch dynamic report JSON
           ├── Store dynamic_report_data
           └── Mark dynamic_status = completed
```

### Status Polling

The frontend polls the status endpoint while status is `running`. Once status becomes `completed`, it fetches the updated report and renders runtime artifacts such as domains, URLs, SQLite databases, trackers, API calls, and dynamic raw data.

### Live Stream

The backend WebSocket server supports:

| Stream Type | Purpose |
|---|---|
| `screen` | Captures emulator screenshots via ADB and sends base64 frames. |
| `logs` | Streams filtered Android logcat output. |

## 4.12 Step 12: Export and Download

### Export Endpoints

| Format | Endpoint |
|---|---|
| JSON | `GET /api/report/download/json/:hash` |
| CSV | `GET /api/report/download/csv/:hash` |
| PDF | `GET /api/report/download/pdf/:hash` |

### Export Workflow

```text
User clicks export button
   │
   ▼
Frontend opens backend download URL
   │
   ▼
Backend fetches report by hash
   │
   ▼
Backend formats output
   │
   ├── JSON: raw report JSON
   ├── CSV: findings table
   └── PDF: multi-page professional report
   │
   ▼
Response headers force file download
```

## 4.13 Complete Sequence Diagram

```text
User          React Frontend           Express Backend          MongoDB             MASE
 │                  │                         │                    │                 │
 │ Open app         │                         │                    │                 │
 │─────────────────>│                         │                    │                 │
 │                  │ Verify token            │                    │                 │
 │                  │────────────────────────>│                    │                 │
 │                  │                         │ JWT validation      │                 │
 │                  │<────────────────────────│                    │                 │
 │ Login            │                         │                    │                 │
 │─────────────────>│ POST /auth/login        │                    │                 │
 │                  │────────────────────────>│ Find user           │                 │
 │                  │                         │───────────────────>│                 │
 │                  │                         │<───────────────────│                 │
 │                  │                         │ bcrypt + JWT        │                 │
 │                  │<────────────────────────│                    │                 │
 │ Upload APK       │                         │                    │                 │
 │─────────────────>│ POST /analyze           │                    │                 │
 │                  │────────────────────────>│ Store temp file      │                 │
 │                  │                         │ Upload APK          │                 │
 │                  │                         │──────────────────────────────────────>│
 │                  │                         │<──────────────────────────────────────│ Hash
 │                  │                         │ Trigger scan        │                 │
 │                  │                         │──────────────────────────────────────>│
 │                  │                         │ Fetch report JSON   │                 │
 │                  │                         │──────────────────────────────────────>│
 │                  │                         │<──────────────────────────────────────│ Raw report
 │                  │                         │ Parse/enrich report │                 │
 │                  │                         │ Save report         │                 │
 │                  │                         │───────────────────>│                 │
 │                  │<────────────────────────│ Parsed report       │                 │
 │ View report      │                         │                    │                 │
 │─────────────────>│ GET report APIs         │                    │                 │
 │                  │────────────────────────>│ Fetch/parse data     │                 │
 │                  │                         │───────────────────>│                 │
 │                  │                         │<───────────────────│                 │
 │                  │<────────────────────────│ Report JSON          │                 │
 │ Download PDF     │                         │                    │                 │
 │─────────────────>│ GET PDF export          │                    │                 │
 │                  │────────────────────────>│ PDFKit generation    │                 │
 │                  │<────────────────────────│ PDF stream           │                 │
```

---

# 5. Frontend Documentation

## 5.1 Frontend Technologies Used

| Technology | Role | Why Selected | Benefit |
|---|---|---|---|
| React | UI framework | Component-based architecture | Reusable pages and interactive state handling. |
| Create React App | Build tooling | Quick project setup | Provides scripts for development/build/test. |
| React Router | Routing | Client-side navigation | Enables login, dashboard, and report routes. |
| Framer Motion | Animations | Smooth UI transitions | Improves professional dashboard experience. |
| Lucide React | Icons | Modern icon library | Consistent UI symbols for buttons and cards. |
| Recharts | Charts | Data visualization | Risk distribution and vulnerability charts. |
| Tailwind CSS | Styling | Utility-first CSS | Fast, consistent dark-themed UI styling. |
| React Syntax Highlighter | Code display | Source-code viewing | Displays decompiled Java/source snippets. |
| Browser Fetch API | API communication | Native browser API | Avoids extra HTTP client dependency. |
| LocalStorage | Token persistence | Simple session persistence | Stores JWT, username, and last scan hash. |

## 5.2 Frontend Architecture

The frontend follows a page-component architecture:

```text
client/src
├── App.js
├── index.js
├── index.css
├── components
│   ├── Navbar.jsx
│   └── MenuOverlay.jsx
└── pages
    ├── Login.jsx
    ├── Home.jsx
    ├── Dashboard.jsx
    └── Report.jsx
```

### Current Component Hierarchy

```text
App
├── Login route
└── Protected route wrapper
    ├── Navbar
    ├── Home
    ├── Dashboard
    │   └── Report embedded after scan completion
    └── Report
        ├── SecretCard
        ├── Overview tab
        ├── Vulnerabilities tab
        ├── AI Fixer tab
        ├── Secrets tab
        ├── Dynamic tab
        ├── MITRE/CVE tab
        ├── Privacy tab
        ├── Play Store compliance tab
        └── Code modal
```

## 5.3 Routing Flow

| Route | Component | Protection |
|---|---|---|
| `/login` | `Login.jsx` | Public |
| `/` | `Home.jsx` | Protected |
| `/dashboard` | `Dashboard.jsx` | Protected |
| `/report` | `Report.jsx` | Protected |

## 5.4 Authentication Guards

`App.js` defines a `ProtectedRoute` wrapper. It checks whether `mobaudit_token` exists in `localStorage`. A token verification effect also calls the backend verification endpoint when the app starts. If verification fails, the token and user metadata are removed from local storage.

This design gives the user a smooth frontend experience while the backend remains the source of truth for protected API access.

## 5.5 State Management

The project currently uses React local state through `useState` and lifecycle effects through `useEffect`. No Redux or global context store is currently required because the app has a small number of top-level pages and most data is page-specific.

### State Examples

| Component | State |
|---|---|
| `Login.jsx` | username, password, loading, error, login/register mode |
| `Dashboard.jsx` | selected file, scan progress, scan results, history, drag state |
| `Report.jsx` | report data, risk data, secrets data, active tab, code viewer state, AI fixes, dynamic status, WebSocket frames |

## 5.6 API Communication

The frontend uses the browser `fetch()` API. Backend base URL is constructed using:

```text
http://<window.location.hostname>:5001
```

This allows the application to work on localhost and LAN IPs when the frontend and backend run on the same host but different ports.

## 5.7 Frontend Folder Structure Explanation

### Existing Folders

| Folder/File | Responsibility |
|---|---|
| `src/` | Main React source code. |
| `src/components/` | Shared UI components such as navigation and overlay menu. |
| `src/pages/` | Route-level page components such as login, home, dashboard, and report viewer. |
| `src/index.js` | React entry point and root renderer. |
| `src/App.js` | Router, protected routes, and session validation. |
| `src/index.css` | Tailwind imports and base styling. |
| `public/` | Static assets such as logo, manifest, icons, and HTML template. |

### Enterprise Folders Recommended for Future Refactor

The current project keeps most logic inside page components. For a larger enterprise version, the following folders would improve maintainability:

| Folder | Recommended Purpose |
|---|---|
| `layouts/` | Reusable app shell, dashboard layout, report layout. |
| `hooks/` | Custom hooks such as `useAuth`, `useScanHistory`, `useReport`, `useWebSocketStream`. |
| `services/` | API clients such as `authService`, `scanService`, `reportService`. |
| `context/` | Global auth/session context. |
| `redux/store/` | Optional global state store if scan state and notifications become complex. |
| `utils/` | Formatting helpers, severity mapping, risk color helpers. |
| `assets/` | Images, icons, branding files, static UI media. |
| `styles/` | Shared CSS modules or design tokens if Tailwind utilities become repetitive. |

## 5.8 Login UI Flow

1. User enters username and password.
2. Frontend validates required fields.
3. If registering, frontend checks password confirmation.
4. Frontend sends credentials to login or register endpoint.
5. Backend returns token, username, and role.
6. Frontend stores token and username in local storage.
7. Frontend navigates to `/dashboard`.

## 5.9 Dashboard Rendering Flow

1. Dashboard reads stored username.
2. Dashboard requests scan history.
3. Dashboard shows upload panel.
4. If history exists, dashboard calculates:
   - total scans
   - high-risk apps
   - total vulnerabilities
   - average risk score
   - risk distribution
   - top vulnerable apps
5. User clicks a history card to open report.

## 5.10 Scan Creation UI Flow

1. User drags or selects an APK.
2. UI validates extension during drag-and-drop.
3. Selected filename appears in the upload card.
4. User clicks `START SCAN`.
5. UI displays simulated progress while the backend processes the scan.
6. On success, `lastScanResult` is saved to local storage.
7. The report component is rendered with the returned hash.

## 5.11 Report Viewing Flow

The report page uses tabs to divide complex security output into manageable sections:

| Tab | Purpose |
|---|---|
| Overview | App metadata, risk summary, severity metrics. |
| Vulnerabilities | Detailed normalized findings. |
| AI Fixer | AI-generated fix explanations and secure code guidance. |
| Secrets | Hardcoded secrets and credential indicators. |
| Dynamic | Runtime analysis status and dynamic artifacts. |
| MITRE & CVE | Attack mapping and CVE-style references. |
| Privacy | Dangerous permissions, privacy risks, malware indicators, manifest issues. |
| Play Store Check | Publication readiness and compliance warnings. |
| Code | Source-code viewer for selected files. |

## 5.12 Frontend Error Handling

| Error Area | Handling |
|---|---|
| Login failure | Displays backend error message. |
| Token invalid | Clears local storage and redirects to login. |
| Scan failure | Shows alert with error detail. |
| Report fetch failure | Shows report loading error state. |
| Code view failure | Displays code loading error string. |
| Dynamic start failure | Displays emulator/device error message. |

---

# 6. Backend Documentation

## 6.1 Backend Technologies

| Technology | Role | Why Used |
|---|---|---|
| Node.js | Runtime | Non-blocking I/O, strong ecosystem for APIs. |
| Express.js | HTTP framework | Simple route/middleware architecture. |
| Mongoose | MongoDB connector | Schema modeling and document operations. |
| MongoDB | Database | Flexible JSON-like storage for large scan reports. |
| Multer | File upload middleware | Handles multipart APK uploads. |
| Axios | HTTP client | Communicates with MASE and external APIs. |
| FormData | Multipart forwarding | Sends uploaded APKs to the scan engine. |
| bcryptjs | Password hashing | Stores passwords securely as hashes. |
| jsonwebtoken | JWT authentication | Stateless API session model. |
| PDFKit | PDF generation | Streams professional PDF reports. |
| ws | WebSocket server | Live screen/log streaming for dynamic analysis. |
| adm-zip | APK archive reading | Inspects APK ZIP entries. |
| xml2js | XML parsing | Parses decoded Android manifest XML. |
| crypto | Hashing | SHA-256 reputation hashing and AI cache keys. |
| dotenv | Configuration | Loads environment variables. |

## 6.2 Backend Architecture

The backend is currently implemented in a single large file: `server/server.js`. Functionally, it contains the following layers:

```text
server.js
├── Environment/config loading
├── Express app and middleware setup
├── WebSocket streaming server
├── MASE configuration
├── Utility mapping functions
├── Custom APK parser
├── Play Store compliance checker
├── Report parser
├── Secret scanner
├── MongoDB connection
├── User schema/model
├── Auth middleware/routes
├── Scan report schema/model
├── AI fix cache schema/model
├── File upload middleware
├── Analysis routes
├── Report/risk/secrets/export routes
├── AI remediation routes
├── MITRE/CVE mapping
├── Scan history
├── CI/CD scan endpoint
├── Dynamic analysis routes
└── Server listen
```

## 6.3 Middleware Execution

The backend uses middleware for:

| Middleware | Purpose |
|---|---|
| `cors()` | Allows frontend on port `3000` to call backend on port `5001`. |
| `express.json()` | Parses JSON request bodies. |
| `authenticateJWT` | Protects authenticated routes. |
| `authenticateCiToken` | Protects CI/CD scan endpoint. |
| `upload.single("apk")` | Parses uploaded APK files. |

## 6.4 Request Lifecycle

```text
HTTP Request
   │
   ▼
CORS middleware
   │
   ▼
JSON or multipart parser
   │
   ▼
Authentication middleware when required
   │
   ▼
Route handler
   │
   ├── Validate input
   ├── Query database
   ├── Call MASE or external service
   ├── Transform result
   └── Send JSON/file response
```

## 6.5 Backend Folder Structure Explanation

### Current Backend Structure

```text
server/
├── server.js
├── reset.js
├── package.json
└── package-lock.json
```

### Current File Responsibilities

| File | Responsibility |
|---|---|
| `server.js` | Main API server, authentication, scanning, parsing, reporting, dynamic analysis, exports. |
| `reset.js` | Utility script to reset dynamic analysis status and dynamic report data for stored scans. |
| `package.json` | Backend dependencies and start script. |

### Enterprise Folder Structure Recommended

For maintainability, the current single-file backend can be refactored into:

| Folder | Purpose |
|---|---|
| `routes/` | Route definitions grouped by domain: auth, scans, reports, dynamic, AI. |
| `controllers/` | HTTP request/response handlers. |
| `services/` | Business logic for MASE, parsing, scoring, exports, AI, reputation. |
| `middlewares/` | JWT, CI token, validation, error handling. |
| `models/` | Mongoose schemas for users, reports, AI cache. |
| `repositories/` | Database access abstractions. |
| `validators/` | Request validation schemas. |
| `jobs/` | Background job definitions for scan and dynamic analysis. |
| `queues/` | Queue adapters for Redis/BullMQ or RabbitMQ in production. |
| `utils/` | Mapping helpers, hashing helpers, file cleanup utilities. |
| `config/` | Environment configuration, constants, service URLs. |

## 6.6 Backend Internal Workflow: Login

1. Route receives username and password.
2. Mongoose queries `User.findOne({ username })`.
3. bcrypt compares plaintext password with stored hash.
4. JWT is signed with user ID, username, and role.
5. Response returns token and user metadata.

## 6.7 Backend Internal Workflow: Scan Initialization

1. JWT middleware authenticates the request.
2. Multer saves uploaded APK to `uploads/`.
3. Route verifies `req.file`.
4. Backend waits for MASE readiness.
5. File stream is forwarded to MASE.
6. Returned hash becomes the scan identifier.
7. Static analysis is triggered.
8. Report JSON is fetched.
9. Raw report is parsed, enriched, stored, and returned.

## 6.8 Backend Internal Workflow: Result Processing

The backend normalizes findings using helper functions:

| Function | Purpose |
|---|---|
| `normalizeFinding` | Converts scanner-specific fields into one finding format. |
| `deduplicate` | Removes duplicate findings using title and file. |
| `mapOwaspCategory` | Infers OWASP category from finding title/description. |
| `mapCweFromTitle` | Infers CWE IDs using keyword matching. |
| `parseMobAuditReport` | Converts raw scanner JSON into application metadata and findings. |
| `scanForSecrets` | Searches report content and files for sensitive strings. |
| `mapToMitreAndCve` | Maps findings to attack techniques and CVE-style references. |

## 6.9 Backend Internal Workflow: Report Creation

Report generation is not a separate precomputed document stored in the database. Instead, reports are generated on demand:

- JSON returns stored raw report.
- CSV parses findings and formats rows.
- PDF builds a multi-page PDF stream dynamically using PDFKit.

This design saves storage space and ensures exports reflect the current parser and formatting logic.

---

# 7. Database Documentation

## 7.1 Database Technology

The project uses **MongoDB** with **Mongoose**. MongoDB is appropriate because scan reports are large, nested, and semi-structured. A relational schema would require many normalized tables for findings, permissions, source files, dynamic artifacts, reputation results, and report sections. MongoDB allows raw analysis JSON and enriched objects to be stored directly.

## 7.2 Implemented Collections

The current implementation defines three main collections:

| Collection | Mongoose Model | Purpose |
|---|---|---|
| `users` | `User` | Stores user accounts and hashed passwords. |
| `scanreports` | `ScanReport` | Stores raw and enriched scan reports. |
| `aifixcaches` | `AIFixCache` | Stores AI remediation results by vulnerability hash. |

## 7.3 User Collection

| Field | Type | Constraints | Purpose |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary identifier. |
| `username` | String | Required, unique | Login identifier. |
| `password` | String | Required | bcrypt password hash. |
| `role` | String | Default `user` | Authorization role. |
| `created_at` | Date | Default `Date.now` | Creation timestamp. |

## 7.4 ScanReport Collection

| Field | Type | Constraints | Purpose |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Document identifier and timestamp source. |
| `hash` | String | Required, unique | MASE scan hash and report identifier. |
| `report_data` | Object | Optional | Raw structured analysis report. |
| `dynamic_report_data` | Object | Optional | Runtime dynamic analysis report. |
| `dynamic_status` | String | Default `not_started` | Dynamic analysis state. |
| `user_id` | ObjectId | References `User` | Owner of scan. |
| `custom_analysis` | Object | Default `{}` | Manifest, privacy, malware, permission, secret analysis. |
| `virustotal` | Object | Default `{}` | Reputation intelligence result. |

## 7.5 AI Fix Cache Collection

| Field | Type | Constraints | Purpose |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Cache entry identifier. |
| `vuln_hash` | String | Required, unique | MD5 hash of title, description, and code snippet. |
| `explanation` | String | Optional | AI explanation of vulnerability. |
| `fix` | String | Optional | Step-by-step remediation. |
| `secure_code` | String | Optional | Example secure implementation. |
| `created_at` | Date | Default `Date.now` | Cache creation timestamp. |

## 7.6 Logical Enterprise Entities

Although the current database stores nested reports inside `scanreports`, the system can be understood using these logical entities:

| Logical Entity | Current Storage |
|---|---|
| Users | `users` collection |
| Scans | `scanreports` document |
| Vulnerabilities | Nested inside `report_data` and parsed on demand |
| Reports | Generated from `scanreports` |
| Logs | Runtime server logs and WebSocket log stream; not persisted as separate collection |
| Sessions | JWT tokens; not stored server-side |
| Targets | Uploaded APKs; temporary file only, deleted after scan |

## 7.7 ER Diagram

```text
┌───────────────┐          1           N          ┌──────────────────┐
│     User      │────────────────────────────────>│    ScanReport     │
├───────────────┤                                 ├──────────────────┤
│ _id           │                                 │ _id              │
│ username      │                                 │ hash             │
│ password      │                                 │ report_data      │
│ role          │                                 │ custom_analysis  │
│ created_at    │                                 │ virustotal       │
└───────────────┘                                 │ dynamic_status   │
                                                  │ dynamic_data     │
                                                  │ user_id          │
                                                  └──────────────────┘

┌──────────────────┐
│   AIFixCache      │
├──────────────────┤
│ _id              │
│ vuln_hash        │
│ explanation      │
│ fix              │
│ secure_code      │
│ created_at       │
└──────────────────┘
```

## 7.8 Indexing and Optimization

Implemented indexes are implied by schema constraints:

| Field | Index Type | Purpose |
|---|---|---|
| `users.username` | Unique | Prevent duplicate accounts and speed login lookup. |
| `scanreports.hash` | Unique | Fast report retrieval by scan hash. |
| `aifixcaches.vuln_hash` | Unique | Fast AI cache lookup and deduplication. |

Recommended future indexes:

| Field | Reason |
|---|---|
| `scanreports.user_id` | Improve user history queries. |
| `scanreports.dynamic_status` | Improve dynamic status dashboards. |
| `scanreports._id` | Already default; useful for sorting by creation time. |
| `aifixcaches.created_at` | Enable TTL cleanup if desired. |

## 7.9 Data Lifecycle

```text
APK Upload
   │
   ▼
Temporary file stored in uploads/
   │
   ▼
File forwarded to MASE and custom parser
   │
   ▼
Raw report and enrichment stored in MongoDB
   │
   ▼
Temporary APK deleted
   │
   ▼
Reports generated on demand from stored data
   │
   ▼
Dynamic data may be added later to same scan document
```

---

# 8. API Documentation

## 8.1 API Lifecycle

All protected frontend requests follow this lifecycle:

```text
React fetch()
   │
   ▼
Authorization header added
   │
   ▼
Express receives request
   │
   ▼
JWT middleware verifies user
   │
   ▼
Route validates params/body/files
   │
   ▼
Route performs database and service operations
   │
   ▼
Response returned as JSON or file stream
```

## 8.2 Authentication APIs

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/auth/login` | POST | Authenticates existing user. | No |
| `/api/auth/register` | POST | Creates a new user account. | No |
| `/api/auth/verify` | GET | Verifies JWT validity. | Yes |

### POST `/api/auth/login`

| Item | Detail |
|---|---|
| Description | Logs in a user and returns JWT. |
| Headers | `Content-Type: application/json` |
| Body | `{ "username": "string", "password": "string" }` |
| Success | `200 { token, username, role }` |
| Errors | `401 Invalid credentials`, `500 Login failed` |
| Security Validation | bcrypt password comparison; JWT signed for 24 hours. |

### POST `/api/auth/register`

| Item | Detail |
|---|---|
| Description | Registers a new user. |
| Headers | `Content-Type: application/json` |
| Body | `{ "username": "string", "password": "string" }` |
| Success | `200 { token, username, role }` |
| Errors | `400 Username already exists`, `500 Registration failed` |
| Security Validation | Password hashed with bcrypt before storage. |

### GET `/api/auth/verify`

| Item | Detail |
|---|---|
| Description | Validates JWT and returns decoded user payload. |
| Headers | `Authorization: Bearer <token>` |
| Success | `200 { valid: true, user }` |
| Errors | `401 Unauthorized` |
| Security Validation | JWT signature and expiration check. |

## 8.3 Scan APIs

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/analyze` | POST | Uploads APK and performs full static/enrichment analysis. | Yes |
| `/api/scans/history` | GET | Returns recent scans for the authenticated user. | Yes |
| `/api/scan/start` | POST | Starts CI/CD scan using token auth. | CI token |
| `/api/health` | GET | Returns server and service health. | No |

### POST `/api/analyze`

| Item | Detail |
|---|---|
| Description | Main APK analysis endpoint. |
| Headers | `Authorization: Bearer <token>` |
| Body | Multipart form field `apk` |
| Success | `200` parsed report JSON |
| Errors | `400 No file uploaded`, `401 Unauthorized`, `500 Analysis failed` |
| Database | Upserts `scanreports` document. |
| Internal Services | MASE, custom APK parser, reputation lookup. |
| Cleanup | Temporary uploaded file deleted after route finishes. |

### GET `/api/scans/history`

| Item | Detail |
|---|---|
| Description | Fetches latest 20 scan summaries. |
| Headers | `Authorization: Bearer <token>` |
| Success | `200 { scans: [...] }` |
| Errors | `401 Unauthorized`, `500 Failed to fetch scan history` |
| Database | Reads `scanreports`; updates legacy `user_id: null` records. |

### POST `/api/scan/start`

| Item | Detail |
|---|---|
| Description | CI/CD style scan start endpoint. |
| Headers | `Authorization: Bearer <CI_CD_TOKEN>` |
| Body | Multipart `apk` or JSON/form `repo_url` |
| Success | `202 { status, hash, results_url, message }` |
| Errors | `400`, `401`, `500` |
| Processing Style | Non-blocking scan trigger. |

### GET `/api/health`

| Item | Detail |
|---|---|
| Description | Returns basic service health. |
| Success | `200 { status, port, mase, mongodb }` |
| Purpose | Operational readiness check. |

## 8.4 Report and Analysis APIs

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/report/:hash` | GET | Returns normalized report. | Yes |
| `/api/risk-score/:hash` | GET | Returns computed risk score. | Yes |
| `/api/custom-analysis/:hash` | GET | Returns custom APK parser result. | Yes |
| `/api/virustotal/:hash` | GET | Returns reputation intelligence. | Yes |
| `/api/secrets/:hash` | GET | Returns detected secrets. | Yes |
| `/api/playstore-check/:hash` | GET | Returns compliance assessment. | Yes |
| `/api/mitre-cve/:hash` | GET | Returns attack and CVE-style mappings. | Yes |
| `/api/code/:hash` | GET | Fetches decompiled source code file. | Current implementation: No |

### GET `/api/report/:hash`

| Item | Detail |
|---|---|
| Path Params | `hash` scan identifier |
| Headers | `Authorization: Bearer <token>` |
| Success | Normalized report JSON |
| Errors | `404 Report not found`, `500 Fetch failed` |
| Database | Reads `scanreports` filtered by hash and user. |

### GET `/api/risk-score/:hash`

| Item | Detail |
|---|---|
| Description | Computes weighted score from findings. |
| Success | `{ hash, total_score, risk_level, owasp_categories, meta }` |
| Errors | `404 Report not found`, `500 Risk analysis flow interrupted` |

### GET `/api/custom-analysis/:hash`

| Item | Detail |
|---|---|
| Description | Returns custom parser output. |
| Success | Permission, privacy, malware, secrets, manifest, app info object |
| Errors | `404 Report not found`, `500` |

### GET `/api/virustotal/:hash`

| Item | Detail |
|---|---|
| Description | Returns stored reputation result. |
| Success | Reputation JSON |
| Errors | `404 Report not found`, `500` |

### GET `/api/secrets/:hash`

| Item | Detail |
|---|---|
| Description | Runs/report secret detection on stored report data. |
| Success | `{ hash, count, secrets }` |
| Errors | `404 Report not found`, `500 Secret analysis failed` |

### GET `/api/playstore-check/:hash`

| Item | Detail |
|---|---|
| Description | Checks publish-readiness conditions. |
| Success | Compliance object with verdict, passed, warnings, critical items |
| Errors | `404 Report not found`, `500` |

### GET `/api/mitre-cve/:hash`

| Item | Detail |
|---|---|
| Description | Maps findings to attack techniques and CVE-style references. |
| Success | `{ hash, total, mappings }` |
| Errors | `404 Report not found`, `500 Failed to generate MITRE mappings` |

### GET `/api/code/:hash?file=<path>`

| Item | Detail |
|---|---|
| Description | Fetches decompiled source for a specific file from MASE. |
| Query Params | `file` required |
| Success | `{ code: "..." }` |
| Errors | `400 File required`, `500 Code fetch failed` |
| Recommended Security | Add JWT protection and ownership check in production. |

## 8.5 Export APIs

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/report/download/json/:hash` | GET | Downloads raw report JSON. | Current implementation: No |
| `/api/report/download/csv/:hash` | GET | Downloads findings CSV. | Current implementation: No |
| `/api/report/download/pdf/:hash` | GET | Downloads professional PDF. | Current implementation: No |

Recommended production improvement: protect export endpoints with JWT and report ownership checks.

## 8.6 AI Remediation API

### POST `/api/ai/fix-suggestion`

| Item | Detail |
|---|---|
| Description | Generates or returns cached remediation guidance. |
| Headers | `Content-Type: application/json` |
| Body | `{ "title": "string", "description": "string", "code_snippet": "string" }` |
| Success | `{ vuln_hash, explanation, fix, secure_code }` |
| Errors | `400`, `500 AI service failed to generate a suggestion` |
| Database | Reads/writes `aifixcaches`. |
| Processing | Uses MD5 cache key and external AI API when configured. |
| Recommended Security | Add JWT protection and request size limits. |

## 8.7 Dynamic Analysis APIs

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/analyze/dynamic/:hash/status` | GET | Returns dynamic status. | Current implementation: No |
| `/api/analyze/dynamic/:hash` | POST | Starts dynamic analysis. | Current implementation: No |
| `/api/analyze/dynamic/:hash/reset` | POST | Resets dynamic data. | Yes |

Recommended production improvement: protect all dynamic endpoints with JWT and ownership checks.

---

# 9. Scanning Engine Deep Explanation

## 9.1 Scan Initialization

Scan initialization begins when the backend receives a valid APK upload. The scan request contains the user identity from JWT middleware and a temporary file from Multer. The backend creates a file stream and forwards it to MASE. The returned hash becomes the primary scan identifier throughout the application.

## 9.2 Target Parsing

Target parsing is performed at multiple levels:

| Layer | Parsing Performed |
|---|---|
| MASE | APK metadata, manifest, source, certificates, components, security findings. |
| Custom parser | Manifest XML, permissions, dangerous permissions, privacy risks, strings, ZIP entries. |
| Report parser | Normalized findings, OWASP, CWE, severity, application metadata. |
| Reputation checker | SHA-256 hash and external engine statistics. |

## 9.3 Request Generation

The backend generates requests to MASE using:

- Multipart form-data for APK upload.
- URL-encoded forms for scan trigger and report retrieval.
- Required API key headers.
- Hash-based scan references.

## 9.4 Payload Processing

The payload passes through these transformations:

```text
APK binary
   │
   ├── Temporary backend file
   ├── MASE upload stream
   ├── Custom APK ZIP inspection
   ├── SHA-256 hash calculation
   └── Cleanup after processing
```

## 9.5 Detection Logic

### Static Findings

Static detection is performed by MASE and normalized by MobAudit. Findings may include:

- insecure permissions
- exported components
- debug flags
- insecure communication
- weak cryptographic usage
- insecure storage
- hardcoded secrets
- WebView risks
- reverse engineering indicators

### Custom Permission Detection

The custom parser marks permissions dangerous when they include sensitive Android capabilities such as:

- contacts
- location
- SMS
- call logs
- camera
- microphone
- external storage
- phone state
- accounts

### Custom Malware Indicator Detection

The parser checks ZIP entry names for indicators such as:

- root-related files
- hooking frameworks
- excessive native libraries
- encryption-related native libraries

### Secret Detection

The secret scanner looks for patterns such as:

- API keys
- AWS-style access keys
- Firebase URLs
- Google API keys
- passwords
- tokens

## 9.6 Vulnerability Identification

The normalized vulnerability model ensures every finding can be rendered consistently:

```text
{
  title,
  description,
  severity,
  file,
  line,
  owasp,
  cvss,
  cwe
}
```

This standardization is important because different scanner sections may use different field names such as `title`, `name`, `issue`, `detail`, `message`, `file_path`, or `source`.

## 9.7 Scan Orchestration

The backend acts as the orchestrator:

1. Validate request.
2. Upload target.
3. Start MASE scan.
4. Fetch report.
5. Parse and normalize output.
6. Run custom checks.
7. Run reputation check.
8. Store all relevant data.
9. Return frontend-ready response.

## 9.8 Multi-Stage Scanning

| Stage | Type | Output |
|---|---|---|
| APK upload | Ingestion | Scan hash |
| Static analysis | Automated security scan | Raw report JSON |
| Custom analysis | Backend enrichment | Privacy, manifest, malware, permission result |
| Reputation | External intelligence | Malicious/suspicious engine stats |
| Secret scan | Pattern matching | Secret list |
| Risk scoring | Data aggregation | Numeric score and level |
| Mapping | Threat classification | OWASP, CWE, MITRE/CVE-style output |
| Dynamic analysis | Runtime orchestration | Domains, URLs, trackers, databases, API logs |

## 9.9 Async Processing and Concurrency

The current implementation uses JavaScript async/await for non-blocking operations. The dynamic analysis flow uses an in-process asynchronous function after sending an immediate response. This allows the frontend to continue polling while the backend works.

Production concurrency recommendations:

- Move scan jobs to a durable queue such as BullMQ with Redis.
- Store scan status transitions explicitly.
- Add worker processes for MASE orchestration.
- Add retry policies for transient MASE failures.
- Add concurrency limits to prevent multiple heavy APK scans from exhausting CPU and memory.
- Add per-user rate limits.

---

# 10. Report Generation System

## 10.1 Result Formatting

The backend formats raw scanner results into structured report sections:

- application metadata
- severity distribution
- normalized findings
- OWASP categories
- CWE mappings
- risk score
- permissions
- custom privacy risks
- malware indicators
- reputation results
- MITRE/CVE-style mappings
- dynamic results when available

## 10.2 Severity Calculation

Severity is treated as a weighted security signal:

| Severity | Weight |
|---|---:|
| Critical / High | 3 |
| Medium / Warning | 2 |
| Low / Info | 1 |

The score is capped at 100 to make reporting easier for users and management reviewers.

## 10.3 CVSS and Risk Classification

When CVSS scores are available from the scanner or mapping logic, they are included in the vulnerability object or MITRE/CVE-style mapping. The PDF report displays CVSS-like numeric scores in mapping sections. Risk classification is based on the cumulative score:

| Classification | Condition |
|---|---|
| Low | Score up to 30 |
| Medium | Score greater than 30 and up to 70 |
| High | Score greater than 70 |

## 10.4 PDF Generation

The PDF export uses PDFKit and builds a multi-page report dynamically. Major sections include:

1. Cover page.
2. Application information.
3. Executive summary.
4. Severity distribution.
5. OWASP Mobile Top 10 summary.
6. Detailed findings.
7. Permissions analysis.
8. MITRE ATT&CK and CVE-style mapping.
9. Reputation intelligence.
10. Privacy and malware analysis.
11. Recommendations.

## 10.5 CSV Export

CSV export is designed for spreadsheet analysis and includes:

| Column | Meaning |
|---|---|
| Title | Vulnerability title. |
| Severity | Risk severity. |
| File | Affected file. |
| Line | Affected line if known. |
| Description | Finding explanation. |

## 10.6 JSON Export

JSON export returns the stored raw report data. This is useful for:

- developer debugging
- CI/CD integrations
- third-party tooling
- archival of original scanner output

## 10.7 Report Lifecycle

```text
Scan completes
   │
   ▼
Raw report stored
   │
   ▼
User opens report
   │
   ▼
Backend parses report on demand
   │
   ▼
Frontend displays report tabs
   │
   ▼
User exports selected format
   │
   ▼
Backend generates file stream
```

---

# 11. Authentication and Security

## 11.1 Implemented Authentication

MobAudit uses JWT authentication:

- User logs in with username/password.
- Backend verifies password using bcrypt.
- Backend signs a JWT containing user ID, username, and role.
- Frontend stores token in `localStorage`.
- Protected frontend routes check token presence.
- Protected backend routes verify token using `authenticateJWT`.

## 11.2 Password Hashing

Passwords are not stored in plaintext. The backend hashes passwords with bcrypt using a salt factor of `10`. During login, bcrypt compares the submitted password against the stored hash.

## 11.3 Access Control

Implemented access control:

- JWT middleware protects scan creation, report retrieval, risk score, scan history, custom analysis, reputation, secrets, mapping, and selected dynamic reset routes.
- Scan reports are typically filtered by `hash` and `user_id`, preventing users from reading another user's report through protected endpoints.

Current limitations:

- Some endpoints are not protected in the current implementation, including selected download, source-code, AI fix, and dynamic status/start routes.
- Role-based authorization exists as a field but is not deeply enforced across routes.

Recommended production improvements:

- Protect all report export routes.
- Protect source-code viewing.
- Protect dynamic status/start routes.
- Enforce owner checks for every hash-based route.
- Add admin-only APIs for user management.
- Use refresh tokens and token rotation.

## 11.4 Input Sanitization and Injection Prevention

MongoDB access is performed through Mongoose methods, reducing traditional SQL injection risk because the database is non-relational. However, NoSQL injection should still be considered. Recommended improvements:

- Validate all request bodies with schemas.
- Enforce strict types for username, password, hash, file, and repo URL.
- Reject objects where strings are expected.
- Sanitize query parameters such as `file`.
- Restrict source-code file paths to MASE-approved values.

## 11.5 XSS Prevention

React escapes text values by default, reducing reflected XSS risk in rendered data. However, scanner data may contain untrusted strings. Recommended hardening:

- Never use raw HTML rendering for scanner output.
- Sanitize downloaded report filenames.
- Escape PDF text content where necessary.
- Apply strict Content Security Policy in production.

## 11.6 CSRF Protection

The current architecture uses Bearer tokens in Authorization headers, which reduces traditional cookie-based CSRF exposure. If cookies are introduced later, CSRF tokens or SameSite cookie policies should be added.

## 11.7 Secure Headers

Recommended production headers:

| Header | Purpose |
|---|---|
| `Content-Security-Policy` | Restricts script, style, and resource loading. |
| `X-Content-Type-Options: nosniff` | Prevents MIME sniffing. |
| `X-Frame-Options: DENY` | Prevents clickjacking. |
| `Referrer-Policy` | Limits sensitive URL leakage. |
| `Strict-Transport-Security` | Enforces HTTPS. |

## 11.8 Rate Limiting

Rate limiting is recommended for:

- login
- registration
- upload analysis
- AI fix generation
- source-code viewing
- dynamic analysis start

This prevents brute force login attempts, service abuse, and resource exhaustion.

## 11.9 API Security

Security controls implemented:

- JWT middleware.
- CI token middleware.
- bcrypt password hashing.
- temporary file cleanup.
- user report ownership filtering on many routes.
- environment-based secrets.

Security controls recommended:

- centralized validation middleware.
- request size limits.
- file type and magic-byte validation for APK uploads.
- antivirus scanning for uploaded files.
- per-user scan quotas.
- structured security logging.
- full audit logs.
- HTTPS reverse proxy.

## 11.10 Token Expiration

JWT tokens are signed with a 24-hour expiration. Once expired, backend verification fails and the frontend clears the token. Refresh-token support is a recommended enhancement.

---

# 12. System Architecture

## 12.1 Frontend/Backend Communication Diagram

```text
React Browser App
   │
   ├── POST /api/auth/login
   ├── GET  /api/auth/verify
   ├── POST /api/analyze
   ├── GET  /api/scans/history
   ├── GET  /api/report/:hash
   ├── GET  /api/risk-score/:hash
   ├── GET  /api/secrets/:hash
   ├── GET  /api/mitre-cve/:hash
   ├── POST /api/ai/fix-suggestion
   ├── POST /api/analyze/dynamic/:hash
   └── GET  /api/report/download/:format/:hash
           │
           ▼
Node/Express API Server
```

## 12.2 Database Interaction Diagram

```text
Express Routes
   │
   ├── Auth routes ───────────────> users
   ├── Scan routes ───────────────> scanreports
   ├── Report routes ─────────────> scanreports
   ├── Dynamic routes ────────────> scanreports.dynamic_status / dynamic_report_data
   └── AI fix route ──────────────> aifixcaches
```

## 12.3 Scan Engine Architecture

```text
Backend Orchestrator
   │
   ├── Upload APK to MASE
   ├── Trigger static analysis
   ├── Retrieve report JSON
   ├── Request source code views
   ├── Start dynamic analysis
   ├── Stop dynamic analysis
   └── Retrieve dynamic report JSON
```

## 12.4 Deployment Architecture

```text
Developer / Server Machine
├── React frontend on port 3000
├── Express backend on port 5001
├── WebSocket stream server on port 5002
├── MongoDB on port 27017
├── MASE container on port 8000
└── Genymotion / Android emulator over ADB
```

## 12.5 Production Architecture Recommendation

```text
Internet
   │
   ▼
Reverse Proxy / HTTPS Gateway
   │
   ├── /             → React static build
   ├── /api          → Express API cluster
   └── /ws           → WebSocket service
                         │
                         ├── MongoDB replica set
                         ├── Redis queue
                         ├── MASE worker nodes
                         ├── Object storage for reports
                         └── Monitoring/logging stack
```

---

# 13. Use Cases

## 13.1 User Registration

| Item | Description |
|---|---|
| Actor | New user |
| Preconditions | User is on login page and chooses registration mode. |
| Workflow | Enter username/password, confirm password, submit, backend checks uniqueness, hashes password, creates user, returns JWT. |
| Postconditions | User is authenticated and redirected to dashboard. |

## 13.2 User Login

| Item | Description |
|---|---|
| Actor | Existing user |
| Preconditions | User account exists. |
| Workflow | Submit credentials, backend validates user and bcrypt hash, backend returns JWT, frontend stores token. |
| Postconditions | User can access protected routes. |

## 13.3 Create Scan

| Item | Description |
|---|---|
| Actor | Authenticated user |
| Preconditions | User has APK file. |
| Workflow | Select APK, click scan, frontend uploads file, backend validates token/file, forwards file to MASE, starts analysis. |
| Postconditions | Scan report is stored and returned. |

## 13.4 Monitor Scan

| Item | Description |
|---|---|
| Actor | Authenticated user |
| Preconditions | Scan exists. |
| Workflow | Dashboard shows progress for immediate scan; dynamic tab polls status for runtime analysis. |
| Postconditions | User sees completed or error status. |

## 13.5 View Vulnerabilities

| Item | Description |
|---|---|
| Actor | Authenticated user |
| Preconditions | Report exists and belongs to user. |
| Workflow | User opens report, frontend fetches normalized report and renders findings. |
| Postconditions | User can inspect severity, file, line, OWASP, CWE, description. |

## 13.6 Generate Reports

| Item | Description |
|---|---|
| Actor | Authenticated user |
| Preconditions | Scan report exists. |
| Workflow | User clicks export button, backend formats JSON/CSV/PDF. |
| Postconditions | File download begins. |

## 13.7 Download Reports

| Item | Description |
|---|---|
| Actor | User or reviewer |
| Preconditions | Report hash exists. |
| Workflow | Browser opens download endpoint, backend streams selected format. |
| Postconditions | Report file is available for submission or sharing. |

## 13.8 Admin Management

| Item | Description |
|---|---|
| Actor | Admin |
| Preconditions | Admin account exists. |
| Current Behavior | Default admin account can be auto-created; deep admin management APIs are not yet implemented. |
| Future Workflow | Admin manages users, scan quotas, system status, audit logs, and service health. |

---

# 14. Challenges and Solutions

## 14.1 Challenge: Handling Large APK Uploads

**Problem:** APK files can be large and should not be loaded entirely into memory.

**Solution:** The backend uses Multer disk storage and streams the file to MASE through form-data. After processing, the temporary file is deleted.

## 14.2 Challenge: Normalizing Scanner Output

**Problem:** Raw security reports can contain inconsistent field names and nested structures.

**Solution:** The parser normalizes fields into a consistent vulnerability model with title, description, severity, file, line, OWASP, CVSS, and CWE.

## 14.3 Challenge: Presenting Complex Security Data Clearly

**Problem:** Raw vulnerability data is difficult for students, clients, and developers to understand.

**Solution:** The frontend splits results into tabs and the backend generates executive-level summaries, risk scores, and professional PDF reports.

## 14.4 Challenge: Dynamic Analysis Requires External Device State

**Problem:** Dynamic analysis depends on an Android emulator or ADB device being connected.

**Solution:** The backend checks ADB devices before starting dynamic analysis and returns a clear `503` error if no device is available.

## 14.5 Challenge: AI Suggestions Can Be Expensive or Slow

**Problem:** Repeated AI calls for the same vulnerability waste time and API credits.

**Solution:** The backend hashes vulnerability context and stores AI responses in a cache collection.

## 14.6 Challenge: Report Generation Complexity

**Problem:** Professional PDF reports require layout, pagination, tables, and multiple sections.

**Solution:** PDFKit is used to programmatically generate cover pages, summaries, findings, mappings, reputation intelligence, and recommendations.

---

# 15. Performance Optimization

## 15.1 Caching

Implemented:

- AI remediation cache by vulnerability hash.
- Stored raw scan report in MongoDB to avoid rescanning for every view.

Recommended:

- Cache parsed report summaries.
- Cache risk score results.
- Cache report export artifacts for large reports.

## 15.2 Queue Optimization

Current:

- Direct async route processing.
- In-process dynamic analysis background function.

Recommended:

- Use Redis-backed queues for static and dynamic scan jobs.
- Limit concurrency per worker.
- Store job progress in database.
- Add retry and dead-letter queues.

## 15.3 Database Optimization

Implemented:

- Unique indexes on scan hash, username, and AI cache hash.

Recommended:

- Add index on `user_id`.
- Store scan summary fields separately to avoid parsing full raw report for history.
- Add TTL for temporary or stale AI cache entries if needed.

## 15.4 API Optimization

Recommended:

- Combine report-related endpoints into a single report bundle endpoint for initial page load.
- Compress responses with gzip or brotli.
- Paginate large findings.
- Limit source-code response size.

## 15.5 Frontend Rendering Optimization

Recommended:

- Lazy-load report tabs.
- Memoize chart data.
- Virtualize long findings lists.
- Split `Report.jsx` into smaller tab components.
- Avoid generating random dashboard analytics values during render.

---

# 16. Testing

## 16.1 Unit Testing

Recommended unit tests:

| Area | Test Examples |
|---|---|
| OWASP mapper | Permission maps to platform usage; storage maps to insecure storage. |
| CWE mapper | Debug maps to CWE-489; HTTP maps to CWE-319. |
| Risk scoring | Correct score and level from findings. |
| Secret scanner | Detects API keys and passwords. |
| Parser | Handles missing fields safely. |

## 16.2 Integration Testing

Recommended integration tests:

- Login and registration.
- Protected route without token.
- Protected route with invalid token.
- APK upload request without file.
- Report retrieval by owner.
- Scan history response structure.
- Dynamic status state transitions.

## 16.3 API Testing

Tools:

- Postman
- Insomnia
- curl
- automated Jest/Supertest suite

Required tests:

| API | Test |
|---|---|
| `/api/auth/login` | Valid and invalid credentials. |
| `/api/analyze` | Missing file, invalid token, valid upload. |
| `/api/report/:hash` | Existing report, missing report, wrong owner. |
| `/api/risk-score/:hash` | Correct severity distribution. |
| `/api/report/download/pdf/:hash` | PDF content type and file stream. |

## 16.4 Security Testing

Recommended:

- brute force login testing
- JWT tampering tests
- NoSQL injection payloads
- malicious filename upload tests
- oversized APK upload tests
- source-code file path abuse tests
- XSS payloads inside report fields
- authorization bypass tests for hash-based endpoints

## 16.5 Current Test Status

The frontend includes a default Create React App test that still checks for the original sample text. It should be replaced with project-specific tests for routing, login, dashboard rendering, and report tab behavior.

---

# 17. Deployment

## 17.1 Local Development Deployment

The repository includes startup scripts:

| Script | Platform | Purpose |
|---|---|---|
| `start.ps1` | Windows PowerShell | Starts MongoDB, MASE, backend, and frontend. |
| `start.sh` | Linux/macOS shell | Starts MASE, syncs API key, backend, and frontend. |

## 17.2 Required Services

| Service | Port | Purpose |
|---|---:|---|
| React frontend | 3000 | User interface |
| Express backend | 5001 | REST API |
| WebSocket server | 5002 | Dynamic screen/log streaming |
| MASE container | 8000 | APK analysis engine |
| MongoDB | 27017 | Database |
| Android emulator/ADB | 5555 or configured device | Dynamic analysis |

## 17.3 Environment Variables

Typical backend environment variables:

| Variable | Purpose |
|---|---|
| `PORT` | Backend API port. |
| `MONGODB_URI` | MongoDB connection string. |
| `JWT_SECRET` | JWT signing secret. |
| `MASE_BASE_URL` | MASE service base URL. |
| `MASE_API_KEY` | MASE service API key. |
| `GROQ_API_KEY` | AI remediation API key. |
| `VIRUSTOTAL_API_KEY` | Reputation intelligence API key. |
| `CI_CD_TOKEN` | Token for CI/CD scan endpoint. |

Note: The production configuration should expose analysis-engine settings using MASE terminology for consistency across documentation, deployment scripts, and operator-facing material.

## 17.4 Docker and Containerization

The startup scripts use Docker to manage:

- MongoDB container.
- MASE analysis container.

Production recommendations:

- Use `docker-compose.yml`.
- Use named volumes for persistent MASE and MongoDB data.
- Add health checks.
- Separate development and production environment files.
- Avoid printing secrets in console logs.

## 17.5 Reverse Proxy Setup

Recommended production reverse proxy:

```text
https://domain.com/        → React build
https://domain.com/api     → Express backend
https://domain.com/ws      → WebSocket stream
```

Nginx or Caddy can terminate TLS and forward requests internally.

## 17.6 CI/CD Workflow

Recommended pipeline:

1. Checkout repository.
2. Install backend dependencies.
3. Install frontend dependencies.
4. Run lint checks.
5. Run unit tests.
6. Build frontend.
7. Build backend container.
8. Deploy to staging.
9. Run API smoke tests.
10. Deploy to production.

The project already includes a CI/CD scan start endpoint that can be extended into a full DevSecOps pipeline.

---

# 18. Future Enhancements

## 18.1 AI Integration

- More advanced vulnerability explanations.
- Code-aware remediation using full source context.
- Prioritized remediation roadmap.
- Chat-based report assistant.
- False-positive triage suggestions.

## 18.2 Advanced Scanning

- iOS IPA analysis support.
- SAST rules customization.
- API endpoint discovery.
- Dependency vulnerability analysis.
- Runtime interaction automation.
- Network traffic capture and TLS inspection.

## 18.3 Cloud Deployment

- Kubernetes deployment.
- Worker autoscaling.
- Object storage for report artifacts.
- Managed MongoDB.
- Centralized secret management.

## 18.4 Real-Time Monitoring

- Live scan progress events.
- WebSocket notifications for scan completion.
- Admin dashboard for worker health.
- Audit logs for user actions.

## 18.5 SIEM Integration

- Export findings to Splunk, Elastic, or Wazuh.
- Generate STIX/TAXII-compatible output.
- Security event forwarding.

## 18.6 Distributed Scanning

- Multiple scan workers.
- Queue-based load balancing.
- Per-user scan quotas.
- Horizontal scaling for enterprise teams.

## 18.7 Security Improvements

- Protect every hash-based endpoint.
- Add refresh-token rotation.
- Add rate limiting.
- Add strict file validation.
- Add audit logging.
- Add role-based authorization.
- Add secure headers and HTTPS-only deployment.

---

# 19. Conclusion

MobAudit is a complete mobile application security evaluation platform that combines full-stack web development, Android application security analysis, database-backed report persistence, dynamic analysis orchestration, AI-assisted remediation, and professional report generation. The system demonstrates practical cybersecurity engineering by transforming raw APK scan output into a structured, understandable, and export-ready workflow.

The project successfully implements user authentication, protected dashboards, APK upload processing, MASE integration, custom APK parsing, reputation analysis, risk scoring, MITRE/CVE-style mapping, dynamic analysis status tracking, WebSocket streaming, source-code viewing, and multi-format report export. These features make the platform suitable for academic defense, client demonstrations, internship evaluation, and further development into an enterprise-grade application security product.

Future improvements should focus on production hardening, queue-based background processing, complete endpoint authorization, richer testing, cloud deployment, and advanced AI-assisted analysis. Even in its current form, MobAudit provides a strong technical foundation and a professionally presentable cybersecurity solution for Android application auditing.

---

# 20. Appendix

## 20.1 Repository Structure

```text
mobaudit-demo/
├── .gitignore
├── start.ps1
├── start.sh
├── docs/
│   └── MobAudit_Enterprise_Technical_Documentation.md
├── server/
│   ├── server.js
│   ├── reset.js
│   ├── package.json
│   └── package-lock.json
└── client/
    ├── package.json
    ├── package-lock.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── public/
    │   ├── index.html
    │   ├── manifest.json
    │   ├── logo.png
    │   └── icons
    └── src/
        ├── App.js
        ├── index.js
        ├── index.css
        ├── components/
        │   ├── Navbar.jsx
        │   └── MenuOverlay.jsx
        └── pages/
            ├── Login.jsx
            ├── Home.jsx
            ├── Dashboard.jsx
            └── Report.jsx
```

## 20.2 Main Backend Dependencies

| Package | Purpose |
|---|---|
| `express` | REST API framework |
| `mongoose` | MongoDB ODM |
| `multer` | File uploads |
| `axios` | HTTP requests |
| `form-data` | Multipart forwarding |
| `bcryptjs` | Password hashing |
| `jsonwebtoken` | JWT auth |
| `pdfkit` | PDF reports |
| `ws` | WebSocket server |
| `adm-zip` | APK archive reading |
| `xml2js` | XML parsing |
| `dotenv` | Environment configuration |

## 20.3 Main Frontend Dependencies

| Package | Purpose |
|---|---|
| `react` | UI framework |
| `react-router-dom` | Routing |
| `framer-motion` | Animations |
| `lucide-react` | Icons |
| `recharts` | Charts |
| `react-syntax-highlighter` | Code viewer |
| `tailwindcss` | Styling |

## 20.4 Glossary

| Term | Meaning |
|---|---|
| APK | Android Package file. |
| MASE | MobAudit Security Engine. |
| JWT | JSON Web Token used for stateless authentication. |
| OWASP Mobile Top 10 | Industry-standard mobile security risk categories. |
| CWE | Common Weakness Enumeration. |
| CVSS | Common Vulnerability Scoring System. |
| ADB | Android Debug Bridge used to communicate with emulator/device. |
| Dynamic Analysis | Runtime inspection of an application while executing. |
| Static Analysis | Inspection of application package/code without executing it. |
| SIEM | Security Information and Event Management platform. |
