/**
 * Shared HTTP client for all API requests
 * Provides timeout, retry, error handling, and OData support
 */

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchConfig extends RequestInit {
  timeout?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 1;

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle API errors with user-friendly messages
 */
async function handleApiError(response: Response): Promise<ApiError> {
  const status = response.status;
  let message = `API Error: ${status}`;
  let details: unknown;

  try {
    const data = await response.json();
    message = data.error?.message || data.message || message;
    details = data;
  } catch {
    try {
      message = await response.text() || message;
    } catch {
      // Keep default message
    }
  }

  // Map status codes to user-friendly messages
  switch (status) {
    case 401:
      return new ApiError('Session expired. Please login again.', 401, details);
    case 403:
      return new ApiError('You don\'t have permission to access this resource.', 403, details);
    case 404:
      return new ApiError('The requested resource was not found.', 404, details);
    case 429:
      return new ApiError('Too many requests. Please try again later.', 429, details);
    case 500:
    case 502:
    case 503:
      return new ApiError('Server error. Please try again later.', status, details);
    default:
      return new ApiError(message, status, details);
  }
}

export const apiClient = {
  /**
   * Enhanced fetch with timeout, retry, and error handling
   */
  async request<T>(url: string, config: FetchConfig = {}): Promise<T> {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = DEFAULT_RETRIES,
      ...fetchConfig
    } = config;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchConfig,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await handleApiError(response);
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return null as T;
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);

        // Don't retry on client errors (4xx) except 429
        if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Don't retry on abort
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError('Request timeout', 408);
        }

        // Retry on network errors or 5xx
        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s...
        await sleep(1000 * Math.pow(2, attempt));
      }
    }

    throw new ApiError('Max retries exceeded', 0);
  },

  /**
   * OData-specific request with proper headers
   */
  async odata<T>(endpoint: string, config: FetchConfig = {}): Promise<T> {
    const headers = new Headers(config.headers);
    headers.set('Accept', 'application/json');
    headers.set('OData-MaxVersion', '4.0');
    headers.set('OData-Version', '4.0');

    return this.request<T>(`/_api${endpoint}`, {
      ...config,
      headers,
      credentials: 'include',
    });
  },

  /**
   * Invoke a Power Pages-registered cloud flow via `window.shell.ajaxSafePost`.
   *
   * Key rules (from official Power Pages SPA pattern):
   *  - Use shell.ajaxSafePost — it injects the CSRF token and handles auth automatically
   *  - Send data as { eventData: JSON.stringify(payload) } — a plain object
   *  - Do NOT set contentType — jQuery must encode it as application/x-www-form-urlencoded
   */
  async flow<T = void>(url: string, eventData: Record<string, unknown>): Promise<T> {
    interface ShellAjaxPromise<R> {
      done: (cb: (response: R) => void) => ShellAjaxPromise<R>;
      fail: (cb: (xhr: unknown, status: string, error: string) => void) => ShellAjaxPromise<R>;
    }
    interface Shell {
      ajaxSafePost: <R = unknown>(settings: { type?: string; url: string; data?: unknown }) => ShellAjaxPromise<R>;
    }

    const shell = (window as { shell?: Shell }).shell;
    if (!shell || typeof shell.ajaxSafePost !== 'function') {
      throw new Error('window.shell.ajaxSafePost is not available — is this running inside Power Pages?');
    }

    return new Promise<T>((resolve, reject) => {
      shell.ajaxSafePost<T>({
        type: 'POST',
        url,
        data: { eventData: JSON.stringify(eventData) },
        // NOTE: do NOT set contentType — jQuery must use application/x-www-form-urlencoded
      })
        .done((response) => resolve(response))
        .fail((_xhr, status, error) => reject(new Error(`Flow call failed: ${status} — ${error}`)));
    });
  },
};
