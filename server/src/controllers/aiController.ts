import { Response } from 'express';
import { GeminiService } from '../services/geminiService.js';
import { PolicyService } from '../services/policyService.js';
import { AuthRequest } from '../middleware/auth.js';

export async function chatWithAi(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'A prompt message is required.' });
    }

    const result = await GeminiService.chat({
      userId: req.user._id.toString(),
      role: req.user.role,
      employeeId: req.employeeId,
      message: message.trim(),
      history: history || [],
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI Chat error';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function summarizeDashboard(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { kpis } = req.body;
    if (!kpis) {
      return res.status(400).json({ success: false, message: 'KPI data payload is required.' });
    }

    const bullets = await GeminiService.generateDashboardSummary(kpis, req.user.role);
    res.json({
      success: true,
      data: {
        insights: bullets,
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI summarize error';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function smartLeaveExtract(req: AuthRequest, res: Response) {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Natural language leave prompt is required.' });
    }

    const extracted = await GeminiService.parseSmartLeave(String(prompt).trim());
    res.json({
      success: true,
      data: extracted,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Smart leave extraction error';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getCompanyPolicies(req: AuthRequest, res: Response) {
  try {
    const policyText = PolicyService.getStructuredPolicies();
    res.json({
      success: true,
      data: {
        policies: policyText,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching policies';
    res.status(500).json({ success: false, message: msg });
  }
}
