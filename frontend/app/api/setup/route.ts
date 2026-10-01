import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { mode, local, cloud } = data;

    if (mode !== 'local' && mode !== 'cloud') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const cwd = process.cwd(); // This is the frontend directory
    const backendEnvLocalPath = path.join(cwd, '..', '.env.local');
    const backendEnvCloudPath = path.join(cwd, '..', '.env.cloud');
    const frontendEnvLocalPath = path.join(cwd, '.env.local');
    const frontendEnvCloudPath = path.join(cwd, '.env.cloud');
    const activeModePath = path.join(cwd, '..', 'active_mode.txt');

    // 1. Generate contents
    const backendLocalContent = `# 1. Local Offline Mode (.env.local)
# ------------------------------------------
JARVIS_MODE=local
LIVEKIT_URL=${local.backendLivekitUrl || 'ws://localhost:7880'}
LIVEKIT_API_KEY=${local.livekitApiKey || 'devkey'}
LIVEKIT_API_SECRET=${local.livekitApiSecret || 'secret'}
GOOGLE_API_KEY=${local.googleApiKey || 'your_gemini_api_key'}
`;

    const frontendLocalContent = `# 1. Local Offline Mode (.env.local)
# ------------------------------------------
LIVEKIT_API_KEY=${local.livekitApiKey || 'devkey'}
LIVEKIT_API_SECRET=${local.livekitApiSecret || 'secret'}
LIVEKIT_URL=${local.frontendServerUrl || 'http://localhost:7880'}
NEXT_PUBLIC_LIVEKIT_URL=${local.frontendClientUrl || 'ws://localhost:7880'}
AGENT_NAME=${local.agentName || 'my-agent'}
`;

    const backendCloudContent = `# 2. Cloud Online Mode (.env.cloud)
# ------------------------------------------
AGENT_NAME=${cloud.agentName || 'my-agent'}
LIVEKIT_URL=${cloud.backendLivekitUrl || 'wss://your-project.livekit.cloud'}
LIVEKIT_API_KEY=${cloud.livekitApiKey || 'your_livekit_api_key'}
LIVEKIT_API_SECRET=${cloud.livekitApiSecret || 'your_livekit_api_secret'}
GOOGLE_API_KEY=${cloud.googleApiKey || 'your_gemini_api_key'}
`;

    const frontendCloudContent = `# 2. Cloud Online Mode (.env.cloud)
# ------------------------------------------
LIVEKIT_API_KEY=${cloud.livekitApiKey || 'your_livekit_api_key'}
LIVEKIT_API_SECRET=${cloud.livekitApiSecret || 'your_livekit_api_secret'}
LIVEKIT_URL=${cloud.frontendServerUrl || 'https://your-project.livekit.cloud'}
NEXT_PUBLIC_LIVEKIT_URL=${cloud.frontendClientUrl || 'wss://your-project.livekit.cloud'}
AGENT_NAME=${cloud.agentName || 'my-agent'}
`;

    // 2. Write files
    await fs.writeFile(backendEnvLocalPath, backendLocalContent, 'utf-8');
    await fs.writeFile(frontendEnvLocalPath, frontendLocalContent, 'utf-8');

    await fs.writeFile(backendEnvCloudPath, backendCloudContent, 'utf-8');
    await fs.writeFile(frontendEnvCloudPath, frontendCloudContent, 'utf-8');

    // 3. Save Active Mode
    await fs.writeFile(activeModePath, mode, 'utf-8');

    // 4. Handle LiveKit Server & Backend Restart
    try {
      if (mode === 'cloud') {
        // Stop the local livekit server on Docker, Windows, and Linux
        await execPromise('docker stop livekit-jarvis-server-livekit-server-1 || true').catch(
          () => {}
        );
        await execPromise('taskkill /F /IM livekit-server.exe || true').catch(() => {});
        await execPromise('killall livekit-server || true').catch(() => {});
      } else {
        // Start the local livekit server on Docker
        await execPromise('docker start livekit-jarvis-server-livekit-server-1 || true').catch(
          () => {}
        );
      }
    } catch (error) {
      console.error('Error managing LiveKit server:', error);
    }

    // 5. Restart Backend Process (Python)
    try {
      // Docker/Linux Supervisor
      await execPromise('supervisorctl restart backend || true').catch(() => {});

      // If running locally in 'dev' mode, touching agent.py forces it to hot-reload
      const agentPyPath = path.join(cwd, '..', 'src', 'agent.py');
      const now = new Date();
      await fs.utimes(agentPyPath, now, now).catch(() => {});
    } catch (error) {
      console.error('Error restarting backend:', error);
    }

    return NextResponse.json({ success: true, message: `Configuration saved for ${mode} mode.` });
  } catch (error: unknown) {
    console.error('Setup API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
