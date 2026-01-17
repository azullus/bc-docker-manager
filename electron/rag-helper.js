/**
 * RAG Helper - BC Container Documentation Retrieval
 *
 * Searches BC/Docker HOWTO documents for relevant content.
 * Used as context for AI chat OR as offline fallback when no API key.
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

// Check if running in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Get the path to BC-specific HOWTO documents
 * In development: Use relative path from project root
 * In production: Use bundled resources path (extraResources)
 */
function getHowToPath() {
  if (app.isPackaged) {
    // In production, HOWTOs are bundled via extraResources
    return path.join(process.resourcesPath, 'HOWTO', 'CONTAINERS');
  } else {
    // In development, use relative path from project root
    return path.join(__dirname, '..', '..', '..', "HOWTO's", 'CONTAINERS');
  }
}

// Path to BC-specific HOWTO documents
const HOWTO_PATH = getHowToPath();

// Cache for loaded documents
let documentCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load and index BC/Docker HOWTO documents
 * @returns {Promise<Document[]>}
 */
async function loadDocuments() {
  if (documentCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return documentCache;
  }

  const documents = [];

  try {
    const files = await fs.readdir(HOWTO_PATH);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(HOWTO_PATH, file);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      try {
        const content = await fs.readFile(filePath, 'utf8');
        const title = extractTitle(content, file);
        const keywords = extractKeywords(content);
        const sections = extractSections(content);

        documents.push({
          title,
          path: filePath,
          content,
          keywords,
          sections,
        });
      } catch (err) {
        // Skip unreadable files
      }
    }

    documentCache = documents;
    cacheTimestamp = Date.now();
    if (isDev) {
      console.log(`RAG: Loaded ${documents.length} BC/Docker documents`);
    }
  } catch (err) {
    if (isDev) {
      console.error('Failed to load HOWTO documents:', err.message);
    }
  }

  return documents;
}

/**
 * Extract title from markdown
 */
function extractTitle(content, filename) {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].replace(/^HOWTO-?\s*/i, '').trim();
  }
  return filename.replace('.md', '').replace(/^HOWTO-?\s*/i, '');
}

/**
 * Extract section headers and content
 */
function extractSections(content) {
  const sections = [];
  const regex = /^(#{2,3})\s+(.+)$/gm;
  let match;
  let lastIndex = 0;
  let lastSection = null;

  while ((match = regex.exec(content)) !== null) {
    if (lastSection) {
      lastSection.content = content.slice(lastIndex, match.index).trim();
      sections.push(lastSection);
    }
    lastSection = {
      level: match[1].length,
      title: match[2],
      content: '',
    };
    lastIndex = match.index + match[0].length;
  }

  if (lastSection) {
    lastSection.content = content.slice(lastIndex).trim();
    sections.push(lastSection);
  }

  return sections;
}

/**
 * Extract keywords from content
 */
function extractKeywords(content) {
  const keywords = new Set();

  const bcTerms = [
    'container', 'docker', 'bccontainerhelper', 'business central', 'bc',
    'backup', 'restore', 'database', 'sql', 'license', 'extension',
    'web client', 'webclient', 'service tier', 'port', 'https', 'ssl',
    'start', 'stop', 'restart', 'remove', 'create', 'deploy',
    'error', 'troubleshoot', 'fix', 'issue', 'problem', 'failed',
    'memory', 'cpu', 'performance', 'slow', 'timeout',
    'image', 'artifact', 'sandbox', 'onprem', 'credential',
    'navuserpassword', 'windows authentication', 'healthcheck',
    'powershell', 'script', 'install-bc', 'new-bccontainer',
  ];

  const lowerContent = content.toLowerCase();
  for (const term of bcTerms) {
    if (lowerContent.includes(term)) {
      keywords.add(term);
    }
  }

  return Array.from(keywords);
}

/**
 * Search documents for relevant content
 */
async function searchDocuments(query, maxResults = 3) {
  const documents = await loadDocuments();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const scored = documents.map(doc => {
    let score = 0;

    for (const keyword of doc.keywords) {
      if (queryLower.includes(keyword)) score += 3;
    }

    for (const word of queryWords) {
      if (doc.content.toLowerCase().includes(word)) score += 1;
      if (doc.title.toLowerCase().includes(word)) score += 2;
    }

    // Boost troubleshooting docs for error queries
    if (queryLower.match(/error|problem|fix|won't|can't|failed/)) {
      if (doc.title.toLowerCase().includes('troubleshoot')) score += 5;
    }

    // Boost deployment docs for create/install queries
    if (queryLower.match(/deploy|create|install|new|setup/)) {
      if (doc.title.toLowerCase().match(/deployment|helper/)) score += 5;
    }

    return { doc, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.doc);
}

/**
 * Build context string for AI prompt
 */
async function buildContext(query, maxChars = 6000) {
  const docs = await searchDocuments(query);
  if (docs.length === 0) return '';

  let context = '\n\n---\n**Relevant Documentation:**\n';
  let charCount = context.length;

  for (const doc of docs) {
    const header = `\n### ${doc.title}\n`;
    const remaining = maxChars - charCount - header.length;
    if (remaining <= 100) break;

    let content = doc.content;
    if (content.length > remaining) {
      content = content.slice(0, remaining - 50) + '\n\n[...truncated]';
    }

    context += header + content + '\n';
    charCount = context.length;
  }

  return context + '---\n';
}

/**
 * Generate offline response from documentation (no API key fallback)
 */
async function getOfflineResponse(query) {
  const docs = await searchDocuments(query, 2);

  if (docs.length === 0) {
    return {
      content: `I couldn't find relevant documentation for your question.

**Available topics in the knowledge base:**
- Container deployment and setup
- BC-Container Helper commands
- Docker troubleshooting
- Backup and restore procedures
- Common error solutions

Try rephrasing your question or check the HOWTO's/CONTAINERS folder directly.`,
      sources: [],
    };
  }

  // Find the most relevant section within the top document
  const topDoc = docs[0];
  const queryLower = query.toLowerCase();

  let bestSection = null;
  let bestScore = 0;

  for (const section of topDoc.sections) {
    let score = 0;
    const sectionLower = (section.title + ' ' + section.content).toLowerCase();

    for (const word of queryLower.split(/\s+/)) {
      if (word.length > 2 && sectionLower.includes(word)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestSection = section;
    }
  }

  // Build response
  let response = `**From: ${topDoc.title}**\n\n`;

  if (bestSection && bestSection.content.length > 50) {
    response += `### ${bestSection.title}\n\n`;
    response += bestSection.content.slice(0, 2000);
    if (bestSection.content.length > 2000) {
      response += '\n\n[...see full document for more]';
    }
  } else {
    // Use document intro
    response += topDoc.content.slice(0, 2000);
    if (topDoc.content.length > 2000) {
      response += '\n\n[...see full document for more]';
    }
  }

  if (docs.length > 1) {
    response += `\n\n---\n**Related:** ${docs.slice(1).map(d => d.title).join(', ')}`;
  }

  return {
    content: response,
    sources: docs.map(d => ({ title: d.title, path: d.path })),
    isOffline: true,
  };
}

/**
 * List available documents
 */
async function listDocuments() {
  const documents = await loadDocuments();
  return documents.map(d => ({
    title: d.title,
    path: d.path,
    keywordCount: d.keywords.length,
  }));
}

function clearCache() {
  documentCache = null;
  cacheTimestamp = 0;
}

module.exports = {
  loadDocuments,
  searchDocuments,
  buildContext,
  getOfflineResponse,
  listDocuments,
  clearCache,
};
