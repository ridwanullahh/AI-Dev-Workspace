import React, { useState, useEffect } from 'react'
import { deploymentManager } from '@/services/deploymentManager'
import { useEnhancedProjectStore } from '@/stores/enhancedProjectStore'
import { 
  Rocket,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  ExternalLink,
  GitBranch,
  GitCommit,
  Server,
  Globe,
  Zap,
  BarChart3,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

interface DeploymentConfigCardProps {
  config: any
  platform: any
  onDeploy: (configId: string) => void
  onDelete: (configId: string) => void
  onEdit: (configId: string) => void
}

function DeploymentConfigCard({ config, platform, onDeploy, onDelete, onEdit }: DeploymentConfigCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'text-green-500'
      case 'deploying': return 'text-blue-500'
      case 'failed': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed': return <CheckCircle className="h-4 w-4" />
      case 'deploying': return <Activity className="h-4 w-4 animate-spin" />
      case 'failed': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{config.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{platform.name}</p>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(config.status)}
            <span className={`text-xs ${getStatusColor(config.status)}`}>
              {config.status}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Platform</span>
            <Badge variant="outline">{platform.name}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <Badge variant="secondary">{platform.type}</Badge>
          </div>
          {config.lastDeployed && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Deployed</span>
              <span>{new Date(config.lastDeployed).toLocaleDateString()}</span>
            </div>
          )}
          {config.deploymentUrl && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">URL</span>
              <a 
                href={config.deploymentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Visit
              </a>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => onDeploy(config.id)}
            className="flex-1"
            disabled={config.status === 'deploying'}
          >
            <Rocket className="h-4 w-4 mr-2" />
            Deploy
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onEdit(config.id)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onDelete(config.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface DeploymentCardProps {
  deployment: any
  config?: any
  platform?: any
  onCancel?: (deploymentId: string) => void
  onViewLogs: (deploymentId: string) => void
}

function DeploymentCard({ deployment, config, platform, onCancel, onViewLogs }: DeploymentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500'
      case 'failed': return 'text-red-500'
      case 'deploying': return 'text-blue-500'
      case 'building': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />
      case 'failed': return <XCircle className="h-4 w-4" />
      case 'deploying': return <Upload className="h-4 w-4 animate-pulse" />
      case 'building': return <Activity className="h-4 w-4 animate-spin" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const start = new Date(startTime).getTime()
    const end = endTime ? new Date(endTime).getTime() : Date.now()
    const duration = Math.floor((end - start) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m`
    return `${Math.floor(duration / 3600)}h`
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(deployment.status)}
            <div>
              <h4 className="font-medium">Deployment {deployment.id.slice(-8)}</h4>
              <p className="text-sm text-muted-foreground">
                {config?.name} • {platform?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={deployment.status === 'success' ? 'default' : 'secondary'}>
              {deployment.status}
            </Badge>
            <Badge variant="outline">{deployment.environment}</Badge>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Branch</span>
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {deployment.branch}
            </span>
          </div>
          {deployment.commitHash && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Commit</span>
              <span className="flex items-center gap-1">
                <GitCommit className="h-3 w-3" />
                {deployment.commitHash.slice(0, 7)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span>{formatDuration(deployment.startTime, deployment.endTime)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Started</span>
            <span>{new Date(deployment.startTime).toLocaleString()}</span>
          </div>
        </div>

        {deployment.url && (
          <div className="mt-3">
            <a 
              href={deployment.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View Deployment
            </a>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewLogs(deployment.id)}
            className="flex-1"
          >
            <Activity className="h-3 w-3 mr-1" />
            Logs
          </Button>
          {deployment.status === 'building' || deployment.status === 'deploying' ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onCancel?.(deployment.id)}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function DeploymentPage() {
  const { projects, currentProject } = useEnhancedProjectStore()
  const [platforms, setPlatforms] = useState<any[]>([])
  const [configs, setConfigs] = useState<any[]>([])
  const [deployments, setDeployments] = useState<any[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreateConfigModal, setShowCreateConfigModal] = useState(false)
  const [showPipelineModal, setShowPipelineModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [selectedDeployment, setSelectedDeployment] = useState<any>(null)
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([])

  const [newConfig, setNewConfig] = useState({
    name: '',
    platformId: '',
    config: {}
  })

  const [newPipeline, setNewPipeline] = useState({
    name: '',
    trigger: 'push' as const,
    branch: 'main',
    steps: []
  })

  useEffect(() => {
    initializeData()
  }, [currentProject])

  const initializeData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      await deploymentManager.initialize()
      
      const [platformsData, configsData, deploymentsData, pipelinesData, statsData] = await Promise.all([
        deploymentManager.getPlatforms(),
        deploymentManager.getDeploymentConfigs(currentProject?.id),
        deploymentManager.getDeployments(currentProject?.id),
        deploymentManager.getCIPipelines(currentProject?.id),
        deploymentManager.getDeploymentStats(currentProject?.id)
      ])

      setPlatforms(platformsData)
      setConfigs(configsData)
      setDeployments(deploymentsData)
      setPipelines(pipelinesData)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployment data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateConfig = async () => {
    if (!newConfig.name || !newConfig.platformId || !currentProject) return

    try {
      await deploymentManager.createDeploymentConfig({
        projectId: currentProject.id,
        platformId: newConfig.platformId,
        name: newConfig.name,
        config: newConfig.config
      })

      setNewConfig({ name: '', platformId: '', config: {} })
      setShowCreateConfigModal(false)
      await initializeData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deployment config')
    }
  }

  const handleDeploy = async (configId: string) => {
    try {
      await deploymentManager.deployProject(configId)
      await initializeData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start deployment')
    }
  }

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this deployment configuration?')) return

    try {
      await deploymentManager.deleteDeploymentConfig(configId)
      await initializeData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deployment config')
    }
  }

  const handleViewLogs = async (deploymentId: string) => {
    try {
      const logs = await deploymentManager.getDeploymentLogs(deploymentId)
      setDeploymentLogs(logs)
      setSelectedDeployment(deployments.find(d => d.id === deploymentId))
      setShowLogsModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployment logs')
    }
  }

  const handleCancelDeployment = async (deploymentId: string) => {
    try {
      await deploymentManager.cancelDeployment(deploymentId)
      await initializeData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel deployment')
    }
  }

  const getPlatformIcon = (type: string) => {
    switch (type) {
      case 'static': return <Globe className="h-5 w-5" />
      case 'server': return <Server className="h-5 w-5" />
      case 'container': return <Zap className="h-5 w-5" />
      case 'function': return <Activity className="h-5 w-5" />
      default: return <Rocket className="h-5 w-5" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto animate-pulse">
            <Rocket className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading deployment data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-destructive rounded-lg flex items-center justify-center mx-auto">
            <Rocket className="w-6 h-6 text-destructive-foreground" />
          </div>
          <p className="text-destructive font-medium">Error loading deployment data</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button onClick={initializeData}>Retry</Button>
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Rocket className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium">No Project Selected</h3>
          <p className="text-muted-foreground">Select a project to manage deployments</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Deployments</h1>
            <p className="text-muted-foreground">
              Manage deployments and CI/CD pipelines for {currentProject.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowPipelineModal(true)} variant="outline">
              <Play className="h-4 w-4 mr-2" />
              CI Pipeline
            </Button>
            <Button onClick={() => setShowCreateConfigModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Deployment
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{stats.totalDeployments}</p>
                <p className="text-xs text-muted-foreground">Total Deployments</p>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{stats.successfulDeployments}</p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{stats.failedDeployments}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-500">
                  {Math.round(stats.averageBuildTime / 1000)}s
                </p>
                <p className="text-xs text-muted-foreground">Avg Build Time</p>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">
                  {Math.round(stats.averageDeployTime / 1000)}s
                </p>
                <p className="text-xs text-muted-foreground">Avg Deploy Time</p>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Tabs defaultValue="deployments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="configs">Configurations</TabsTrigger>
          <TabsTrigger value="pipelines">CI/CD Pipelines</TabsTrigger>
        </TabsList>

        <TabsContent value="deployments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Deployments</h3>
            <Button variant="outline" size="sm" onClick={initializeData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {deployments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Deployments Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a deployment configuration to get started
                </p>
                <Button onClick={() => setShowCreateConfigModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Configuration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deployments
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .map((deployment) => {
                  const config = configs.find(c => c.id === deployment.configId)
                  const platform = platforms.find(p => p.id === config?.platformId)
                  return (
                    <DeploymentCard
                      key={deployment.id}
                      deployment={deployment}
                      config={config}
                      platform={platform}
                      onCancel={handleCancelDeployment}
                      onViewLogs={handleViewLogs}
                    />
                  )
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="configs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Deployment Configurations</h3>
            <Button onClick={() => setShowCreateConfigModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </div>

          {configs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Configurations</h3>
                <p className="text-muted-foreground mb-4">
                  Set up deployment configurations to automate your deployments
                </p>
                <Button onClick={() => setShowCreateConfigModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Configuration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {configs.map((config) => {
                const platform = platforms.find(p => p.id === config.platformId)
                return (
                  <DeploymentConfigCard
                    key={config.id}
                    config={config}
                    platform={platform}
                    onDeploy={handleDeploy}
                    onDelete={handleDeleteConfig}
                    onEdit={() => {}}
                  />
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pipelines" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">CI/CD Pipelines</h3>
            <Button onClick={() => setShowPipelineModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Pipeline
            </Button>
          </div>

          {pipelines.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No CI/CD Pipelines</h3>
                <p className="text-muted-foreground mb-4">
                  Create automated pipelines to build, test, and deploy your code
                </p>
                <Button onClick={() => setShowPipelineModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Pipeline
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pipelines.map((pipeline) => (
                <Card key={pipeline.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{pipeline.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Trigger: {pipeline.trigger} • Branch: {pipeline.branch}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={pipeline.isActive ? 'default' : 'secondary'}>
                          {pipeline.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant={pipeline.status === 'success' ? 'default' : 'secondary'}>
                          {pipeline.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Run
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Deployment Config Modal */}
      {showCreateConfigModal && (
        <Dialog open={showCreateConfigModal} onOpenChange={setShowCreateConfigModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Deployment Configuration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Configuration Name</label>
                <Input
                  value={newConfig.name}
                  onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                  placeholder="e.g., Production Deployment"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Platform</label>
                <Select
                  value={newConfig.platformId}
                  onValueChange={(value) => setNewConfig({ ...newConfig, platformId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a platform..." />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(platform.type)}
                          <div>
                            <div className="font-medium">{platform.name}</div>
                            <div className="text-xs text-muted-foreground">{platform.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newConfig.platformId && (
                <div className="space-y-3">
                  {platforms
                    .find(p => p.id === newConfig.platformId)
                    ?.config.requiredFields.map((field: string) => (
                      <div key={field}>
                        <label className="text-sm font-medium mb-2 block">
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                        </label>
                        <Input
                          value={newConfig.config[field] || ''}
                          onChange={(e) => setNewConfig({
                            ...newConfig,
                            config: { ...newConfig.config, [field]: e.target.value }
                          })}
                          placeholder={`Enter ${field}...`}
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreateConfigModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateConfig} 
                className="flex-1"
                disabled={!newConfig.name || !newConfig.platformId}
              >
                Create Configuration
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Deployment Logs Modal */}
      {showLogsModal && selectedDeployment && (
        <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Deployment Logs</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Deployment: {selectedDeployment.id.slice(-8)}</span>
                <span>Status: {selectedDeployment.status}</span>
              </div>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {deploymentLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500">
                      [{new Date().toLocaleTimeString()}]
                    </span> {log}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}