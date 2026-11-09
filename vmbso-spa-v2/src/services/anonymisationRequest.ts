import { config } from '../config/powerPages.config';
import { getCsrfToken } from './apiClient';

/** `actum_requeststatus` value "Submitted" (VMPP-395). */
export const ANONYMISATION_STATUS_SUBMITTED = 182980000;

/**
 * Body for a new `actum_anonymisationrequest`. The name holds only a UTC timestamp, never
 * personal data. The Account lookup is left empty on purpose: the VMPP-394 flow fills it.
 */
export const buildAnonymisationRequestBody = (contactId: string, now: Date): Record<string, unknown> => {
  const iso = now.toISOString();
  return {
    actum_name: `Anonymisation request - ${iso.slice(0, 10)} ${iso.slice(11, 16)}`,
    actum_requeststatus: ANONYMISATION_STATUS_SUBMITTED,
    actum_requestedon: iso,
    'actum_Contact@odata.bind': `/contacts(${contactId})`,
  };
};

/**
 * Creates the anonymisation request for the signed-in user's contact. The portal role has
 * Create but no Read on the table, so no `Prefer: return=representation`.
 */
export const submitAnonymisationRequest = async (contactId: string): Promise<void> => {
  if (config.devMode) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return;
  }
  const token = await getCsrfToken();
  const response = await fetch(config.api.anonymisationRequests, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      __RequestVerificationToken: token,
      'x-requested-with': 'XMLHttpRequest',
    },
    body: JSON.stringify(buildAnonymisationRequestBody(contactId, new Date())),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Failed to submit anonymisation request: ${response.status}${details ? ` - ${details}` : ''}`);
  }
};
