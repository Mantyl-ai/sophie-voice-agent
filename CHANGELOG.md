# Changelog

All notable changes to Sophie Voice Agent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-02-14

### Added

- Three-phase UX: Setup, Voice Session, and Debrief
- Real-time voice conversation powered by OpenAI GPT-4o
- Post-session debrief generation powered by Anthropic Claude Haiku
- Signal report with risk classification (GREEN / YELLOW / RED)
- Recommended next moves with prioritized action items
- Draft follow-up email with subject line, ready to copy
- Document upload with client-side text extraction (FileReader API)
- Web Speech API integration: SpeechRecognition (input) + SpeechSynthesis (output)
- Text input fallback for browsers without speech support
- Serverless API proxy via Netlify Functions (zero API key exposure to client)
- CORS origin whitelist on both endpoints
- Model whitelist and token ceiling on OpenAI proxy
- Mantyl brand design system: gradient palette, Inter font, dark navy theme
- Premium hero section: animated particles, pulsing rings, glass-morphism cards
- Sophie 3D character with transparent background
- Mobile-responsive layout
- Security headers (X-Frame-Options, CSP, Referrer-Policy)
- Enterprise documentation: Architecture, API Reference, Deployment Guide

### Architecture

- `POST /api/chat` — OpenAI GPT-4o proxy for voice conversation
- `POST /api/debrief` — Anthropic Claude Haiku proxy for structured debrief
- Single-file React 18 frontend (zero build step)
- Netlify Functions for serverless backend

## [0.3.0] — 2026-02-14

### Changed

- Renamed agent from Katie to Sophie
- Replaced all "deal" / "coaching" terminology with "engagement" / "signal report"
- Replaced CSS-illustrated character with 3D rendered PNG
- Complete hero section redesign with brand gradient background

## [0.2.0] — 2026-02-13

### Changed

- Migrated from client-side API key to server-side Netlify Functions
- Added model whitelist and token limits
- Restructured repo for Netlify deployment

## [0.1.0] — 2026-02-12

### Added

- Initial prototype: Katie voice agent
- Single-model architecture (OpenAI GPT-4o for all tasks)
- Client-side API key via URL parameter
