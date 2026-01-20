import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Wallet, Category } from "../types";
import { memoryService } from "./memory";
import { databaseKernel } from "./database";
import { offlineSyncService } from "./offlineSync";
import { v4 as uuidv4 } from 'uuid';

// Use import.meta.env for Vite environment variables
const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || "dummy_key";

import { GeminiKeyConfig } from "../types";

let aiInstances: Record<string, GoogleGenAI> = {};
let limitedKeys: Set<string> = new Set();
let activeKeyId: string | null = localStorage.getItem('finos_preferred_key_id');

// Hot Reload Listener for Global Sync
if (typeof window !== 'undefined') {
  window.addEventListener('FINOS_AI_KEYS_UPDATED', () => {
    console.log("♻️ [AI-Kernel] Hot Reloading Global Keys Reservoir...");
    aiInstances = {}; // Clear instances to pick up new keys
    activeKeyId = localStorage.getItem('finos_preferred_key_id');
    syncKeysToContext();
  });
}

const recentLogs: string[] = [];

const dispatchLog = (message: string) => {
  // Console Log for Debugging (User Request)
  console.log(`📠 [AI-TERM] ${message}`);

  // Persist in memory
  const timestamped = `[${new Date().toLocaleTimeString()}] ${message}`;
  recentLogs.push(timestamped);
  if (recentLogs.length > 50) recentLogs.shift();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('FINOS_AI_LOG', {
      detail: { message }
    }));
  }
};

const dispatchTrial = (keyId: string, model: string, status: 'TRYING' | 'SUCCESS' | 'FAILED' | 'FINISHED') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('FINOS_AI_TRIAL', {
      detail: { keyId, model, status }
    }));
  }
};

const logTokenUsage = (activity: string, response: any, keyId: string = 'unknown', model: string = 'unknown') => {
  if (response?.usageMetadata) {
    const { promptTokenCount, candidatesTokenCount, totalTokenCount } = response.usageMetadata;
    console.log(`💰 [AI-BILLING] ------------------------`);
    console.log(`📝 Activity: ${activity}`);
    console.log(`🔑 Key ID: ${keyId} | Model: ${model}`);
    console.log(`📤 Input Tokens: ${promptTokenCount || 0}`);
    console.log(`📥 Output Tokens: ${candidatesTokenCount || 0}`);
    console.log(`----------------------------------------`);
    console.log(`📊 Total Execution Tokens: ${totalTokenCount || 0}`);
    console.log(`----------------------------------------`);

    // Persist to DB (Fire & Forget)
    try {
      // Fetch current user_id directly from meta_sync to ensure RLS compatibility
      // databaseKernel.query returns rows array directly: query(table, where)
      databaseKernel.query('meta_sync', 'id = 1').then(rows => {
        const userId = rows?.[0]?.last_user_id || 'unknown';

        const logEntry = {
          id: uuidv4(),
          key_id: keyId || 'unknown',
          activity_type: activity,
          model: model || 'unknown',
          input_tokens: promptTokenCount || 0,
          output_tokens: candidatesTokenCount || 0,
          total_tokens: totalTokenCount || 0,
          timestamp: Date.now(),
          status: 'SUCCESS',
          error_msg: null,
          user_id: userId,
          updated_at: Date.now() // Critical for Sync
        };

        // Use the kernel execution wrapper which handles connection state
        databaseKernel.run(`
            INSERT INTO ai_usage_logs (id, key_id, activity_type, model, input_tokens, output_tokens, total_tokens, timestamp, status, error_msg, user_id, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          logEntry.id,
          logEntry.key_id,
          logEntry.activity_type,
          logEntry.model,
          logEntry.input_tokens,
          logEntry.output_tokens,
          logEntry.total_tokens,
          logEntry.timestamp,
          logEntry.status,
          null,
          logEntry.user_id,
          logEntry.updated_at
        ], false).then(() => {
          console.log(`✅ [AI-DB] Log saved for Key: ${logEntry.key_id} (User: ${logEntry.user_id})`);

          // Queue for Sync Explicitly
          const syncId = uuidv4();
          databaseKernel.run(`
              INSERT INTO sync_queue (id, entity, entity_id, operation, payload, created_at, status)
              VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            syncId,
            'ai_usage_logs',
            logEntry.id,
            'INSERT',
            JSON.stringify(logEntry),
            Date.now(),
            'pending'
          ], false)
            .then(() => offlineSyncService.push()) // Trigger Sync Engine
            .catch(err => console.error("❌ [AI-DB] Sync Queue failed:", err));

          // Dispatch Real-time Event for UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('FINOS_AI_USAGE_UPDATE', { detail: logEntry }));
          }
        }).catch(e => {
          console.error("❌ [AI-DB] Insert failed:", e);
        });
      });

    } catch (e) {
      console.error("❌ [AI-DB] Setup failed:", e);
    }
  }
};

export const getRecentLogs = () => [...recentLogs];

// FOUNDATION_KEYS removed for security - all keys must come from Supabase
const FOUNDATION_KEYS: GeminiKeyConfig[] = [];

const getKeys = (): GeminiKeyConfig[] => {
  // 1. Priority: Global Admin Keys (Synced from Super Admin)
  const globalKeysJSON = localStorage.getItem('finos_global_ai_keys');

  // 2. Secondary: User's own keys (if allowed/present)
  let activeKeysJSON = (globalKeysJSON && globalKeysJSON !== '[object Object]') ? globalKeysJSON : null;

  if (activeKeysJSON && activeKeysJSON !== '[object Object]') {
    try {
      const keys: GeminiKeyConfig[] = typeof activeKeysJSON === 'string' ? JSON.parse(activeKeysJSON) : activeKeysJSON;
      if (Array.isArray(keys) && keys.length > 0) {
        // Validation: Filter out keys that don't look valid (too short or placeholder)
        return keys.filter(k => k.key && k.key.length > 10 && k.key !== 'dummy_key');
      }
    } catch (e) {
      console.warn("Failed to parse custom keys, falling back to Foundation.", e);
    }
  }

  // 3. Ultimate Fallback: Foundation Keys (International Failover Reservoir)
  console.log("🛠️ [AI-Kernel] Utilizing International Foundation Reservoir.");
  return FOUNDATION_KEYS;
};



const syncKeysToContext = (activeId?: string | null) => {
  if (activeId !== undefined) activeKeyId = activeId;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('FINOS_GEMINI_SYNC', {
      detail: {
        keys: getKeys(),
        activeKeyId
      }
    }));
  }
};

const getPreferredKeyId = () => localStorage.getItem('finos_preferred_key_id');
const setPreferredKeyId = (id: string) => {
  localStorage.setItem('finos_preferred_key_id', id);
  // Dispatch event for Cloud Sync (FinanceContext will catch this)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('FINOS_SETTINGS_UPDATE', {
      detail: { preferredGeminiKeyID: id }
    }));
  }
};

const getAiForNextKey = () => {
  const allKeys = getKeys();
  const activeKeys = allKeys.filter(k => k.status === 'ACTIVE' && !limitedKeys.has(k.id));

  // Sort active keys to prioritize the preferred one
  const preferredId = getPreferredKeyId();
  if (preferredId) {
    activeKeys.sort((a, b) => {
      if (a.id === preferredId) return -1;
      if (b.id === preferredId) return 1;
      return 0;
    });
  }

  if (activeKeys.length > 0) {
    const config = activeKeys[0];
    if (!aiInstances[config.id]) {
      aiInstances[config.id] = new GoogleGenAI({ apiKey: config.key });
    }
    if (activeKeyId !== config.id) syncKeysToContext(config.id);
    return { ai: aiInstances[config.id], id: config.id };
  }

  // Emergency Unlock: If we have keys but all are limited, pick the one waiting longest
  const limited = allKeys.filter(k => k.status === 'LIMITED' || limitedKeys.has(k.id));
  if (limited.length > 0) {
    console.warn("⚠️ [AI] All keys limited. Forcing emergency unlock of one key.");

    // Sort by limitedAt to find the one that's been waiting longest (or random if undefined)
    limited.sort((a, b) => (a.limitedAt || 0) - (b.limitedAt || 0));

    const victim = limited[0];
    limitedKeys.delete(victim.id);

    // Update local storage to reflect this force-unlock
    const updatedKeys = allKeys.map(k => k.id === victim.id ? { ...k, status: 'ACTIVE' as const, limitedAt: undefined } : k);
    localStorage.setItem('finos_global_ai_keys', JSON.stringify(updatedKeys));

    if (!aiInstances[victim.id]) {
      aiInstances[victim.id] = new GoogleGenAI({ apiKey: victim.key });
    }

    syncKeysToContext(victim.id);
    return { ai: aiInstances[victim.id], id: victim.id };
  }

  return null;
};

const markKeyLimited = (id: string) => {
  limitedKeys.add(id);
  // Update in localStorage as well so Admin UI can show it
  const keys = getKeys();
  const updatedKeys = keys.map(k => k.id === id ? { ...k, status: 'LIMITED' as const, limitedAt: Date.now() } : k);
  localStorage.setItem('finos_global_ai_keys', JSON.stringify(updatedKeys));

  // Reset after 1 minute (Gemini free tier limit usually resets every minute)
  setTimeout(() => {
    limitedKeys.delete(id);

    // Revert status in localStorage to ACTIVE
    const currentKeys = getKeys();
    const restoredKeys = currentKeys.map(k => k.id === id ? { ...k, status: 'ACTIVE' as const, limitedAt: undefined } : k);
    localStorage.setItem('finos_global_ai_keys', JSON.stringify(restoredKeys));

    syncKeysToContext(); // Sync back to ACTIVE state
  }, 60000);

  syncKeysToContext(null); // Clear active key since current one just failed
  dispatchLog(`❌ Key ${id} marked LIMITED. Cooling down for 60s.`);
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Safe extraction for @google/genai responses
const extractText = (response: any): string => {
  if (!response) return "";
  // Handle nested response object (Common in some SDK versions)
  if (response.response) {
    return extractText(response.response);
  }
  if (typeof response.text === 'string') return response.text;
  if (typeof response.text === 'function') {
    try { return response.text(); } catch (e) { return ""; }
  }
  return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

// Models to try in order. 
// Reordered: 2.0 Flash is stabilized and has higher initial quotas.
export const FALLBACK_MODELS = [

  "gemini-2.5-flash" // Experimental (limit: 20/day)
];

// Helper to get preferred model (Global priority)
export const getPreferredModel = () => localStorage.getItem('finos_global_ai_model') || localStorage.getItem('finos_preferred_model');
const setPreferredModel = (model: string) => {
  localStorage.setItem('finos_preferred_model', model);
  // Dispatch event for Cloud Sync
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('FINOS_SETTINGS_UPDATE', {
      detail: { preferredGeminiModel: model }
    }));
  }
};

// Helper to iterate models for a SINGLE key
async function withModelFailover<T>(
  ai: GoogleGenAI,
  keyId: string,
  operation: (model: string) => Promise<T>
): Promise<T> {
  let lastError: any = null;

  // Dynamic Model Sort: Preferred Model First
  const preferredModel = getPreferredModel();
  const sortedModels = [...FALLBACK_MODELS];
  if (preferredModel && sortedModels.includes(preferredModel)) {
    sortedModels.sort((a, b) => {
      if (a === preferredModel) return -1;
      if (b === preferredModel) return 1;
      return 0;
    });
  }

  for (const model of sortedModels) {
    try {
      dispatchTrial(keyId, model, 'TRYING');
      // dispatchLog(`🔄 Trying Model: ${model}...`);
      const result = await operation(model);
      // SUCCESS HOOK: If we get here, this model worked!
      dispatchTrial(keyId, model, 'SUCCESS');
      if (model !== preferredModel) {
        console.log(`🎉 [AI] New Preferred Model Found: ${model}`);
        dispatchLog(`🏆 New Champion Model: ${model}`);
        setPreferredModel(model);
      }
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || "";
      // Only switch model on Rate Limit (429), Overloaded (503), or Not Found (404)
      if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('503') || errorMsg.includes('404')) {
        dispatchTrial(keyId, model, 'FAILED');
        console.warn(`⚠️ [AI] Model ${model} failed (Quota/Load/Missing). Switching IMMEDIATELY...`);
        dispatchLog(`⚠️ Model ${model} Failed (Quota/Error). Switching...`);

        // If preferred model fails, clear preference so we don't prefer it next time
        if (model === preferredModel) {
          localStorage.removeItem('finos_preferred_model');
        }
        // No delay - fail fast to next model
        // USER REQUIREMENT: Do not retry the same model/API. Move to next option immediately.
        lastError = error;
        continue;
      }
      throw error; // Other errors are fatal
    }
  }
  throw lastError; // All models failed for this key
}

// Standard wrapper for AI calls with auto-failover (KEYS)
async function withFailover<T>(operation: (ai: GoogleGenAI, keyId: string) => Promise<T>): Promise<T> {
  const keys = getKeys();
  const maxRetries = keys.length;
  let lastError: any = null;

  // Track tried keys in this session to avoid infinite loops
  const triedKeys = new Set<string>();

  for (let i = 0; i < maxRetries; i++) {
    const context = getAiForNextKey();
    if (!context || triedKeys.has(context.id)) {
      // If we ran out of keys or identified a loop, break and throw
      break;
    }

    triedKeys.add(context.id);

    try {
      console.log(`🌐 [AI-Engine] Routing request through Node: ${context.id}`);
      const result = await operation(context.ai, context.id);

      // Success: Optional - if this wasn't the preferred key, we could promote it
      return result;
    } catch (error: any) {
      lastError = error;
      const errorMsg = (error?.message || "").toUpperCase();

      // Check for Retryable failures (Cloud Quota, Network, Model Availability)
      const isRetryable =
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('404') ||
        errorMsg.includes('503') ||
        errorMsg.includes('500') ||
        errorMsg.includes('DEADLINE_EXCEEDED');

      if (isRetryable) {
        console.warn(`⚠️ [AI-Engine] Node ${context.id} degraded. Attempting automated failover...`);
        dispatchLog(`🔄 Node ${context.id} Failover: ${errorMsg.substring(0, 30)}...`);
        markKeyLimited(context.id);
        continue; // Try next key
      }

      // Non-retryable errors (e.g. Safety Filters, Invalid Params) should be thrown immediately
      throw error;
    }
  }

  throw lastError || new Error("Global Intelligence Mesh is currently offline.");
}

export interface FinancialInsight {
  insight: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

const CACHE_KEY = 'finos_ai_insights_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const GLOBAL_CACHE_KEY = 'finos_global_ai_insights';

export const getFinancialInsights = async (transactions: Transaction[], wallets: Wallet[], forceRefresh: boolean = false): Promise<FinancialInsight[]> => {
  try {
    // 1. Check Global Cache First (Synced from Super Admin)
    const globalCached = localStorage.getItem(GLOBAL_CACHE_KEY);
    if (globalCached && !forceRefresh) {
      try {
        const data = JSON.parse(globalCached);
        if (Array.isArray(data) && data.length > 0) {
          console.log("🤖 [AI] Using Global Insights (Synced).");
          return data;
        }
      } catch (e) {
        console.warn("Failed to parse global insights", e);
      }
    }

    // 2. Check Local Cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached && !forceRefresh) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log("🤖 [AI] Using cached insights.");
        return data;
      }
    }

    const context = `
      User Transactions: ${JSON.stringify(transactions.slice(0, 20))}
      User Wallets: ${JSON.stringify(wallets)}
      Task: Provide 3 short, punchy financial insights for a premium fintech app dashboard. 
      Focus on spending trends, savings opportunities, or budget alerts.
    `;

    const insights = await withFailover(async (ai, keyId) => {
      return await withModelFailover(ai, keyId, async (model) => {
        const response = await (ai as any).models.generateContent({
          model: model,
          contents: context,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  insight: { type: Type.STRING },
                  urgency: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] }
                },
                required: ['insight', 'urgency']
              }
            }
          }
        });
        const text = extractText(response);
        logTokenUsage("Generate Insights", response, keyId, model);
        return text ? (JSON.parse(text) as FinancialInsight[]) : [];
      });
    });

    // 2. Save Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: insights,
      timestamp: Date.now()
    }));

    return insights;
  } catch (error: any) {
    console.error("AI Insights Error:", error);

    // If rate limited, try to return expired cache if exists
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }

    return [
      { insight: "Track your expenses to see AI-powered insights here.", urgency: "LOW" },
      { insight: "Your food spending is looking stable this week.", urgency: "LOW" }
    ];
  }
};

export interface CategorySuggestion {
  categoryName: string;
  confidence: number;
}

export interface AIProcessedAction {
  type: 'ADD_TRANSACTION' | 'ADD_PLAN' | 'REQUEST_INFO' | 'UNCERTAIN';
  payload?: any;
  missingFields?: string[];
  explanation: string;
}

import { VectorService } from './vector';

// Helper to clean noise and extract the core "Subject" for powerful embedding
const extractSubject = (input: string): string => {
  // Improved Clean: Split -> Filter -> Join
  const words = input.replace(/[0-9]/g, ' ').split(/\s+/);

  const stopWords = new Set([
    'taka', 'tk', 'price', 'bill', 'dam', 'cost', 'korlam', 'dilam', 'expense', 'amount', 'er', 'te', 'theke', 'holo', 'give', 'paid', 'new', 'add', 'money', 'wallet', 'test', 'cash', 'payment', 'koro',
    'টাকা', 'বিল', 'দাম', 'খরচ', 'করলাম', 'দিলাম', 'হলো', 'থেকে', 'এর', 'দিয়ে', 'ভাড়া', 'লাগলো', 'পেমেন্ট', 'দিন', 'করো', 'এড', 'নতুন', 'ট্যাঁক', 'ক্যাশ', 'ওয়ালেট', 'টেস্ট'
  ]);

  const filtered = words.filter(w => {
    const lower = w.toLowerCase();
    return !stopWords.has(lower) && w.length > 1; // Filter stop words and single chars
  });

  return filtered.join(' ').trim();
};


const matchCategory = async (keywords: string): Promise<any[]> => {
  console.log(`🔎 [AI-PROCESS] RAG: Starting matching for keywords: "${keywords}"`);
  try {
    const embedding = await generateEmbedding(keywords);
    if (!embedding) {
      console.warn("🔎 [AI-PROCESS] RAG: Failed to generate embedding. No matches found.");
      return [];
    }
    const results = await VectorService.searchCategories(embedding, 5);
    console.log(`🔎 [AI-PROCESS] RAG: Found ${results.length} category matches.`);
    return results;
  } catch (e) {
    console.warn("⚠️ [AI-PROCESS] Category matching failed:", e);
    return [];
  }
};

const getLocalDateTime = () => {
  const now = new Date();
  const date = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const time = now.toLocaleTimeString('en-GB'); // HH:mm:ss
  return { date, time, iso: now.toISOString() };
};

// Phase 5: Smart Wallet Filter to prune tokens
const getRelevantWallets = (input: string, wallets: Wallet[]): string => {
  if (!input) return wallets.slice(0, 8).map(w => `${w.id}:${w.name}`).join('|');
  const lowerInput = input.toLowerCase();
  // Find wallets whose name is mentioned
  const matches = wallets.filter(w => lowerInput.includes(w.name.toLowerCase()));
  // If no match, send top 8 to save tokens. If match, send matches + top 3.
  const resultSlots = matches.length > 0 ? [...matches, ...wallets.slice(0, 3)] : wallets.slice(0, 8);
  // Deduplicate and format
  const unique = Array.from(new Set(resultSlots.map(w => w.id)))
    .map(id => {
      const w = wallets.find(curr => curr.id === id);
      return `${w?.id}:${w?.name}`;
    });
  return unique.join('|');
};

export const processAICommand = async (input: string, context: { wallets: Wallet[], categories: Category[], userId?: string, imageBase64?: string }): Promise<AIProcessedAction> => {
  const { date: today, time: nowTime } = getLocalDateTime();
  console.log(`🚀 [AI-PROCESS] New Command received. Input: "${input || "Base64 Image"}"`);

  try {
    return await withFailover(async (ai, keyId) => {
      // 1. MEMORY RECALL (Persistent AI Brain)
      let memoriesStr = "None";
      if (context.userId) {
        console.log(`🧠 [AI-PROCESS] Recalling memories for User: ${context.userId}`);
        const memories = await memoryService.recall(context.userId);
        if (memories.length > 0) {
          const topMemories = memories.slice(0, 3);
          const tMap: any = { 'PATTERN': 'P', 'ALIAS': 'A', 'PREFERENCE': 'Pr' };
          memoriesStr = topMemories.map(m => `${tMap[m.memory_type]}:${m.memory_key}=${m.memory_value}`).join('|');
        }
        else {
          console.log(`🧠 [AI-PROCESS] No memories found for this user.`);
        }
      }

      // 2. MULTIMODAL BRANCH (1-Call Pro)
      if (context.imageBase64) {
        dispatchLog("📸 [AI] 1-Call Pro: Analyzing image for extraction + RAG keywords...");
        console.log("📸 [AI-PROCESS] Branch: MULTIMODAL (Image)");

        const walletsPrompt = getRelevantWallets(input, context.wallets);

        const multimodalPrompt = `JSON:{type:'ADD_TRANSACTION',payload:{amount,date,type:'EXPENSE'},explanation,searchKeywords}
        Rules:1.Mirror 'explanation' lang (5-8 words).2.searchKeywords: English ONLY (no Bangla).3.NO IDs/Metadata/WalletName in explanation.
        T:${today}|W:${walletsPrompt}|M:${memoriesStr}|In:${input || 'None'}`;

        console.log("📡 [AI-PROCESS] Sending Multimodal Request to Gemini...");
        const multimodalResult = await withModelFailover(ai, keyId, async (model) => {
          const res = await (ai as any).models.generateContent({
            model: model,
            contents: [{
              role: 'user',
              parts: [
                { text: multimodalPrompt },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: context.imageBase64!.includes(',') ? context.imageBase64!.split(',')[1] : context.imageBase64!
                  }
                }
              ]
            }]
          });
          const text = extractText(res);
          logTokenUsage("Multimodal Transaction (Image)", res, keyId, model);
          console.log("📥 [AI-PROCESS] Raw AI Response:", text);

          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          console.log("🧩 [AI-PROCESS] JSON Parsed successfully.", parsed);

          // Smart Injection: Map Explanation to Note + Append Time
          if (parsed.payload) {
            parsed.payload.note = parsed.explanation; // Unified field
            const datePart = parsed.payload.date || today;
            parsed.payload.date = `${datePart}T${nowTime}`;
            console.log(`💉 [AI-PROCESS] Smart Injection applied. Note: "${parsed.payload.note}", Date: ${parsed.payload.date}`);
          }
          return parsed;
        });

        // Local RAG Match for Category
        if (multimodalResult.searchKeywords) {
          dispatchLog(`🔍 [AI] Local RAG Match: "${multimodalResult.searchKeywords}"`);
          const keywords = multimodalResult.searchKeywords + " " + (multimodalResult.payload?.note || "");
          const matches = await matchCategory(keywords);
          if (matches.length > 0) {
            // Check if category exists in context
            const exists = context.categories.some(c => c.id === matches[0].id);
            if (exists) {
              dispatchLog(`🎯 [AI] RAG Hit: ${matches[0].name}`);
              if (!multimodalResult.payload) multimodalResult.payload = {};
              multimodalResult.payload.categoryId = matches[0].id;
            } else {
              console.warn(`⚠️ [AI] RAG suggested ${matches[0].id} but not in context. Ignoring.`);
            }
          }
        }
        console.log("📸 [AI-DEBUG] Final Multimodal Result (with RAG):", multimodalResult);
        return multimodalResult;
      }

      // 3. TEXT BRANCH (1-Call Pro)
      dispatchLog(`🔍 [AI] Text Command: "${input}"`);
      console.log("📝 [AI-PROCESS] Branch: TEXT COMMAND");

      const walletsPrompt = getRelevantWallets(input, context.wallets);

      const textPrompt = `JSON:{type:'ADD_TRANSACTION',payload:{amount,date,type:'EXPENSE'|'INCOME',walletId,categoryId,title},explanation,searchKeywords}
      Rules:1.Mirror 'explanation' lang (5-8 words).2.searchKeywords: English ONLY (no Bangla).3.NO IDs/Metadata/WalletName in explanation.
      T:${today}|W:${walletsPrompt}|M:${memoriesStr}|In:"${input}"`;

      console.log("📡 [AI-PROCESS] Sending Text Request to Gemini...");
      const textResult = await withModelFailover(ai, keyId, async (model) => {
        const res = await (ai as any).models.generateContent({
          model: model,
          contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
          config: {
            responseMimeType: "application/json"
          }
        });
        const text = extractText(res);
        logTokenUsage("Text Transaction Command", res, keyId, model);
        console.log("📥 [AI-PROCESS] Raw AI Response:", text);
        const parsed = text ? JSON.parse(text.replace(/```json|```/g, "").trim()) : { type: 'UNCERTAIN', explanation: "I couldn't process that." };
        console.log("🧩 [AI-PROCESS] JSON Parsed successfully.", parsed);

        // Smart Injection: Map Explanation to Note + Append Time
        if (parsed.payload) {
          parsed.payload.note = parsed.explanation;
          const datePart = parsed.payload.date || today;
          parsed.payload.date = `${datePart}T${nowTime}`;
          console.log(`💉 [AI-PROCESS] Smart Injection applied. Note: "${parsed.payload.note}", Date: ${parsed.payload.date}`);
        }
        return parsed;
      });

      // Local RAG Match for Category (Consistency)
      if (textResult.searchKeywords) {
        dispatchLog(`🔍 [AI] Local RAG Match: "${textResult.searchKeywords}"`);
        const matches = await matchCategory(textResult.searchKeywords);
        if (matches.length > 0) {
          const exists = context.categories.some(c => c.id === matches[0].id);
          if (exists) {
            dispatchLog(`🎯 [AI] RAG Hit: ${matches[0].name}`);
            if (!textResult.payload) textResult.payload = {};
            textResult.payload.categoryId = matches[0].id;
          } else {
            console.warn(`⚠️ [AI] RAG suggested ${matches[0].id} but not in context. Ignoring.`);
          }
        }
      }

      console.log("📝 [AI-PROCESS] Final Text Result (with RAG):", textResult);
      return textResult;
    });
  } catch (error: any) {
    console.error("AI Command Processing Error:", error);
    return { type: 'UNCERTAIN', explanation: "দুঃখিত, টেকনিক্যাল সমস্যার কারণে আমি এখন কাজ করতে পারছি না।" };
  }
};

export const suggestCategory = async (note: string, amount: number): Promise<CategorySuggestion> => {
  try {
    return await withFailover(async (ai, keyId) => {
      return await withModelFailover(ai, keyId, async (model) => {
        const res = await (ai as any).models.generateContent({
          model: model,
          contents: [{ role: 'user', parts: [{ text: `Suggest a financial category for a transaction of ${amount} with note: "${note}"` }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                categoryName: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ['categoryName', 'confidence']
            }
          }
        });
        const text = extractText(res);
        logTokenUsage("Suggest Category", res, keyId, model);
        return text ? JSON.parse(text.replace(/```json|```/g, "").trim()) : { categoryName: 'General', confidence: 0 };
      });
    });
  } catch (error) {
    return { categoryName: 'General', confidence: 0 };
  }
};

export const generateEmbedding = async (text: string | any): Promise<number[] | null> => {
  const safeText = typeof text === 'string' ? text : Array.isArray(text) ? text.join(' ') : String(text || '');
  console.log(`🧬 [AI-PROCESS] Generating embedding for: "${safeText.substring(0, 30)}..."`);
  try {
    return await withFailover(async (ai, keyId) => {
      // Try latest embedding model first (Preferred)
      try {
        const result = await (ai as any).models.embedContent({
          model: "models/text-embedding-004",
          contents: safeText
        });
        logTokenUsage("Generating Embedding (RAG Search)", result, keyId, "models/text-embedding-004");
        console.log("🧬 [AI-PROCESS] Embedding success (text-embedding-004)");
        return result.embeddings?.[0]?.values;
      } catch (err) {
        console.warn("⚠️ [AI-PROCESS] text-embedding-004 failed, trying embedding-001...", err);
        const result = await (ai as any).models.embedContent({
          model: "models/embedding-001",
          contents: text
        });
        logTokenUsage("Generating Embedding (RAG Search - Fallback)", result, keyId, "models/embedding-001");
        console.log("🧬 [AI-PROCESS] Embedding success (embedding-001)");
        return result.embeddings?.[0]?.values;
      }
    });
  } catch (e: any) {
    const msg = e?.message || "";
    // FAIL FAST: If rate limited, throw immediately to trigger Master Key Failover
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) throw e;

    console.error("❌ [Gemini] Embedding failed (Non-Critical):", e);
    return null;
  }
};

export const learnFromCorrection = async (userId: string, input: string, original: AIProcessedAction, final: any) => {
  if (!userId || !original.payload) return;

  try {
    const subject = extractSubject(input);
    if (!subject || subject.length < 3) return;

    // 1. Check Category Correction
    if (original.payload.categoryId !== final.categoryId && final.categoryId) {
      // User changed category!
      const key = `cat_${subject.toLowerCase().replace(/\s+/g, '_')}`;
      await memoryService.remember(userId, key, final.categoryId, 'PREFERENCE', 0.9);
    }

    // 2. Check Wallet Correction
    if (original.payload.walletId !== final.walletId && final.walletId) {
      const key = `wallet_${subject.toLowerCase().replace(/\s+/g, '_')}`;
      await memoryService.remember(userId, key, final.walletId, 'PREFERENCE', 0.8);
    }

    // 3. New Note (if original was empty but user added one)
    if (!original.payload.note && final.note) {
      const key = `note_${subject.toLowerCase().replace(/\s+/g, '_')}`;
      await memoryService.remember(userId, key, final.note, 'PATTERN', 0.7);
    }

  } catch (e) {
    console.error("🧠 [AI] Failed to learn:", e);
  }
};

// Utility to test a key/model pair
export const testAiNode = async (key: string, model: string, onLog: (msg: string) => void, keyId: string): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    // Minimal request to check health for @google/genai structure
    const result = await (ai as any).models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: "Say 'HEALED'" }] }]
    });
    logTokenUsage("AI Health Check (Node Test)", result, keyId, model);

    // Robust extraction: @google/genai result might have .text() or .text
    let responseText = "";
    if (result) {
      if (typeof result.text === 'function') {
        responseText = await result.text();
      } else if (typeof result.text === 'string') {
        responseText = result.text;
      } else {
        responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    }

    if (responseText && responseText.trim().length > 0) {
      onLog(`      ✅ Response: ${responseText.trim().substring(0, 20)}...`);
      return true;
    }

    onLog(`      ⚠️ Warning: Model returned empty/invalid response.`);
    return false;
  } catch (e: any) {
    const errorMsg = e?.message || e?.statusText || String(e);

    if (errorMsg.includes('429')) {
      onLog(`      🛑 Quota Exhausted (429).`);
    } else if (errorMsg.includes('404')) {
      onLog(`      🚫 Model Not Supported/Found (404).`);
    } else {
      onLog(`      ❌ Error: ${errorMsg.substring(0, 50)}...`);
    }

    console.warn(`Health check failed for ${model}:`, e);
    return false;
  }
};

export const runAiHealthCheck = async (onLog: (msg: string) => void) => {
  const keys = getKeys();
  if (!keys.length) {
    onLog("❌ No API Keys found to test.");
    return false;
  }

  try {
    onLog(`🚀 Initializing Global Health Check (${keys.length} keys, ${FALLBACK_MODELS.length} models)...`);

    for (const keyConfig of keys) {
      onLog(`\n🔑 Testing Key: ${keyConfig.label} (...${keyConfig.key.slice(-4)})`);

      for (const model of FALLBACK_MODELS) {
        onLog(`   🔄 Trying Model: ${model}...`);
        dispatchTrial(keyConfig.id, model, 'TRYING');

        const success = await testAiNode(keyConfig.key, model, onLog, keyConfig.id);

        if (success) {
          onLog(`   ✅ SUCCESS! Champion pair found.`);
          dispatchTrial(keyConfig.id, model, 'SUCCESS');

          // Activate this pair
          localStorage.setItem('finos_preferred_key_id', keyConfig.id);
          localStorage.setItem('finos_preferred_model', model);

          // Notify app for Cloud Sync & UI Refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('FINOS_SETTINGS_UPDATE', {
              detail: {
                preferredGeminiKeyID: keyConfig.id,
                preferredGeminiModel: model
              }
            }));
          }

          syncKeysToContext(keyConfig.id);

          dispatchLog(`🏆 Auto-Healer: New Champion ${keyConfig.label} @ ${model}`);
          return true;
        } else {
          onLog(`   ❌ FAILED.`);
          dispatchTrial(keyConfig.id, model, 'FAILED');
        }

        // Safety pause to avoid hitting global network rate limits during health check
        await wait(800);
      }
      // Pause between keys as well
      await wait(1000);
    }

    onLog("\n❌ All combinations exhausted. No working AI node found.");
    return false;
  } finally {
    // Ensure UI scanning stops regardless of success or exhaustion
    dispatchTrial('', '', 'FINISHED');
  }
};

export const getKeyUsageLogs = async (keyId: string | null) => {
  if (!keyId) return [];
  try {
    await databaseKernel.getDb(); // Ensure ready
    console.log(`📊 [AI-DB] Fetching logs for Key: ${keyId}`);
    const results = await databaseKernel.query('ai_usage_logs', 'key_id = ? ORDER BY timestamp DESC LIMIT 50', [keyId]);
    console.log(`📊 [AI-DB] Query Result Count: ${results?.values?.length || 0}`);
    return results;
  } catch (e) {
    console.error("❌ [AI-DB] Failed to fetch logs", e);
    return [];
  }
};
