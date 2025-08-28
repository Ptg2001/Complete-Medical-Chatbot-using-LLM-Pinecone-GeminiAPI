# Medical Chatbot (Vercel UI + Serverless API)

A minimal medical chatbot with Retrieval-Augmented Generation (RAG) using:
- Google Generative AI (Gemini)
- Pinecone vector database
- Hugging Face embeddings (all-MiniLM-L6-v2)
- Static UI (vanilla HTML/CSS/JS) + Vercel Serverless Functions

## Project Structure

```
public/            # static frontend (served by Vercel)
  index.html       # chat UI (calls /api/chat)
api/               # Vercel serverless functions (ESM JS)
  _lib/
    rag.js         # shared RAG chain
  chat.js          # POST /api/chat
  health.js        # GET /api/health
package.json       # scripts and dependencies
```

## Local Development

1) Install deps
```bash
npm install
```

2) Create `.env.local` in the project root (used by Vercel dev/functions):
```
PINECONE_API_KEY=...
PINECONE_INDEX=medical-chatbot
GOOGLE_API_KEY=...
HUGGINGFACEHUB_API_KEY=...
```

3) Run locally with Vercel Dev (recommended):
```bash
npx vercel dev
```
- UI: http://localhost:3000
- API: http://localhost:3000/api/chat

Alternatively, you can serve `public/` yourself and call the deployed Vercel functions, but `vercel dev` simulates the platform.

## Deployment (Vercel)

1) Link the project
```bash
vercel link
```

2) Add Production env vars (Project → Settings → Environment Variables) or via CLI:
```bash
vercel env add PINECONE_API_KEY
vercel env add PINECONE_INDEX
vercel env add GOOGLE_API_KEY
vercel env add HUGGINGFACEHUB_API_KEY
```

3) Deploy
```bash
vercel --prod
```

## Notes & Troubleshooting

- Ensure the Pinecone index name matches PINECONE_INDEX and was built with the same embedding model (all-MiniLM-L6-v2).
- If `/api/chat` returns 500, inspect function logs:
```bash
vercel inspect https://<your-app>.vercel.app
```
- The UI supports a custom API base for non-Vercel backends by setting a global before `</body>` in `public/index.html`:
```html
<script>window.__API_BASE__ = 'https://your-backend.example.com';</script>
```

## License

MIT
