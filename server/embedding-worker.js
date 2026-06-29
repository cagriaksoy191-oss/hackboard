/**
 * embedding-worker.js — RAG Embedding Pipeline
 *
 * Background worker that:
 * 1. Polls for entities with embedding_status = 'pending'
 * 2. Chunks the text content (title + description for tasks, content for messages/comments)
 * 3. Generates embeddings via configurable provider (Gemini / OpenAI / mock)
 * 4. Stores embedding vectors in the embeddings table
 * 5. Updates source entity embedding_status to 'indexed'
 *
 * Usage:
 *   import { startEmbeddingWorker, queueEmbedding } from './embedding-worker.js';
 *   startEmbeddingWorker(intervalMs);  // Start polling loop
 *   queueEmbedding('task', taskId);    // Mark entity for re-indexing
 */

import { prepare } from './db-adapter.js';
import { vectorStore, cosineSimilarity } from './lib/vector-store.js';

/* ──────────────────────────────────────────────
   Configuration
   ────────────────────────────────────────────── */
const CHUNK_MAX_TOKENS = 512;
const CHUNK_OVERLAP_TOKENS = 64;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-004';
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'mock'; // 'gemini' | 'openai' | 'mock'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const POLL_INTERVAL = parseInt(process.env.EMBEDDING_POLL_INTERVAL) || 30000; // 30s default
const BATCH_SIZE = 10;

let workerRunning = false;
let workerTimer = null;

/* ──────────────────────────────────────────────
   Text Chunking — Simple sentence-aware splitter
   ────────────────────────────────────────────── */
function estimateTokens(text) {
  // Rough estimate: ~4 chars per token (GPT-style)
  return Math.ceil(text.length / 4);
}

function chunkText(text, maxTokens = CHUNK_MAX_TOKENS, overlapTokens = CHUNK_OVERLAP_TOKENS) {
  if (!text || text.trim() === '') return [];

  const cleaned = text.trim().replace(/\r\n/g, '\n');
  const totalTokens = estimateTokens(cleaned);

  // If text fits in one chunk, return as-is
  if (totalTokens <= maxTokens) {
    return [{ text: cleaned, index: 0 }];
  }

  // Split by paragraphs first, then sentences
  const paragraphs = cleaned.split(/\n{2,}/);
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

    for (const sentence of sentences) {
      const testChunk = currentChunk ? `${currentChunk} ${sentence.trim()}` : sentence.trim();

      if (estimateTokens(testChunk) > maxTokens && currentChunk) {
        chunks.push({ text: currentChunk.trim(), index: chunkIndex++ });

        // Apply overlap: take last N tokens worth of text
        const overlapChars = overlapTokens * 4;
        const overlapText = currentChunk.slice(-overlapChars);
        currentChunk = overlapText ? `${overlapText} ${sentence.trim()}` : sentence.trim();
      } else {
        currentChunk = testChunk;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ text: currentChunk.trim(), index: chunkIndex });
  }

  return chunks;
}

/* ──────────────────────────────────────────────
   Embedding Providers
   ────────────────────────────────────────────── */

/**
 * Mock embeddings — deterministic 128-dim vector from text hash
 * Used for development/testing without API keys
 */
function generateMockEmbedding(text) {
  const dim = 128;
  const vec = new Array(dim);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    vec[i] = Math.sin(hash) * 0.5;
  }
  // Normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map(v => v / norm);
}

/**
 * Gemini Embedding API
 */
async function generateGeminiEmbedding(text) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini embedding error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

/**
 * OpenAI Embedding API
 */
async function generateOpenAIEmbedding(text) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embedding error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Exponential backoff retry wrapper for async operations
 */
async function retryWithBackoff(fn, retries = 3, initialDelay = 2000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) {
        throw err;
      }
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.warn(`[Embedding API] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Generate embedding based on configured provider
 */
async function generateEmbedding(text) {
  return await retryWithBackoff(async () => {
    switch (EMBEDDING_PROVIDER) {
      case 'gemini':
        return await generateGeminiEmbedding(text);
      case 'openai':
        return await generateOpenAIEmbedding(text);
      case 'mock':
      default:
        return generateMockEmbedding(text);
    }
  });
}

/* ──────────────────────────────────────────────
   Source Text Extractors
   ────────────────────────────────────────────── */
async function extractTaskText(taskId) {
  const task = await prepare(`
    SELECT t.title, t.description, t.priority, t.status,
           t.org_id, t.workspace_id,
           GROUP_CONCAT(tg.name, ', ') as tag_names
    FROM tasks t
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN tags tg ON tt.tag_id = tg.id
    WHERE t.id = ?
    GROUP BY t.id
  `).get(taskId);

  if (!task) return null;

  const parts = [`# ${task.title}`];
  if (task.description) parts.push(task.description);
  if (task.priority) parts.push(`Priority: ${task.priority}`);
  if (task.status) parts.push(`Status: ${task.status}`);
  if (task.tag_names) parts.push(`Tags: ${task.tag_names}`);

  return {
    text: parts.join('\n\n'),
    orgId: task.org_id,
    workspaceId: task.workspace_id,
  };
}

async function extractMessageText(messageId) {
  const msg = await prepare(`
    SELECT m.content, m.org_id, m.workspace_id, u.name as user_name
    FROM messages m JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).get(messageId);

  if (!msg) return null;

  return {
    text: `${msg.user_name}: ${msg.content}`,
    orgId: msg.org_id,
    workspaceId: msg.workspace_id,
  };
}

async function extractCommentText(commentId) {
  const comment = await prepare(`
    SELECT c.content, t.org_id, t.workspace_id, u.name as user_name
    FROM comments c
    JOIN tasks t ON c.task_id = t.id
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(commentId);

  if (!comment) return null;

  return {
    text: `${comment.user_name}: ${comment.content}`,
    orgId: comment.org_id,
    workspaceId: comment.workspace_id,
  };
}

async function extractActivityText(activityId) {
  const activity = await prepare(`
    SELECT a.*, u.name as user_name
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.id = ?
  `).get(activityId);

  if (!activity) return null;

  // Build structured text from activity metadata
  const parts = [`${activity.user_name || 'System'} ${activity.action}: ${activity.details}`];

  if (activity.entity_type && activity.entity_id) {
    parts.push(`Entity: ${activity.entity_type} #${activity.entity_id}`);
  }

  // Parse structured metadata for richer context
  if (activity.metadata && activity.metadata !== '{}') {
    try {
      const meta = JSON.parse(activity.metadata);
      if (meta.from && meta.to) parts.push(`Transition: ${meta.from} → ${meta.to}`);
      if (meta.sprint_id) parts.push(`Sprint: #${meta.sprint_id}`);
      if (meta.workflow_stage) parts.push(`Stage: ${meta.workflow_stage}`);
      if (meta.assigned_to_name) parts.push(`Assigned to: ${meta.assigned_to_name}`);
      if (meta.priority) parts.push(`Priority: ${meta.priority}`);
    } catch (e) {
      // Non-JSON metadata — ignore
    }
  }

  return {
    text: parts.join('\n'),
    orgId: activity.org_id,
    workspaceId: activity.workspace_id,
  };
}

const EXTRACTORS = {
  task: extractTaskText,
  message: extractMessageText,
  comment: extractCommentText,
  activity: extractActivityText,
};

/* ──────────────────────────────────────────────
   Core Pipeline
   ────────────────────────────────────────────── */

/**
 * Process a single entity: extract text → chunk → embed → store
 */
async function processEntity(sourceType, sourceId) {
  const extractor = EXTRACTORS[sourceType];
  if (!extractor) {
    console.warn(`[Embedding] Unknown source type: ${sourceType}`);
    return false;
  }

  try {
    const source = await extractor(sourceId);
    if (!source) {
      console.warn(`[Embedding] Source not found: ${sourceType}:${sourceId}`);
      return false;
    }

    const chunks = chunkText(source.text);
    if (chunks.length === 0) return false;

    // Delete old embeddings for this source
    await vectorStore.deleteBySource(sourceType, sourceId);

    // Generate and store embeddings for each chunk via vector store
    for (const chunk of chunks) {
      const vector = await generateEmbedding(chunk.text);
      const tokenCount = estimateTokens(chunk.text);

      await vectorStore.upsert({
        orgId: source.orgId || null,
        workspaceId: source.workspaceId || null,
        sourceType,
        sourceId,
        chunkIndex: chunk.index,
        chunkText: chunk.text,
        embedding: vector,
        model: EMBEDDING_MODEL,
        tokenCount,
      });
    }

    // Update source entity status
    if (sourceType === 'task') {
      await prepare("UPDATE tasks SET embedding_status = 'indexed' WHERE id = ?").run(sourceId);
    } else if (sourceType === 'comment') {
      await prepare("UPDATE comments SET embedding_status = 'indexed' WHERE id = ?").run(sourceId);
    } else if (sourceType === 'activity') {
      await prepare("UPDATE activities SET embedding_status = 'indexed' WHERE id = ?").run(sourceId);
    }

    console.info(`[Embedding] Indexed ${sourceType}:${sourceId} (${chunks.length} chunks)`);
    return true;
  } catch (err) {
    console.error(`[Embedding] Error processing ${sourceType}:${sourceId}:`, err.message);

    // Mark as failed
    if (sourceType === 'task') {
      await prepare("UPDATE tasks SET embedding_status = 'failed' WHERE id = ?").run(sourceId);
    } else if (sourceType === 'comment') {
      await prepare("UPDATE comments SET embedding_status = 'failed' WHERE id = ?").run(sourceId);
    } else if (sourceType === 'activity') {
      await prepare("UPDATE activities SET embedding_status = 'failed' WHERE id = ?").run(sourceId);
    }
    return false;
  }
}

/**
 * Poll for pending entities and process them
 */
async function pollPendingEntities() {
  if (!workerRunning) return;

  try {
    // Find pending tasks
    const pendingTasks = await prepare(
      "SELECT id FROM tasks WHERE embedding_status = 'pending' LIMIT ?"
    ).all(BATCH_SIZE);

    // Find pending comments
    const pendingComments = await prepare(
      "SELECT id FROM comments WHERE embedding_status = 'pending' LIMIT ?"
    ).all(BATCH_SIZE);

    // Find pending activities
    const pendingActivities = await prepare(
      "SELECT id FROM activities WHERE embedding_status = 'pending' LIMIT ?"
    ).all(BATCH_SIZE);

    const total = pendingTasks.length + pendingComments.length + pendingActivities.length;
    if (total > 0) {
      console.info(`[Embedding] Processing ${total} pending entities...`);
    }

    for (const task of pendingTasks) {
      await processEntity('task', task.id);
    }

    for (const comment of pendingComments) {
      await processEntity('comment', comment.id);
    }

    for (const activity of pendingActivities) {
      await processEntity('activity', activity.id);
    }
  } catch (err) {
    console.error('[Embedding] Poll error:', err.message);
  }
}

/* ──────────────────────────────────────────────
   Cosine Similarity Search (via Vector Store)
   ────────────────────────────────────────────── */

/**
 * Semantic search across embeddings
 * Delegates to the vector store adapter which handles:
 *   - SQLite: in-memory cosine similarity
 *   - PostgreSQL: pgvector DB-level ANN with <=> operator
 *
 * @param {string} query - Search query text
 * @param {object} options - { orgId, workspaceId, sourceType, limit }
 * @returns {Array} Ranked results with score, chunk_text, source info
 */
export async function semanticSearch(query, options = {}) {
  // Generate query embedding
  const queryVector = await generateEmbedding(query);

  // Delegate to vector store (handles SQLite vs pgvector transparently)
  return vectorStore.search(queryVector, options);
}

/* ──────────────────────────────────────────────
   Public API
   ────────────────────────────────────────────── */

/**
 * Queue an entity for embedding (set status to 'pending')
 */
export async function queueEmbedding(sourceType, sourceId) {
  if (sourceType === 'task') {
    await prepare("UPDATE tasks SET embedding_status = 'pending' WHERE id = ?").run(sourceId);
  } else if (sourceType === 'comment') {
    await prepare("UPDATE comments SET embedding_status = 'pending' WHERE id = ?").run(sourceId);
  } else if (sourceType === 'activity') {
    await prepare("UPDATE activities SET embedding_status = 'pending' WHERE id = ?").run(sourceId);
  } else if (sourceType === 'message') {
    // Messages don't have embedding_status column — process directly
    await processEntity('message', sourceId);
  }
}

/**
 * Start the background polling loop
 */
export async function startEmbeddingWorker(intervalMs = POLL_INTERVAL) {
  if (workerRunning) {
    console.warn('[Embedding] Worker already running');
    return;
  }

  // Initialize vector store adapter (pgvector extension, indexes, etc.)
  await vectorStore.initialize();

  workerRunning = true;
  console.info(`[Embedding] Worker started (provider: ${EMBEDDING_PROVIDER}, interval: ${intervalMs}ms)`);

  // Initial poll
  pollPendingEntities();

  // Recurring poll
  workerTimer = setInterval(pollPendingEntities, intervalMs);
}

/**
 * Stop the background polling loop
 */
export function stopEmbeddingWorker() {
  workerRunning = false;
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
  console.info('[Embedding] Worker stopped');
}

export { chunkText, cosineSimilarity, generateEmbedding };
