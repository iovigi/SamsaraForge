# Deployment Guide for IIS

This guide explains how to deploy the **API** and **PWA** applications to Internet Information Services (IIS) using `iisnode`.

## Prerequisites

Ensure the following are installed on your Windows Server:
1.  **[Node.js](https://nodejs.org/)**: Install the LTS version.
2.  **[IIS (Internet Information Services)](https://www.iis.net/)**: Enable via Windows Features.
3.  **[URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite)**: Required for routing.
4.  **[iisnode](https://github.com/azure/iisnode)**: Required to run Node.js applications on IIS.

---

## 1. Application Build Steps

Both applications are built with Next.js and need to be compiled before deployment.

### API (`/api`)
1.  Open a terminal in the `api` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the application:
    ```bash
    npm run build
    ```

### PWA (`/pwa`)
1.  Open a terminal in the `pwa` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the application:
    ```bash
    npm run build
    ```

> **Note:** The `web.config` and `server.js` files created in the previous steps are essential. Ensure they are present in both root directories.

---

## 2. IIS Configuration

### Step 1: Create an Application Pool
1.  Open **IIS Manager**.
2.  Go to **Application Pools**.
3.  Click **Add Application Pool...**.
4.  Name: `SamsaraForgePool` (or your preferred name).
5.  .NET CLR Version: **No Managed Code**.
6.  Click **OK**.

### Step 2: Configure Sites or Applications

You can deploy these as separate sites (e.g., subdomains) or as a main site with a nested application.

#### Option A: Separate Sites (Recommended for Subdomains)

**For PWA (e.g., `app.domain.com`):**
1.  Right-click **Sites** -> **Add Website**.
2.  Site name: `SamsaraPWA`.
3.  Physical path: `D:\path\to\SamsaraForge\pwa` (The folder containing `package.json` and `web.config`).
4.  Hostname: `app.domain.com` (or leave blank and use a specific port).
5.  Application Pool: Select `SamsaraForgePool`.

**For API (e.g., `api.domain.com`):**
1.  Right-click **Sites** -> **Add Website**.
2.  Site name: `SamsaraAPI`.
3.  Physical path: `D:\path\to\SamsaraForge\api`.
4.  Hostname: `api.domain.com` (or use a different port like 4000).
5.  Application Pool: Select `SamsaraForgePool`.

#### Option B: Sub-application (e.g., `domain.com/api`)

1.  Create the main site pointing to the **PWA** folder as described above.
2.  Right-click the PWA site in the sidebar -> **Add Application**.
3.  Alias: `api`.
4.  Application Pool: `SamsaraForgePool`.
5.  Physical path: `D:\path\to\SamsaraForge\api`.

---

## 3. Permissions

The IIS Application Pool identity needs **Read** and **Write** permissions to the folders. Write permissions are required for `iisnode` to create logs and interceptor files.

1.  Right-click the project folder (`api` or `pwa`).
2.  Properties -> **Security** -> **Edit** -> **Add**.
3.  Enter: `IIS AppPool\SamsaraForgePool` (replace `SamsaraForgePool` with your actual pool name).
    *   *Tip: You might need to check names against your computer/server location.*
4.  Grant **Read & Execute**, **List folder contents**, **Read**, and **Write**.

---

## 4. Environment Variables

Create a `.env.production` or `.env` file in each directory (`api` and `pwa`) with your production variables. Next.js will load these automatically.

**Example PWA `.env`**:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_vapid_key
```

**Example API `.env`**:
```env
MONGODB_URI=mongodb://localhost:27017/samsara
JWT_SECRET=your_super_secret_key
VAPID_PUBLIC_KEY=your_public_vapid_key
VAPID_PRIVATE_KEY=your_private_vapid_key
```

---

## 5. Troubleshooting Check

- **500 Errors**: Check the `iisnode` folder (created automatically in your app dir) or enable "Detailed errors" in IIS.
- **WebSocket issues**: `iisnode` supports WebSockets, but ensure you haven't disabled them in `web.config` or global IIS settings.
- **Node Version**: Ensure the installed Node.js version is compatible with your code (check `node -v` in terminal).
