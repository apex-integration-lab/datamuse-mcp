#!/usr/bin/env node
// datamuse-mcp — no dependencies, Node 18+
const BASE = 'https://api.datamuse.com/words';

async function datamuse(params) {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set('max', '20');
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Datamuse ${r.status}`);
  const words = await r.json();
  return words.map(w => w.word).join(', ') || 'No results.';
}

const TOOLS = [
  { name: 'find_words', description: 'Find words by meaning or description (e.g. "run fast" → sprint, dash, bolt)', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Meaning or description to search for' } }, required: ['query'] } },
  { name: 'synonyms', description: 'Get synonyms for a word', inputSchema: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'] } },
  { name: 'antonyms', description: 'Get antonyms for a word', inputSchema: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'] } },
  { name: 'related_words', description: 'Get words associated with or triggered by a word (topics, concepts)', inputSchema: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'] } },
  { name: 'rhymes', description: 'Get words that rhyme with a word', inputSchema: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'] } },
];

const send = obj => process.stdout.write(JSON.stringify(obj) + '\n');
const respond = (id, result) => send({ jsonrpc: '2.0', id, result });
const error = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

async function handle({ id, method, params = {} }) {
  switch (method) {
    case 'initialize':
      return respond(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'datamuse', version: '1.0.0' } });
    case 'notifications/initialized':
    case 'initialized':
      return;
    case 'tools/list':
      return respond(id, { tools: TOOLS });
    case 'tools/call': {
      const { name, arguments: args } = params;
      try {
        let text;
        switch (name) {
          case 'find_words':    text = await datamuse({ ml: args.query }); break;
          case 'synonyms':      text = await datamuse({ rel_syn: args.word }); break;
          case 'antonyms':      text = await datamuse({ rel_ant: args.word }); break;
          case 'related_words': text = await datamuse({ rel_trg: args.word }); break;
          case 'rhymes':        text = await datamuse({ rel_rhy: args.word }); break;
          default: return error(id, -32601, `Unknown tool: ${name}`);
        }
        respond(id, { content: [{ type: 'text', text }] });
      } catch (e) {
        error(id, -32000, e.message);
      }
      return;
    }
    default:
      if (id != null) error(id, -32601, `Method not found: ${method}`);
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async chunk => {
  buf += chunk;
  const lines = buf.split('\n');
  buf = lines.pop();
  for (const line of lines) {
    if (line.trim()) {
      try { await handle(JSON.parse(line)); } catch (_) {}
    }
  }
});
