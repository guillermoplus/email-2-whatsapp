# Email to WhatsApp

## Description

This project is designed to integrate email services with WhatsApp, allowing users to receive email notifications directly on WhatsApp.

## Features

- Fetch emails using IMAP
- Send notifications to WhatsApp
- Schedule tasks using cron jobs
- Integrate with Microsoft Graph API

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/guillermoplus/email-2-whatsapp.git
    cd email-2-whatsapp
    ```

2. Install dependencies:
    ```sh
    pnpm install
    ```

3. Create a `.env` file in the root directory and add the following environment variables:
    ```env
    PORT=3072
    AZURE_TENANT_ID=your-tenant-id
    AZURE_CLIENT_ID=your-client-id
    AZURE_CLIENT_SECRET=your-client-secret
    AZURE_REDIRECT_URI=https://example.com/auth/callback
    OUTLOOK_AUTH_URL=https://login.microsoftonline.com/common/oauth2/v2.0/authorize
    OUTLOOK_TOKEN_URL=https://login.microsoftonline.com/common/oauth2/v2.0/token
    OUTLOOK_SCOPE=Mail.Read offline_access IMAP.AccessAsUser.All User.Read.All
    ```

## Usage

- To start the application:
    ```sh
    pnpm start
    ```

- To build the application:
    ```sh
    pnpm build
    ```

- To run tests:
    ```sh
    pnpm test
    ```

## Dependencies

- `@azure/identity`
- `@microsoft/microsoft-graph-client`
- `@microsoft/microsoft-graph-types`
- `awilix`
- `axios`
- `cron`
- `dotenv`
- `express`
- `imapflow`
- `puppeteer`
- `qrcode-terminal`
- `sqlite`
- `sqlite3`
- `whatsapp-web.js`

## Dev Dependencies

- `@types/express`
- `@types/qrcode-terminal`
- `ts-node`
- `typescript`

## Licencia

Este proyecto está licenciado bajo la [AGPL v3](https://www.gnu.org/licenses/agpl-3.0.html) con restricciones adicionales.  
**Nota:** El uso comercial del software o sus derivados no está permitido sin autorización explícita del autor.

