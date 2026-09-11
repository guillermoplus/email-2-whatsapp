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

3. Copy `.env.example` to `.env` and fill in the values:
    ```sh
    cp .env.example .env
    ```

   All variables in that file are mandatory except `WHATSAPP_MESSAGE` and
   `PUPPETEER_EXECUTABLE_PATH`; the server refuses to start if any is missing.

   `AZURE_REDIRECT_URI` must end with **`/api/auth/outlook/login/callback`** and
   match the Redirect URI registered in Azure (App registrations > Authentication >
   Web) character for character. That path is built from the constants in
   `src/config/routes.ts` and checked at startup, so changing the route means
   updating Azure and `.env` as well.

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

