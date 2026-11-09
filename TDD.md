# Technical Design Document (TDD)
**Project**: FleetTroops — Proof-of-Delivery (POD) Capture & Billing System  
**Client**: Company A, Chhatrapati Sambhajinagar, Maharashtra  
**GitHub URL**: *(Add your repository URL here)*  
**Live Demo URL**: *(Add your deployed Render / Hugging Face Spaces URL here)*  

---

## 1. Executive Summary & Problem Framing

Company A operates a full-truckload (FTL) transport fleet of 140 owned trucks and ~200 hired trucks across Maharashtra and central India (cement, steel, packaged goods), handling ~2,200 trips per month with an average freight of ₹32,000 per trip (₹84.48 crore annual freight turnover).

### Operational Bottleneck
Historically, drivers carried physical lorry receipts (LRs) back to the headquarters 10 to 20 days after delivery. WhatsApp photos were routinely lost or unorganized. Tally accounting clerks refused to issue invoices without verified proof of delivery, as enterprise clients (e.g. UltraTech, Tata Steel, ITC) reject unverified billings.

### Mathematical ROI Analysis (Company A Economics)
1. **Working Capital Unlocked**: Bringing POD-to-invoice cycle time from 18 days down to 4 days brings collections 14 days forward:
   $$\text{Working Capital Recovered} = \frac{\text{₹}84.48\text{ Cr} \times 14}{365} = \text{₹}3.24\text{ Crore}$$
2. **Annual Cost of Capital Savings**:
   $$\text{Bank Interest Saved} = \text{₹}3.24\text{ Cr} \times 12\% = \text{₹}38.9\text{ Lakh / year}$$
3. **Dispute & Lost Freight Recovery**: 1.5% of trips (396 trips/year) suffered lost or disputed PODs, forfeiting half the freight:
   $$396 \times \text{₹}16,000 = \text{₹}63.36\text{ Lakh / year}$$
4. **Total Bottom-Line Financial Impact**:
   $$\text{Total Annual Impact} = \text{₹}38.9\text{ Lakh} + \text{₹}63.36\text{ Lakh} = \textbf{₹1.02 Crore / year}$$

---

## 2. System Architecture & Component Selection

```
┌────────────────────────────────────────────────────────┐
│                   DRIVER EDGE (Mobile)                 │
│  • PWA (One-Touch 250px Button, No Forms)              │
│  • Client-Side HTML5 Canvas Compression (<260 KB)      │
│  • Browser Web Speech Audio (Marathi / Hindi)          │
│  • IndexedDB Offline Queue (Highway Dead Zones)        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ (HTTP Multipart + GPS Watermark)
┌────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND GATEWAY               │
│  • Python 3.12 + FastAPI + Pydantic v2                 │
│  • JWT Role-Based Access Control (4 Explicit Roles)   │
│  • DPDP Act 2023 Consignee Masking Middleware          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            MULTI-TIER VISION AI & RULE ENGINE          │
│  [Tier 1]: Google Gemini 1.5/2.0 Flash (Free AI Studio)│
│  [Tier 2]: Pure Python Heuristic Fallback Engine       │
│  • 6-Point Verification (Stamp, Signature, LR, Qty)    │
│  • Retake Circuit Breaker (Strictly Capped at 2)       │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌───────────────────────────┐
│  EXCEPTION REVIEW QUEUE │ │   BILLING & TALLY DESK    │
│  • Image Source of Truth│ │  • Tally Prime XML Export │
│  • Human Quantity Fix   │ │  • Customer Invoices      │
└─────────────────────────┘ └───────────────────────────┘
```

### Why This Architecture Was Chosen
* **FastAPI + Pydantic v2**: Provides strict compile-time request/response validation, automatic OpenAPI documentation, and asynchronous I/O to handle concurrent driver uploads without thread blocking.
* **Multi-Tier AI Strategy**: Ensures 100% operational uptime. If the Gemini API is rate-limited, unauthenticated, or down, the system transparently activates the local deterministic rule engine. The application never fails or crashes during review.
* **Pure JS/WASM Frontend Build**: Built with Rsbuild/React 18 to eliminate native C++ `.node` binary dependencies, ensuring cross-platform stability on all operating systems and container environments.
* **Single Multi-Stage Container**: Simplifies deployment down to one service on free cloud tiers (Render, Hugging Face Spaces), eliminating CORS errors and separate frontend/backend hosting maintenance.

---

## 3. Data Models & Core Flows

### Relational Schema (SQLite + SQLAlchemy 2.0 Async)
* **`Trip`**:
  * `trip_id` (PK, e.g. `TRP-66120`), `lr_number`, `eway_bill`, `client_name`, `vehicle_number`, `vehicle_type` (`OWN`/`HIRED`), `origin`, `destination`, `freight_amount`, `status` (`PENDING_POD`, `RETAKE_REQUESTED`, `NEEDS_REVIEW`, `VERIFIED`, `INVOICED`), `retake_count` (integer, max 2), `consignee_name`, `consignee_phone`.
* **`PODSubmission`**:
  * `id` (PK), `trip_id` (FK), `image_url`, `file_size_kb`, `gps_lat`, `gps_lng`, `captured_at`, `stamp_detected`, `signature_detected`, `lr_number_detected`, `lr_match`, `dispatched_quantity`, `received_quantity`, `shortage_remark`, `ai_confidence`, `is_reviewed`.
* **`Invoice`**:
  * `id` (PK), `invoice_number`, `trip_id` (FK, Unique), `client_name`, `billing_cycle`, `freight_amount`, `deduction_amount`, `net_payable`, `pod_image_url`, `tally_voucher_number`, `exported_to_tally`.

---

## 4. UI/UX Decisions & The "Hard Part"

### 1. Low-Literacy Highway Drivers
* **One Big Button**: A 250px circular button (high contrast green/red) prevents confusion.
* **Zero Forms / No Typing**: Drivers never type LR numbers or consignee names. The app pre-loads trip data from the vehicle plate (`MH20 EL 4521`).
* **Bilingual Voice Feedback**: Utilizes the browser's native `SpeechSynthesis` in Marathi (`mr-IN`) and Hindi (`hi-IN`) to speak status aloud over loud diesel engine noise at factory gates.

### 2. Solving Highway Dead Zones (<300 KB & Offline Storage)
* **Client-Side Canvas Compression**: High-resolution mobile photos (3–10 MB) are scaled to 1400px and progressively compressed to **under 260 KB** on the device before transmission, respecting Company A's 300 KB bandwidth threshold.
* **IndexedDB Offline Queue**: In coverage dead zones (such as Kasara Ghat), photos and coordinates are saved to local device storage. An auto-sync listener detects when mobile range returns and seamlessly uploads pending receipts.

### 3. Hired Truck Drivers (SMS Web Link)
* External drivers representing 200 hired trucks will not install third-party mobile apps. A lightweight, tokenized mobile web link (`/sms-upload`) allows instant camera capture with zero installation or login requirements.

### 4. Billing Executive & The "Source of Truth" Principle
* AI is an accelerator, not an autonomous decider. The raw photo scan is maintained as the legal source of truth.
* Any delivery with shortage notes (e.g. `TRP-66141` short by 6 cartons) or missing stamps after 2 retakes is locked in the **Exception Review Queue**. Billing staff review the original scan, confirm the deduction, and manually authorize invoice generation.

### 5. Enterprise Client Consignor Portal
* Clients (e.g. Company B) can view billed consignments and audit stamped delivery receipts.
* In accordance with the **Digital Personal Data Protection (DPDP) Act 2023**, consignee phone numbers and individual driver contacts are masked (`+91 ******1223`, `U********* D**** N*****`).

---

## 5. Scope Boundaries: What Was Cut & Next Steps

### Deliberately Out of Scope (As Specified in Brief)
* **Live GPS Tracking**: Omitted. Instead, GPS coordinates are sampled exclusively at the consignee gate at the moment of photo capture to verify delivery location.
* **Trip Dispatch Planning & Optimization**: Left to Company A's existing TMS.
* **Fuel & Fleet Expense Accounting**: Excluded to focus specifically on the gate-to-invoice working capital lifecycle.

### Production Next Steps
1. **WhatsApp Cloud API Webhook**: Integrate directly with WhatsApp Business API so drivers can upload photos via WhatsApp, routing through the same Pydantic AI pipeline.
2. **Direct Tally Prime ODBC / XML Auto-Sync**: Transition from file export to direct TCP port push (`localhost:9000`) for real-time ledger creation in Tally Prime.
3. **Automated WhatsApp Reminders**: Trigger automated SMS/WhatsApp alerts for drivers whose trips exceed 4 days without delivery confirmation.

---

## 6. Assumptions Catalog

| Assumption | Rationale |
| :--- | :--- |
| **Network Dead Zones** | Drivers will deliver to rural or industrial factory gates where 4G/5G is intermittent; client-side compression and offline queue are mandatory. |
| **Retake Limit (Max 2)** | Trapping a driver at a factory gate for more than 2 photo attempts causes traffic congestion; unresolved photos must escalate to office staff. |
| **Client Rejections** | Cement and steel firms will reject any invoice submitted without an attached legible delivery acknowledgment. |
| **Single Container Hosting** | Multi-stage Docker deployment ensures zero cloud hosting costs on evaluation platforms without requiring credit card registration. |

