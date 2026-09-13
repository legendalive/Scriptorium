import React, { useState } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  Sliders,
  Check,
} from 'lucide-react';
import { ProviderTier } from '../types';
import {
  VENDOR_PRESETS,
  saveProviders,
  autoDetectVendorFromKey,
  sanitizeProviderTier,
  testProviderConnection,
} from '../services/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ProviderTier[];
  onProvidersUpdated: (providers: ProviderTier[]) => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

interface ProviderMeta {
  key: string;
  name: string;
  badge: string;
  recommendation?: string;
  placeholder: string;
  helpLink?: string;
}

const SUPPORTED_PROVIDERS: ProviderMeta[] = [
  {
    key: 'gemini',
    name: 'Google Gemini',
    badge: 'Google AI Studio',
    recommendation: 'Defaults to Gemini 3.8/3.6 Flash with high-performance free quotas and expansive context windows.',
    placeholder: 'AIzaSy...',
  },
  {
    key: 'openrouter',
    name: 'OpenRouter',
    badge: 'Recommended',
    recommendation: 'Defaults to top free models (Llama 3.3 70B Free, Qwen 2.5 72B Free, DeepSeek R1 Free).',
    placeholder: 'sk-or-v1-...',
  },
  {
    key: 'groq',
    name: 'Groq Cloud',
    badge: 'Ultra Fast',
    recommendation: 'Defaults to Llama 3.3 70B Versatile with Groq’s fast free daily quota.',
    placeholder: 'gsk_...',
  },
  {
    key: 'openai',
    name: 'OpenAI',
    badge: 'Official',
    recommendation: 'Defaults to fast, lightweight GPT-4o-mini with fallback to GPT-4o.',
    placeholder: 'sk-proj-... or sk-...',
  },
  {
    key: 'deepseek',
    name: 'DeepSeek',
    badge: 'Low Cost',
    recommendation: 'Defaults to DeepSeek-Chat (V3) and DeepSeek-Reasoner (R1).',
    placeholder: 'sk-...',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  providers,
  onProvidersUpdated,
  onToast,
}) => {
  // Ensure all supported providers exist in state and are sanitized with modern free models
  const [tiers, setTiers] = useState<ProviderTier[]>(() => {
    const list = [...providers].map(sanitizeProviderTier);
    SUPPORTED_PROVIDERS.forEach((sp, idx) => {
      const existingIdx = list.findIndex((t) => t.vendorType === sp.key);
      const preset = VENDOR_PRESETS[sp.key];
      if (existingIdx === -1 && preset) {
        list.push(
          sanitizeProviderTier({
            id: `tier-${idx + 1}-${sp.key}`,
            name: sp.name,
            vendorType: sp.key as any,
            baseUrl: preset.baseUrl,
            apiKey: '',
            autoPickBestModel: true,
            preferredModel: preset.defaultModel,
            cycleFreeModelsOnError: true,
            fallbackModels: preset.knownFreeModels.join(', '),
            enabled: false,
          })
        );
      } else if (existingIdx >= 0 && preset) {
        list[existingIdx] = sanitizeProviderTier({
          ...list[existingIdx],
          baseUrl: preset.baseUrl,
        });
      }
    });
    return list;
  });

  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [testingVendor, setTestingVendor] = useState<string | null>(null);
  const [quickKeyInput, setQuickKeyInput] = useState('');
  const [detectedVendor, setDetectedVendor] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleKeyVisibility = (key: string) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateApiKey = (vendorKey: string, newApiKey: string) => {
    setTiers((prev) => {
      const updated = prev.map((t) => {
        if (t.vendorType === vendorKey) {
          return sanitizeProviderTier({
            ...t,
            apiKey: newApiKey.trim(),
            enabled: !!newApiKey.trim(),
            testStatus: undefined,
            testMessage: undefined,
          });
        }
        return t;
      });
      // Sort with configured keys first
      const sorted = [...updated].sort((a, b) => (b.apiKey ? 1 : 0) - (a.apiKey ? 1 : 0));
      saveProviders(sorted);
      onProvidersUpdated(sorted);
      return updated;
    });
  };

  // Quick Key Paste Handler
  const handleQuickKeyChange = (val: string) => {
    setQuickKeyInput(val);
    const trimmed = val.trim();
    if (trimmed.length > 5) {
      const detected = autoDetectVendorFromKey(trimmed);
      setDetectedVendor(detected);
    } else {
      setDetectedVendor(null);
    }
  };

  const applyQuickKey = () => {
    if (!quickKeyInput.trim()) return;
    const vendor = (detectedVendor || autoDetectVendorFromKey(quickKeyInput.trim())) as string;
    updateApiKey(vendor, quickKeyInput.trim());
    onToast(`Applied API key to ${VENDOR_PRESETS[vendor]?.name || vendor}!`, 'info');
    setQuickKeyInput('');
    setDetectedVendor(null);
  };

  // Test single vendor connection with automatic cycling through free models
  const handleTestVendor = async (vendorKey: string) => {
    const rawTier = tiers.find((t) => t.vendorType === vendorKey);
    const preset = VENDOR_PRESETS[vendorKey];
    if (!rawTier || !rawTier.apiKey.trim()) {
      onToast(`Please enter your ${preset?.name || vendorKey} API key first.`, 'error');
      return;
    }

    setTestingVendor(vendorKey);

    // Update status to testing
    setTiers((prev) =>
      prev.map((t) =>
        t.vendorType === vendorKey
          ? { ...t, testStatus: 'testing', testMessage: 'Testing connection & selecting free model...' }
          : t
      )
    );

    try {
      const result = await testProviderConnection(rawTier);

      if (result.success) {
        const updated = tiers.map((t) =>
          t.vendorType === vendorKey
            ? {
                ...t,
                preferredModel: result.workingModel,
                testStatus: 'success' as const,
                testMessage: result.message,
                enabled: true,
              }
            : t
        );
        const sorted = [...updated].sort((a, b) => (b.apiKey ? 1 : 0) - (a.apiKey ? 1 : 0));
        setTiers(updated);
        saveProviders(sorted);
        onProvidersUpdated(sorted);
        onToast(`Connected to ${preset?.name || vendorKey}! Using free model: ${result.workingModel}`, 'success');
      } else {
        setTiers((prev) =>
          prev.map((t) =>
            t.vendorType === vendorKey
              ? {
                  ...t,
                  testStatus: 'error',
                  testMessage: result.message,
                }
              : t
          )
        );
        onToast(`Connection failed: ${result.message}`, 'error');
      }
    } catch (e: any) {
      const friendlyError = e.message || 'Connection failed.';
      setTiers((prev) =>
        prev.map((t) =>
          t.vendorType === vendorKey
            ? {
                ...t,
                testStatus: 'error',
                testMessage: friendlyError,
              }
            : t
        )
      );
      onToast(`Connection failed: ${friendlyError}`, 'error');
    } finally {
      setTestingVendor(null);
    }
  };

  const handleSave = () => {
    // Automatically sanitize all tiers and order configured providers first
    const updatedTiers = tiers
      .map(sanitizeProviderTier)
      .map((t) => ({
        ...t,
        enabled: !!t.apiKey.trim(),
      }));

    // Sort: tiers with API keys first
    updatedTiers.sort((a, b) => {
      if (a.apiKey && !b.apiKey) return -1;
      if (!a.apiKey && b.apiKey) return 1;
      return 0;
    });

    saveProviders(updatedTiers);
    onProvidersUpdated(updatedTiers);

    const configuredCount = updatedTiers.filter((t) => !!t.apiKey.trim()).length;
    if (configuredCount > 0) {
      onToast(`Saved! ${configuredCount} AI provider(s) active with free models verified.`, 'success');
    } else {
      onToast('Settings saved. Enter an API key whenever you are ready to write with AI.', 'info');
    }
    onClose();
  };

  return (
    <div
      id="settingsModalBackdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-300">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                <span>AI API Key Setup</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Zero Config
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Simply paste your API key, test connection, and save. All endpoints and models are handled automatically.
              </p>
            </div>
          </div>

          <button
            id="closeSettingsModalBtn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Quick Paste Assistant */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Quick Paste Any Key
              </span>
              {detectedVendor && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40">
                  Detected: {VENDOR_PRESETS[detectedVendor]?.name || detectedVendor}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickKeyInput}
                onChange={(e) => handleQuickKeyChange(e.target.value)}
                placeholder="Paste any API key here (e.g. OpenRouter, Groq, Gemini, OpenAI)..."
                className="flex-1 h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-400 font-mono"
              />
              <button
                type="button"
                onClick={applyQuickKey}
                disabled={!quickKeyInput.trim()}
                className="h-9 px-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-zinc-950 text-xs font-bold transition-colors shrink-0"
              >
                Apply Key
              </button>
            </div>
          </div>

          {/* Clean Providers List */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Select Your AI Provider
            </div>

            {SUPPORTED_PROVIDERS.map((provider) => {
              const tier = tiers.find((t) => t.vendorType === provider.key);
              const preset = VENDOR_PRESETS[provider.key];
              const apiKey = tier?.apiKey || '';
              const isVisible = visibleKeys[provider.key] || false;
              const isTesting = testingVendor === provider.key;
              const hasKey = apiKey.trim().length > 0;
              const isConnected = tier?.testStatus === 'success';
              const isError = tier?.testStatus === 'error';
              const activeFreeModel = tier?.preferredModel || preset?.defaultModel || '';

              return (
                <div
                  key={provider.key}
                  id={`providerCard_${provider.key}`}
                  className={`p-4 rounded-xl border transition-all ${
                    hasKey
                      ? 'border-zinc-700 bg-zinc-900/90 shadow-sm'
                      : 'border-zinc-800/80 bg-zinc-950/60'
                  }`}
                >
                  {/* Provider Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-100">{provider.name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                        {provider.badge}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-1.5 text-xs">
                      {isTesting ? (
                        <span className="text-amber-300 flex items-center gap-1 text-[11px]">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Testing...
                        </span>
                      ) : isConnected ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready
                        </span>
                      ) : isError ? (
                        <span className="text-red-400 flex items-center gap-1 text-[11px] font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          Error
                        </span>
                      ) : hasKey ? (
                        <span className="text-zinc-400 text-[11px]">Key entered</span>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">Not configured</span>
                      )}
                    </div>
                  </div>

                  {/* Active Free Model Pill & Description */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {provider.recommendation}
                    </p>
                    {activeFreeModel && (
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-amber-300/90 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0 self-start sm:self-auto">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Free Model: <strong className="text-amber-200">{activeFreeModel}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* ONLY THE API KEY FIELD */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => updateApiKey(provider.key, e.target.value)}
                        placeholder={provider.placeholder}
                        className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-950 pl-3 pr-9 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(provider.key)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        title={isVisible ? 'Hide key' : 'Show key'}
                      >
                        {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      id={`testBtn_${provider.key}`}
                      onClick={() => handleTestVendor(provider.key)}
                      disabled={!hasKey || isTesting}
                      className="h-9 px-3.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>Test</span>
                    </button>
                  </div>

                  {/* Detailed message if tested */}
                  {tier?.testMessage && (
                    <div
                      className={`mt-2 text-[11px] px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 ${
                        isConnected
                          ? 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300'
                          : 'border-red-900/60 bg-red-950/40 text-red-300'
                      }`}
                    >
                      {isConnected ? (
                        <Check className="w-3 h-3 shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 shrink-0" />
                      )}
                      <span>{tier.testMessage}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Server URLs & models are configured automatically.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="saveSettingsBtn"
              onClick={handleSave}
              className="h-9 px-5 rounded-lg bg-amber-400 text-zinc-950 hover:bg-amber-300 text-xs font-bold shadow-sm transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
