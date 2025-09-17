import React, { useState, useEffect } from 'react';
import { enhancedAgentOrchestrator } from '../../../services/enhancedAgentOrchestrator';
import { Agent, Task } from '../../../services/types';

interface TaskMonitorProps {
  taskId: string;
}

const TaskMonitor: React.FC<TaskMonitorProps> = ({ taskId }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [agentDetails, setAgentDetails] = useState<Record<string, any>>({});
  const [collaboration, setCollaboration] = useState<any | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    const fetchTaskStatus = async () => {
      if (!isPolling) return;

      try {
        const currentTask = await enhancedAgentOrchestrator.getTaskById(taskId);
        setTask(currentTask || null);

        const collab = await enhancedAgentOrchestrator.getCollaborationByTaskId(taskId);
        setCollaboration(collab || null);

        const agentStatuses: Record<string, any> = {};
        if (collab) {
          for (const agentId of collab.participants) {
            const status = await enhancedAgentOrchestrator.getAgentStatus(agentId);
            agentStatuses[agentId] = {
              ...status.agent,
              currentTask: status.currentTask,
            };
          }
        }
        setAgentDetails(agentStatuses);

        if (currentTask?.status === 'completed' || currentTask?.status === 'failed') {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Failed to fetch task status:', error);
      }
    };

    const interval = setInterval(fetchTaskStatus, 3000);
    return () => clearInterval(interval);
  }, [taskId, isPolling]);

  return (
    <div className="p-4 mt-4 border rounded-lg">
      <h2 className="text-xl font-semibold mb-2">Task Monitor (ID: {taskId})</h2>
      <p className="mb-2">Overall Status: <span className="font-mono bg-gray-200 p-1 rounded">{task?.status || 'loading...'}</span></p>
      
      {collaboration && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Collaboration Details</h3>
          <p>Type: {collaboration.collaborationType}</p>
          <p>Participants: {collaboration.participants.join(', ')}</p>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold">Agent Statuses</h3>
        <ul>
          {Object.entries(agentDetails).map(([agentId, details]) => (
            <li key={agentId}>
              <strong>{details.name || `Agent ${agentId.substring(0,4)}`}:</strong> {details.status}
              {details.currentTask && details.currentTask.id.startsWith(taskId) && ` (Working on: ${details.currentTask.title})`}
            </li>
          ))}
        </ul>
      </div>

      {task?.status === 'completed' && task.result && (
        <div>
          <h3 className="text-lg font-semibold">Final Result</h3>
          <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap">{task.result.output}</pre>
        </div>
      )}
    </div>
  );
};

export default TaskMonitor;