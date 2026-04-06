import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import Chat from './components/Chat'
import LandingPage from './components/LandingPage'
import AnimatedLogo from './components/AnimatedLogo'
import ImageStudio from './components/ImageStudio'
import Gallery from './components/Gallery'
import ProfileDashboard from './components/ProfileDashboard'
import PaperFormatter from './components/PaperFormatter'
import AIHumanizer from './components/AIHumanizer'
import PDFGenerator from './components/PDFGenerator'


const appStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  @keyframes nameShimmer {
    0% { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }

  div::-webkit-scrollbar {
    width: 6px;
  }
  div::-webkit-scrollbar-track {
    background: transparent;
  }
  div::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
  }
  div::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.2);
  }
`

type AppPage = 'dashboard' | 'chat' | 'image-studio' | 'gallery' | 'profile' | 'paper-formatter' | 'ai-humanizer' | 'pdf-generator'

const NAV_ITEMS: { id: AppPage; label: string; icon: JSX.Element; color: string }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
    color: '#19c37d',
  },
  {
    id: 'chat',
    label: 'AI Chat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: '#06b6d4',
  },
  {
    id: 'image-studio',
    label: 'Image Studio',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    color: '#ec4899',
  },
  {
    id: 'paper-formatter',
    label: 'Paper Formatter',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    color: '#3b82f6',
  },
  {
    id: 'ai-humanizer',
    label: 'AI Humanizer',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    color: '#14b8a6',
  },
{
    id: 'pdf-generator',
    label: 'PDF Generator',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    color: '#f59e0b',
  },
  {
    id: 'gallery',
    label: 'Gallery',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2" />
        <path d="M2 12h20" />
        <path d="M12 2v20" />
      </svg>
    ),
    color: '#8b5cf6',
  },
]

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint])
  return isMobile
}

function App() {
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'))
  const [threadId, setThreadId] = useState<string | null>(localStorage.getItem('threadId'))
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard')
  const createThread = useMutation(api.threads.createThread)
  const threads = useQuery(api.threads.getThreadsByUser, userId ? { userId: userId as any } : 'skip')

  const deleteThread = useMutation(api.threads.deleteThread)
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null)

  const startNewChat = async () => {
    if (!userId) return
    try {
      const newThreadId = await createThread({
        userId: userId as any,
        title: 'New Chat',
      })
      setThreadId(newThreadId)
      localStorage.setItem('threadId', newThreadId)
    } catch (error) {
      console.error('Failed to create thread:', error)
    }
  }

  const handleDeleteThread = async (threadIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deletingThreadId) return
    setDeletingThreadId(threadIdToDelete)
    try {
      await deleteThread({ threadId: threadIdToDelete as any, userId: userId as any })
      if (threadId === threadIdToDelete) {
        const remaining = threads?.filter((t: any) => t._id !== threadIdToDelete)
        if (remaining && remaining.length > 0) {
          setThreadId(remaining[0]._id)
          localStorage.setItem('threadId', remaining[0]._id)
        } else {
          setThreadId(null)
          localStorage.removeItem('threadId')
          startNewChat()
        }
      }
    } catch (error) {
      console.error('Failed to delete thread:', error)
    } finally {
      setDeletingThreadId(null)
    }
  }

  // Group threads by date
  const groupThreads = (threadList: any[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterday = today - 86400000
    const last7days = today - 7 * 86400000
    const last30days = today - 30 * 86400000

    const groups: { label: string; threads: any[] }[] = [
      { label: 'Today', threads: [] },
      { label: 'Yesterday', threads: [] },
      { label: 'Last 7 Days', threads: [] },
      { label: 'Last 30 Days', threads: [] },
      { label: 'Older', threads: [] },
    ]

    for (const thread of threadList) {
      const t = thread.updatedAt || thread.createdAt || 0
      if (t >= today) groups[0].threads.push(thread)
      else if (t >= yesterday) groups[1].threads.push(thread)
      else if (t >= last7days) groups[2].threads.push(thread)
      else if (t >= last30days) groups[3].threads.push(thread)
      else groups[4].threads.push(thread)
    }

    return groups.filter(g => g.threads.length > 0)
  }

  useEffect(() => {
    if (userId && !threadId) {
      startNewChat()
    }
  }, [userId])

  const navigateTo = useCallback((page: AppPage) => {
    setCurrentPage(page)
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  if (!userId) {
    return <LandingPage onUserSet={setUserId} />
  }

  // Render current page content
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <ProfileDashboard userId={userId} onBack={() => navigateTo('chat')} onNavigate={(page) => navigateTo(page as AppPage)} />
      case 'image-studio':
        return <ImageStudio userId={userId} onBack={() => navigateTo('dashboard')} />
      case 'paper-formatter':
        return <PaperFormatter userId={userId} onBack={() => navigateTo('dashboard')} />
      case 'profile':
        return <ProfileDashboard userId={userId} onBack={() => navigateTo('dashboard')} onNavigate={(page) => navigateTo(page as AppPage)} />
      case 'ai-humanizer':
        return <AIHumanizer userId={userId} onBack={() => navigateTo('dashboard')} />
case 'pdf-generator':
        return <PDFGenerator userId={userId} onBack={() => navigateTo('dashboard')} />
      case 'gallery':
        return <Gallery userId={userId} onBack={() => navigateTo('dashboard')} />
      case 'chat':
      default:
        return threadId ? (
          <Chat threadId={threadId} userId={userId} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: 'rgba(255,255,255,0.5)', fontSize: '16px',
          }}>
            Starting conversation...
          </div>
        )
    }
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#212121',
      overflow: 'hidden',
    }}>
      <style>{appStyles}</style>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 998,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '260px' : '0px',
        minWidth: sidebarOpen ? '260px' : '0px',
        backgroundColor: '#171717',
        padding: sidebarOpen ? '12px' : '0px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        borderRight: sidebarOpen ? '1px solid rgba(255,255,255,0.06)' : 'none',
        ...(isMobile ? {
          position: 'fixed' as const,
          top: 0,
          left: sidebarOpen ? 0 : -260,
          bottom: 0,
          zIndex: 999,
          width: '260px',
          minWidth: '260px',
        } : {}),
      }}>
        {/* Sidebar Header - Logo + Close */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 4px 12px',
        }}>
          <AnimatedLogo size={36} />
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', padding: '6px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#ececec' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            title="Close sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <polyline points="14 9 11 12 14 15"></polyline>
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <div style={{ marginBottom: '12px' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                navigateTo(item.id)
                if (item.id === 'chat' && !threadId) startNewChat()
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: currentPage === item.id ? `${item.color}15` : 'transparent',
                color: currentPage === item.id ? item.color : 'rgba(255,255,255,0.6)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: currentPage === item.id ? 500 : 400,
                fontSize: '13px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                marginBottom: '2px',
                textAlign: 'left',
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0 12px 0' }} />

        {/* New Chat Button - only show when on chat page */}
        {currentPage === 'chat' && (
          <button
            onClick={startNewChat}
            style={{
              width: '100%', padding: '12px', backgroundColor: 'transparent',
              color: '#ececec', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '10px', cursor: 'pointer', marginBottom: '12px',
              fontWeight: 500, fontSize: '14px', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            } as React.CSSProperties}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New chat
          </button>
        )}

        {/* Chat History - only show when on chat page */}
        {currentPage === 'chat' && (
          <div style={{
            flex: 1, overflowY: 'auto', display: 'flex',
            flexDirection: 'column', gap: '2px',
          }}>
            {threads && threads.length > 0 ? (
              <>
                {groupThreads(threads).map((group) => (
                  <div key={group.label}>
                    <p style={{
                      margin: '12px 0 6px 8px', color: 'rgba(255,255,255,0.3)',
                      fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      {group.label}
                    </p>
                    {group.threads.map((thread: any) => {
                      const isActive = threadId === thread._id
                      const isDeleting = deletingThreadId === thread._id
                      const displayTitle = thread.title === 'New Chat' || !thread.title
                        ? 'New Chat'
                        : thread.title.replace(/^\d{1,2}\/\d{1,2}\/\d{4},?\s*\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i, 'New Chat')
                      return (
                        <div
                          key={thread._id}
                          onClick={() => {
                            setThreadId(thread._id)
                            localStorage.setItem('threadId', thread._id)
                            if (isMobile) setSidebarOpen(false)
                          }}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                            borderRadius: '8px', cursor: 'pointer',
                            color: isActive ? '#ececec' : 'rgba(255,255,255,0.55)',
                            fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden',
                            textOverflow: 'ellipsis', transition: 'all 0.15s', fontWeight: 400,
                            display: 'flex', alignItems: 'center', gap: '8px',
                            position: 'relative',
                            opacity: isDeleting ? 0.4 : 1,
                          } as React.CSSProperties}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                            const delBtn = e.currentTarget.querySelector('.del-btn') as HTMLElement
                            if (delBtn) delBtn.style.opacity = '1'
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                            const delBtn = e.currentTarget.querySelector('.del-btn') as HTMLElement
                            if (delBtn) delBtn.style.opacity = '0'
                          }}
                          title={displayTitle}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                            {displayTitle}
                          </span>
                          <button
                            className="del-btn"
                            onClick={(e) => handleDeleteThread(thread._id, e)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'rgba(255,255,255,0.3)', padding: '2px',
                              borderRadius: '4px', display: 'flex', alignItems: 'center',
                              opacity: 0, transition: 'all 0.15s', flexShrink: 0,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                            title="Delete chat"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </>
            ) : (
              <p style={{
                margin: '20px 0', color: 'rgba(255,255,255,0.3)',
                fontSize: '13px', textAlign: 'center', padding: '10px', whiteSpace: 'nowrap',
              }}>
                No conversations yet
              </p>
            )}
          </div>
        )}

        {/* Spacer when not on chat */}
        {currentPage !== 'chat' && <div style={{ flex: 1 }} />}

        {/* Bottom - Logout */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '12px', marginTop: '8px',
        }}>
          <button
            onClick={() => {
              localStorage.removeItem('userId')
              localStorage.removeItem('threadId')
              setUserId(null)
              setThreadId(null)
            }}
            style={{
              width: '100%', padding: '10px 12px', backgroundColor: 'transparent',
              color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: 400, fontSize: '14px', transition: 'all 0.2s',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            } as React.CSSProperties}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#ececec' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Log out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Sidebar Open Button - shows when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'absolute', top: '12px', left: '12px', zIndex: 50,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
              padding: '8px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#ececec' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            title="Open sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <polyline points="14 9 17 12 14 15"></polyline>
            </svg>
          </button>
        )}
        {renderPage()}
      </div>
    </div>
  )
}

export default App
