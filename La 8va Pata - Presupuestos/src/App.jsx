import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import BudgetEditor from './components/BudgetEditor';
import TemplatesConfig from './components/TemplatesConfig';
import ClientView from './components/ClientView';
import ClientsDatabase from './components/ClientsDatabase';
import { FileSpreadsheet, Users, Settings } from 'lucide-react';
import logoImg from './assets/logo.png';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'clients', 'editor', 'templates', 'client-view'
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
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans flex flex-col">
      {/* Visual background decorations for a premium grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415510_1px,transparent_1px),linear-gradient(to_bottom,#33415510_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none no-print"></div>

      {/* Global Navigation Header (only on main list screens) */}
      {(activeView === 'dashboard' || activeView === 'clients') && (
        <header className="border-b border-brand-border bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 no-print">
          <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="La 8va Pata" className="h-8 w-auto object-contain mix-blend-screen" />
              <div className="h-4 w-[1px] bg-brand-border hidden sm:block"></div>
              <span className="text-[10px] tracking-widest text-brand-muted uppercase font-bold hidden sm:block">Tangente Console</span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex bg-brand-bg border border-brand-border p-1 rounded-lg">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-brand-green text-white shadow-md'
                    : 'text-brand-muted hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Presupuestos
              </button>
              <button
                onClick={() => setActiveView('clients')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'clients'
                    ? 'bg-brand-green text-white shadow-md'
                    : 'text-brand-muted hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Clientes
              </button>
            </nav>

            {/* Settings Link */}
            <button
              onClick={() => setActiveView('templates')}
              className="flex items-center gap-2 px-3 py-1.5 border border-brand-border bg-brand-card hover:bg-brand-border text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-brand-muted" />
              Configurar Plantillas
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full relative">
        {activeView === 'dashboard' && (
          <Dashboard 
            onSelectProject={handleSelectProject} 
            onOpenTemplates={() => setActiveView('templates')} 
          />
        )}

        {activeView === 'clients' && (
          <ClientsDatabase />
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
      </main>
    </div>
  );
}

export default App;
