import { Pinecone } from '@pinecone-database/pinecone'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { PineconeStore } from '@langchain/pinecone'
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts'

const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'medical-chatbot'
const HUGGINGFACEHUB_API_KEY = process.env.HUGGINGFACEHUB_API_KEY

if (!PINECONE_API_KEY) throw new Error('Missing PINECONE_API_KEY')
if (!GOOGLE_API_KEY) throw new Error('Missing GOOGLE_API_KEY')
if (!HUGGINGFACEHUB_API_KEY) throw new Error('Missing HUGGINGFACEHUB_API_KEY')

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY })
const embeddingsModel = 'sentence-transformers/all-MiniLM-L6-v2'

async function getRetriever() {
  const index = pinecone.Index(PINECONE_INDEX)
  const embeddings = new HuggingFaceInferenceEmbeddings({ apiKey: HUGGINGFACEHUB_API_KEY, model: embeddingsModel })
  const store = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex: index })
  return store.asRetriever(3)
}

const systemPrompt = `You are an Medical assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, say that you don't know. Use three sentences maximum and keep the answer concise.`

async function buildChain() {
  const retriever = await getRetriever()
  const model = new ChatGoogleGenerativeAI({ model: 'gemini-1.5-flash', apiKey: GOOGLE_API_KEY })
  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(systemPrompt + '\n\n{context}'),
    HumanMessagePromptTemplate.fromTemplate('{input}')
  ])
  const chain = prompt.pipe(model).pipe(new StringOutputParser())
  return async (input) => {
    const docs = await retriever.getRelevantDocuments(input)
    const context = docs.map(d => d.pageContent).join('\n\n')
    const text = await chain.invoke({ context, input })
    return text
  }
}

let chainPromise = null
export function getRagChain() {
  if (!chainPromise) chainPromise = buildChain()
  return chainPromise
}



