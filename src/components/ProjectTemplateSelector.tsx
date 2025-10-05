import React from 'react';
import { 
  Globe, 
  Smartphone, 
  Server, 
  Package, 
  FileText,
  Zap,
  Layers,
  Code2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch with no template',
    icon: FileText,
    tags: ['basic'],
    color: 'text-gray-500'
  },
  {
    id: 'react-vite',
    name: 'React + Vite',
    description: 'Modern React with Vite, TypeScript, and Tailwind CSS',
    icon: Zap,
    tags: ['react', 'typescript', 'web'],
    color: 'text-blue-500'
  },
  {
    id: 'nextjs',
    name: 'Next.js App',
    description: 'Full-stack React framework with SSR and API routes',
    icon: Layers,
    tags: ['react', 'typescript', 'fullstack'],
    color: 'text-black dark:text-white'
  },
  {
    id: 'react-native',
    name: 'React Native',
    description: 'Cross-platform mobile app with Expo',
    icon: Smartphone,
    tags: ['react', 'mobile', 'typescript'],
    color: 'text-purple-500'
  },
  {
    id: 'express-api',
    name: 'Express.js API',
    description: 'RESTful API with Express and TypeScript',
    icon: Server,
    tags: ['nodejs', 'api', 'typescript'],
    color: 'text-green-500'
  },
  {
    id: 'fastapi',
    name: 'FastAPI',
    description: 'Modern Python API with automatic docs',
    icon: Server,
    tags: ['python', 'api'],
    color: 'text-teal-500'
  },
  {
    id: 'vue-vite',
    name: 'Vue 3 + Vite',
    description: 'Vue 3 with Composition API and TypeScript',
    icon: Globe,
    tags: ['vue', 'typescript', 'web'],
    color: 'text-emerald-500'
  },
  {
    id: 'svelte',
    name: 'SvelteKit',
    description: 'Full-stack framework with Svelte',
    icon: Globe,
    tags: ['svelte', 'typescript', 'fullstack'],
    color: 'text-orange-500'
  },
  {
    id: 'npm-library',
    name: 'NPM Library',
    description: 'TypeScript library with bundling and testing',
    icon: Package,
    tags: ['typescript', 'library'],
    color: 'text-red-500'
  },
  {
    id: 'chrome-extension',
    name: 'Chrome Extension',
    description: 'Browser extension with manifest v3',
    icon: Code2,
    tags: ['typescript', 'web'],
    color: 'text-yellow-500'
  }
];

interface ProjectTemplateSelectorProps {
  selectedTemplate: string;
  onSelect: (templateId: string) => void;
}

export function ProjectTemplateSelector({ selectedTemplate, onSelect }: ProjectTemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose a Template</h3>
        <p className="text-sm text-muted-foreground">
          Select a template to get started quickly with pre-configured settings
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = selectedTemplate === template.id;

          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left hover:border-primary/50 ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${template.color}`}>
                  <Icon className="h-8 w-8" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold mb-1">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {template.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
