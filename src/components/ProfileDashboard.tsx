import { useState, useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface ProfileDashboardProps {
  userId: string
  onBack: () => void
  onNavigate?: (page: string) => void
}

// Animated counter hook
function useAnimatedCount(target: number, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) { setCount(0); return }
    let start = 0
    const step = Math.max(1, Math.ceil(target / (duration / 16)))
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

// Sparkline mini chart component
function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const width = 120
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * (height - 4)}`).join(' ')
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <polygon fill={`url(#sg-${color.replace('#', '')})`}
        points={`0,${height} ${points} ${width},${height}`} />
    </svg>
  )
}

// Activity ring component
function ActivityRing({ percentage, color, size = 80, strokeWidth = 6, label }: {
  percentage: number; color: string; size?: number; strokeWidth?: number; label: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (percentage / 100) * circumference)
    }, 300)
    return () => clearTimeout(timer)
  }, [percentage, circumference])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </svg>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

export default function ProfileDashboard({ userId, onBack, onNavigate }: ProfileDashboardProps) {
  const user = useQuery(api.users.getUserById, { userId: userId as any })
  const threads = useQuery(api.threads.getThreadsByUser, { userId: userId as any })
  const messages = useQuery(api.messages.getByUser, { userId: userId as any })
  const creations = useQuery(api.creative.getCreations, { userId: userId as any })
  const papers = useQuery(api.papers.getPapers, { userId: userId as any })
  const notes = useQuery(api.papers.getNotes, { userId: userId as any })
  const research = useQuery(api.research.getHistory, { userId: userId as any })

  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'analytics'>('overview')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const dashRef = useRef<HTMLDivElement>(null)

  // Computed stats
  const totalChats = threads?.length || 0
  const totalMessages = messages?.length || 0
  const totalCreations = creations?.length || 0
  const totalPapers = papers?.length || 0
  const totalNotes = notes?.length || 0
  const totalResearch = research?.length || 0
  const imageCount = creations?.filter((c: any) => c.type === 'image').length || 0
  const videoCount = creations?.filter((c: any) => c.type === 'video').length || 0
  const threeDCount = creations?.filter((c: any) => c.type === '3d').length || 0
  const mapCount = creations?.filter((c: any) => c.type === 'map_snapshot').length || 0

  // Animated counters
  const animChats = useAnimatedCount(totalChats)
  const animMessages = useAnimatedCount(totalMessages)
  const animCreations = useAnimatedCount(totalCreations)
  const animPapers = useAnimatedCount(totalPapers)
  const animResearch = useAnimatedCount(totalResearch)
  const animNotes = useAnimatedCount(totalNotes)

  // Activity data for last 7 days
  const now = Date.now()
  const dayMs = 86400000
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * dayMs
    const dayEnd = dayStart + dayMs
    const msgCount = messages?.filter((m: any) => m.createdAt >= dayStart && m.createdAt < dayEnd).length || 0
    const resCount = research?.filter((r: any) => r.createdAt >= dayStart && r.createdAt < dayEnd).length || 0
    return { msgCount, resCount, total: msgCount + resCount }
  })

  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * dayMs)
    return d.toLocaleDateString('en', { weekday: 'short' })
  })

  // Recent activity timeline (combine all activities, sort by time)
  const allActivity: { type: string; title: string; time: number; color: string; icon: string }[] = []

  threads?.slice(0, 8).forEach((t: any) => {
    allActivity.push({ type: 'chat', title: t.title, time: t.updatedAt, color: '#19c37d', icon: 'chat' })
  })
  research?.slice(0, 8).forEach((r: any) => {
    allActivity.push({ type: 'research', title: r.query, time: r.createdAt, color: '#a855f7', icon: 'research' })
  })
  creations?.slice(0, 8).forEach((c: any) => {
    allActivity.push({ type: c.type, title: c.prompt, time: c.createdAt, color: '#ec4899', icon: c.type })
  })
  papers?.slice(0, 5).forEach((p: any) => {
    allActivity.push({ type: 'paper', title: p.title, time: p.createdAt, color: '#ef4444', icon: 'paper' })
  })
  notes?.slice(0, 5).forEach((n: any) => {
    allActivity.push({ type: 'note', title: n.title, time: n.updatedAt || n.createdAt, color: '#f59e0b', icon: 'note' })
  })

  allActivity.sort((a, b) => b.time - a.time)
  const recentActivity = allActivity.slice(0, 15)

  // Time ago helper
  const timeAgo = (ts: number) => {
    const diff = now - ts
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < dayMs) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 7 * dayMs) return `${Math.floor(diff / dayMs)}d ago`
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const joinDate = user ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '...'
  const daysActive = user ? Math.max(1, Math.ceil((now - user.createdAt) / dayMs)) : 1
  const avgMessagesPerDay = Math.round(totalMessages / daysActive * 10) / 10

  // Icon renderer
  const renderIcon = (type: string) => {
    switch (type) {
      case 'chat': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      )
      case 'research': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      )
      case 'image': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
      )
      case 'video': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
      )
      case '3d': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
      )
      case 'paper': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
      )
      case 'note': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
      )
      default: return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
      )
    }
  }

  // 3D card tilt effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 15
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -15
    card.style.transform = `perspective(800px) rotateX(${y}deg) rotateY(${x}deg) scale3d(1.02, 1.02, 1.02)`
    setHoveredCard(cardId)
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    setHoveredCard(null)
  }

  // Quick action cards
  const quickActions = [
    { id: 'chat', label: 'New Chat', desc: 'Start AI conversation', color: '#19c37d', gradient: 'linear-gradient(135deg, #19c37d, #0d9488)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
    { id: 'research', label: 'AI Research', desc: 'Deep analysis & brainstorm', color: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7, #6366f1)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> },
    { id: 'research-dash', label: 'Paper Search', desc: 'ArXiv & Wikipedia', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> },
    { id: 'gallery', label: 'My Gallery', desc: 'All creations', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2" /><path d="M2 12h20" /><path d="M12 2v20" /></svg> },
    { id: 'image-studio', label: 'Image Studio', desc: 'Generate AI art', color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #a855f7)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg> },
    { id: 'paper-formatter', label: 'Paper Formatter', desc: 'IEEE, APA, ACM formats', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
  ]

  // Stat cards config
  const statCards = [
    { id: 'chats', label: 'Conversations', value: animChats, total: totalChats, color: '#19c37d', gradient: 'linear-gradient(135deg, rgba(25,195,125,0.15), rgba(25,195,125,0.05))',
      sparkData: last7Days.map(d => d.msgCount), sub: `${avgMessagesPerDay} msgs/day avg` },
    { id: 'messages', label: 'Total Messages', value: animMessages, total: totalMessages, color: '#06b6d4', gradient: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
      sparkData: last7Days.map(d => d.msgCount), sub: `${totalMessages > 0 ? Math.round(totalMessages / Math.max(totalChats, 1)) : 0} per chat` },
    { id: 'creations', label: 'AI Creations', value: animCreations, total: totalCreations, color: '#ec4899', gradient: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(236,72,153,0.05))',
      sparkData: [imageCount, videoCount, threeDCount, mapCount], sub: `${imageCount} img, ${videoCount} vid, ${threeDCount} 3D` },
    { id: 'research', label: 'Research', value: animResearch, total: totalResearch, color: '#a855f7', gradient: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))',
      sparkData: last7Days.map(d => d.resCount), sub: `${research?.filter((r: any) => r.saved).length || 0} saved` },
    { id: 'papers', label: 'Papers Saved', value: animPapers, total: totalPapers, color: '#ef4444', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
      sparkData: [totalPapers], sub: `in library` },
    { id: 'notes', label: 'Research Notes', value: animNotes, total: totalNotes, color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
      sparkData: [totalNotes], sub: `${notes?.filter((n: any) => n.pinned).length || 0} pinned` },
  ]

  // Activity ring percentages (capped at 100)
  const chatRingPct = Math.min(100, (totalChats / Math.max(10, totalChats)) * 100)
  const creativeRingPct = Math.min(100, (totalCreations / Math.max(5, totalCreations)) * 100)
  const researchRingPct = Math.min(100, (totalResearch / Math.max(5, totalResearch)) * 100)
  const overallScore = Math.min(100, Math.round(((totalChats > 0 ? 25 : 0) + (totalCreations > 0 ? 25 : 0) + (totalResearch > 0 ? 25 : 0) + (totalPapers > 0 ? 25 : 0))))

  return (
    <div ref={dashRef} className="dashboard-root" style={{
      height: '100%', overflowY: 'auto', padding: '28px 24px',
      background: 'linear-gradient(180deg, #171717 0%, #1a1a2e 50%, #16213e 100%)',
    }}>
      <style>{`
        .dashboard-root { scroll-behavior: smooth; }
        .dash-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
          will-change: transform;
        }
        .dash-card:hover {
          box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 0 30px rgba(255,255,255,0.02);
        }
        .stat-glow {
          position: absolute; top: -20px; right: -20px; width: 80px; height: 80px;
          border-radius: 50%; filter: blur(30px); opacity: 0.15; pointer-events: none;
          transition: opacity 0.3s;
        }
        .dash-card:hover .stat-glow { opacity: 0.3; }
        .tab-btn {
          padding: 8px 20px; border: none; border-radius: 10px; cursor: pointer;
          font-size: 13px; font-weight: 500; transition: all 0.3s;
          font-family: inherit; white-space: nowrap;
        }
        .tab-active {
          background: linear-gradient(135deg, rgba(25,195,125,0.2), rgba(91,95,199,0.2));
          color: #fff; border: 1px solid rgba(255,255,255,0.1);
        }
        .tab-inactive {
          background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.04);
        }
        .tab-inactive:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
        .action-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer; transform-style: preserve-3d;
        }
        .action-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 24px rgba(0,0,0,0.3);
        }
        .timeline-dot {
          width: 32px; height: 32px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: all 0.3s;
        }
        .timeline-item:hover .timeline-dot { transform: scale(1.15); }
        .timeline-item {
          display: flex; gap: 12px; padding: 10px 14px; border-radius: 10px;
          transition: all 0.2s; cursor: default;
        }
        .timeline-item:hover { background: rgba(255,255,255,0.03); }
        .bar-chart-bar {
          transition: height 1s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
          border-radius: 4px 4px 0 0;
        }
        @keyframes dashFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dashSlide { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulseRing { 0%, 100% { box-shadow: 0 0 0 0 rgba(25,195,125,0.2); } 50% { box-shadow: 0 0 0 8px rgba(25,195,125,0); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

        @media (max-width: 768px) {
          .dashboard-root {
            padding: 16px 8px !important;
          }
          .profile-container {
            max-width: 100% !important;
            padding: 0 4px !important;
          }
          .profile-header {
            flex-direction: column !important;
            text-align: center !important;
            padding: 20px 16px !important;
            gap: 14px !important;
          }
          .profile-header-info {
            align-items: center !important;
          }
          .profile-header-info h1 {
            font-size: 20px !important;
          }
          .profile-header-info > div {
            justify-content: center !important;
          }
          .profile-avatar {
            width: 56px !important;
            height: 56px !important;
            font-size: 22px !important;
          }
          .profile-avatar-badge {
            width: 18px !important;
            height: 18px !important;
          }
          .profile-score-badge {
            padding: 8px 16px !important;
          }
          .profile-score-badge span:first-child {
            font-size: 20px !important;
          }
          .profile-tabs {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .tab-btn {
            padding: 7px 14px !important;
            font-size: 12px !important;
          }
          .profile-stats-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .profile-card {
            padding: 16px !important;
          }
          .profile-card .stat-value {
            font-size: 24px !important;
          }
          .profile-card .sparkline-wrap svg {
            width: 80px !important;
          }
          .profile-actions-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .profile-two-col {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .profile-activity-section {
            padding: 16px !important;
          }
          .profile-activity-section .timeline-item {
            padding: 8px 10px !important;
          }
          .profile-activity-rings {
            gap: 8px !important;
          }
          .profile-activity-rings svg {
            width: 60px !important;
            height: 60px !important;
          }
          .profile-analytics-summary {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .profile-analytics-summary > div {
            padding: 14px !important;
          }
          .profile-analytics-summary .analytics-value {
            font-size: 22px !important;
          }
          .profile-analytics-two-col {
            grid-template-columns: 1fr !important;
          }
          .profile-bar-chart {
            height: 120px !important;
            gap: 8px !important;
            padding: 0 4px !important;
          }
          .action-card {
            padding: 14px !important;
          }
          .action-card .action-icon {
            width: 38px !important;
            height: 38px !important;
          }
        }
      `}</style>

      <div className="profile-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* === HEADER === */}
        <div className="profile-header" style={{
          display: 'flex', alignItems: 'center', gap: '20px', padding: '28px 32px',
          borderRadius: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(25,195,125,0.08), rgba(91,95,199,0.08), rgba(228,75,170,0.08))',
          border: '1px solid rgba(255,255,255,0.08)',
          animation: 'dashFadeIn 0.6s ease-out',
        }}>
          {/* Animated background gradient */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.04,
            background: 'linear-gradient(270deg, #19c37d, #5b5fc7, #e44baa, #19c37d)',
            backgroundSize: '400% 400%', animation: 'gradientShift 8s ease infinite',
          }} />

          {/* Avatar with ring */}
          <div style={{ position: 'relative' }}>
            <div className="profile-avatar" style={{
              width: '78px', height: '78px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #19c37d, #5b5fc7, #e44baa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '30px', fontWeight: 700, color: '#fff', flexShrink: 0,
              boxShadow: '0 0 20px rgba(25,195,125,0.3)',
              animation: 'pulseRing 3s infinite',
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="profile-avatar-badge" style={{
              position: 'absolute', bottom: -2, right: -2, width: '22px', height: '22px',
              borderRadius: '50%', background: '#19c37d', border: '3px solid #171717',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
          </div>

          <div className="profile-header-info" style={{ flex: 1, zIndex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 700, margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
              {user?.name || 'Loading...'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 6px 0' }}>
              {user?.email || ''}
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                Joined {joinDate}
              </span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                {daysActive} days active
              </span>
            </div>
          </div>

          {/* Score badge */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', zIndex: 1,
          }}>
            <div className="profile-score-badge" style={{
              padding: '10px 20px', borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(25,195,125,0.15), rgba(91,95,199,0.15))',
              border: '1px solid rgba(25,195,125,0.2)',
            }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#19c37d' }}>{overallScore}</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>/ 100</span>
            </div>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>ACTIVITY SCORE</span>
          </div>
        </div>

        {/* === TAB NAVIGATION === */}
        <div className="profile-tabs" style={{
          display: 'flex', gap: '8px', marginBottom: '20px',
          animation: 'dashFadeIn 0.6s ease-out 0.1s both',
        }}>
          {(['overview', 'activity', 'analytics'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`tab-btn ${activeTab === tab ? 'tab-active' : 'tab-inactive'}`}>
              {tab === 'overview' ? 'Overview' : tab === 'activity' ? 'Activity' : 'Analytics'}
            </button>
          ))}
        </div>

        {/* === OVERVIEW TAB === */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid - 3D Cards */}
            <div className="profile-stats-grid" style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px',
              animation: 'dashFadeIn 0.6s ease-out 0.15s both',
            }}>
              {statCards.map((stat) => (
                <div key={stat.id} className="dash-card profile-card"
                  onMouseMove={(e) => handleMouseMove(e, stat.id)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    padding: '22px', borderRadius: '16px', position: 'relative', overflow: 'hidden',
                    background: stat.gradient,
                    border: `1px solid ${hoveredCard === stat.id ? stat.color + '30' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                  <div className="stat-glow" style={{ background: stat.color }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '0 0 4px 0', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {stat.label}
                      </p>
                      <p className="stat-value" style={{ color: '#fff', fontSize: '32px', fontWeight: 700, margin: 0, lineHeight: 1 }}>
                        {stat.value}
                      </p>
                    </div>
                    <span className="sparkline-wrap"><Sparkline data={stat.sparkData} color={stat.color} height={36} /></span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: 0 }}>{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{
              marginBottom: '24px',
              animation: 'dashFadeIn 0.6s ease-out 0.25s both',
            }}>
              <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: '0 0 14px 0' }}>
                Quick Actions
              </h3>
              <div className="profile-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {quickActions.map((action) => (
                  <div key={action.id} className="action-card"
                    onClick={() => onNavigate?.(action.id)}
                    style={{
                      padding: '18px', borderRadius: '14px',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', gap: '14px',
                    }}>
                    <div className="action-icon" style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: action.gradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {action.icon}
                    </div>
                    <div>
                      <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>{action.label}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: 0 }}>{action.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Two Column: Recent Activity + Activity Rings */}
            <div className="profile-two-col" style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px',
              animation: 'dashFadeIn 0.6s ease-out 0.35s both',
            }}>
              {/* Recent Activity Timeline */}
              <div className="profile-activity-section" style={{
                padding: '22px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0' }}>
                  Recent Activity
                </h3>
                {recentActivity.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                    No activity yet. Start chatting or creating!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '340px', overflowY: 'auto' }}>
                    {recentActivity.map((item, i) => (
                      <div key={i} className="timeline-item" style={{ animation: `dashSlide 0.4s ease-out ${i * 0.05}s both` }}>
                        <div className="timeline-dot" style={{ background: `${item.color}15`, color: item.color }}>
                          {renderIcon(item.icon)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: '0 0 2px 0',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                          }}>
                            {item.title}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{
                              padding: '1px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 500,
                              background: `${item.color}15`, color: item.color, textTransform: 'capitalize',
                            }}>
                              {item.type}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>{timeAgo(item.time)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Rings + Breakdown */}
              <div className="profile-activity-section" style={{
                padding: '22px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 20px 0' }}>
                  Usage Breakdown
                </h3>
                <div className="profile-activity-rings" style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '24px' }}>
                  <ActivityRing percentage={chatRingPct} color="#19c37d" label="Chat" />
                  <ActivityRing percentage={creativeRingPct} color="#ec4899" label="Creative" />
                  <ActivityRing percentage={researchRingPct} color="#a855f7" label="Research" />
                </div>

                {/* Breakdown list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Images Generated', value: imageCount, color: '#ec4899' },
                    { label: 'Videos Created', value: videoCount, color: '#f97316' },
                    { label: '3D Models', value: threeDCount, color: '#06b6d4' },
                    { label: 'Map Snapshots', value: mapCount, color: '#19c37d' },
                    { label: 'Notes Written', value: totalNotes, color: '#f59e0b' },
                    { label: 'Papers Saved', value: totalPapers, color: '#ef4444' },
                  ].map((item) => (
                    <div key={item.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: item.color }} />
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{item.label}</span>
                      </div>
                      <span style={{ color: item.color, fontSize: '13px', fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* === ACTIVITY TAB === */}
        {activeTab === 'activity' && (
          <div style={{ animation: 'dashFadeIn 0.5s ease-out' }}>
            {/* 7-Day Activity Bar Chart */}
            <div className="profile-activity-section" style={{
              padding: '24px', borderRadius: '16px', marginBottom: '20px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 20px 0' }}>
                Last 7 Days Activity
              </h3>
              <div className="profile-bar-chart" style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px', padding: '0 8px' }}>
                {last7Days.map((day, i) => {
                  const maxVal = Math.max(...last7Days.map(d => d.total), 1)
                  const heightPct = (day.total / maxVal) * 100
                  const msgPct = day.total > 0 ? (day.msgCount / day.total) * 100 : 0
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 500 }}>{day.total}</span>
                      <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <div className="bar-chart-bar" style={{
                          width: '100%', height: `${Math.max(4, heightPct * 1.2)}px`,
                          background: `linear-gradient(180deg, #19c37d ${msgPct}%, #a855f7 100%)`,
                          opacity: 0.8,
                        }} />
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{dayLabels[i]}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '14px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#19c37d' }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Messages</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#a855f7' }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Research</span>
                </div>
              </div>
            </div>

            {/* Full Activity Timeline */}
            <div className="profile-activity-section" style={{
              padding: '24px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0' }}>
                All Recent Activity
              </h3>
              {recentActivity.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
                  No activity yet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {recentActivity.map((item, i) => (
                    <div key={i} className="timeline-item" style={{
                      animation: `dashSlide 0.4s ease-out ${i * 0.04}s both`,
                      borderLeft: `2px solid ${item.color}20`,
                      marginLeft: '14px', paddingLeft: '20px', position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute', left: '-7px', top: '14px',
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: item.color, border: '2px solid #1a1a2e',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          color: 'rgba(255,255,255,0.75)', fontSize: '13px', margin: '0 0 4px 0',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                        }}>
                          {item.title}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{
                            padding: '2px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 500,
                            background: `${item.color}15`, color: item.color, textTransform: 'capitalize',
                          }}>
                            {item.type}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{timeAgo(item.time)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === ANALYTICS TAB === */}
        {activeTab === 'analytics' && (
          <div style={{ animation: 'dashFadeIn 0.5s ease-out' }}>
            {/* Summary Cards */}
            <div className="profile-analytics-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Total Items', value: totalChats + totalCreations + totalResearch + totalPapers + totalNotes, color: '#19c37d' },
                { label: 'Days Active', value: daysActive, color: '#06b6d4' },
                { label: 'Avg Msgs/Day', value: avgMessagesPerDay, color: '#a855f7' },
                { label: 'Productivity', value: `${overallScore}%`, color: '#f97316' },
              ].map((item) => (
                <div key={item.label} style={{
                  padding: '20px', borderRadius: '14px', textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <p className="analytics-value" style={{ color: item.color, fontSize: '28px', fontWeight: 700, margin: '0 0 4px 0' }}>{item.value}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</p>
                </div>
              ))}
            </div>

            {/* Content Distribution */}
            <div className="profile-analytics-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Creations pie-like display */}
              <div style={{
                padding: '24px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 18px 0' }}>
                  Content Distribution
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'Conversations', value: totalChats, total: totalChats + totalCreations + totalResearch + totalPapers, color: '#19c37d' },
                    { label: 'AI Creations', value: totalCreations, total: totalChats + totalCreations + totalResearch + totalPapers, color: '#ec4899' },
                    { label: 'Research Sessions', value: totalResearch, total: totalChats + totalCreations + totalResearch + totalPapers, color: '#a855f7' },
                    { label: 'Papers & Notes', value: totalPapers + totalNotes, total: totalChats + totalCreations + totalResearch + totalPapers, color: '#f59e0b' },
                  ].map((item) => {
                    const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0
                    return (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{item.label}</span>
                          <span style={{ color: item.color, fontSize: '12px', fontWeight: 600 }}>{item.value} ({pct}%)</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '3px', background: item.color, width: `${pct}%`,
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Model Usage / Research modes */}
              <div style={{
                padding: '24px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 18px 0' }}>
                  Research Modes Used
                </h3>
                {(() => {
                  const modes: Record<string, number> = {}
                  research?.forEach((r: any) => { modes[r.mode] = (modes[r.mode] || 0) + 1 })
                  const entries = Object.entries(modes).sort((a, b) => b[1] - a[1])
                  const modeColors: Record<string, string> = {
                    quick: '#19c37d', deep: '#a855f7', compare: '#06b6d4',
                    summary: '#f59e0b', explain: '#ec4899', brainstorm: '#f97316',
                  }
                  if (entries.length === 0) return (
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                      No research yet
                    </p>
                  )
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {entries.map(([mode, count]) => {
                        const total = research?.length || 1
                        const pct = Math.round((count / total) * 100)
                        const color = modeColors[mode] || '#8b5cf6'
                        return (
                          <div key={mode}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'capitalize' }}>{mode}</span>
                              <span style={{ color, fontSize: '12px', fontWeight: 600 }}>{count} ({pct}%)</span>
                            </div>
                            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: '3px', background: color, width: `${pct}%`,
                                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                              }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Top Chats & Top Research */}
            <div className="profile-analytics-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{
                padding: '22px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: '#19c37d' }} />
                  Recent Conversations
                </h3>
                {(threads || []).slice(0, 6).map((thread: any, i: number) => (
                  <div key={thread._id} style={{
                    padding: '10px 12px', borderRadius: '8px', marginBottom: '4px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    animation: `dashSlide 0.3s ease-out ${i * 0.05}s both`,
                  }}>
                    <p style={{
                      color: 'rgba(255,255,255,0.65)', fontSize: '12px', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1,
                    }}>
                      {thread.title}
                    </p>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', flexShrink: 0, marginLeft: '8px' }}>
                      {timeAgo(thread.updatedAt)}
                    </span>
                  </div>
                ))}
                {(!threads || threads.length === 0) && (
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', textAlign: 'center', padding: '15px 0' }}>No conversations yet</p>
                )}
              </div>

              <div style={{
                padding: '22px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: '#a855f7' }} />
                  Recent Research
                </h3>
                {(research || []).slice(0, 6).map((r: any, i: number) => (
                  <div key={r._id} style={{
                    padding: '10px 12px', borderRadius: '8px', marginBottom: '4px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)',
                    animation: `dashSlide 0.3s ease-out ${i * 0.05}s both`,
                  }}>
                    <p style={{
                      color: 'rgba(255,255,255,0.65)', fontSize: '12px', margin: '0 0 3px 0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    }}>
                      {r.query}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ padding: '1px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 500, background: 'rgba(168,85,247,0.1)', color: '#a855f7', textTransform: 'capitalize' }}>
                        {r.mode}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>{timeAgo(r.createdAt)}</span>
                      {r.saved && <span style={{ fontSize: '9px', color: '#f59e0b' }}>Saved</span>}
                    </div>
                  </div>
                ))}
                {(!research || research.length === 0) && (
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', textAlign: 'center', padding: '15px 0' }}>No research yet</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
