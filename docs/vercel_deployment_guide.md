# Vercel Deployment Guide (Frontend)

## 1. Project Configuration

The Next.js frontend has been adapted for production edge deployment. 

- **API Proxy Routing**: Vercel acts as a reverse proxy for all REST API calls. Any request to `/api/*` is automatically rewritten to `https://[railway-domain]/api/v1/*`. This circumvents CORS issues.
- **WebSocket Streaming**: WebSockets do not play nicely with serverless proxies. The frontend connects directly to the backend using `wss://[railway-domain]/v1/transit/...`. 

Both of these behaviors are completely controlled by a single environment variable.

## 2. Environment Variables

In your Vercel Project Dashboard, navigate to **Settings > Environment Variables** and inject the following:

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **YES** | The public HTTPS domain of your Railway backend. | `https://stellarflow-backend-production.up.railway.app` |

*Note: Do not include a trailing slash in the URL.*

## 3. Firebase Configuration

If you are continuing to use Firebase Auth on the frontend, ensure that the standard Firebase environment variables are also present in Vercel:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

## 4. Deployment Steps

1. Connect your GitHub repository to Vercel.
2. Ensure the Framework Preset is set to **Next.js**.
3. Set the Root Directory to `/` (the root of the web app).
4. Expand the **Environment Variables** section and add `NEXT_PUBLIC_API_URL`.
5. Click **Deploy**.

## 5. Post-Deployment Verification

Once deployed on Vercel:
1. Open the application and verify that the initial dashboard data loads (verifying the REST API proxy rewrite).
2. Open the Browser Developer Console > Network Tab > WS filter.
3. Start a transit simulation and verify that the WebSocket successfully upgrades to `101 Switching Protocols` directly against the Railway backend domain.
