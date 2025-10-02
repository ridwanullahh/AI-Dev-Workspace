import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectSwitcher } from '../ProjectSwitcher';
import { ProjectProvider } from '../../contexts/ProjectContext';

vi.mock('../../database/schema', () => ({
  db: {
    projects: {
      orderBy: vi.fn().mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            {
              id: 'proj1',
              name: 'Test Project 1',
              description: 'First test project',
              type: 'web',
              status: 'active'
            },
            {
              id: 'proj2',
              name: 'Test Project 2',
              description: 'Second test project',
              type: 'mobile',
              status: 'active'
            }
          ])
        })
      })
    }
  }
}));

describe('ProjectSwitcher', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <ProjectProvider>
        {component}
      </ProjectProvider>
    );
  };

  it('should render with no project selected', () => {
    renderWithProvider(<ProjectSwitcher />);
    expect(screen.getByText('Select Project')).toBeInTheDocument();
  });

  it('should open dropdown on button click', async () => {
    renderWithProvider(<ProjectSwitcher />);
    
    const button = screen.getByText('Select Project');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
    });
  });

  it('should display projects in dropdown', async () => {
    renderWithProvider(<ProjectSwitcher />);
    
    const button = screen.getByText('Select Project');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
    });
  });

  it('should filter projects by search term', async () => {
    renderWithProvider(<ProjectSwitcher />);
    
    const button = screen.getByText('Select Project');
    fireEvent.click(button);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search projects...');
      fireEvent.change(searchInput, { target: { value: 'First' } });
    });

    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Project 2')).not.toBeInTheDocument();
  });

  it('should show "No projects found" when filter matches nothing', async () => {
    renderWithProvider(<ProjectSwitcher />);
    
    const button = screen.getByText('Select Project');
    fireEvent.click(button);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search projects...');
      fireEvent.change(searchInput, { target: { value: 'NonexistentProject' } });
    });

    expect(screen.getByText('No projects found')).toBeInTheDocument();
  });

  it('should call onProjectSelect when project is clicked', async () => {
    const onProjectSelect = vi.fn();
    renderWithProvider(<ProjectSwitcher onProjectSelect={onProjectSelect} />);
    
    const button = screen.getByText('Select Project');
    fireEvent.click(button);

    await waitFor(async () => {
      const project = screen.getByText('Test Project 1');
      fireEvent.click(project);
    });

    expect(onProjectSelect).toHaveBeenCalled();
  });

  it('should close dropdown after project selection', async () => {
    renderWithProvider(<ProjectSwitcher />);
    
    const button = screen.getByText('Select Project');
    fireEvent.click(button);

    await waitFor(async () => {
      const project = screen.getByText('Test Project 1');
      fireEvent.click(project);
    });

    expect(screen.queryByPlaceholderText('Search projects...')).not.toBeInTheDocument();
  });

  it('should display project metadata', async () => {
    renderWithProvider(<ProjectSwitcher />);
    
    const button = screen.getByText('Select Project');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('First test project')).toBeInTheDocument();
      expect(screen.getByText('web')).toBeInTheDocument();
    });
  });
});
