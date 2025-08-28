import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { Pinecone } from '@pinecone-database/pinecone';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
const app = express();
app.use(cors());
app.use(express.json());
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'medical-chatbot';
const HUGGINGFACEHUB_API_KEY = process.env.HUGGINGFACEHUB_API_KEY;
if (!PINECONE_API_KEY)
    throw new Error('Missing PINECONE_API_KEY');
if (!GOOGLE_API_KEY)
    throw new Error('Missing GOOGLE_API_KEY');
if (!HUGGINGFACEHUB_API_KEY)
    throw new Error('Missing HUGGINGFACEHUB_API_KEY for embeddings');
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const embeddingsModel = 'sentence-transformers/all-MiniLM-L6-v2';
async function getRetriever() {
    const index = pinecone.Index(PINECONE_INDEX);
    const embeddings = new HuggingFaceInferenceEmbeddings({ apiKey: HUGGINGFACEHUB_API_KEY, model: embeddingsModel });
    const store = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex: index });
    return store.asRetriever(3);
}
const systemPrompt = `You are an Medical assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, say that you don't know. Use three sentences maximum and keep the answer concise.`;
async function getRagChain() {
    const retriever = await getRetriever();
    const model = new ChatGoogleGenerativeAI({ model: 'gemini-1.5-flash', apiKey: GOOGLE_API_KEY });
    const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(systemPrompt + '\n\n{context}'),
        HumanMessagePromptTemplate.fromTemplate('{input}')
    ]);
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    return async (input) => {
        const docs = await retriever.getRelevantDocuments(input);
        const context = docs.map(d => d.pageContent).join('\n\n');
        const text = await chain.invoke({ context, input });
        return text;
    };
}
let ragPromise = null;
function getRag() {
    if (!ragPromise)
        ragPromise = getRagChain();
    return ragPromise;
}
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});
const ChatSchema = z.object({ message: z.string().min(1) });
app.post('/api/chat', async (req, res) => {
    try {
        const parsed = ChatSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: 'message is required' });
        const rag = await getRag();
        const answer = await rag(parsed.data.message);
        res.json({ answer });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'internal_error' });
    }
});
// Serve static frontend (no build tool needed)
const path = await import('node:path');
const fs = await import('node:fs');
const publicDir = path.resolve(process.cwd(), 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
    const indexHtml = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexHtml))
        return res.sendFile(indexHtml);
    res.status(404).send('Not Found');
});
app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});
