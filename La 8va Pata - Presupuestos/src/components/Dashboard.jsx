import React, { useState, useEffect } from 'react';
import { getProjects, createProject, deleteProject } from '../lib/storage';
import { fetchExchangeRate } from '../lib/exchangeRate';
import { Plus, Trash2, Edit, FileSpreadsheet, RefreshCw } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Dashboard({ onSelectProject, onOpenTemplates }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    agency: '',
    product: '',
    reason: '',
    duration: '',
    format: '',
    shoot_days: 1,
    director: '',
    contact_8va_pata: '',
    budget_number: '',
    exchange_rate: 3.6
  });

  const loadProjects = async () => {
    setLoading(true);
    const data = await getProjects();
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleFetchRate = async () => {
    const rate = await fetchExchangeRate();
    setNewProject(prev => ({ ...prev, exchange_rate: rate }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProject.name) return;
    
    setLoading(true);
    await createProject(newProject);
    setShowCreateModal(false);
    // Reset form
    setNewProject({
      name: '',
      client: '',
      agency: '',
      product: '',
      reason: '',
      duration: '',
      format: '',
      shoot_days: 1,
      director: '',
      contact_8va_pata: '',
      budget_number: '',
      exchange_rate: 3.6
    });
    await loadProjects();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (confirm('¿Está seguro de eliminar este presupuesto?')) {
      await deleteProject(id);
      await loadProjects();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 text-left">
        <div className="flex flex-col items-start">
          <img src={logoImg} alt="La 8va Pata Logo" className="h-8 md:h-12 w-auto object-contain mix-blend-screen mb-1 -ml-0.5" />
          <h1 className="text-3xl font-extralight text-brand-green tracking-wider uppercase">Presupuestos</h1>
          <p className="text-brand-muted mt-2 text-sm leading-relaxed">
            Gestión de presupuestos de producción<br />y realización audiovisual
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={onOpenTemplates}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-brand-border bg-brand-card hover:bg-brand-border text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
          >
            <FileSpreadsheet className="w-4 h-4 text-brand-gold" />
            Editar Plantillas
          </button>
          
          <button
            onClick={async () => {
              setShowCreateModal(true);
              await handleFetchRate();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-green hover:bg-brand-greenHover text-white text-sm font-semibold rounded-lg transition-colors shadow-lg cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo Presupuesto
          </button>
        </div>
      </div>

      {/* Grid of Projects */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-brand-card rounded-xl border border-brand-border">
          <FileSpreadsheet className="w-16 h-16 text-brand-muted mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">No hay presupuestos activos</h3>
          <p className="text-brand-muted mb-6">Crea tu primer presupuesto audiovisual utilizando la plantilla maestra.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-brand-green hover:bg-brand-greenHover text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Crear Presupuesto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj)}
              className="bg-brand-card hover:bg-brand-card/85 border border-brand-border hover:border-brand-green/50 rounded-xl p-6 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                    proj.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    proj.status === 'liquidated' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    proj.status === 'sent' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                    'bg-slate-700/50 text-slate-300 border border-slate-600'
                  }`}>
                    {proj.status === 'approved' ? 'Aprobado' :
                     proj.status === 'liquidated' ? 'Liquidado' :
                     proj.status === 'sent' ? 'Enviado' : 'Borrador'}
                  </span>
                  
                  <button
                    onClick={(e) => handleDelete(proj.id, e)}
                    className="text-brand-muted hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 leading-snug group-hover:text-brand-green transition-colors">
                  {proj.name}
                </h3>
                
                <div className="space-y-1.5 text-sm text-brand-muted mb-6">
                  <div className="flex justify-between"><span className="font-light">Cliente:</span> <span className="text-white font-medium">{proj.client || '-'}</span></div>
                  <div className="flex justify-between"><span className="font-light">Producto:</span> <span className="text-white font-medium">{proj.product || '-'}</span></div>
                  <div className="flex justify-between"><span className="font-light">Director:</span> <span className="text-white font-medium">{proj.director || '-'}</span></div>
                  <div className="flex justify-between"><span className="font-light">Nº Presupuesto:</span> <span className="text-white font-medium">{proj.budget_number || '-'}</span></div>
                </div>
              </div>

              <div className="border-t border-brand-border pt-4 mt-auto flex justify-between items-center text-xs text-brand-muted">
                <span>TC: {proj.exchange_rate}</span>
                <span>Modificado: {new Date(proj.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fadeIn">
          <div className="bg-brand-card border border-brand-border w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slideUp">
            <div className="border-b border-brand-border px-6 py-4 flex justify-between items-center bg-slate-900/50 flex-shrink-0">
              <h3 className="text-lg font-bold text-white">Nuevo Presupuesto Audiovisual</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-brand-muted hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    required
                    value={newProject.name}
                    onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ej. Comercial Verano 2026"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Cliente</label>
                  <input
                    type="text"
                    value={newProject.client}
                    onChange={e => setNewProject(p => ({ ...p, client: e.target.value }))}
                    placeholder="Ej. Backus"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Agencia</label>
                  <input
                    type="text"
                    value={newProject.agency}
                    onChange={e => setNewProject(p => ({ ...p, agency: e.target.value }))}
                    placeholder="Ej. McCann"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Producto</label>
                  <input
                    type="text"
                    value={newProject.product}
                    onChange={e => setNewProject(p => ({ ...p, product: e.target.value }))}
                    placeholder="Ej. Pilsen Callao"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Motivo</label>
                  <input
                    type="text"
                    value={newProject.reason}
                    onChange={e => setNewProject(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Ej. Campaña Amistad"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Director</label>
                  <input
                    type="text"
                    value={newProject.director}
                    onChange={e => setNewProject(p => ({ ...p, director: e.target.value }))}
                    placeholder="Ej. Juan Perez"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Número de Presupuesto</label>
                  <input
                    type="text"
                    value={newProject.budget_number}
                    onChange={e => setNewProject(p => ({ ...p, budget_number: e.target.value }))}
                    placeholder="Ej. P2026-004"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Días de Rodaje</label>
                  <input
                    type="number"
                    min="1"
                    value={newProject.shoot_days}
                    onChange={e => setNewProject(p => ({ ...p, shoot_days: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5 flex justify-between items-center">
                    Tipo de Cambio (USD-PEN)
                    <button
                      type="button"
                      onClick={handleFetchRate}
                      className="text-brand-green hover:underline flex items-center gap-1 text-[10px] uppercase font-bold cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      API SUNAT
                    </button>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={newProject.exchange_rate}
                    onChange={e => setNewProject(p => ({ ...p, exchange_rate: parseFloat(e.target.value) || 3.6 }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-brand-border pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-brand-border hover:bg-brand-border rounded-lg text-sm text-white font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-green hover:bg-brand-greenHover rounded-lg text-sm text-white font-semibold shadow-lg cursor-pointer"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
