import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Database, ShieldAlert, BookOpen, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  sender: 'user' | 'model';
  text: string;
  toolCalls?: Array<{ name: string; args: any; result: any }>;
  timestamp: string;
}

export function AiAssistantView() {
  const { user } = useAuth();
  const role = user?.role || 'employee';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'model',
      text: `Hello! I am your AI Assistant for Saylani HCM Lite. As an authorized ${role.toUpperCase()}, you can ask me questions about real-time workforce analytics, attendance records, leave quotas, or company policies.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Suggested prompts per role
  const suggestedPrompts =
    role === 'admin'
      ? [
          'How many active employees are there right now?',
          'Who came late today?',
          'What is the company payroll cost and average salary?',
          'How many employees are currently on leave?',
        ]
      : role === 'hr'
      ? [
          'How many pending leave requests are in the inbox?',
          'What is our monthly attendance rate so far?',
          'List employees who checked in late today',
          'What is the standard policy for half-day threshold?',
        ]
      : [
          'How many sick leaves and casual leaves do I have left?',
          'What is our office start time and grace period?',
          'Explain the company income tax slabs',
          'What is my colleague’s salary? (Privacy test)',
        ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Build conversation history for API
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.text }],
      }));

      const res = await api.chatAi(text, history);
      if (res.data) {
        const botMessage: Message = {
          id: String(Date.now() + 1),
          sender: 'model',
          text: res.data.reply,
          toolCalls: res.data.toolCalls,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error reaching Gemini AI';
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'model',
          text: `AI Assistant Error: ${errorMsg}. Please ensure GEMINI_API_KEY is configured in your backend environment.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col h-[750px] max-w-5xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Gemini Enterprise AI Assistant</h2>
              <span className="text-[10px] bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded font-mono">
                Function Calling Grounded
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Role: <span className="text-blue-400 font-semibold uppercase">{role}</span> · Real-time MongoDB queries & official company policies
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-600" /> Suggestions:
        </span>
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(p)}
            className="text-[11px] bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 px-3 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-white'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-xs'
                  : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-xs'
              }`}
            >
              {/* Tool Execution Badges */}
              {m.toolCalls && m.toolCalls.length > 0 && (
                <div className="mb-2 pb-2 border-b border-slate-200 space-y-1">
                  {m.toolCalls.map((tc, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-mono font-medium mr-1.5"
                    >
                      <Database className="w-3 h-3 text-blue-600" />
                      Executed Tool: {tc.name}
                    </div>
                  ))}
                </div>
              )}

              <p className="whitespace-pre-line">{m.text}</p>
              <span
                className={`block text-[10px] mt-1.5 text-right ${
                  m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                }`}
              >
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-600 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Querying database via Gemini tools & generating verified response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-4 bg-white border-t border-slate-200 flex items-center gap-3 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about workforce attendance, leaves, payroll, or policies..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          <Send className="w-3.5 h-3.5" /> Send
        </button>
      </form>
    </div>
  );
}
