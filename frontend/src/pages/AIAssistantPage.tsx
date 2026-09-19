import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Send, Sparkles, Cpu, CheckCircle, AlertTriangle, Info, Tag } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  time: string;
  citedIncidents?: string[];
  citedResources?: string[];
  engineMode?: string;
  isDataSufficient?: boolean;
}

export const AIAssistantPage: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [aiHealth, setAiHealth] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'SENTINEL AI Command Assistant active. I am grounded strictly in database records to answer operational queries across incidents, resource status, and regional capacity.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      engineMode: 'GEMINI_2_5',
    },
  ]);

  const quickQuestions = [
    'Summarize active critical P1 incidents',
    'Which units are available in Sector 3?',
    'Check regional hospital bed availability',
    'Show delayed emergency responses',
  ];

  useEffect(() => {
    fetchAIHealth();
  }, []);

  const fetchAIHealth = async () => {
    try {
      const res = await axios.get('/api/v1/ai/health');
      if (res.data?.data) {
        setAiHealth(res.data.data);
      }
    } catch (err) {
      setAiHealth({ status: 'NOT_CONFIGURED' });
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || query;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await axios.post('/api/v1/ai/assistant/chat', { query: text });
      if (res.data?.data) {
        const data = res.data.data;
        const assistantMsg: Message = {
          role: 'assistant',
          text: data.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citedIncidents: data.citedIncidents || [],
          citedResources: data.citedResources || [],
          engineMode: data.engineMode,
          isDataSufficient: data.isDataSufficient,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error?.message || 'Failed to reach AI Command Assistant endpoint.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `[System Error]: ${errorMsg}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          engineMode: 'DETERMINISTIC_FALLBACK',
          isDataSufficient: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const status = aiHealth?.status || 'NOT_CONFIGURED';
    if (status === 'AVAILABLE_HEALTHY') {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-mono">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Gemini 2.5 Flash • Grounded Engine</span>
        </div>
      );
    }
    if (status === 'DEGRADED') {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[11px] font-mono">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Gemini Degraded • Fallback Mode Active</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono">
        <Cpu className="w-3.5 h-3.5 text-slate-400" />
        <span>Deterministic Rule Engine Active</span>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-indigo-400" />
            SENTINEL AI COMMAND ASSISTANT
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Grounded Conversational Operational Intelligence Panel (Strict System DB Context)
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Security Grounding Banner */}
      <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 flex items-center justify-between text-xs text-indigo-200">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>
            <strong>Database Grounding Rule:</strong> Responses are generated strictly from live database records. If requested data is missing, the assistant explicitly reports insufficient data.
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <Card
        className="flex-1 flex flex-col overflow-hidden min-h-[440px]"
        bodyClassName="p-0 flex flex-col flex-1"
      >
        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 max-w-3xl ${
                m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  m.role === 'user'
                    ? 'bg-rose-600 text-white'
                    : 'bg-indigo-950 border border-indigo-700 text-indigo-400'
                }`}
              >
                {m.role === 'user' ? 'OP' : <Sparkles className="w-4 h-4" />}
              </div>

              <div
                className={`p-4 rounded-xl text-xs leading-relaxed space-y-2 ${
                  m.role === 'user'
                    ? 'bg-rose-950/70 border border-rose-800 text-slate-100'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="font-mono text-[10px] font-bold text-slate-400">
                    {m.role === 'user' ? 'EOC DISPATCH OPERATOR' : 'SENTINEL AI ASSISTANT'}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                    {m.engineMode && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {m.engineMode}
                      </span>
                    )}
                    <span>{m.time}</span>
                  </div>
                </div>

                <p className="font-sans text-sm whitespace-pre-wrap">{m.text}</p>

                {/* Cited Incidents & Resources */}
                {m.role === 'assistant' && ((m.citedIncidents && m.citedIncidents.length > 0) || (m.citedResources && m.citedResources.length > 0)) && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-400" /> Cited Records:
                    </span>
                    {m.citedIncidents?.map((inc, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/80 text-rose-300">
                        {inc}
                      </span>
                    ))}
                    {m.citedResources?.map((res, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800/80 text-sky-300">
                        {res}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-400 shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-indigo-300 font-mono animate-pulse">
                Analyzing EOC database snapshot via Gemini 2.5 engine...
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
          <span className="text-slate-500 uppercase shrink-0">Quick Queries:</span>
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 shrink-0 whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
          <input
            type="text"
            placeholder="Ask question regarding active emergencies, unit availability, or hospital capacity..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans disabled:opacity-50"
          />
          <Button
            size="md"
            variant="primary"
            onClick={() => handleSend()}
            disabled={loading || !query.trim()}
            icon={<Send className="w-4 h-4" />}
          >
            Submit Query
          </Button>
        </div>
      </Card>
    </div>
  );
};
