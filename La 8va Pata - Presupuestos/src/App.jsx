import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import BudgetEditor from './components/BudgetEditor';
import TemplatesConfig from './components/TemplatesConfig';
import ClientView from './components/ClientView';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'editor', 'templates', 'client-view'
  const [selectedProject, setSelectedProject] = useState(null);
  const [clientItems, setClientItems] = useState([]);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setActiveView('editor');
  };

  const handleUpdateProject = (updatedProject) => {
    setSelectedProject(updatedProject);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans">
      {/* Visual background decorations for a premium grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415510_1px,transparent_1px),linear-gradient(to_bottom,#33415510_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none no-print"></div>

      {activeView === 'dashboard' && (
        <Dashboard 
          onSelectProject={handleSelectProject} 
          onOpenTemplates={() => setActiveView('templates')} 
        />
      )}

      {activeView === 'editor' && (
        <BudgetEditor 
          project={selectedProject} 
          onBack={() => {
            setSelectedProject(null);
            setActiveView('dashboard');
          }} 
          onUpdateProject={handleUpdateProject}
          onOpenClientView={(project, items) => {
            setSelectedProject(project);
            setClientItems(items);
            setActiveView('client-view');
          }}
        />
      )}

      {activeView === 'templates' && (
        <TemplatesConfig 
          onClose={() => setActiveView('dashboard')} 
        />
      )}

      {activeView === 'client-view' && (
        <ClientView 
          project={selectedProject}
          items={clientItems}
          onBack={() => {
            setActiveView('editor');
          }}
        />
      )}
    </div>
  );
}

export default App;
