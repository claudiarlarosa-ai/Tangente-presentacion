import React, { useState, useEffect } from 'react';
import { getProjects, createProject, deleteProject, updateProject } from '../lib/storage';
import { fetchExchangeRate } from '../lib/exchangeRate';
import { Plus, Trash2, FileSpreadsheet, RefreshCw, Download, Printer, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';


export default function Dashboard({ onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'draft', 'approved', 'rejected', 'liquidated'
  const [searchQuery, setSearchQuery] = useState('');

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
    setNewProject(prev => ({ 
      ...prev, 
      exchange_rate: rate
    }));
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

  const handleStatusChange = async (projectId, newStatus, e) => {
    e.stopPropagation();
    await updateProject(projectId, { status: newStatus });
    await loadProjects();
  };

  // KPIs Calculations
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'draft' || p.status === 'sent').length,
    approved: projects.filter(p => p.status === 'approved').length,
    rejected: projects.filter(p => p.status === 'rejected').length,
    liquidated: projects.filter(p => p.status === 'liquidated').length
  };

  // Filter projects by status and search query
  const filteredProjects = projects.filter(proj => {
    // Status Filter
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'draft' && (proj.status === 'draft' || proj.status === 'sent')) ||
      proj.status === statusFilter;

    // Search Query
    const matchesSearch = 
      proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (proj.client && proj.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (proj.budget_number && proj.budget_number.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  // CSV Export Function
  const handleExportCSV = () => {
    const headers = ['Nombre Proyecto', 'Cliente', 'Agencia', 'Producto', 'N. Presupuesto', 'Estado', 'Tipo de Cambio', 'Dias Rodaje', 'Fecha Creacion'];
    const rows = filteredProjects.map(p => [
      p.name,
      p.client || '',
      p.agency || '',
      p.product || '',
      p.budget_number || '',
      p.status === 'approved' ? 'Aprobado' :
      p.status === 'liquidated' ? 'Liquidado' :
      p.status === 'rejected' ? 'Rechazado' : 'En Proceso',
      p.exchange_rate || 3.6,
      p.shoot_days || 1,
      new Date(p.created_at).toLocaleDateString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `base_datos_presupuestos_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // print/PDF export
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Upper header segment (Action bar) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 text-left no-print">
        <div>
          <h1 className="text-3xl font-extralight text-brand-green tracking-wider uppercase">Presupuestos</h1>
          <p className="text-brand-muted mt-2 text-sm">
            Base de datos y control de presupuestos para La 8va Pata
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-3 py-2 border border-brand-border bg-brand-card hover:bg-brand-border text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 md:flex-none"
            title="Exportar base de datos a Excel"
          >
            <Download className="w-3.5 h-3.5 text-brand-gold" />
            Excel
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-3 py-2 border border-brand-border bg-brand-card hover:bg-brand-border text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 md:flex-none"
            title="Imprimir reporte en PDF"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            PDF
          </button>

          <button
            onClick={async () => {
              setShowCreateModal(true);
              await handleFetchRate();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-green hover:bg-brand-greenHover text-white text-xs font-bold rounded-lg transition-colors shadow-lg cursor-pointer flex-1 md:flex-none"
          >
            <Plus className="w-4 h-4" />
            Nuevo Presupuesto
          </button>
        </div>
      </div>

      {/* KPI Dashboard Cards (Clickable filters) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 no-print">
        {/* Total budgets */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
            statusFilter === 'all' 
              ? 'bg-slate-900 border-brand-green shadow-md' 
              : 'bg-brand-card border-brand-border hover:border-brand-muted/40'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-brand-muted font-semibold uppercase">Total Proyectos</span>
            <TrendingUp className="w-4 h-4 text-brand-green" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>

        {/* In progress */}
        <div 
          onClick={() => setStatusFilter('draft')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
            statusFilter === 'draft' 
              ? 'bg-slate-900 border-blue-500 shadow-md' 
              : 'bg-brand-card border-brand-border hover:border-brand-muted/40'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-brand-muted font-semibold uppercase">En Proceso</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.inProgress}</div>
        </div>

        {/* Approved */}
        <div 
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
            statusFilter === 'approved' 
              ? 'bg-slate-900 border-emerald-500 shadow-md' 
              : 'bg-brand-card border-brand-border hover:border-brand-muted/40'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-brand-muted font-semibold uppercase">Aprobados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.approved}</div>
        </div>

        {/* Rejected */}
        <div 
          onClick={() => setStatusFilter('rejected')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
            statusFilter === 'rejected' 
              ? 'bg-slate-900 border-red-500 shadow-md' 
              : 'bg-brand-card border-brand-border hover:border-brand-muted/40'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-brand-muted font-semibold uppercase">Rechazados</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.rejected}</div>
        </div>

        {/* Liquidated */}
        <div 
          onClick={() => setStatusFilter('liquidated')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left col-span-2 md:col-span-1 ${
            statusFilter === 'liquidated' 
              ? 'bg-slate-900 border-amber-500 shadow-md' 
              : 'bg-brand-card border-brand-border hover:border-brand-muted/40'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-brand-muted font-semibold uppercase">Liquidados</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.liquidated}</div>
        </div>
      </div>

      {/* Filter and Search Input */}
      <div className="flex items-center bg-brand-card border border-brand-border rounded-xl px-4 py-2.5 mb-6 max-w-md no-print">
        <Clock className="w-5 h-5 text-brand-muted mr-3 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, cliente o presupuesto..."
          className="w-full bg-transparent text-white text-sm focus:outline-none"
        />
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-left mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800">Reporte General de Presupuestos</h1>
        <p className="text-slate-500 text-xs mt-1">La 8va Pata • Generado el {new Date().toLocaleDateString()} • Filtro: {
          statusFilter === 'all' ? 'Todos' :
          statusFilter === 'draft' ? 'En Proceso' :
          statusFilter === 'approved' ? 'Aprobado' :
          statusFilter === 'rejected' ? 'Rechazado' : 'Liquidado'
        }</p>
      </div>

      {/* Grid of Projects */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-brand-card rounded-xl border border-brand-border">
          <FileSpreadsheet className="w-16 h-16 text-brand-muted mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">No se encontraron presupuestos</h3>
          <p className="text-brand-muted">Prueba cambiando el filtro de estado o crea un nuevo presupuesto.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:block print:space-y-4">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj)}
              className="bg-brand-card hover:bg-brand-card/85 border border-brand-border hover:border-brand-green/50 rounded-xl p-6 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer flex flex-col justify-between group print:border-slate-300 print:text-slate-850 print:bg-white print:p-4 print:shadow-none print:rounded-none"
            >
              <div>
                <div className="flex justify-between items-start mb-4 print:mb-2">
                  {/* Interactive Status Changer (Only in App, not in Print) */}
                  <select
                    value={proj.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStatusChange(proj.id, e.target.value, e)}
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border bg-slate-900 text-white cursor-pointer focus:outline-none no-print ${
                      proj.status === 'approved' ? 'border-emerald-800 text-emerald-400 bg-emerald-950/80' :
                      proj.status === 'liquidated' ? 'border-amber-800 text-amber-400 bg-amber-950/80' :
                      proj.status === 'rejected' ? 'border-red-800 text-red-400 bg-red-950/80' :
                      'border-blue-850 text-blue-450 bg-blue-955/80'
                    }`}
                  >
                    <option value="draft">En Proceso (Borrador)</option>
                    <option value="sent">En Proceso (Enviado)</option>
                    <option value="approved">Aprobado</option>
                    <option value="rejected">Rechazado</option>
                    <option value="liquidated">Liquidado</option>
                  </select>

                  {/* Plain text label for print */}
                  <span className="hidden print:inline font-bold text-xs uppercase text-slate-700">
                    Estado: {
                      proj.status === 'approved' ? 'Aprobado' :
                      proj.status === 'liquidated' ? 'Liquidado' :
                      proj.status === 'rejected' ? 'Rechazado' : 'En Proceso'
                    }
                  </span>
                  
                  <button
                    onClick={(e) => handleDelete(proj.id, e)}
                    className="text-brand-muted hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100 cursor-pointer no-print"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 leading-snug group-hover:text-brand-green transition-colors print:text-slate-900 print:text-base print:mb-1">
                  {proj.name}
                </h3>
                
                <div className="space-y-1.5 text-sm text-brand-muted mb-6 print:mb-2 print:text-slate-750 print:text-xs">
                  <div className="flex justify-between border-b border-brand-border/10 pb-1"><span className="font-light">Cliente:</span> <span className="text-white font-medium print:text-slate-900">{proj.client || '-'}</span></div>
                  <div className="flex justify-between border-b border-brand-border/10 pb-1"><span className="font-light">Producto:</span> <span className="text-white font-medium print:text-slate-900">{proj.product || '-'}</span></div>
                  <div className="flex justify-between border-b border-brand-border/10 pb-1"><span className="font-light">Director:</span> <span className="text-white font-medium print:text-slate-900">{proj.director || '-'}</span></div>
                  <div className="flex justify-between"><span className="font-light">Nº Presupuesto:</span> <span className="text-white font-medium print:text-slate-900">{proj.budget_number || '-'}</span></div>
                </div>
              </div>

              <div className="border-t border-brand-border/40 pt-4 mt-auto flex justify-between items-center text-xs text-brand-muted print:border-slate-200 print:text-slate-500 print:pt-2">
                <span>T. Cambio: {proj.exchange_rate}</span>
                <span>Modificado: {new Date(proj.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fadeIn no-print">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    required
                    value={newProject.name}
                    onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ej. Comercial Verano 2026"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Cliente</label>
                  <input
                    type="text"
                    value={newProject.client}
                    onChange={e => setNewProject(p => ({ ...p, client: e.target.value }))}
                    placeholder="Ej. La 8va Pata"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Agencia</label>
                  <input
                    type="text"
                    value={newProject.agency}
                    onChange={e => setNewProject(p => ({ ...p, agency: e.target.value }))}
                    placeholder="Ej. McCann"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Producto</label>
                  <input
                    type="text"
                    value={newProject.product}
                    onChange={e => setNewProject(p => ({ ...p, product: e.target.value }))}
                    placeholder="Ej. Pilsen Callao"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Motivo</label>
                  <input
                    type="text"
                    value={newProject.reason}
                    onChange={e => setNewProject(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Ej. Campaña Amistad"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Director</label>
                  <input
                    type="text"
                    value={newProject.director}
                    onChange={e => setNewProject(p => ({ ...p, director: e.target.value }))}
                    placeholder="Ej. Juan Perez"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Número de Presupuesto</label>
                  <input
                    type="text"
                    value={newProject.budget_number}
                    onChange={e => setNewProject(p => ({ ...p, budget_number: e.target.value }))}
                    placeholder="Ej. P2026-004"
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Días de Rodaje</label>
                  <input
                    type="number"
                    min="1"
                    value={newProject.shoot_days}
                    onChange={e => setNewProject(p => ({ ...p, shoot_days: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-white mb-1.5 flex justify-between items-center">
                    Tipo de Cambio (USD-PEN) *
                    <button
                      type="button"
                      onClick={handleFetchRate}
                      className="text-brand-green hover:underline flex items-center gap-1 text-[10px] uppercase font-bold cursor-pointer"
                      title="Actualizar tasa desde API de tipo de cambio"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      API Mercado
                    </button>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={newProject.exchange_rate}
                    onChange={e => setNewProject(p => ({ ...p, exchange_rate: parseFloat(e.target.value) || 3.6 }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-brand-border pt-4 mt-6 flex justify-end gap-3 flex-shrink-0">
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
                  Crear Presupuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
