import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Plus, X, Edit, Trash2, Share, Download, Upload } from 'lucide-react'

interface FloatingActionItem {
  id: string
  icon: React.ReactNode
  label: string
  color: string
  onPress: () => void
}

interface FloatingActionMenuProps {
  items: FloatingActionItem[]
  mainIcon?: React.ReactNode
  mainButtonColor?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  className?: string
  disabled?: boolean
}

export function FloatingActionMenu({
  items,
  mainIcon,
  mainButtonColor = 'bg-primary',
  position = 'bottom-right',
  className,
  disabled = false
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'bottom-6 right-6'
      case 'bottom-left':
        return 'bottom-6 left-6'
      case 'top-right':
        return 'top-6 right-6'
      case 'top-left':
        return 'top-6 left-6'
      default:
        return 'bottom-6 right-6'
    }
  }

  const getItemAnimationClasses = (index: number) => {
    const baseClasses = 'absolute transition-all duration-300 ease-out'
    
    if (!isOpen) {
      return `${baseClasses} opacity-0 scale-50`
    }

    const positions = getPositionClasses()
    const isBottom = positions.includes('bottom')
    const isRight = positions.includes('right')

    let transform = ''
    let distance = 70 // Distance from main button

    if (isBottom) {
      if (isRight) {
        // Bottom-right: fan out upwards and to the left
        const angle = (index * 45) - 90 // -90 to 90 degrees
        const x = Math.cos(angle * Math.PI / 180) * distance
        const y = Math.sin(angle * Math.PI / 180) * distance
        transform = `translate(${x}px, ${y}px)`
      } else {
        // Bottom-left: fan out upwards and to the right
        const angle = (index * 45) - 90 // -90 to 90 degrees
        const x = Math.cos(angle * Math.PI / 180) * distance
        const y = Math.sin(angle * Math.PI / 180) * distance
        transform = `translate(${-x}px, ${y}px)`
      }
    } else {
      if (isRight) {
        // Top-right: fan out downwards and to the left
        const angle = (index * 45) + 90 // 90 to 270 degrees
        const x = Math.cos(angle * Math.PI / 180) * distance
        const y = Math.sin(angle * Math.PI / 180) * distance
        transform = `translate(${x}px, ${y}px)`
      } else {
        // Top-left: fan out downwards and to the right
        const angle = (index * 45) + 90 // 90 to 270 degrees
        const x = Math.cos(angle * Math.PI / 180) * distance
        const y = Math.sin(angle * Math.PI / 180) * distance
        transform = `translate(${-x}px, ${y}px)`
      }
    }

    return `${baseClasses} opacity-100 scale-100 ${transform}`
  }

  const toggleMenu = () => {
    if (disabled) return
    
    if (isOpen) {
      setIsAnimating(true)
      setIsOpen(false)
      setTimeout(() => setIsAnimating(false), 300)
    } else {
      setIsOpen(true)
    }
  }

  const handleItemClick = (onPress: () => void) => {
    onPress()
    toggleMenu()
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (isOpen) {
          toggleMenu()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        toggleMenu()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div 
      ref={menuRef}
      className={cn(
        "fixed z-50",
        getPositionClasses(),
        className
      )}
    >
      {/* Action Items */}
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => handleItemClick(item.onPress)}
          className={cn(
            getItemAnimationClasses(index),
            "w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform",
            item.color,
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
          style={{ zIndex: 40 - index }}
        >
          {item.icon}
        </button>
      ))}

      {/* Main Button */}
      <button
        onClick={toggleMenu}
        className={cn(
          "w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-primary/50",
          mainButtonColor,
          isOpen && "rotate-45",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        disabled={disabled}
        style={{ zIndex: 50 }}
      >
        {mainIcon || (isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />)}
      </button>

      {/* Labels */}
      {isOpen && items.map((item, index) => {
        const positions = getPositionClasses()
        const isBottom = positions.includes('bottom')
        const isRight = positions.includes('right')

        let labelPosition = {}
        let distance = 90 // Distance from main button

        if (isBottom) {
          if (isRight) {
            // Bottom-right
            const angle = (index * 45) - 90
            const x = Math.cos(angle * Math.PI / 180) * distance
            const y = Math.sin(angle * Math.PI / 180) * distance
            labelPosition = { right: `${-x - 20}px`, bottom: `${-y + 8}px` }
          } else {
            // Bottom-left
            const angle = (index * 45) - 90
            const x = Math.cos(angle * Math.PI / 180) * distance
            const y = Math.sin(angle * Math.PI / 180) * distance
            labelPosition = { left: `${-x + 20}px`, bottom: `${-y + 8}px` }
          }
        } else {
          if (isRight) {
            // Top-right
            const angle = (index * 45) + 90
            const x = Math.cos(angle * Math.PI / 180) * distance
            const y = Math.sin(angle * Math.PI / 180) * distance
            labelPosition = { right: `${-x - 20}px`, top: `${-y - 8}px` }
          } else {
            // Top-left
            const angle = (index * 45) + 90
            const x = Math.cos(angle * Math.PI / 180) * distance
            const y = Math.sin(angle * Math.PI / 180) * distance
            labelPosition = { left: `${-x + 20}px`, top: `${-y - 8}px` }
          }
        }

        return (
          <div
            key={`label-${item.id}`}
            className={cn(
              "absolute px-3 py-1 bg-black/80 text-white text-sm rounded-lg whitespace-nowrap transition-all duration-300",
              isOpen ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )}
            style={{
              ...labelPosition,
              zIndex: 40 - index
            }}
          >
            {item.label}
          </div>
        )
      })}
    </div>
  )
}

// Preset menu configurations
export const EditFloatingMenu = ({ onEdit, onDelete, onShare }: {
  onEdit: () => void
  onDelete: () => void
  onShare: () => void
}) => (
  <FloatingActionMenu
    items={[
      {
        id: 'edit',
        icon: <Edit className="h-6 w-6" />,
        label: 'Edit',
        color: 'bg-blue-500',
        onPress: onEdit
      },
      {
        id: 'delete',
        icon: <Trash2 className="h-6 w-6" />,
        label: 'Delete',
        color: 'bg-red-500',
        onPress: onDelete
      },
      {
        id: 'share',
        icon: <Share className="h-6 w-6" />,
        label: 'Share',
        color: 'bg-green-500',
        onPress: onShare
      }
    ]}
    position="bottom-right"
  />
)

export const FileFloatingMenu = ({ onUpload, onDownload, onNew }: {
  onUpload: () => void
  onDownload: () => void
  onNew: () => void
}) => (
  <FloatingActionMenu
    items={[
      {
        id: 'upload',
        icon: <Upload className="h-6 w-6" />,
        label: 'Upload',
        color: 'bg-purple-500',
        onPress: onUpload
      },
      {
        id: 'download',
        icon: <Download className="h-6 w-6" />,
        label: 'Download',
        color: 'bg-orange-500',
        onPress: onDownload
      },
      {
        id: 'new',
        icon: <Plus className="h-6 w-6" />,
        label: 'New File',
        color: 'bg-green-500',
        onPress: onNew
      }
    ]}
    position="bottom-left"
  />
)

export const QuickActionsMenu = ({ 
  onCreate, 
  onImport, 
  onExport, 
  onSettings 
}: {
  onCreate: () => void
  onImport: () => void
  onExport: () => void
  onSettings: () => void
}) => (
  <FloatingActionMenu
    items={[
      {
        id: 'create',
        icon: <Plus className="h-6 w-6" />,
        label: 'Create',
        color: 'bg-green-500',
        onPress: onCreate
      },
      {
        id: 'import',
        icon: <Download className="h-6 w-6" />,
        label: 'Import',
        color: 'bg-blue-500',
        onPress: onImport
      },
      {
        id: 'export',
        icon: <Upload className="h-6 w-6" />,
        label: 'Export',
        color: 'bg-purple-500',
        onPress: onExport
      },
      {
        id: 'settings',
        icon: <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>,
        label: 'Settings',
        color: 'bg-gray-500',
        onPress: onSettings
      }
    ]}
    position="bottom-right"
  />
)