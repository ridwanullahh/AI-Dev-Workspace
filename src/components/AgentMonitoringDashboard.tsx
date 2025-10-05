import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  TrendingUp,
  Cpu,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface AgentTask {
  id: string;
  agentType: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  description: string;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  logs: string[];
  resourceUsage: {
    cpu: number;
    memory: number;
  };
}

interface AgentStats {
  agentType: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTime: number;
  successRate: number;
}

export function AgentMonitoringDashboard() {
  const [activeTasks, setActiveTasks] = useState<AgentTask[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);

  useEffect(() => {
    loadAgentData();
    const interval = setInterval(loadAgentData, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, []);

  const loadAgentData = async () => {
    // Mock data - in real implementation, this would fetch from agentOrchestra service
    const mockTasks: AgentTask[] = [
      {
        id: 'task1',
        agentType: 'Coder',
        status: 'running',
        description: 'Implementing user authentication flow',
        progress: 65,
        startedAt: new Date(Date.now() - 120000),
        logs: [
          '[00:00] Task started',
          '[00:30] Analyzing requirements',
          '[01:00] Generating code structure',
          '[01:30] Implementing authentication logic',
          '[02:00] Progress: 65%'
        ],
        resourceUsage: { cpu: 45, memory: 128 }
      },
      {
        id: 'task2',
        agentType: 'Reviewer',
        status: 'queued',
        description: 'Review changes in pull request #42',
        progress: 0,
        logs: ['[00:00] Task queued'],
        resourceUsage: { cpu: 0, memory: 0 }
      }
    ];

    const mockStats: AgentStats[] = [
      {
        agentType: 'Planner',
        totalTasks: 45,
        completedTasks: 42,
        failedTasks: 1,
        averageTime: 180,
        successRate: 93.3
      },
      {
        agentType: 'Coder',
        totalTasks: 128,
        completedTasks: 115,
        failedTasks: 5,
        averageTime: 240,
        successRate: 89.8
      },
      {
        agentType: 'Debugger',
        totalTasks: 67,
        completedTasks: 64,
        failedTasks: 2,
        averageTime: 150,
        successRate: 95.5
      },
      {
        agentType: 'Reviewer',
        totalTasks: 89,
        completedTasks: 87,
        failedTasks: 1,
        averageTime: 90,
        successRate: 97.8
      }
    ];

    setActiveTasks(mockTasks);
    setAgentStats(mockStats);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'running': return 'text-blue-500';
      case 'failed': return 'text-red-500';
      case 'queued': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'running': return <Play className="h-4 w-4 animate-pulse" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'queued': return <Clock className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Agent Monitoring</h2>
        <p className="text-sm text-muted-foreground">
          Real-time monitoring of AI agent tasks and performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {agentStats.map((stat) => (
          <div key={stat.agentType} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">{stat.agentType}</span>
              <Badge variant="outline" className="text-xs">
                {stat.totalTasks} tasks
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium text-green-500">{stat.successRate}%</span>
              </div>
              <Progress value={stat.successRate} className="h-2" />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stat.completedTasks} completed</span>
                <span>{stat.failedTasks} failed</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Tasks */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Active Tasks ({activeTasks.length})
          </h3>
        </div>

        <div className="divide-y divide-border">
          {activeTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No active tasks
            </div>
          ) : (
            activeTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{task.agentType}</Badge>
                      <div className={`flex items-center gap-1 ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        <span className="text-xs font-medium capitalize">{task.status}</span>
                      </div>
                    </div>
                    <p className="text-sm">{task.description}</p>
                  </div>
                  
                  {task.status === 'running' && (
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {task.status === 'running' && (
                  <>
                    <Progress value={task.progress} className="mb-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{task.progress}% complete</span>
                      <span>
                        {task.startedAt && 
                          `${Math.floor((Date.now() - task.startedAt.getTime()) / 1000)}s elapsed`}
                      </span>
                    </div>

                    {/* Resource Usage */}
                    <div className="mt-3 flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Cpu className="h-3 w-3 text-primary" />
                        <span>CPU: {task.resourceUsage.cpu}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        <span>Memory: {task.resourceUsage.memory}MB</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Task Logs Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selectedTask.agentType} Task</h3>
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-black/50">
              {selectedTask.logs.map((log, idx) => (
                <div key={idx} className="text-green-400">
                  {log}
                </div>
              ))}
            </div>

            {selectedTask.status === 'running' && (
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-4">
                  <Button variant="destructive" size="sm" className="flex-1">
                    Cancel Task
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
