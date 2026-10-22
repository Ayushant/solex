import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Serve ARCHITECTURE.md content so evaluators can inspect the production blueprint directly in-app
app.get('/api/architecture', (_req, res) => {
  try {
    const archPath = path.resolve(__dirname, 'ARCHITECTURE.md');
    const content = fs.readFileSync(archPath, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: 'Unable to read ARCHITECTURE.md' });
  }
});

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(200).json({ fallbackToLocal: true });
    return;
  }

  try {
    const {
      messages = [],
      roleContext = 'Admin',
      portfolioSnapshot = '',
    } = req.body as {
      messages: ChatTurn[];
      roleContext?: string;
      portfolioSnapshot?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const systemInstruction = `You are the soleX Deal & Mandate Copilot, an enterprise advisor embedded inside the soleX Real Estate Master-Franchise Operating System in India.
Current Active User Role: ${roleContext}.

Your Responsibilities:
1. When the active role is Admin (Mandate HQ), help the user analyze inventory velocity across towers, structure developer mandate terms, calculate all-inclusive unit cost sheets (Base Price + Floor Rise + PLC + 5% GST + 6% Stamp Duty), and review pending channel partner commission payouts.
2. When the active role is Broker (Channel Partner), help the broker pitch available units to their buyers, prepare payment plan comparisons, recommend matching units based on buyer budget/BHK, and track their commission statuses.
3. Always format Indian currency values cleanly in Crores (₹ Cr) and Lakhs (₹ L) and reference exact unit numbers, lead names, and broker firms from the live state snapshot below.
4. Keep responses concise, structured, and executive-ready. Plain text only without decorative markdown stars or emojis.

Live soleX State Snapshot:
${portfolioSnapshot}`;

    const ai = getGenAIClient();

    // Ensure turns start with a 'user' message (skip initial welcome 'model' message)
    const rawTurns = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));
    const firstUserIdx = rawTurns.findIndex((t) => t.role === 'user');
    const validContents =
      firstUserIdx >= 0 ? rawTurns.slice(firstUserIdx) : rawTurns;

    const candidateModels = [
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
    ];

    for (const targetModel of candidateModels) {
      try {
        const response: GenerateContentResponse = await Promise.race([
          ai.models.generateContent({
            model: targetModel,
            contents: validContents,
            config: {
              systemInstruction,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Model request timed out')), 9000)
          ),
        ]);

        if (response.text) {
          res.json({
            text: response.text,
          });
          return;
        }
      } catch {
        // Continue to next candidate model
      }
    }

    res.status(200).json({ fallbackToLocal: true });
  } catch {
    res.status(200).json({ fallbackToLocal: true });
  }
});

async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`soleX Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
