'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { AIMessage } from '@/lib/types';

interface AIChatProps {
  initialContext?: string;
  initialPrompt?: string | null;
}

export default function AIChat({ initialContext, initialPrompt }: AIChatProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasProcessedInitialPrompt = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your BC Docker troubleshooting assistant. I can help you with:

- **Container issues**: startup failures, crashes, performance problems
- **Configuration**: ports, memory, networking, SSL
- **Database**: backup/restore, SQL errors, data issues
- **Development**: extension deployment, debugging, web services

${initialContext ? `\nI see you're working with: ${initialContext}` : ''}

How can I help you today?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [initialContext, messages.length]);

  // Handle initial prompt from quick actions
  useEffect(() => {
    if (initialPrompt && !hasProcessedInitialPrompt.current && messages.length > 0) {
      hasProcessedInitialPrompt.current = true;
      // Set the input and auto-submit
      setInput(initialPrompt);
    }
  }, [initialPrompt, messages.length]);

  // Auto-submit when input is set from initialPrompt
  useEffect(() => {
    if (input && hasProcessedInitialPrompt.current && !loading) {
      // Small delay to ensure UI has updated
      const timer = setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [input, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: initialContext,
        }),
      });

      const data = await response.json();

      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'I apologize, but I was unable to generate a response.',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Safely parse bold text without using dangerouslySetInnerHTML
  const parseBoldText = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the bold
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      // Add the bold text
      parts.push(<strong key={match.index}>{match[1]}</strong>);
      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h4 key={i} className="font-bold text-white mt-3 mb-1">{line.slice(4)}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={i} className="font-bold text-white text-lg mt-4 mb-2">{line.slice(3)}</h3>;
        }

        // Code blocks
        if (line.startsWith('```')) {
          return null; // Handle separately
        }

        // Bullet points
        if (line.startsWith('- ')) {
          return (
            <li key={i} className="ml-4 list-disc">
              {parseBoldText(line.slice(2))}
            </li>
          );
        }

        // Numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s/);
        if (numberedMatch) {
          return (
            <li key={i} className="ml-4 list-decimal">
              {parseBoldText(line.slice(numberedMatch[0].length))}
            </li>
          );
        }

        // Empty lines
        if (!line.trim()) {
          return <br key={i} />;
        }

        return <p key={i}>{parseBoldText(line)}</p>;
      });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div className={`chat-message ${message.role === 'user' ? 'chat-user' : 'chat-assistant'}`}>
              <div className="prose prose-invert prose-sm max-w-none">
                {formatMessage(message.content)}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="chat-message chat-assistant">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your issue or ask a question..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn btn-primary px-4"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send. Describe your issue in detail for better assistance.
        </p>
      </form>
    </div>
  );
}
