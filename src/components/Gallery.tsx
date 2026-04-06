import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface GalleryProps {
  userId: string
  onBack: () => void
}

type FilterType = 'all' | 'image' | 'video' | '3d' | 'map_snapshot'

export default function Gallery({ userId, onBack }: GalleryProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const creations = useQuery(api.creative.getCreations, {
    userId: userId as any,
    type: filter !== 'all' ? filter as any : undefined,
  })
  const deleteCreation = useMutation(api.creative.deleteCreation)

  const downloadItem = (dataUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    link.click()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this creation?')) {
      await deleteCreation({ id: id as any, userId: userId as any })
      setSelectedItem(null)
    }
  }

  const filters: { key: FilterType; label: string; icon: string; color: string }[] = [
    { key: 'all', label: 'All', icon: '????', color: '#8b5cf6' },
    { key: 'image', label: 'Images', icon: '????', color: '#f97316' },
    { key: 'video', label: 'Videos', icon: '????', color: '#10b981' },
    { key: '3d', label: '3D Scenes', icon: '????', color: '#06b6d4' },
  ]

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'image': return 'Image'
      case 'video': return 'Video'
      case '3d': return '3D Scene'
      case 'map_snapshot': return 'Map'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'image': return '#f97316'
      case 'video': return '#10b981'
      case '3d': return '#06b6d4'
      case 'map_snapshot': return '#f59e0b'
      default: return '#8b5cf6'
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div className="gal-topbar" style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff',
          width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#fff' }}>My Gallery</h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            {creations ? `${creations.length} creations` : 'Loading...'}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '8px 10px', borderRadius: '8px', border: 'none',
              background: viewMode === 'grid' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
              color: viewMode === 'grid' ? '#8b5cf6' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '8px 10px', borderRadius: '8px', border: 'none',
              background: viewMode === 'list' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
              color: viewMode === 'list' ? '#8b5cf6' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="gal-filters" style={{
        padding: '12px 24px',
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontFamily: 'inherit', fontWeight: 500,
              background: filter === f.key ? `${f.color}20` : 'rgba(255,255,255,0.04)',
              color: filter === f.key ? f.color : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="gal-content" style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {!creations ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>
            Loading...
          </div>
        ) : creations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" style={{ marginBottom: '16px' }}>
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M2 12h20" />
              <path d="M12 2v20" />
            </svg>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px', marginBottom: '8px' }}>
              No creations yet
            </p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
              Go to Image Studio, 3D Studio, or Video Studio to create something!
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="gal-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
          }}>
            {creations.map((item: any) => (
              <div
                key={item._id}
                onClick={() => setSelectedItem(item)}
                style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Preview */}
                <div className="gal-card-preview" style={{
                  height: '180px', background: '#0a0a0a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {item.type === 'image' && item.dataUrl ? (
                    <img src={item.dataUrl} alt={item.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : item.type === 'video' && item.dataUrl ? (
                    <video src={item.dataUrl} muted loop style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                    />
                  ) : item.type === '3d' ? (
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.2)', fontSize: '24px',
                    }}>
                      ?
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500,
                      background: `${getTypeColor(item.type)}15`, color: getTypeColor(item.type),
                    }}>
                      {getTypeLabel(item.type)}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{
                    color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    lineHeight: 1.4,
                  }}>
                    {item.prompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="gal-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '800px' }}>
            {creations.map((item: any) => (
              <div
                key={item._id}
                className="gal-list-item"
                onClick={() => setSelectedItem(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '12px 16px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                {/* Thumbnail */}
                <div className="gal-thumb" style={{
                  width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
                  background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.type === 'image' && item.dataUrl ? (
                    <img src={item.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={getTypeColor(item.type)} strokeWidth="1.5">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{
                    color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                  }}>
                    {item.prompt}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: '8px', fontSize: '10px',
                      background: `${getTypeColor(item.type)}15`, color: getTypeColor(item.type),
                    }}>
                      {getTypeLabel(item.type)}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="gal-list-actions" style={{ display: 'flex', gap: '6px' }}>
                  {item.dataUrl && (
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadItem(item.dataUrl, `creation-${item._id}.${item.type === 'video' ? 'mp4' : 'png'}`) }}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)',
                        background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer',
                        fontSize: '11px', fontFamily: 'inherit',
                      }}
                    >
                      Download
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item._id) }}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)',
                      background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer',
                      fontSize: '11px', fontFamily: 'inherit',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div
          className="gal-modal-overlay"
          onClick={() => setSelectedItem(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '40px',
          }}
        >
          <div
            className="gal-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '800px', width: '100%', borderRadius: '16px',
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Preview */}
            <div className="gal-modal-preview" style={{ maxHeight: '500px', overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center' }}>
              {selectedItem.type === 'image' && selectedItem.dataUrl ? (
                <img className="gal-modal-img" src={selectedItem.dataUrl} alt={selectedItem.prompt} style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }} />
              ) : selectedItem.type === 'video' && selectedItem.dataUrl ? (
                <video className="gal-modal-vid" src={selectedItem.dataUrl} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '500px' }} />
              ) : (
                <div style={{
                  width: '100%', height: '300px',
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.3)', fontSize: '18px',
                }}>
                  {getTypeLabel(selectedItem.type)} Preview
                </div>
              )}
            </div>

            {/* Details */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500,
                  background: `${getTypeColor(selectedItem.type)}15`, color: getTypeColor(selectedItem.type),
                }}>
                  {getTypeLabel(selectedItem.type)}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(selectedItem.createdAt).toLocaleString()}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  Model: {selectedItem.model?.split('/').pop() || 'Unknown'}
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                {selectedItem.prompt}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedItem.dataUrl && (
                  <button
                    onClick={() => downloadItem(selectedItem.dataUrl, `creation.${selectedItem.type === 'video' ? 'mp4' : 'png'}`)}
                    style={{
                      padding: '10px 20px', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit',
                    }}
                  >
                    Download
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedItem._id)}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                    cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', marginLeft: 'auto',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .gal-topbar {
            padding: 12px 16px !important;
            gap: 10px !important;
          }
          .gal-filters {
            padding: 10px 16px !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            flex-wrap: nowrap !important;
          }
          .gal-filters::-webkit-scrollbar {
            display: none !important;
          }
          .gal-filters button {
            flex-shrink: 0 !important;
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
          .gal-content {
            padding: 12px !important;
          }
          .gal-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important;
            gap: 10px !important;
          }
          .gal-card-preview {
            height: 140px !important;
          }
          .gal-list-item {
            flex-wrap: wrap !important;
            gap: 10px !important;
            padding: 10px 12px !important;
          }
          .gal-thumb {
            width: 44px !important;
            height: 44px !important;
          }
          .gal-list-actions {
            width: 100% !important;
            justify-content: flex-end !important;
          }
          .gal-modal-overlay {
            padding: 16px !important;
          }
          .gal-modal {
            max-width: 95vw !important;
            border-radius: 12px !important;
          }
          .gal-modal-preview {
            max-height: 250px !important;
          }
          .gal-modal-img {
            max-height: 250px !important;
          }
          .gal-modal-vid {
            max-height: 250px !important;
          }
        }
      `}</style>
    </div>
  )
}
