import { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import Chat from './components/Chat'
import UserSetup from './components/UserSetup'

function App() {
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'))
  const [threadId, setThreadId] = useState<string | null>(localStorage.getItem('threadId'))
  const createThread = useMutation(api.threads.createThread)
  const threads = useQuery(api.threads.getThreadsByUser, userId ? { userId: userId as any } : 'skip')

  const startNewChat = async () => {
    if (!userId) return
    try {
      const newThreadId = await createThread({
        userId: userId as any,
        title: new Date().toLocaleString(),
      })
      setThreadId(newThreadId)
      localStorage.setItem('threadId', newThreadId)
    } catch (error) {
      console.error('Failed to create thread:', error)
    }
  }

  useEffect(() => {
    if (userId && !threadId) {
      startNewChat()
    }
  }, [userId])

  if (!userId) {
    return <UserSetup onUserSet={setUserId} />
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#fff' }}>
      {/* Sidebar */}
      <div style={{
        width: '260px',
        backgroundColor: '#1a1a1a',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #333',
      }}>
        <button
          onClick={startNewChat}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#10a37f',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '16px',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          + New Chat
        </button>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          color: '#ccc',
          fontSize: '13px',
        }}>
          <p style={{ margin: '16px 0 8px 0', color: '#999' }}>Chat History</p>
          {threads && threads.length > 0 ? (
            threads.map((thread: any) => (
              <div
                key={thread._id}
                onClick={() => {
                  setThreadId(thread._id)
                  localStorage.setItem('threadId', thread._id)
                }}
                style={{
                  padding: '10px',
                  marginBottom: '8px',
                  backgroundColor: threadId === thread._id ? '#333' : 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: threadId === thread._id ? '#10a37f' : '#999',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#333'
                  e.currentTarget.style.color = '#10a37f'
                }}
                onMouseLeave={(e) => {
                  if (threadId !== thread._id) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#999'
                  }
                }}
              >
                {thread.title}
              </div>
            ))
          ) : (
            <p style={{ margin: '10px 0', color: '#555', fontSize: '12px' }}>No previous chats</p>
          )}
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('userId')
            localStorage.removeItem('threadId')
            setUserId(null)
            setThreadId(null)
          }}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          Logout
        </button>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {threadId ? (
          <Chat threadId={threadId} userId={userId} />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#ccc',
          }}>
            Loading...
          </div>
        )}
      </div>
    </div>
  )
}

export default App
