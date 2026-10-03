import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { App } from '@/components/app/app';
import { getAppConfig } from '@/lib/utils';

export default async function Page() {
  // Check if configuration exists
  const cwd = process.cwd();
  const activeModePath = path.join(cwd, '..', 'active_mode.txt');

  if (!fs.existsSync(activeModePath)) {
    redirect('/setup');
  }

  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);

  return <App appConfig={appConfig} />;
}
