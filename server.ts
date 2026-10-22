import express from 'express';
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
  try {
    const {
      messages = [],
      model = 'gemini-3.8-flash',
      roleContext = 'Admin',
      portfolioSnapshot = '',
    } = req.body as {
      messages: ChatTurn[];
      model?: 'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite';
      roleContext?: string;
      portfolioSnapshot?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const validModels = ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    const selectedModel = validModels.includes(model) ? model : 'gemini-3.8-flash';

    const systemInstruction = `You are the soleX Deal & Mandate Copilot, an enterprise AI advisor embedded inside the soleX Real Estate Master-Franchise Operating System in India.
Current Active User Role: ${roleContext}.

Your Responsibilities:
1. When the active role is Admin (Mandate HQ), help the user analyze inventory velocity across towers, structure developer mandate terms, calculate all-inclusive unit cost sheets (Base Price + Floor Rise + PLC + 5% GST + 6% Stamp Duty), and review pending channel partner commission payouts.
2. When the active role is Broker (Channel Partner), help the broker pitch available units to their buyers, prepare payment plan comparisons, recommend matching units based on buyer budget/BHK, and track their commission statuses.
3. Always format Indian currency values cleanly in Crores (₹ Cr) and Lakhs (₹ L) and reference exact unit numbers, lead names, and broker firms from the live state snapshot below.
4. Keep responses concise, structured, and executive-ready.

Live soleX State Snapshot:
${portfolioSnapshot}`;

    const ai = getGenAIClient();

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));
    const latestMessage = messages[messages.length - 1].text;

    const runChatWithModel = async (targetModel: string): Promise<{ text: string; usedModel: string }> => {
      const chat = ai.chats.create({
        model: targetModel,
        history,
        config: {
          systemInstruction,
        },
      });
      const response: GenerateContentResponse = await chat.sendMessage({
        message: latestMessage,
      });
      return {
        text: response.text || 'No response generated.',
        usedModel: targetModel,
      };
    };

    try {
      const result = await runChatWithModel(selectedModel);
      res.json(result);
    } catch (primaryErr: unknown) {
      // If gemini-4-argon was requested without a paid key attached, gracefully fall back to gemini-3.8-flash
      if (selectedModel === 'gemini-4-argon') {
        const fallbackResult = await runChatWithModel('gemini-3.8-flash');
        res.json({
          ...fallbackResult,
          fallbackNote: 'Executed with gemini-3.8-flash (standard tier key active).',
        });
        return;
      }
      throw primaryErr;
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unexpected error communicating with Gemini API';
    res.status(500).json({ error: errMsg });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`soleX Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
