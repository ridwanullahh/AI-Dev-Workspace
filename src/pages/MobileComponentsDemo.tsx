import React, { useState, useEffect } from 'react'
import { CardSwipe } from '@/components/ui/mobile-optimized/CardSwipe'
import { BottomSheet } from '@/components/ui/mobile-optimized/BottomSheet'
import { PullToRefresh } from '@/components/ui/mobile-optimized/PullToRefresh'
import { InfiniteScroll, SwipeableList, SwipeableTaskItem } from '@/components/ui/mobile-optimized'
import { GestureNavigation } from '@/components/ui/mobile-optimized/GestureNavigation'
import { QuickActionsMenu, EditFloatingMenu, FileFloatingMenu } from '@/components/ui/mobile-optimized/FloatingActionMenu'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Heart, 
  Star, 
  Trash2, 
  Archive, 
  Plus, 
  Edit, 
  Share, 
  Download, 
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2
} from 'lucide-react'

export function MobileComponentsDemo() {
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Design new UI components', completed: false },
    { id: '2', title: 'Implement mobile gestures', completed: false },
    { id: '3', title: 'Test accessibility features', completed: true },
    { id: '4', title: 'Optimize performance', completed: false },
    { id: '5', title: 'Write documentation', completed: false }
  ])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  // Demo data for carousel
  const carouselItems = [
    <div key="1" className="h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Card 1</h2>
        <p>Swipe to navigate</p>
      </div>
    </div>,
    <div key="2" className="h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600 text-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Card 2</h2>
        <p>Gesture navigation</p>
      </div>
    </div>,
    <div key="3" className="h-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 text-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Card 3</h2>
        <p>Mobile optimized</p>
      </div>
    </div>
  ]

  const handleRefresh = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setRefreshCount(prev => prev + 1)
    setLoading(false)
  }

  const loadMoreTasks = async () => {
    // Simulate loading more tasks
    await new Promise(resolve => setTimeout(resolve, 1000))
    const newTasks = Array.from({ length: 5 }, (_, i) => ({
      id: `${tasks.length + i + 1}`,
      title: `Task ${tasks.length + i + 1}`,
      completed: Math.random() > 0.5
    }))
    setTasks(prev => [...prev, ...newTasks])
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }

  const handleArchiveTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, title: `[Archived] ${task.title}` } : task
    ))
  }

  const handleStarTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, title: `⭐ ${task.title}` } : task
    ))
  }

  const handleCreateTask = () => {
    const newTask = {
      id: `${tasks.length + 1}`,
      title: `New Task ${tasks.length + 1}`,
      completed: false
    }
    setTasks(prev => [newTask, ...prev])
  }

  const handleImport = () => {
    alert('Import functionality would open file picker')
  }

  const handleExport = () => {
    alert('Export functionality would save data')
  }

  const handleSettings = () => {
    alert('Settings panel would open')
  }

  return (
    <div className="space-y-8 p-4 pb-24">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Mobile-Optimized UI Components</h1>
        <p className="text-muted-foreground">
          Interactive demo of mobile-first components with gestures and animations
        </p>
        <Badge variant="secondary">Refresh Count: {refreshCount}</Badge>
      </div>

      {/* Card Swipe Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Card Swipe Component
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Swipe left or right on the cards below to trigger actions
          </p>
          <div className="space-y-4">
            <CardSwipe
              onSwipeLeft={() => alert('Swiped left - Dislike')}
              onSwipeRight={() => alert('Swiped right - Like')}
              threshold={60}
            >
              <Card className="p-6">
                <div className="text-center space-y-2">
                  <div className="text-4xl">🎨</div>
                  <h3 className="font-semibold">Design Project</h3>
                  <p className="text-sm text-muted-foreground">Swipe to interact</p>
                </div>
              </Card>
            </CardSwipe>

            <CardSwipe
              onSwipeLeft={() => alert('Swiped left - Pass')}
              onSwipeRight={() => alert('Swiped right - Save')}
              threshold={60}
            >
              <Card className="p-6">
                <div className="text-center space-y-2">
                  <div className="text-4xl">🚀</div>
                  <h3 className="font-semibold">Mobile App</h3>
                  <p className="text-sm text-muted-foreground">Gesture-based UI</p>
                </div>
              </Card>
            </CardSwipe>
          </div>
        </CardContent>
      </Card>

      {/* Pull to Refresh Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Pull to Refresh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Pull down from the top to refresh the content
          </p>
          <PullToRefresh
            onRefresh={handleRefresh}
            loading={loading}
            threshold={80}
          >
            <div className="space-y-3">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium">Refresh Item {i + 1}</h4>
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </PullToRefresh>
        </CardContent>
      </Card>

      {/* Swipeable List Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Swipeable List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Swipe left or right on list items to reveal actions
          </p>
          <SwipeableList>
            {tasks.slice(0, 5).map((task) => (
              <SwipeableTaskItem
                key={task.id}
                onDelete={() => handleDeleteTask(task.id)}
                onArchive={() => handleArchiveTask(task.id)}
                onStar={() => handleStarTask(task.id)}
              >
                <div className="p-3 bg-background rounded-lg border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.completed && (
                      <Badge variant="outline">Completed</Badge>
                    )}
                  </div>
                </div>
              </SwipeableTaskItem>
            ))}
          </SwipeableList>
        </CardContent>
      </Card>

      {/* Infinite Scroll Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5" />
            Infinite Scroll
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Scroll to the bottom to load more items
          </p>
          <div className="max-h-64 overflow-y-auto border rounded-lg">
            <InfiniteScroll
              loadMore={loadMoreTasks}
              hasMore={tasks.length < 20}
              loading={loading}
              threshold={100}
            >
              <div className="space-y-2 p-4">
                {tasks.map((task) => (
                  <div key={task.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.completed && (
                        <Badge variant="outline">Completed</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </InfiniteScroll>
          </div>
        </CardContent>
      </Card>

      {/* Gesture Navigation Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChevronLeft className="h-5 w-5" />
            Gesture Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Swipe or use arrow keys to navigate between cards
          </p>
          <GestureNavigation
            onSwipeLeft={() => setCarouselIndex((prev) => (prev + 1) % carouselItems.length)}
            onSwipeRight={() => setCarouselIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length)}
          >
            {carouselItems[carouselIndex]}
          </GestureNavigation>
        </CardContent>
      </Card>

      {/* Bottom Sheet Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Bottom Sheet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Click the button to open a bottom sheet
          </p>
          <Button onClick={() => setShowBottomSheet(true)} className="w-full">
            Open Bottom Sheet
          </Button>

          <BottomSheet
            isOpen={showBottomSheet}
            onClose={() => setShowBottomSheet(false)}
            title="Example Bottom Sheet"
            defaultHeight="60vh"
          >
            <div className="space-y-4 p-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input placeholder="Enter your name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea 
                  placeholder="Enter your message" 
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button className="flex-1">
                  Save
                </Button>
              </div>
            </div>
          </BottomSheet>
        </CardContent>
      </Card>

      {/* Floating Action Menu Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Floating Action Menu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Click the floating button to reveal action menu
          </p>
          <div className="relative h-32 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Floating menus appear in corners</p>
            
            {/* Edit Menu */}
            <EditFloatingMenu
              onEdit={() => alert('Edit clicked')}
              onDelete={() => alert('Delete clicked')}
              onShare={() => alert('Share clicked')}
            />
            
            {/* File Menu */}
            <FileFloatingMenu
              onUpload={() => alert('Upload clicked')}
              onDownload={() => alert('Download clicked')}
              onNew={handleCreateTask}
            />
            
            {/* Quick Actions Menu */}
            <QuickActionsMenu
              onCreate={handleCreateTask}
              onImport={handleImport}
              onExport={handleExport}
              onSettings={handleSettings}
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <h4 className="font-medium mb-1">CardSwipe</h4>
            <p className="text-muted-foreground">
              Wrap any content with swipe gestures. Configure callbacks for left/right swipes.
            </p>
          </div>
          <div className="text-sm">
            <h4 className="font-medium mb-1">PullToRefresh</h4>
            <p className="text-muted-foreground">
              Add pull-to-refresh functionality to any scrollable content.
            </p>
          </div>
          <div className="text-sm">
            <h4 className="font-medium mb-1">SwipeableList</h4>
            <p className="text-muted-foreground">
              Create list items with swipe actions for quick operations.
            </p>
          </div>
          <div className="text-sm">
            <h4 className="font-medium mb-1">InfiniteScroll</h4>
            <p className="text-muted-foreground">
              Automatically load more content when user scrolls to bottom.
            </p>
          </div>
          <div className="text-sm">
            <h4 className="font-medium mb-1">GestureNavigation</h4>
            <p className="text-muted-foreground">
              Add swipe navigation with visual feedback and indicators.
            </p>
          </div>
          <div className="text-sm">
            <h4 className="font-medium mb-1">BottomSheet</h4>
            <p className="text-muted-foreground">
              Create slide-up panels that work great on mobile devices.
            </p>
          </div>
          <div className="text-sm">
            <h4 className="font-medium mb-1">FloatingActionMenu</h4>
            <p className="text-muted-foreground">
              Add quick action menus that expand from a floating button.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MobileComponentsDemo;