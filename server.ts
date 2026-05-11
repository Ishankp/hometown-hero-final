import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { Octokit } from 'octokit';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  // Middleware to inject Octokit if token is present
  const injectOctokit = (req: any, res: any, next: any) => {
    const token = req.cookies.github_token;
    if (token) {
      req.octokit = new Octokit({ auth: token });
    }
    next();
  };

  // API Routes
  app.get('/api/auth/url', (req, res) => {
    if (!GITHUB_CLIENT_ID) {
      return res.status(500).json({ error: 'GitHub Client ID not configured' });
    }
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;
    res.json({ url });
  });

  app.get('/api/auth/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('Missing code');
    }

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const data = await response.json();
      const accessToken = data.access_token;

      if (!accessToken) {
        throw new Error('Failed to obtain access token');
      }

      res.cookie('github_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. Closing window...</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('github_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.json({ success: true });
  });

  app.get('/api/user', injectOctokit, async (req: any, res) => {
    if (!req.octokit) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const { data } = await req.octokit.rest.users.getAuthenticated();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.get('/api/repos', injectOctokit, async (req: any, res) => {
    if (!req.octokit) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const { data } = await req.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'pushed',
        per_page: 50,
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch repositories' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
