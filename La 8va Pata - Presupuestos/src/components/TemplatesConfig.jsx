import React, { useState, useEffect } from 'react';
import { getTemplateItems, saveTemplateItem, deleteTemplateItem, resetTemplateItems } from '../lib/storage';
import { ArrowLeft, Plus, Edit, Trash2, Save, FileSpreadsheet, RefreshCw } from 'lucide-react';

export default function TemplatesConfig({ onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('production'); // 'production' or 'realization'
  const [editingItem, setEditingItem] = useState(null);
  
  const [newItem, setNewItem] = useState({
    type: 'production',
    category: '',
    item_name: '',
    default_unit_cost: 0,
    default_quantity: 0,
    default_days: 0
  });

  const loadTemplates = async () => {
    setLoading(true);
    const data = await getTemplateItems();
    setTemplates(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleReset = async () => {
    if (confirm('¿Está seguro de restablecer la plantilla a los valores por defecto del Excel original? Esto sobrescribirá cualquier edición que hayas hecho en la plantilla.')) {
      setLoading(true);
      await resetTemplateItems();
      await loadTemplates();
      alert('Plantilla restablecida con éxito.');
    }
  };

  const handleSave = async (item) => {
    await saveTemplateItem(item);
    setEditingItem(null);
    await loadTemplates();
  };

  const handleDelete = async (id) => {
    if (confirm('¿Está seguro de eliminar este ítem de la plantilla base?')) {
      await deleteTemplateItem(id);
      await loadTemplates();
    }
  };

  const handleAddNew = async (e) => {
    e.preventDefault();
    if (!newItem.item_name || !newItem.category) return;
    
    await saveTemplateItem({
      ...newItem,
      type: activeTab
    });
    
    setNewItem({
      type: activeTab,
      category: '',
      item_name: '',
      default_unit_cost: 0,
      default_quantity: 0,
      default_days: 0
    });
    
    await loadTemplates();
  };

  // Group templates by category
  const filteredTemplates = templates.filter(t => t.type === activeTab);
  const categories = [...new Set(filteredTemplates.map(t => t.category))];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-brand-border pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 border border-brand-border bg-brand-card hover:bg-brand-border text-white rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-brand-gold" />
              Plantilla Maestra
            </h1>
            <p className="text-brand-muted text-sm mt-0.5">Define los ítems y costos estándar que se cargarán en los nuevos presupuestos</p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 border border-red-500/30 hover:border-red-500 bg-red-950/10 hover:bg-red-950/30 text-red-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer w-full sm:w-auto justify-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Restablecer Valores Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab('production')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'production'
              ? 'border-brand-green text-brand-green bg-brand-green/5'
              : 'border-transparent text-brand-muted hover:text-white'
          }`}
        >
          Presupuesto de Producción
        </button>
        <button
          onClick={() => setActiveTab('realization')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'realization'
              ? 'border-brand-green text-brand-green bg-brand-green/5'
              : 'border-transparent text-brand-muted hover:text-white'
          }`}
        >
          Presupuesto de Realización (Interno)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-green"></div>
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat} className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-900/50 px-6 py-3 border-b border-brand-border">
                  <h3 className="text-brand-green font-bold text-sm tracking-wide uppercase">{cat}</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border text-brand-muted text-[10px] uppercase font-bold tracking-wider">
                        <th className="px-6 py-3">Nombre del Ítem</th>
                        <th className="px-6 py-3 text-right">Costo Unit. (USD)</th>
                        <th className="px-6 py-3 text-right">Cant.</th>
                        <th className="px-6 py-3 text-right">Días</th>
                        <th className="px-6 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-sm">
                      {filteredTemplates
                        .filter(t => t.category === cat)
                        .map(item => (
                          <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="px-6 py-2.5 text-white font-medium">
                              {editingItem?.id === item.id ? (
                                <input
                                  type="text"
                                  value={editingItem.item_name}
                                  onChange={e => setEditingItem(p => ({ ...p, item_name: e.target.value }))}
                                  className="bg-slate-950 border border-brand-border rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-brand-green text-white"
                                />
                              ) : (
                                item.item_name
                              )}
                            </td>
                            
                            <td className="px-6 py-2.5 text-right font-mono text-white">
                              {editingItem?.id === item.id ? (
                                <input
                                  type="number"
                                  value={editingItem.default_unit_cost}
                                  onChange={e => setEditingItem(p => ({ ...p, default_unit_cost: parseFloat(e.target.value) || 0 }))}
                                  className="bg-slate-950 border border-brand-border rounded px-2 py-1 text-xs w-24 text-right focus:outline-none focus:border-brand-green text-white"
                                />
                              ) : (
                                `$${(item.default_unit_cost || 0).toFixed(2)}`
                              )}
                            </td>

                            <td className="px-6 py-2.5 text-right font-mono text-white">
                              {editingItem?.id === item.id ? (
                                <input
                                  type="number"
                                  value={editingItem.default_quantity}
                                  onChange={e => setEditingItem(p => ({ ...p, default_quantity: parseFloat(e.target.value) || 0 }))}
                                  className="bg-slate-950 border border-brand-border rounded px-2 py-1 text-xs w-16 text-right focus:outline-none focus:border-brand-green text-white"
                                />
                              ) : (
                                item.default_quantity || 0
                              )}
                            </td>

                            <td className="px-6 py-2.5 text-right font-mono text-white">
                              {editingItem?.id === item.id ? (
                                <input
                                  type="number"
                                  value={editingItem.default_days}
                                  onChange={e => setEditingItem(p => ({ ...p, default_days: parseFloat(e.target.value) || 0 }))}
                                  className="bg-slate-950 border border-brand-border rounded px-2 py-1 text-xs w-16 text-right focus:outline-none focus:border-brand-green text-white"
                                />
                              ) : (
                                item.default_days || 0
                              )}
                            </td>

                            <td className="px-6 py-2.5 text-center">
                              <div className="flex justify-center gap-2">
                                {editingItem?.id === item.id ? (
                                  <button
                                    onClick={() => handleSave(editingItem)}
                                    className="p-1 bg-brand-green/20 hover:bg-brand-green text-brand-green hover:text-white rounded transition-colors cursor-pointer"
                                    title="Guardar"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingItem(item)}
                                    className="p-1 hover:bg-brand-border text-brand-muted hover:text-white rounded transition-colors cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1 hover:bg-red-500/20 text-brand-muted hover:text-red-400 rounded transition-colors cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add New Section Sidebar */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-6 shadow-sm h-fit space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
            <Plus className="w-5 h-5 text-brand-green" />
            Agregar Nuevo Ítem
          </h3>
          
          <form onSubmit={handleAddNew} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Categoría / Grupo</label>
              <input
                type="text"
                required
                value={newItem.category}
                onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                placeholder="Ej. Casting / Modelos, Personal Técnico..."
                className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Nombre del Ítem</label>
              <input
                type="text"
                required
                value={newItem.item_name}
                onChange={e => setNewItem(p => ({ ...p, item_name: e.target.value }))}
                placeholder="Ej. Steady Cam, Director de Arte..."
                className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Costo por Defecto (USD)</label>
              <input
                type="number"
                step="0.01"
                value={newItem.default_unit_cost}
                onChange={e => setNewItem(p => ({ ...p, default_unit_cost: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Cantidad</label>
                <input
                  type="number"
                  value={newItem.default_quantity}
                  onChange={e => setNewItem(p => ({ ...p, default_quantity: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Días</label>
                <input
                  type="number"
                  value={newItem.default_days}
                  onChange={e => setNewItem(p => ({ ...p, default_days: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-green hover:bg-brand-greenHover text-white py-2.5 font-semibold rounded-lg transition-colors cursor-pointer flex justify-center items-center gap-1 mt-4 shadow-lg text-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar a la Plantilla
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
