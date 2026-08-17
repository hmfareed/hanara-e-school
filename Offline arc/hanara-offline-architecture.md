---
title: "HANARA SMS — Offline Mode Architecture"
subtitle: "Applying offline-first patterns to the MERN stack"
author: "HANARA SMS Technical Specification"
date: "August 2026"
---

# HANARA SMS — Offline Mode Architecture

## Yes, HANARA SMS Can Have a Proper Offline Mode

HANARA SMS is React + Node.js/Express + MongoDB, and that stack supports a proper offline mode. The important distinction: **MongoDB stays on the server.** The browser needs its own local database, and HANARA's UI needs to stop assuming the network is always there.

This isn't a hypothetical for HANARA — it's already load-bearing. The Staff Attendance module spec calls for QR-based check-in on classroom and gate devices where connectivity in Tamale can drop mid-school-day, and that spec already assumes offline capture with later sync. This document lays out the architecture that makes that promise real, and extends the same pattern to the other modules that need it: JHS 3 Mock Exam grade entry, Accountant fee submission, and Student Directory edits.

```
                 HANARA SMS
                 React Frontend
                       │
                       ▼
              ┌─────────────────┐
              │  Data Service   │
              └────────┬────────┘
                       │
             ┌─────────┴─────────┐
             │                   │
        INTERNET ON         INTERNET OFF
             │                   │
             ▼                   ▼
       Node.js API          IndexedDB
             │              (local DB)
             ▼                   │
          MongoDB                 │
             ▲                   │
             └────── Sync ───────┘
```

Even though HANARA is a website, the browser stores data locally with IndexedDB. No desktop rewrite needed.

## The Stack

| Layer | Technology |
|---|---|
| UI | React |
| Backend | Node.js + Express |
| Main DB | MongoDB |
| Local DB | IndexedDB |
| IndexedDB wrapper | Dexie.js |
| Real-time | Socket.io (online only — see below) |
| Offline assets | Service Worker |
| Sync | Custom Node.js sync API |
| Deployment | Standard web hosting |

## Why HANARA's Existing Patterns Already Fit Offline

This is the part worth calling out explicitly: the architectural decisions already made for HANARA's modules aren't just compatible with offline sync — they're what make offline sync *safe*. Two patterns in particular do most of the work.

**The immutable-event pattern (Staff Attendance) is a natural fit for sync queues.** Because each QR check-in/check-out is captured as an append-only event rather than a field that gets overwritten, two devices logging attendance for the same staff member while both offline can never produce a conflicting write — there's nothing to conflict. The events just merge. This is the single biggest reason attendance should be the first module built offline-first: the data model already assumes multiple writers and doesn't require a "last write wins" resolution strategy.

**The correction-log pattern (Accountant module) is the right model for offline fee entry.** A payment recorded offline should never silently overwrite a synced record — it should be logged as a new correction event, same as if it were entered online. This also protects against the more serious risk below: offline entry should never claim a Paystack transaction succeeded.

## Worked Example: Staff QR Attendance, Offline

A teacher or gate officer opens the attendance scanner at `/attendance` while connected. The app downloads and caches locally:

- Staff roster for the day
- Staff photos/QR references
- Today's attendance events so far

Then the internet drops.

The officer can still:

- - Open the scanner
- - Scan a staff QR code
- - Log check-in / check-out
- - Search staff by name if a scan fails

Each scan writes an **immutable event** into IndexedDB:

```
IndexedDB
│
├── staff
├── attendanceEvents   (append-only)
└── syncQueue
```

The UI shows:

> [OFFLINE] — Events will sync when connection is restored.

Socket.io real-time delivery (used for live attendance dashboards when online) simply doesn't fire while offline — there's no fallback needed there, because the event is already durably queued locally and will broadcast normally once synced.

### When connection returns

```
Internet restored
       ↓
Sync Engine starts
       ↓
Read syncQueue
       ↓
POST attendanceEvents to Node.js
       ↓
Node.js validates (staff exists, no duplicate event ID)
       ↓
MongoDB appends events
       ↓
Server broadcasts via Socket.io to live dashboards
       ↓
Remove synced events from syncQueue
       ↓
Download any server-side events missed locally
       ↓
Update IndexedDB
```

> [ONLINE] — All events synchronized.

## Module-by-Module: What Should Be Offline-First

### Staff Attendance — build this first
Already spec'd as immutable events. Lowest sync-conflict risk in the whole system. This is the module where offline mode matters most day-to-day, since gate/classroom devices are the ones most exposed to spotty connectivity.

### JHS 3 Mock Exam grade entry — offline-safe, with a hard boundary
The Draft → Submitted → Locked workflow maps cleanly onto offline states:

- **Draft**: a teacher entering CA and exam scores offline is just editing a local draft. No conflict risk — sync when reconnected.
- **Submitted**: can happen offline; queue it like any other write.
- **Locked**: this transition should require a live connection. Locking triggers the best-six aggregate computation and is a one-way, administratively significant action — it shouldn't be something that resolves ambiguously from a stale offline client. Block the "Lock" action in the UI when offline, with a clear reason shown.

### Accountant fee submission — offline-safe, but never claims payment success
Record a payment offline as **pending verification**, using the same correction-log pattern already used for online corrections. Never let the offline client mark a Paystack/mobile-money transaction as successful — that confirmation only ever comes from the server after real verification.

```
Record payment
      ↓
Offline
      ↓
"Pending verification" (correction-log entry)
      ↓
Internet returns
      ↓
Server verifies with Paystack → confirms or rejects
```

### Student Directory — offline-safe for reads and edits, with the usual care
Admins can view and edit student records offline. Since this is a mutable record (not an event log), standard last-write-wins with a visible "last synced" timestamp is acceptable here — conflicts are rare (one admin editing one student) and low-stakes compared to attendance or fees.

### System Administrator destructive actions — online only
The two-person rule for destructive actions already requires real-time coordination between two people, which offline mode can't provide. Don't attempt to queue these; block them outright when offline, same as Mock Exam locking.

## One Important Limitation

Offline **access** and offline **first use** are different things. A device that has never opened HANARA SMS while online has nothing cached — it can't magically download the staff roster or student directory with no connection.

```
FIRST TIME
──────────
Internet required
      ↓
Login
      ↓
Download relevant school data
      ↓
Cache application shell
      ↓
Initialize IndexedDB
      ↓
Ready for offline use

AFTER THAT
──────────
Internet or no internet
      ↓
System continues working
      ↓
Sync when connection returns
```

Practically: every gate device, classroom tablet, or accountant's laptop needs one supervised online session before it can be trusted offline.

## Make It a PWA

This is what makes HANARA feel like an installed application rather than a website that sometimes breaks.

```
Chrome
   ↓
hanarasms.com (or your deployed domain)
   ↓
"Install HANARA SMS"
   ↓
Installed on device
```

With:

- App icon and standalone window
- Cached application shell
- Offline functionality per module above
- Local IndexedDB store
- Background sync
- Network status indicator in the UI

## Recommended Folder Structure

Extending HANARA's existing structure rather than replacing it:

```
client/
├── pages/
├── components/
├── hooks/
│
├── services/
│   ├── api.js
│   ├── sync.js
│   ├── network.js
│   └── auth.js
│
├── db/                      ← new
│   ├── staff.js
│   ├── attendanceEvents.js
│   ├── mockExamScores.js
│   ├── feeCorrections.js
│   ├── students.js
│   └── syncQueue.js
│
└── PWA
    └── Service Worker

              ↕
        Node.js API (Express)

              ↕

           MongoDB
```

## The Core Architectural Rule

**Don't let React components talk to the API directly for every operation.** Route everything through a data service that decides where the data comes from:

```
React Component
       ↓
Data Service
       ↓
Local DB (IndexedDB)
       ↓
Sync Engine
       ↓
Node API
       ↓
MongoDB
```

With this in place, HANARA's UI doesn't need to know or care whether the school's internet is up. The scanner keeps scanning, the gradebook keeps accepting scores, and the sync engine handles the rest whenever the connection comes back — which, for a school in Tamale, it's designed to expect will happen more than once a day.
