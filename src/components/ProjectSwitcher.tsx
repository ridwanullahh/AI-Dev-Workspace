import React, { useState, useEffect } from 'react';
import { db } from '../database/schema';
import type { Project } from '../database/schema';
import { useProject } from '../contexts/ProjectContext';

interface ProjectSwitcherProps {
  onProjectSelect?: (project: Project) => void;
}

export function ProjectSwitcher({ onProjectSelect }: ProjectSwitcherProps) {
  const { currentProject, setCurrentProject } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const allProjects = await db.projects.orderBy('updatedAt').reverse().toArray();
    setProjects(allProjects);
  };

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project);
    setIsOpen(false);
    onProjectSelect?.(project);
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
      >
        {currentProject ? (
          <>
            <span className="font-medium">{currentProject.name}</span>
            <span className="text-xs text-gray-400">{currentProject.type}</span>
          </>
        ) : (
          <span className="text-gray-400">Select Project</span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-96 bg-gray-800 rounded-lg shadow-xl z-20 border border-gray-700">
            <div className="p-3 border-b border-gray-700">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No projects found
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 ${
                      currentProject?.id === project.id ? 'bg-blue-900/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-white">{project.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{project.description}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-700 rounded">{project.type}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {project.status === 'active' && (
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-700">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Trigger new project creation
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                + New Project
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
