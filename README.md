# TrustLayer AI

An AI verification and hallucination-detection engine that audits answers from other AI models.

- Splits an AI answer into sentence-level claims and marks each **Verified**, **Unsupported / Hallucination** or **Uncertain / Needs Context**
- Interactive Audit Canvas, Evidence Log with source cards, and a Calibrated Rewrite with inline citations
- Trust Score gauge, Epistemic Humility gauge, confidence distribution chart and a 4-stage audit pipeline
- Full keyboard control (`Ctrl/⌘+Enter`, `Alt+1/2/3`, `↑/↓`, `Tab`, `1-3`, `Esc`, `?`) plus a clickable command dock

Everything runs in the browser. Verdicts come from a sentence-level claim parser, wording heuristics (absolute language, fabricated precision, vague authority, future-as-fact) and a curated reference index. Treat results as triage, not expert review.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Deploys to Vercel as a Vite project with no extra configuration.
