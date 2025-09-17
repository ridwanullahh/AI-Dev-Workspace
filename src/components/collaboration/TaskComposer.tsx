import React, { useState, useEffect } from 'react';
import { specializedAgentsFactory } from '../../../services/specializedAgents';
import { Agent, Task } from '../../../services/types';
import { useWorkspaceStore } from '../../stores/workspaceStore';

interface TaskComposerProps {
  setTaskId: (taskId: string) => void;
}

const TaskComposer: React.FC<TaskComposerProps> = ({ setTaskId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<Task['type']>('code');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const { currentProject } = useWorkspaceStore();

  useEffect(() => {
    const fetchAgents = async () => {
      // This is a mock fetching function. In a real app, you'd get agents from a store or API.
      const agents = await specializedAgentsFactory.getAllAgents();
      setAvailableAgents(agents);
    };
    fetchAgents();
  }, []);

  const handleStartTask = async () => {
    if (!currentProject) {
      alert('Please select a project first.');
      return;
    }
    const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
      title,
      description,
      type: taskType,
      priority,
      projectId: currentProject.id,
      dependencies: [],
      estimatedTime: 300,
      assignedAgent: '',
    };

    const taskId = `task_${Date.now()}`;
    const fullTask: Task = {
      ...newTask,
      id: taskId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    try {
      // This is a placeholder, as assignTask is not available on specializedAgentsFactory
      console.log('Assigning task:', fullTask, {
        requireCollaboration: selectedAgents.length > 1,
        preferredAgents: selectedAgents,
      });
      // await specializedAgentsFactory.assignTask(fullTask, {
      //   requireCollaboration: selectedAgents.length > 1,
      //   preferredAgents: selectedAgents,
      // });
      setTaskId(taskId);
    } catch (error) {
      console.error('Failed to assign task:', error);
      alert('Failed to start task. See console for details.');
    }
  };

  const handleAgentSelection = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-semibold mb-2">Task Composer</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Task Title" value={title} onChange={e => setTitle(e.target.value)} className="p-2 border rounded" />
        <textarea placeholder="Task Description" value={description} onChange={e => setDescription(e.target.value)} className="p-2 border rounded md:col-span-2" />
        <select value={taskType} onChange={e => setTaskType(e.target.value as Task['type'])} className="p-2 border rounded">
          <option value="code">Code</option>
          <option value="design">Design</option>
          <option value="debug">Debug</option>
          <option value="test">Test</option>
          <option value="deploy">Deploy</option>
          <option value="analyze">Analyze</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className="p-2 border rounded">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Select Agents</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {availableAgents.map(agent => (
            <label key={agent.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer">
              <input type="checkbox" checked={selectedAgents.includes(agent.id)} onChange={() => handleAgentSelection(agent.id)} />
              {agent.name}
            </label>
          ))}
        </div>
      </div>
      <button 
        onClick={handleStartTask}
        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        disabled={!title || !description || selectedAgents.length === 0}
      >
        Start Task
      </button>
    </div>
  );
};

export default TaskComposer;