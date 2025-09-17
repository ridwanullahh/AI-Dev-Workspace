import React from 'react';
import TaskComposer from '../components/collaboration/TaskComposer';
import TaskMonitor from '../components/collaboration/TaskMonitor';

const CollaborationPage: React.FC = () => {
  const [taskId, setTaskId] = React.useState<string | null>(null);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Agent Collaboration</h1>
      <TaskComposer setTaskId={setTaskId} />
      {taskId && <TaskMonitor taskId={taskId} />}
    </div>
  );
};

export default CollaborationPage;