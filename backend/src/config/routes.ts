/**
 * Single source of truth for the HTTP route layout.
 *
 * The Outlook callback path lives both in a route decorator and in the
 * AZURE_REDIRECT_URI environment variable (which must match what is registered
 * in the Azure app registration). Building both from these constants keeps them
 * from drifting apart; `environment.ts` validates the match at startup.
 *
 * This module must stay dependency-free to avoid import cycles.
 */

/** Global prefix applied by createExpressServer. */
export const API_PREFIX = '/api';

/** Base route of AuthController. */
export const AUTH_ROUTE = '/auth';

/** Outlook OAuth callback, relative to AuthController. */
export const OUTLOOK_CALLBACK_ROUTE = '/outlook/login/callback';

/**
 * Full public path of the Outlook OAuth callback.
 * AZURE_REDIRECT_URI must end with this value.
 */
export const OUTLOOK_CALLBACK_PATH = `${API_PREFIX}${AUTH_ROUTE}${OUTLOOK_CALLBACK_ROUTE}`;
