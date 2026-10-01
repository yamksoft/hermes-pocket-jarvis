'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'local' | 'cloud'>('local');
  const [loading, setLoading] = useState(false);

  // Local config state
  const [localConfig, setLocalConfig] = useState({
    backendLivekitUrl: 'ws://localhost:7880',
    livekitApiKey: 'devkey',
    livekitApiSecret: 'secret',
    googleApiKey: 'your_gemini_api_key',
    frontendServerUrl: 'http://localhost:7880',
    frontendClientUrl: 'ws://localhost:7880',
    agentName: 'my-agent',
  });

  // Cloud config state
  const [cloudConfig, setCloudConfig] = useState({
    backendLivekitUrl: 'wss://your-project.livekit.cloud',
    livekitApiKey: 'your_livekit_api_key',
    livekitApiSecret: 'your_livekit_api_secret',
    googleApiKey: 'your_gemini_api_key',
    frontendServerUrl: 'https://your-project.livekit.cloud',
    frontendClientUrl: 'wss://your-project.livekit.cloud',
    agentName: 'my-agent',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, local: localConfig, cloud: cloudConfig }),
      });

      if (!res.ok) {
        throw new Error('Failed to save configuration');
      }

      alert('Configuration saved successfully. The backend is restarting...');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error(error);
      alert('Error saving configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Connection Setup</h1>
        <p className="mb-8 text-gray-500 dark:text-gray-400">
          Choose your operating mode and provide the required environment variables.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-4">
            <label
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              style={{
                borderColor: mode === 'local' ? '#3b82f6' : 'transparent',
                backgroundColor: mode === 'local' ? 'rgba(59, 130, 246, 0.05)' : '',
              }}
            >
              <input
                type="radio"
                name="mode"
                value="local"
                checked={mode === 'local'}
                onChange={() => setMode('local')}
                className="hidden"
              />
              <div className="text-lg font-semibold">Local Offline Mode</div>
            </label>
            <label
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              style={{
                borderColor: mode === 'cloud' ? '#3b82f6' : 'transparent',
                backgroundColor: mode === 'cloud' ? 'rgba(59, 130, 246, 0.05)' : '',
              }}
            >
              <input
                type="radio"
                name="mode"
                value="cloud"
                checked={mode === 'cloud'}
                onChange={() => setMode('cloud')}
                className="hidden"
              />
              <div className="text-lg font-semibold">Cloud Online Mode</div>
            </label>
          </div>

          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-gray-900/50">
            {mode === 'local' ? (
              <>
                <h2 className="mb-4 text-xl font-semibold">Local Configuration</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="LiveKit API Key"
                    value={localConfig.livekitApiKey}
                    onChange={(v) => setLocalConfig({ ...localConfig, livekitApiKey: v })}
                  />
                  <Input
                    label="LiveKit API Secret"
                    value={localConfig.livekitApiSecret}
                    type="password"
                    onChange={(v) => setLocalConfig({ ...localConfig, livekitApiSecret: v })}
                  />
                  <Input
                    label="Backend LiveKit URL"
                    value={localConfig.backendLivekitUrl}
                    onChange={(v) => setLocalConfig({ ...localConfig, backendLivekitUrl: v })}
                  />
                  <Input
                    label="Frontend Server URL"
                    value={localConfig.frontendServerUrl}
                    onChange={(v) => setLocalConfig({ ...localConfig, frontendServerUrl: v })}
                  />
                  <Input
                    label="Frontend Client URL"
                    value={localConfig.frontendClientUrl}
                    onChange={(v) => setLocalConfig({ ...localConfig, frontendClientUrl: v })}
                  />
                  <Input
                    label="Google Gemini API Key"
                    value={localConfig.googleApiKey}
                    type="password"
                    onChange={(v) => setLocalConfig({ ...localConfig, googleApiKey: v })}
                  />
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-4 text-xl font-semibold">Cloud Configuration</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="LiveKit API Key"
                    value={cloudConfig.livekitApiKey}
                    onChange={(v) => setCloudConfig({ ...cloudConfig, livekitApiKey: v })}
                  />
                  <Input
                    label="LiveKit API Secret"
                    value={cloudConfig.livekitApiSecret}
                    type="password"
                    onChange={(v) => setCloudConfig({ ...cloudConfig, livekitApiSecret: v })}
                  />
                  <Input
                    label="Backend LiveKit URL (WSS)"
                    value={cloudConfig.backendLivekitUrl}
                    onChange={(v) => setCloudConfig({ ...cloudConfig, backendLivekitUrl: v })}
                  />
                  <Input
                    label="Frontend Server URL (HTTPS)"
                    value={cloudConfig.frontendServerUrl}
                    onChange={(v) => setCloudConfig({ ...cloudConfig, frontendServerUrl: v })}
                  />
                  <Input
                    label="Frontend Client URL (WSS)"
                    value={cloudConfig.frontendClientUrl}
                    onChange={(v) => setCloudConfig({ ...cloudConfig, frontendClientUrl: v })}
                  />
                  <Input
                    label="Google Gemini API Key"
                    value={cloudConfig.googleApiKey}
                    type="password"
                    onChange={(v) => setCloudConfig({ ...cloudConfig, googleApiKey: v })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading} className="w-full px-8 py-6 text-lg">
              {loading ? 'Saving...' : 'Save & Apply Configuration'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        required
      />
    </div>
  );
}
