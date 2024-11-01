import dotenv from "dotenv";

/**
 * Build the environment object with the environment variables.
 */
const getVariablesObject = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  azure: {
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    redirectUri: process.env.AZURE_REDIRECT_URI || '',
  },
  outlook: {
    authUrl: process.env.OUTLOOK_AUTH_URL || '',
    tokenUrl: process.env.OUTLOOK_TOKEN_URL || '',
    scope: process.env.OUTLOOK_SCOPE || '',
  },
  imap: {
    host: process.env.IMAP_HOST || '',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: process.env.IMAP_SECURE === 'true',
    user: process.env.IMAP_USER || '',
    password: process.env.IMAP_PASSWORD || '',
  },
  whatsapp: {
    searchKeyword: process.env.SEARCH_KEYWORD || '',
    destinationPhoneNumber: process.env.WHATSAPP_PHONE_NUMBER || '',
    caption: process.env.WHATSAPP_MESSAGE || '',
  },
});

/**
 * Validate if the environment variables are set. If not, throw an error.
 * @throws Error If any environment variable is missing.
 */
const validateEnvironmentVariables = () => {
  console.log('Validating mandatory environment variables...');
  const variables = getVariablesObject();
  // Azure
  if (!variables.azure.tenantId) {
    throw new Error('AZURE_TENANT_ID is not defined in environment variables');
  } else if (!variables.azure.clientId) {
    throw new Error('AZURE_CLIENT_ID is not defined in environment variables');
  } else if (!variables.azure.clientSecret) {
    throw new Error('AZURE_CLIENT_SECRET is not defined in environment variables');
  } else if (!variables.azure.redirectUri) {
    throw new Error('AZURE_REDIRECT_URI is not defined in environment variables');
  }

  // Outlook
  if (!variables.outlook.authUrl) {
    throw new Error('OUTLOOK_AUTH_URL is not defined in environment variables');
  } else if (!variables.outlook.tokenUrl) {
    throw new Error('OUTLOOK_TOKEN_URL is not defined in environment variables');
  } else if (!variables.outlook.scope) {
    throw new Error('OUTLOOK_SCOPE is not defined in environment variables');
  }

  // IMAP, pending evaluate if it is necessary to validate these variables

  // WhatsApp
  if (!variables.whatsapp.searchKeyword) {
    throw new Error('SEARCH_KEYWORD is not defined in environment variables');
  } else if (!variables.whatsapp.destinationPhoneNumber) {
    throw new Error('WHATSAPP_PHONE_NUMBER is not defined in environment variables');
  }
}

/**
 * Load the environment variables.
 * If the environment variables are already loaded, return them.
 * If the environment is development, load the environment variables from the .env file.
 * @returns The environment variables.
 * @throws Error If the environment variables are missing.
 */
const environment = () => {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }
  if (process.env.ENV_VARIABLES_LOADED === 'true') {
    return getVariablesObject();
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('Loading environment variables from .env file...');
    const loadedEnv = dotenv.config();
    if (loadedEnv.error) {
      throw new Error('Failed to load environment variables from .env file');
    }
    console.log('Environment variables loaded successfully');
  }
  validateEnvironmentVariables();
  process.env.ENV_VARIABLES_LOADED = 'true';
  console.log('Environment variables validated and loaded successfully');
  return getVariablesObject();
};

export default environment;
