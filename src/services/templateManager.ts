import { db } from '@/database/schema';
import type { Project } from '@/database/schema';

export class TemplateManager {
  async createProjectFromTemplate(project: Project, templateId: string) {
    switch (templateId) {
      case 'react-vite':
        await this.createReactViteTemplate(project);
        break;
      default:
        // No files to create for blank template
        break;
    }
  }

  private async createReactViteTemplate(project: Project) {
    const files = [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      },
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: project.name.toLowerCase().replace(/\s+/g, '-'),
            private: true,
            version: '0.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'tsc && vite build',
              lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
              preview: 'vite preview',
            },
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0',
            },
            devDependencies: {
              '@types/react': '^18.2.15',
              '@types/react-dom': '^18.2.7',
              '@typescript-eslint/eslint-plugin': '^6.0.0',
              '@typescript-eslint/parser': '^6.0.0',
              '@vitejs/plugin-react': '^4.0.3',
              eslint: '^8.45.0',
              'eslint-plugin-react-hooks': '^4.6.0',
              'eslint-plugin-react-refresh': '^0.4.3',
              typescript: '^5.0.2',
              vite: '^4.4.5',
            },
          },
          null,
          2
        ),
      },
      {
        path: 'src/main.tsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
      },
      {
        path: 'src/App.tsx',
        content: `function App() {
  return (
    <h1>Hello, world!</h1>
  )
}

export default App
`,
      },
      {
        path: 'src/index.css',
        content: ``,
      },
    ];

    for (const file of files) {
      await db.files.add({
        id: `${project.id}_${file.path}`,
        projectId: project.id,
        path: `${project.gitConfig.localPath}/${file.path}`,
        content: file.content,
        encoding: 'utf8',
        type: 'file',
        size: file.content.length,
        hash: '', // Should be calculated
        isDirty: false,
        isStaged: false,
        lastModified: new Date(),
        createdAt: new Date(),
      });
    }
  }
}

export const templateManager = new TemplateManager();