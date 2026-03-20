# FledgeCode

Learn to code by creating digital art with AI assistance.

FledgeCode is a browser-based coding environment that teaches programming through [P5.js](https://p5js.org/) creative coding. An LLM generates code matched to your current skill level, and you progress from prompting, to reading and modifying generated code, to writing code on your own.

**[Try the prototype](https://inuwali.github.io/fledgecode/)**

*Note:* This is a bring-your-own-API-key project. Currently it supports Claude and ChatGPT.

## How it works

FledgeCode follows a **Use-Modify-Create** learning progression:

1. **Use** — Describe what you want to create. The LLM writes P5.js code for you, constrained to concepts you've already encountered.
2. **Modify** — Read the generated code, tinker with values, and see what changes. Annotated diffs highlight what's new and why.
3. **Create** — Start writing code yourself, building on the concepts you've absorbed through use and modification.

The interface has three panels: a code editor (Monaco), an LLM chat, and a live P5.js canvas. A learning dashboard tracks which concepts you've encountered and mastered, and the system uses this to keep generated code within your comprehension.

## Key features

- **Progressive complexity** — The ontology system tracks your level and constrains LLM output so you're never overwhelmed by unfamiliar concepts all at once
- **Annotated diffs** — Code changes are presented as clickable, annotated diffs that explain what changed and why
- **Model choice** — Use Claude or ChatGPT via your own API key
- **No install** — Runs entirely in the browser; no build step, no backend (aside from the API proxy)
- **Visual learning** — P5.js provides immediate, creative feedback — you see shapes, colors, and animations respond to your code in real time

## Architecture

```
├── docs/           # Frontend app (HTML/CSS/JS, served via GitHub Pages)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── test/       # Browser-based test suite
├── vercel/         # Vercel serverless functions (LLM proxy)
│   ├── api/     # Main LLM endpoint (OpenAI + Anthropic)
│   │   ├── chat.js     # Main LLM endpoint (OpenAI + Anthropic)
│   │   ├── verify-key.js
│   │   ├── health.js
│   │   └── sendRequest.js
└── package.json    # API dependencies (openai, @anthropic-ai/sdk)
```

The frontend is a zero-dependency vanilla JS application. It loads Monaco Editor and P5.js from CDNs. The API layer is a thin Vercel proxy that forwards requests to OpenAI or Anthropic using the learner's own API key — no keys are stored server-side.

## Setup

1. **Create your config file** — copy the example and fill in your values:

   ```bash
   cp docs/js/config.example.js docs/js/config.js
   ```

2. **Edit `docs/js/config.js`** — at minimum, set `apiBaseUrl` to your Vercel proxy URL (see below). Analytics and feedback URL are optional.

3. **Deploy the API proxy** — push the `vercel/` directory to your own Vercel project. Once deployed, use the resulting URL (e.g. `https://your-project.vercel.app/api`) as the `apiBaseUrl` in your config.

## Running locally

Open `docs/index.html` in a browser, or serve it with any static file server.

For the API proxy (needed for LLM features):

```bash
npm install
vercel dev
```

This starts the Vercel development server, which serves both the static files and the API functions locally. Set `apiBaseUrl` in your config to `http://localhost:3000/api` (or whichever port Vercel dev uses).

## Deployment

- **Frontend**: Deployed via GitHub Pages from the `docs/` directory
- **API**: Deployed automatically by Vercel from the `api/` directory

## Status

FledgeCode is a functional prototype. The core learning loop works — ontology-constrained code generation, annotated diffs, progress tracking — but it is under active development.

## Background

- [Building a Vibe Coding Instructor](https://owenmathews.name/blog/2025/05/building-a-vibe-coding-instructor.html) — Origin and motivation
- [An LLM-Native Learn-to-Code Prototype](https://owenmathews.name/blog/2025/07/an-llm-native-learn-to-code-prototype.html) — Technical approach
- [The Present and Future of Coding Education](https://owenmathews.name/blog/2025/08/the-present-and-future-of-coding-education.html) — Educational philosophy

## License

MIT
