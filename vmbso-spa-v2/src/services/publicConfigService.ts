import { config } from '../config/powerPages.config';
import { dataverseService } from './dataverseService';

/**
 * Loads non-secret, per-environment runtime config (Entra provider identifier,
 * GA measurement ID, ...) from the actum_publicconfig table and mutates the
 * shared `config` object in place. Must be awaited before anything that reads
 * config.auth.providerScheme or config.analytics.googleAnalyticsId — main.tsx
 * awaits this before initializing GA and rendering the app.
 *
 * No-ops in dev mode: there's no Dataverse session on localhost, and dev mode
 * mocks auth/analytics entirely.
 */
export async function loadPublicConfig(): Promise<void> {
  if (config.devMode) {
    return;
  }

  const rows = await dataverseService.publicConfig.getAll();
  const byName = new Map(rows.map(row => [row.actum_name, row.actum_value ?? '']));

  config.auth.providerScheme = byName.get('EntraProviderIdentifier') ?? '';
  config.analytics.googleAnalyticsId = byName.get('GoogleAnalyticsId') || undefined;

  if (!config.auth.providerScheme) {
    console.warn('[CONFIG] EntraProviderIdentifier not found in actum_publicconfig — external login will fail.');
  }
}
