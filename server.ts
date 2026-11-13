import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Initialize GoogleGenAI on server side with User-Agent header as required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Grounded Google Search API with gemini-3.8-flash
app.post('/api/gemini/grounded-search', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const systemInstruction = `You are the intelligent Al-Furqaan Quran Memorization Center research & compliance assistant (Giddu-gala Hifzii Qur'aanaa Al-Furqaan).
You provide accurate, up-to-date, grounded information for center administrators and donors.
You specialize in:
1. Ethiopian financial data: current exchange rates (ETB to USD, EUR, SAR, AED, GBP) for diaspora donors.
2. Ethiopian banking & digital payment guidelines: CBE (Commercial Bank of Ethiopia), Telebirr merchant limits, CBE Birr, Awash Bank.
3. Ethiopian Islamic calendar (Hijri synchronizations, Ethiopian calendar dates, Ramadan, Eid ul-Fitr, Eid ul-Adha).
4. Quran memorization center best practices, charity (Sadaqah Jariyah, Zakat) rulings and guidance.
Provide clear, helpful, respectful responses in English, with Afaan Oromoo and Amharic greetings/phrases where appropriate.
Always cite facts accurately from search results.`;

    const userPrompt = context ? `Context: ${context}\n\nQuestion/Task: ${query}` : query;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || 'No response generated.';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSearchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    return res.json({
      text,
      groundingChunks,
      webSearchQueries,
    });
  } catch (error: any) {
    console.error('Grounded search error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to perform grounded search',
    });
  }
});

// AI Dua & Donor Appreciation Generator with search grounding & Islamic references
app.post('/api/gemini/generate-message', async (req: Request, res: Response) => {
  try {
    const { memberName, amountETB, month, purpose, language = 'om' } = req.body;
    if (!memberName) {
      return res.status(400).json({ error: 'Member name is required' });
    }

    const langName = language === 'om' ? 'Afaan Oromoo' : language === 'am' ? 'Amharic' : 'English';

    const prompt = `Generate a heartfelt, formal donor appreciation message and Islamic Dua for an Al-Furqaan Quran Memorization Center donor.
Donor name: ${memberName}
Contribution: ${amountETB ? amountETB + ' ETB' : 'Monthly Pledge'}
Period/Month: ${month || 'Current Month'}
Purpose: ${purpose || 'Support for Quran students (Hifz), teacher allowances and center operations'}
Target Language: ${langName}

Format with:
- Formal center greeting
- Acknowledgment of their blessed Sadaqah Jariyah contribution
- Beautiful Dua (supplication for barakah in their wealth, family, health, and Jannah for supporting Quran memorizers)
- Quote or reference to the Hadith: "The best among you are those who learn the Quran and teach it" (Bukhaarii)
- Al-Furqaan Quran Memorization Center signature.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return res.json({
      message: response.text || '',
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    });
  } catch (error: any) {
    console.error('Generate message error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate message',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
