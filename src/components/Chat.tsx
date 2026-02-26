import { useState, useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'

// Premium animations
const styles = `
  * {
    box-sizing: border-box;
  }

  /* Page Load Animations */
  @keyframes pageLoad {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Message Animations */
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  /* Loading Animations */
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
      opacity: 1;
    }
    50% {
      transform: translateY(-8px);
      opacity: 0.8;
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes wave {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  /* Glow Animation */
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(16, 163, 127, 0.3), 0 2px 8px rgba(0,0,0,0.12);
    }
    50% {
      box-shadow: 0 0 20px rgba(16, 163, 127, 0.6), 0 2px 8px rgba(0,0,0,0.12);
    }
  }

  /* Shimmer Animation */
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  /* Fade Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(10px);
    }
  }

  /* Textarea Animations */
  textarea {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  textarea:focus {
    outline: none;
    border-color: #10a37f !important;
    box-shadow: 0 0 0 4px rgba(16, 163, 127, 0.15), 0 0 0 1px rgba(16, 163, 127, 0.3) !important;
    transform: translateY(-1px);
  }

  textarea:hover:not(:focus) {
    border-color: #10a37f !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
  }

  /* Button Animations */
  button {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  button:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(16, 163, 127, 0.35);
  }

  button:active:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 163, 127, 0.25);
  }

  button:disabled {
    cursor: not-allowed;
  }

  /* Ripple Effect */
  button::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  button:active:not(:disabled)::after {
    animation: ripple 0.6s ease-out;
  }

  @keyframes ripple {
    to {
      width: 300px;
      height: 300px;
      opacity: 0;
    }
  }

  /* Scroll Animations */
  @keyframes scrollPulse {
    0%, 100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  /* Stagger Animation */
  @keyframes staggerFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

interface Message {
  _id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

interface ChatProps {
  threadId: string
  userId: string
}

export default function Chat({ threadId, userId }: ChatProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const convex = useConvex()
  
  // Query messages
  const queriedMessages = useQuery(api.messages.getByThread, { threadId })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [queriedMessages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input
    setInput('')
    setLoading(true)

    try {
      // Call action directly
      await convex.action('chat:chat', {
        threadId,
        userId,
        message: userMessage,
        useRag: true,
      } as any)
      
      // Small delay for DB sync
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e as any)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#fff',
    }}>
      <style>{styles}</style>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e5e5e5',
        backgroundColor: '#fff',
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#000' }}>AI Chat</h1>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: '#fff',
        scrollBehavior: 'smooth',
      }}>
        {!queriedMessages || queriedMessages.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#999',
            fontSize: '16px',
          }}>
            Start a conversation...
          </div>
        ) : (
          queriedMessages.map((msg: any) => (
            <div
              key={msg._id}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '14px 18px',
                  borderRadius: '20px',
                  backgroundColor: msg.role === 'user' ? '#10a37f' : '#e8e8e8',
                  color: msg.role === 'user' ? 'white' : '#222',
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.65',
                  fontSize: '14px',
                  boxShadow: msg.role === 'user' 
                    ? '0 3px 12px rgba(16, 163, 127, 0.2)' 
                    : '0 3px 12px rgba(0,0,0,0.08)',
                  animation: msg.role === 'user' 
                    ? 'slideInRight 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                    : 'slideInLeft 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'default',
                  userSelect: 'text',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = msg.role === 'user'
                    ? '0 6px 20px rgba(16, 163, 127, 0.35)'
                    : '0 6px 20px rgba(0,0,0,0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = msg.role === 'user'
                    ? '0 3px 12px rgba(16, 163, 127, 0.2)'
                    : '0 3px 12px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-start',
            animation: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{
              padding: '14px 18px',
              borderRadius: '20px',
              backgroundColor: '#e8e8e8',
              color: '#666',
              fontSize: '14px',
              boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'glow 2s ease-in-out infinite',
            }}>
              <span style={{ animation: 'wave 1.2s ease-in-out infinite', display: 'inline-block', fontSize: '18px' }}>✨</span>
              <span style={{ 
                display: 'inline-flex',
                gap: '4px',
                alignItems: 'center',
              }}>
                <span style={{ animation: 'bounce 1.4s infinite', fontSize: '10px', fontWeight: 'bold' }}>●</span>
                <span style={{ animation: 'bounce 1.4s infinite', animationDelay: '0.15s', fontSize: '10px', fontWeight: 'bold' }}>●</span>
                <span style={{ animation: 'bounce 1.4s infinite', animationDelay: '0.3s', fontSize: '10px', fontWeight: 'bold' }}>●</span>
              </span>
              <span style={{ marginLeft: '4px', fontWeight: '500' }}>AI is thinking</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: '16px 24px 24px',
        display: 'flex',
        gap: '12px',
        backgroundColor: '#fff',
        borderTop: '1px solid #e5e5e5',
        alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Shift+Enter for new line, Enter to send)"
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #d0d0d0',
            borderRadius: '16px',
            fontSize: '14px',
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            color: '#000',
            fontFamily: 'inherit',
            minHeight: '44px',
            maxHeight: '150px',
            resize: 'none',
            transition: 'all 0.3s ease',
            opacity: loading ? 0.6 : 1,
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 22px',
            backgroundColor: input.trim() ? '#10a37f' : '#d0d0d0',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            fontWeight: '600',
            fontSize: '16px',
            flexShrink: 0,
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: loading ? 0.75 : 1,
            boxShadow: input.trim()
              ? '0 4px 12px rgba(16, 163, 127, 0.25)'
              : '0 2px 8px rgba(0,0,0,0.1)',
            transform: 'translateZ(0)',
            willChange: 'transform',
          }}
        >
          <span style={{
            display: 'inline-block',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }}>
            {loading ? '⏳' : '📤'}
          </span>
        </button>
      </form>
    </div>
  )
}
