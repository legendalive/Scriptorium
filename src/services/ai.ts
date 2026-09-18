import {
  ProviderTier,
  DiscoveredModel,
  ProjectConfig,
  AiGenerationProgress,
  ConfigEntity,
} from '../types';

export const VENDOR_PRESETS: Record<
  string,
  {
    name: string;
    baseUrl: string;
    defaultModel: string;
    knownFreeModels: string[];
    description: string;
  }
> = {
  gemini: {
    name: 'Google Gemini (AI Studio)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-3.8-flash',
    knownFreeModels: [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ],
    description: 'Google AI Studio with high-performance free quotas and expansive context windows',
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free',
    knownFreeModels: ['openrouter/free'],
    description: 'Auto-routes requests to active free models dynamically without broken model IDs',
  },
  groq: {
    name: 'Groq Cloud',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    knownFreeModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'gemma2-9b-it',
      'mixtral-8x7b-32768',
    ],
    description: 'Extremely fast inference with free rate-limited tier',
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    knownFreeModels: ['gpt-4o-mini', 'gpt-4o'],
    description: 'Standard OpenAI models (defaulting to fast, lightweight GPT-4o-mini)',
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    knownFreeModels: ['deepseek-chat', 'deepseek-reasoner'],
    description: 'DeepSeek native models (DeepSeek-V3 and DeepSeek-R1)',
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    knownFreeModels: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    ],
    description: 'Fast open source hosting',
  },
  mistral: {
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    knownFreeModels: ['mistral-small-latest', 'open-mistral-nemo'],
    description: 'European frontier models',
  },
  ollama: {
    name: 'Ollama / Local',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.3',
    knownFreeModels: ['llama3.3', 'qwen2.5', 'mistral'],
    description: '100% free local models running on your machine',
  },
  custom: {
    name: 'Custom Provider',
    baseUrl: '',
    defaultModel: '',
    knownFreeModels: [],
    description: 'Any OpenAI-compatible server or proxy',
  },
};

export const DEFAULT_PROVIDERS: ProviderTier[] = [
  {
    id: 'tier-1',
    name: 'Google Gemini',
    vendorType: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: '',
    autoPickBestModel: true,
    preferredModel: 'gemini-3.8-flash',
    cycleFreeModelsOnError: true,
    fallbackModels: 'gemini-3.8-flash, gemini-3.6-flash, gemini-3.1-flash-lite, gemini-flash-latest',
    enabled: false,
  },
  {
    id: 'tier-2',
    name: 'OpenRouter',
    vendorType: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    autoPickBestModel: true,
    preferredModel: 'openrouter/free',
    cycleFreeModelsOnError: true,
    fallbackModels: 'openrouter/free',
    enabled: false,
  },
  {
    id: 'tier-3',
    name: 'Groq Cloud',
    vendorType: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: '',
    autoPickBestModel: true,
    preferredModel: 'llama-3.3-70b-versatile',
    cycleFreeModelsOnError: true,
    fallbackModels: 'llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma2-9b-it',
    enabled: false,
  },
  {
    id: 'tier-4',
    name: 'OpenAI',
    vendorType: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    autoPickBestModel: true,
    preferredModel: 'gpt-4o-mini',
    cycleFreeModelsOnError: true,
    fallbackModels: 'gpt-4o-mini, gpt-4o',
    enabled: false,
  },
  {
    id: 'tier-5',
    name: 'DeepSeek',
    vendorType: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    autoPickBestModel: true,
    preferredModel: 'deepseek-chat',
    cycleFreeModelsOnError: true,
    fallbackModels: 'deepseek-chat',
    enabled: false,
  },
];

export function isDeprecatedModel(modelId: string): boolean {
  if (!modelId) return true;
  const id = modelId.toLowerCase().trim();
  if (
    id.includes('gemini-2.0-flash') ||
    id.includes('gemini-2.0-pro') ||
    id.includes('gemini-1.5-flash') ||
    id.includes('gemini-1.5-pro') ||
    id.includes('gemini-2.0-flash-thinking') ||
    id === 'gemini-pro' ||
    id === 'gemini-1.0-pro'
  ) {
    return true;
  }
  return false;
}

export function sanitizeProviderTier(tier: ProviderTier): ProviderTier {
  const preset = VENDOR_PRESETS[tier.vendorType];
  if (!preset) return tier;

  let preferred = tier.preferredModel || preset.defaultModel;
  let fallback = tier.fallbackModels || preset.knownFreeModels.join(', ');

  if (tier.vendorType === 'openrouter') {
    preferred = 'openrouter/free';
    fallback = 'openrouter/free';
  } else if (isDeprecatedModel(preferred)) {
    preferred = preset.defaultModel;
  }

  const cleanedFallbacks = fallback
    .split(',')
    .map((s) => s.trim())
    .filter((m) => m && !isDeprecatedModel(m));

  preset.knownFreeModels.forEach((km) => {
    if (!cleanedFallbacks.includes(km)) {
      cleanedFallbacks.push(km);
    }
  });

  const hasApiKey = !!tier.apiKey?.trim();

  return {
    ...tier,
    baseUrl: preset.baseUrl || tier.baseUrl,
    preferredModel: preferred,
    fallbackModels: cleanedFallbacks.join(', '),
    autoPickBestModel: true,
    cycleFreeModelsOnError: true,
    enabled: tier.vendorType === 'ollama' ? tier.enabled : hasApiKey,
  };
}

export function autoDetectVendorFromKey(key: string): 'openrouter' | 'groq' | 'gemini' | 'openai' | 'deepseek' {
  const trimmed = key.trim();
  if (trimmed.startsWith('sk-or-')) return 'openrouter';
  if (trimmed.startsWith('gsk_')) return 'groq';
  if (trimmed.startsWith('AIza')) return 'gemini';
  if (trimmed.startsWith('sk-') && trimmed.includes('deepseek')) return 'deepseek';
  if (trimmed.startsWith('sk-proj-') || trimmed.startsWith('sk-')) return 'openai';
  return 'gemini';
}

const LOCAL_STORAGE_PROVIDERS_KEY = 'scriptorium_providers_v2';

export function loadProviders(): ProviderTier[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_PROVIDERS.map(sanitizeProviderTier);
    }

    const raw = window.localStorage.getItem(LOCAL_STORAGE_PROVIDERS_KEY);
    if (!raw) {
      const initial = DEFAULT_PROVIDERS.map(sanitizeProviderTier);
      saveProviders(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const sanitized = parsed.map(sanitizeProviderTier);
      sanitized.sort((a, b) => (b.apiKey ? 1 : 0) - (a.apiKey ? 1 : 0));
      return sanitized;
    }
  } catch (e) {
    console.error('Failed to load providers from localStorage:', e);
  }
  const fallback = DEFAULT_PROVIDERS.map(sanitizeProviderTier);
  saveProviders(fallback);
  return fallback;
}

export function saveProviders(providers: ProviderTier[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_PROVIDERS_KEY, JSON.stringify(providers));
    }
  } catch (e) {
    console.warn('Could not persist providers to localStorage:', e);
  }
}

export function normalizeBaseUrl(url: string): string {
  return (url || '').trim().replace(/\/+$/, '');
}

export function getCompletionsEndpoint(baseUrl: string): string {
  const norm = normalizeBaseUrl(baseUrl);
  if (!norm) return '';
  if (norm.endsWith('/chat/completions')) return norm;
  return `${norm}/chat/completions`;
}

export function getModelsEndpoint(baseUrl: string): string {
  const norm = normalizeBaseUrl(baseUrl);
  if (!norm) return '';
  if (norm.endsWith('/chat/completions')) {
    return norm.replace(/\/chat\/completions$/, '/models');
  }
  return `${norm}/models`;
}

export async function fetchLiveModels(provider: ProviderTier): Promise<DiscoveredModel[]> {
  const modelsUrl = getModelsEndpoint(provider.baseUrl);
  if (!modelsUrl || !provider.apiKey) {
    throw new Error('Base URL and API key are required to query models.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawList: any[] = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

    const discovered: DiscoveredModel[] = rawList.map((item) => {
      const id = item.id || item.name || '';
      const isFree =
        id.includes(':free') ||
        id === 'openrouter/free' ||
        item.pricing?.prompt === 0 ||
        item.pricing?.prompt === '0' ||
        item.pricing?.completion === 0 ||
        item.pricing?.completion === '0';

      return {
        id,
        name: item.name || id,
        isFree,
        contextLength: item.context_length || item.max_tokens,
        pricing: item.pricing,
      };
    });

    return discovered;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function scoreModelForWriting(modelId: string): number {
  const id = modelId.toLowerCase().trim();

  if (isDeprecatedModel(id)) {
    return -1000;
  }

  if (
    id.includes('embed') ||
    id.includes('whisper') ||
    id.includes('dall-e') ||
    id.includes('tts') ||
    id.includes('moderation') ||
    id.includes('audio') ||
    id.includes('realtime')
  ) {
    return -1000;
  }

  let score = 50;

  if (id === 'openrouter/free') score += 100;
  else if (id.includes('gemini-3.8-flash')) score += 60;
  else if (id.includes('gemini-3.6-flash')) score += 58;
  else if (id.includes('gemini-flash-latest')) score += 56;
  else if (id.includes('gemini-3.1-flash-lite')) score += 52;
  else if (id.includes('claude-3-7') || id.includes('claude-3.7')) score += 55;
  else if (id.includes('claude-3-5-sonnet') || id.includes('claude-3.5-sonnet')) score += 50;
  else if (id.includes('llama-3.3-70b')) score += 48;
  else if (id.includes('llama-3.1-70b')) score += 46;
  else if (id.includes('deepseek-chat') || id.includes('deepseek-v3')) score += 47;
  else if (id.includes('deepseek-r1') || id.includes('r1')) score += 45;
  else if (id.includes('gpt-4o') && !id.includes('mini')) score += 44;
  else if (id.includes('gpt-4o-mini')) score += 40;
  else if (id.includes('qwen-2.5-72b') || id.includes('qwen2.5-72b')) score += 43;
  else if (id.includes('mistral-large')) score += 40;

  if (id.includes(':free')) score += 10;

  return score;
}

export function pickBestAvailableModel(provider: ProviderTier, discovered?: DiscoveredModel[]): string {
  if (provider.vendorType === 'openrouter') {
    return 'openrouter/free';
  }

  const preset = VENDOR_PRESETS[provider.vendorType];

  const list = discovered || provider.cachedModels;
  if (list && list.length > 0) {
    const valid = list.filter((m) => {
      const id = m.id.toLowerCase();
      return !isDeprecatedModel(id) && !id.includes('embed') && !id.includes('whisper') && !id.includes('dall-e') && !id.includes('audio');
    });

    if (valid.length > 0) {
      valid.sort((a, b) => scoreModelForWriting(b.id) - scoreModelForWriting(a.id));
      return valid[0].id;
    }
  }

  if (provider.preferredModel?.trim() && !isDeprecatedModel(provider.preferredModel)) {
    return provider.preferredModel.trim();
  }

  return preset?.defaultModel || 'gpt-4o-mini';
}

export function getAvailableFreeModels(provider: ProviderTier, discovered?: DiscoveredModel[]): string[] {
  if (provider.vendorType === 'openrouter') {
    return ['openrouter/free'];
  }

  const models = new Set<string>();

  const list = discovered || provider.cachedModels;
  if (list && list.length > 0) {
    list
      .filter((m) => (m.isFree || m.id.includes(':free')) && !isDeprecatedModel(m.id))
      .forEach((m) => models.add(m.id));
  }

  if (provider.fallbackModels) {
    provider.fallbackModels
      .split(',')
      .map((s) => s.trim())
      .filter((m) => m && !isDeprecatedModel(m))
      .forEach((m) => models.add(m));
  }

  const preset = VENDOR_PRESETS[provider.vendorType];
  if (preset?.knownFreeModels) {
    preset.knownFreeModels
      .filter((m) => !isDeprecatedModel(m))
      .forEach((m) => models.add(m));
  }

  const sorted = Array.from(models);
  sorted.sort((a, b) => scoreModelForWriting(b) - scoreModelForWriting(a));
  return sorted;
}

async function executeGeminiDirect(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = 90000
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const cleanModel = model.replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
        },
      }),
    });

    const raw = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errMsg = data?.error?.message || data?.error || raw || `HTTP ${response.status}`;
      throw new Error(`[Gemini Native - ${cleanModel}] HTTP ${response.status}: ${errMsg}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error(`[Gemini Native - ${cleanModel}] Received empty content in response.`);
    }

    return text;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`[Gemini Native - ${model}] Request timed out after ${timeoutMs / 1000}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function executeChatCompletion(
  provider: ProviderTier,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = 90000
): Promise<string> {
  const isGemini =
    provider.vendorType === 'gemini' ||
    provider.baseUrl.includes('generativelanguage.googleapis.com');

  const endpoint = getCompletionsEndpoint(provider.baseUrl);
  if (!endpoint) throw new Error(`Missing Base URL for provider "${provider.name}".`);
  if (!provider.apiKey && provider.vendorType !== 'ollama') {
    throw new Error(`Missing API Key for provider "${provider.name}".`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey || 'ollama'}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://ai.studio',
      'X-Title': 'Scriptorium AI Studio',
    };

    if (isGemini && provider.apiKey) {
      headers['x-goog-api-key'] = provider.apiKey;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    const raw = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errMsg =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        raw ||
        `HTTP Error ${response.status}`;

      if (isGemini && provider.apiKey) {
        console.warn(`[Gemini OpenAI endpoint failed: ${errMsg}] — attempting native generateContent fallback...`);
        return await executeGeminiDirect(provider.apiKey, model, systemPrompt, userPrompt, timeoutMs);
      }

      throw new Error(`[${provider.name} - ${model}] HTTP ${response.status}: ${errMsg}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      if (isGemini && provider.apiKey) {
        return await executeGeminiDirect(provider.apiKey, model, systemPrompt, userPrompt, timeoutMs);
      }
      throw new Error(`[${provider.name} - ${model}] Received empty response choices.`);
    }

    return content;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`[${provider.name} - ${model}] Request timed out after ${timeoutMs / 1000}s.`);
    }
    if (isGemini && provider.apiKey && !err.message.includes('Gemini Native')) {
      try {
        return await executeGeminiDirect(provider.apiKey, model, systemPrompt, userPrompt, timeoutMs);
      } catch (directErr: any) {
        throw new Error(directErr.message || err.message);
      }
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function testProviderConnection(
  rawProvider: ProviderTier
): Promise<{ success: boolean; workingModel: string; message: string }> {
  const provider = sanitizeProviderTier(rawProvider);
  const preset = VENDOR_PRESETS[provider.vendorType];
  const effectiveBaseUrl = preset?.baseUrl || provider.baseUrl;

  let discoveredModels: DiscoveredModel[] = [];
  if (provider.vendorType !== 'openrouter') {
    try {
      discoveredModels = await fetchLiveModels({ ...provider, baseUrl: effectiveBaseUrl });
      provider.cachedModels = discoveredModels;
    } catch (e) {
      console.warn(`Live model fetch skipped or failed for ${provider.name}:`, e);
    }
  }

  const candidateModels: string[] = [];

  const bestDynamic = pickBestAvailableModel(provider, discoveredModels);
  if (bestDynamic && !isDeprecatedModel(bestDynamic)) {
    candidateModels.push(bestDynamic);
  }

  if (
    provider.preferredModel?.trim() &&
    !candidateModels.includes(provider.preferredModel.trim()) &&
    !isDeprecatedModel(provider.preferredModel)
  ) {
    candidateModels.push(provider.preferredModel.trim());
  }

  const dynamicFrees = getAvailableFreeModels(provider, discoveredModels);
  dynamicFrees.forEach((m) => {
    if (!candidateModels.includes(m)) candidateModels.push(m);
  });

  if (candidateModels.length === 0) {
    candidateModels.push(preset?.defaultModel || 'gemini-3.8-flash');
  }

  let lastError = '';

  for (const modelToTest of candidateModels) {
    try {
      const testTier: ProviderTier = {
        ...provider,
        baseUrl: effectiveBaseUrl,
        preferredModel: modelToTest,
      };

      await executeChatCompletion(
        testTier,
        modelToTest,
        'Respond with: READY',
        'Ping',
        14000
      );

      return {
        success: true,
        workingModel: modelToTest,
        message: `Connected & verified with ${modelToTest}!`,
      };
    } catch (err: any) {
      lastError = err.message || 'Connection failed';
      console.warn(`Test model [${modelToTest}] failed for ${provider.name}:`, lastError);

      if (lastError.includes('401') || lastError.toLowerCase().includes('invalid api key')) {
        return {
          success: false,
          workingModel: modelToTest,
          message: 'Invalid API Key. Please verify that your key is typed correctly.',
        };
      }
    }
  }

  return {
    success: false,
    workingModel: candidateModels[0],
    message: lastError || 'Unable to connect to any available models for this provider.',
  };
}

export async function executeMultiVendorAi(
  providers: ProviderTier[],
  systemPrompt: string,
  userPrompt: string,
  onProgress?: (progress: AiGenerationProgress) => void
): Promise<{ text: string; tierName: string; modelName: string }> {
  const enabledProviders = providers.filter(
    (p) => p.enabled && p.baseUrl.trim() && (p.vendorType === 'ollama' || (p.apiKey && p.apiKey.trim().length > 0))
  );

  if (enabledProviders.length === 0) {
    throw new Error(
      'No active AI provider with an API key was found. Please open Settings and enter your API key (e.g. for Google Gemini or OpenRouter).'
    );
  }

  const attemptLog: string[] = [];

  const updateProgress = (
    status: 'generating' | 'success' | 'error',
    message: string,
    tier?: string,
    model?: string
  ) => {
    attemptLog.push(message);
    onProgress?.({
      status,
      message,
      activeTier: tier,
      activeModel: model,
      attemptLog,
    });
  };

  for (let tierIdx = 0; tierIdx < enabledProviders.length; tierIdx++) {
    const rawProvider = enabledProviders[tierIdx];
    const provider = sanitizeProviderTier(rawProvider);
    const tierLabel = `Tier ${tierIdx + 1} (${provider.name})`;

    let liveModels: DiscoveredModel[] = provider.cachedModels || [];
    if (provider.vendorType !== 'openrouter' && liveModels.length === 0 && provider.apiKey) {
      try {
        liveModels = await fetchLiveModels(provider);
        provider.cachedModels = liveModels;
      } catch (e) {
        console.warn(`Dynamic model query failed on ${provider.name}, using built-in fallbacks.`);
      }
    }

    const primaryModel = pickBestAvailableModel(provider, liveModels);

    updateProgress(
      'generating',
      `Attempting ${tierLabel} with primary model [${primaryModel}]...`,
      provider.name,
      primaryModel
    );

    try {
      const result = await executeChatCompletion(provider, primaryModel, systemPrompt, userPrompt);
      updateProgress(
        'success',
        `Successfully generated output via ${tierLabel} [${primaryModel}].`,
        provider.name,
        primaryModel
      );
      return { text: result, tierName: provider.name, modelName: primaryModel };
    } catch (primaryErr: any) {
      console.warn(`Primary model error on ${tierLabel}:`, primaryErr.message);
      updateProgress(
        'generating',
        `${tierLabel} [${primaryModel}] failed: ${primaryErr.message}`,
        provider.name,
        primaryModel
      );

      if (provider.cycleFreeModelsOnError) {
        const freeModels = getAvailableFreeModels(provider, liveModels).filter((m) => m !== primaryModel);

        if (freeModels.length > 0) {
          updateProgress(
            'generating',
            `Cycling through ${freeModels.length} free available models on ${tierLabel}...`,
            provider.name
          );

          for (const freeModel of freeModels) {
            updateProgress(
              'generating',
              `${tierLabel} cycling free model [${freeModel}]...`,
              provider.name,
              freeModel
            );

            try {
              const freeResult = await executeChatCompletion(
                provider,
                freeModel,
                systemPrompt,
                userPrompt,
                60000
              );
              updateProgress(
                'success',
                `Successfully generated output via ${tierLabel} free model [${freeModel}].`,
                provider.name,
                freeModel
              );
              return { text: freeResult, tierName: provider.name, modelName: freeModel };
            } catch (freeErr: any) {
              console.warn(`Free model [${freeModel}] failed on ${tierLabel}:`, freeErr.message);
              updateProgress(
                'generating',
                `${tierLabel} free model [${freeModel}] failed: ${freeErr.message}`,
                provider.name,
                freeModel
              );
            }
          }
        }
      }

      if (tierIdx < enabledProviders.length - 1) {
        const nextProvider = enabledProviders[tierIdx + 1];
        updateProgress(
          'generating',
          `All models exhausted on ${tierLabel}. Falling back to Tier ${tierIdx + 2} (${nextProvider.name})...`
        );
      }
    }
  }

  const aggregatedError = attemptLog.slice(-3).join('\n• ');
  updateProgress('error', 'All configured AI providers and fallback models failed.');
  throw new Error(`Generation failed across configured providers:\n• ${aggregatedError}`);
}

export function buildProjectBible(
  config: ProjectConfig,
  bookName?: string,
  seriesName?: string
): string {
  const sections: string[] = [];

  const characters = ((config.characters && config.characters.length > 0)
    ? config.characters
    : config.entities?.filter((e) => e.type === 'character') || []) as ConfigEntity<'character'>[];
  if (characters.length > 0) {
    const list = characters
      .map((c) => {
        const f = c.fields;
        return `• ${f.name || 'Unnamed'}${f.roleArchetype ? ` (${f.roleArchetype})` : ''}:
  Tone/Personality: ${f.personalityTone || 'N/A'}
  Description: ${f.description || 'N/A'}`;
      })
      .join('\n');
    sections.push(`CHARACTERS:\n${list}`);
  }

  const environments = ((config.environments && config.environments.length > 0)
    ? config.environments
    : config.entities?.filter((e) => e.type === 'environment') || []) as ConfigEntity<'environment'>[];
  if (environments.length > 0) {
    const list = environments
      .map((e) => {
        const f = e.fields;
        return `• ${f.settingName || 'Unnamed Setting'}:
  Atmosphere/Mood: ${f.atmosphereMood || 'N/A'}
  Physical Attributes: ${f.physicalAttributes || 'N/A'}
  Notable Locations: ${f.notableLocations || 'N/A'}`;
      })
      .join('\n');
    sections.push(`ENVIRONMENTS / SETTINGS:\n${list}`);
  }

  const plots = ((config.plots && config.plots.length > 0)
    ? config.plots
    : config.entities?.filter((e) => e.type === 'plot') || []) as ConfigEntity<'plot'>[];
  if (plots.length > 0) {
    const list = plots
      .map((p) => {
        const f = p.fields;
        return `• Arc: ${f.arcName || 'Unnamed Arc'} [Status: ${f.resolutionStatus || 'Active'}]
  Key Conflict: ${f.keyConflict || 'N/A'}
  Narrative Goal: ${f.narrativeGoal || 'N/A'}`;
      })
      .join('\n');
    sections.push(`PLOT ARCS & CONFLICTS:\n${list}`);
  }

  const items = ((config.items && config.items.length > 0)
    ? config.items
    : config.entities?.filter((e) => e.type === 'item') || []) as ConfigEntity<'item'>[];
  if (items.length > 0) {
    const list = items
      .map((i) => {
        const f = i.fields;
        return `• Item: ${f.itemName || 'Unnamed Item'}:
  Significance/Powers: ${f.significancePowers || 'N/A'}
  Current Holder: ${f.currentHolder || 'N/A'}
  Appearance: ${f.physicalAppearance || 'N/A'}`;
      })
      .join('\n');
    sections.push(`KEY ITEMS & ARTIFACTS:\n${list}`);
  }

  const events = ((config.events && config.events.length > 0)
    ? config.events
    : config.entities?.filter((e) => e.type === 'event') || []) as ConfigEntity<'event'>[];
  if (events.length > 0) {
    const list = events
      .map((ev) => {
        const f = ev.fields;
        return `• Event: ${f.eventName || 'Unnamed Event'} (${f.historicalEraTimeline || 'Timeline unspecified'}):
  Participants: ${f.keyParticipants || 'N/A'}
  Impact/Consequences: ${f.impactConsequences || 'N/A'}`;
      })
      .join('\n');
    sections.push(`HISTORICAL EVENTS & TIMELINE:\n${list}`);
  }

  const systems = ((config.magicTechSystems && config.magicTechSystems.length > 0)
    ? config.magicTechSystems
    : config.entities?.filter((e) => e.type === 'magic_tech') || []) as ConfigEntity<'magic_tech'>[];
  if (systems.length > 0) {
    const list = systems
      .map((s) => {
        const f = s.fields;
        return `• System: ${f.systemName || 'Unnamed System'}:
  Core Rules & Limits: ${f.coreRulesLimits || 'N/A'}
  Energy Source: ${f.energySource || 'N/A'}
  Primary Users: ${f.primaryUsers || 'N/A'}`;
      })
      .join('\n');
    sections.push(`MAGIC & TECH SYSTEMS:\n${list}`);
  }

  const factions = ((config.factions && config.factions.length > 0)
    ? config.factions
    : config.entities?.filter((e) => e.type === 'faction') || []) as ConfigEntity<'faction'>[];
  if (factions.length > 0) {
    const list = factions
      .map((fa) => {
        const f = fa.fields;
        return `• Faction: ${f.factionName || 'Unnamed Faction'}:
  Ideology & Goals: ${f.ideologyGoals || 'N/A'}
  Key Figures: ${f.keyFigures || 'N/A'}
  Base of Operations: ${f.baseOfOperations || 'N/A'}`;
      })
      .join('\n');
    sections.push(`FACTIONS & GROUPS:\n${list}`);
  }

  const themes = ((config.themes && config.themes.length > 0)
    ? config.themes
    : config.entities?.filter((e) => e.type === 'theme') || []) as ConfigEntity<'theme'>[];
  if (themes.length > 0) {
    const list = themes
      .map((th) => {
        const f = th.fields;
        return `• Theme: ${f.themeName || 'Unnamed Theme'}:
  Central Message: ${f.centralMessage || 'N/A'}
  Symbols: ${f.associatedSymbols || 'N/A'}
  Narrative Focus: ${f.narrativeFocus || 'N/A'}`;
      })
      .join('\n');
    sections.push(`THEMES & MOTIFS:\n${list}`);
  }

  if (config.tone?.trim()) {
    sections.push(`PROSE & TONE GUIDELINES:\n${config.tone.trim()}`);
  }

  if (config.generalNotes?.trim()) {
    sections.push(`ADDITIONAL NOTES:\n${config.generalNotes.trim()}`);
  }

  const bibleContent =
    sections.length > 0 ? sections.join('\n\n') : '(No structured entity bible has been defined yet.)';

  return `You are Scripty, the expert AI co-author and creative writing partner inside Scriptorium.
You must strictly adhere to the established project bible below. Maintain absolute continuity regarding character personalities, physical appearances, setting details, historical events, magic/tech limits, factions, and prose guidelines.

REWRITING & ADAPTATION RULES:
• When instructed to rewrite, adapt, convert perspective (e.g. third person, first person), adopt an aesthetic or dialect (e.g. Old English, Victorian, gothic fantasy, hardboiled), or adjust pacing/length (shorten, expand, heighten imagery), take the provided source manuscript draft or target passage and rewrite it accordingly.
• Seamlessly infuse all character voices, lore, items, and worldbuilding constraints from the Project Bible into the rewritten prose.
• Preserve core narrative actions, relationships, and events unless explicitly told to alter them.
• Write rich, atmospheric, sensory-detailed prose with natural dialogue and organic rhythm.
• Output ONLY publication-ready prose ready to be inserted directly into the novel. Do NOT include greetings, preamble (e.g., "Here is the rewritten text:"), conversational chatter, or meta-explanations.

============================================================
PROJECT BIBLE
ACTIVE BOOK: ${bookName || 'Untitled Book'}
${seriesName ? `SERIES: ${seriesName}` : ''}
============================================================

${bibleContent}`;
}