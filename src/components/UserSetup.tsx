import { useState } from 'react'
import { useConvex } from 'convex/react'

interface UserSetupProps {
  onUserSet: (userId: string) => void
}

export default function UserSetup({ onUserSet }: UserSetupProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const convex = useConvex()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !name) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    console.log('👤 Creating user:', { email, name })
    
    try {
      const user = await convex.mutation('users:getOrCreateUser', {
        email,
        name,
      })
      console.log('✅ User created:', user)
      localStorage.setItem('userId', user._id)
      onUserSet(user._id)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create user'
      console.error('❌ Error:', err)
      setError(`Connection error: ${errorMsg}. Make sure backend is running.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'white',
        padding: '50px',
        borderRadius: '15px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '450px',
      }}>
        <h1 style={{ 
          marginBottom: '10px', 
          textAlign: 'center',
          fontSize: '32px',
          color: '#333',
        }}>
          🤖 AI Agent
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#666',
          marginBottom: '40px',
          fontSize: '14px',
        }}>
          Professional Chat with RAG
        </p>

        {/* Connection Status */}
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: '#e8f4f8',
          borderRadius: '5px',
          fontSize: '12px',
          color: '#004085',
          textAlign: 'center',
          border: '1px solid #b8daff',
        }}>
          <strong>🔌 Status:</strong> {loading ? 'Connecting...' : 'Ready'}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '5px',
            color: '#721c24',
            fontSize: '13px',
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold',
            color: '#333',
          }}>
            📧 Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={loading}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
              backgroundColor: loading ? '#f0f0f0' : 'white',
            }}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold',
            color: '#333',
          }}>
            👤 Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            disabled={loading}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
              backgroundColor: loading ? '#f0f0f0' : 'white',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !name}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '⏳ Creating Account...' : '🚀 Start Chatting'}
        </button>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f0f8ff',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#555',
          lineHeight: '1.6',
        }}>
          <strong>ℹ️ First Time?</strong>
          <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
            <li>Just enter any email and name</li>
            <li>Account auto-created</li>
            <li>Then chat with AI</li>
          </ul>
        </div>
      </form>
    </div>
  )
}
