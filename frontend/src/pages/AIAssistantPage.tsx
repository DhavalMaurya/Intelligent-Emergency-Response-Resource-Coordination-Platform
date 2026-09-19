import React, { useState } from 'react';
import { Bot, Send, Sparkles, MessageSquare, ShieldAlert, Cpu } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const AIAssistantPage: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([
    {
      role: 'assistant',
      text: 'PS-9 Command Assistant active. Ready to assist with operational queries, incident synthesis, and fleet status across all sectors.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const quickQuestions = [
    'Summarize current critical incidents',
    'Which units are available near Sector 3?',
    'Explain why incident INC-2026-1042 is delayed',
    'Check regional hospital bed availability',
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || query;
    if (!text.trim()) return;

    const userMsg = {
      role: 'user' as const,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let reply = '';
    if (text.includes('critical')) {
      reply = 'There are currently 2 active critical incidents: INC-2026-1042 (Chemical Warehouse Fire in Sector 3) and INC-2026-1044 (Scaffolding Collapse in Sector 1). Incident INC-2026-1042 requires immediate mutual-aid ambulance dispatch.';
    } else if (text.includes('Sector 3')) {
      reply = 'Sector 3 has Fire Engine FE-02 and Hazmat HAZ-01 on scene. Ambulance ALS-03 is busy. Recommended closest standby unit is ALS-01 from Station 1 (Sector 1).';
    } else if (text.includes('delayed')) {
      reply = 'Incident INC-2026-1042 exceeded the 10-minute ambulance dispatch window due to severe traffic congestion on the Industrial Corridor connector. Supervisor escalation recorded in audit log.';
    } else {
      reply = 'Telemetry query acknowledged. The AI Command Assistant will provide real-time dynamic conversational synthesis via Google Gemini API in Phase 3.';
    }

    const assistantMsg = {
      role: 'assistant' as const,
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setQuery('');
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2.5">
          <Bot className="w-6 h-6 text-indigo-400" />
          AI COMMAND ASSISTANT
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Conversational Situation Awareness & Resource Intelligence Assistant (Phase 3 Integration Architecture)
        </p>
      </div>

      {/* Phase Architecture Banner */}
      <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 flex items-center justify-between text-xs text-indigo-200">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>
            <strong>AI Subsystem Notice:</strong> Backend SDK (<code className="text-indigo-300">@google/genai</code>) and Gemini models are pre-configured. Live conversational AI activates in Phase 3.
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
              className={`flex items-start gap-3 max-w-2xl ${
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
                className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-rose-950/70 border border-rose-800 text-slate-100'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="font-mono text-[10px] font-bold text-slate-400">
                    {m.role === 'user' ? 'DISPATCH OPERATOR' : 'GEMINI EOC ASSISTANT'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">{m.time}</span>
                </div>
                <p className="font-sans">{m.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
          <span className="text-slate-500 uppercase shrink-0">Quick Queries:</span>
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 shrink-0 whitespace-nowrap transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
          <input
            type="text"
            placeholder="Ask question regarding active emergencies, unit availability, or incident status..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
          />
          <Button
            size="md"
            variant="primary"
            onClick={() => handleSend()}
            icon={<Send className="w-4 h-4" />}
          >
            Submit Query
          </Button>
        </div>
      </Card>
    </div>
  );
};
