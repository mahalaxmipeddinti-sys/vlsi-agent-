import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';

interface WelcomeScreenProps {
  onSubmit: (prompt: string) => void;
  isGenerating: boolean;
  userName?: string;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function WelcomeScreen({ onSubmit, isGenerating, userName = 'User' }: WelcomeScreenProps) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [prompt]);

  const handleSubmit = () => {
    if (prompt.trim() && !isGenerating) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = prompt.trim().length > 0 && !isGenerating;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0F19',
        padding: '0 1rem',
      }}
    >
      {/* Hero */}
      <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        {/* Sparkle icon */}
        <div
          style={{
            width: 60,
            height: 60,
            background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 0 32px rgba(16,185,129,0.28)',
          }}
          className="pulse-glow"
        >
          <Sparkles size={30} color="#10B981" />
        </div>

        {/* Greeting */}
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.4rem)',
            fontWeight: 700,
            color: '#F8FAFC',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {getTimeGreeting()},{' '}
          <span style={{ color: '#10B981' }}>{userName}</span>
        </h1>
      </div>

      {/* Prompt bar */}
      <div
        className="anim-fade-up"
        style={{ width: '100%', maxWidth: 660, animationDelay: '0.08s' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.75rem',
            background: '#1A2237',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 50,
            padding: '0.75rem 0.75rem 0.75rem 1.5rem',
            boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
            transition: 'border-color 0.2s',
          }}
          onFocus={() => {}}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="type your prompt for design chip"
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F8FAFC',
              fontSize: '0.92rem',
              resize: 'none',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.6,
              paddingTop: 2,
              paddingBottom: 2,
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: canSubmit ? '#10B981' : '#1E3A52',
              border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, transform 0.1s',
              transform: canSubmit ? 'scale(1)' : 'scale(0.95)',
            }}
          >
            {isGenerating ? (
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25" />
                <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <ArrowUp size={18} color="#fff" />
            )}
          </button>
        </div>

        {/* Hint */}
        <p
          style={{
            textAlign: 'center',
            color: '#475569',
            fontSize: '0.78rem',
            marginTop: '0.875rem',
            lineHeight: 1.6,
          }}
        >
          Tap{' '}
          <span style={{ color: '#10B981', fontWeight: 600 }}>⚡ VLSI Studio</span>{' '}
          or the three-bar menu{' '}
          <span style={{ fontWeight: 600, color: '#64748B' }}>≡</span>{' '}
          to access Front End &amp; Back End Design Flows.
        </p>
      </div>
    </div>
  );
}
