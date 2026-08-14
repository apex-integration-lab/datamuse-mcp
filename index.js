#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const BASE = "https://api.datamuse.com/words";

async function datamuse(params) {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("max", "20");
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Datamuse ${r.status}`);
  const words = await r.json();
  return words.map((w) => w.word).join(", ") || "No results.";
}

const TOOLS = [
  {
    name: "find_words",
    description: "Find words by meaning or description (e.g. 'run fast' → sprint, dash, bolt)",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Meaning or description to search for" } },
      required: ["query"],
    },
  },
  {
    name: "synonyms",
    description: "Get synonyms for a word",
    inputSchema: {
      type: "object",
      properties: { word: { type: "string" } },
      required: ["word"],
    },
  },
  {
    name: "antonyms",
    description: "Get antonyms for a word",
    inputSchema: {
      type: "object",
      properties: { word: { type: "string" } },
      required: ["word"],
    },
  },
  {
    name: "related_words",
    description: "Get words associated with or triggered by a word (topics, concepts, collocations)",
    inputSchema: {
      type: "object",
      properties: { word: { type: "string" } },
      required: ["word"],
    },
  },
  {
    name: "rhymes",
    description: "Get words that rhyme with a word",
    inputSchema: {
      type: "object",
      properties: { word: { type: "string" } },
      required: ["word"],
    },
  },
];

const server = new Server({ name: "datamuse", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  let text;
  switch (name) {
    case "find_words":    text = await datamuse({ ml: args.query }); break;
    case "synonyms":      text = await datamuse({ rel_syn: args.word }); break;
    case "antonyms":      text = await datamuse({ rel_ant: args.word }); break;
    case "related_words": text = await datamuse({ rel_trg: args.word }); break;
    case "rhymes":        text = await datamuse({ rel_rhy: args.word }); break;
    default: throw new Error(`Unknown tool: ${name}`);
  }
  return { content: [{ type: "text", text }] };
});

await server.connect(new StdioServerTransport());
