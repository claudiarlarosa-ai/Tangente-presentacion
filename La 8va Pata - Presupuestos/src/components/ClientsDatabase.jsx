import React, { useState, useEffect } from 'react';
import { getClients, saveClient, deleteClient } from '../lib/storage';
import { Plus, Search, Edit2, Trash2, Mail, Phone, Building2, Download, Printer } from 'lucide-react';

export default function ClientsDatabase() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    status: 'active'
  });

  const loadClientsData = async () => {
    setLoading(true);
    const data = await getClients();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    loadClientsData();
  }, []);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      contact: '',
      email: '',
      phone: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      contact: client.contact || '',
      email: client.email || '',
      phone: client.phone || '',
      status: client.status || 'active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    setLoading(true);
    const clientToSave = editingClient 
      ? { ...editingClient, ...formData }
      : formData;
      
    await saveClient(clientToSave);
    setShowModal(false);
    await loadClientsData();
  };

  const handleDelete = async (id) => {
    if (confirm('¿Está seguro de eliminar este cliente de la base de datos?')) {
      setLoading(true);
      await deleteClient(id);
      await loadClientsData();
    }
  };

  // Filter clients
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact && c.contact.toLowerCase().includes(search.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  // CSV Export Function
  const handleExportCSV = () => {
    const headers = ['Nombre/Empresa', 'Contacto', 'Correo', 'Telefono', 'Estado', 'Fecha Registro'];
    const rows = filteredClients.map(c => [
      c.name,
      c.contact || '',
      c.email || '',
      c.phone || '',
      c.status === 'active' ? 'Activo' : 'Inactivo',
      new Date(c.created_at).toLocaleDateString()
    ]);
    
    // Add BOM for Excel UTF-8 support
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `base_datos_clientes_${new Date().toISOString().slice(0,10)}.csv`);
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
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 text-left no-print">
        <div>
          <h1 className="text-3xl font-extralight text-brand-green tracking-wider uppercase">Clientes</h1>
          <p className="text-brand-muted mt-2 text-sm">
            Base de datos y directorio de contactos para presupuestos de La 8va Pata
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-3 py-2 border border-brand-border bg-brand-card hover:bg-brand-border text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-none"
            title="Exportar a Excel (CSV)"
          >
            <Download className="w-3.5 h-3.5 text-brand-gold" />
            Excel
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-3 py-2 border border-brand-border bg-brand-card hover:bg-brand-border text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-none"
            title="Imprimir o guardar como PDF"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            PDF
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-green hover:bg-brand-greenHover text-white text-xs font-bold rounded-lg transition-colors shadow-lg cursor-pointer flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" />
            Agregar Cliente
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center bg-brand-card border border-brand-border rounded-xl px-4 py-2.5 mb-6 max-w-md no-print">
        <Search className="w-5 h-5 text-brand-muted mr-3 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por empresa, contacto o correo..."
          className="w-full bg-transparent text-white text-sm focus:outline-none"
        />
      </div>

      {/* Printable Header */}
      <div className="hidden print:block text-left mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800">Directorio de Clientes</h1>
        <p className="text-slate-500 text-xs mt-1">La 8va Pata • Generado el {new Date().toLocaleDateString()}</p>
      </div>

      {/* Clients Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-20 bg-brand-card rounded-xl border border-brand-border">
          <Building2 className="w-16 h-16 text-brand-muted mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">No se encontraron clientes</h3>
          <p className="text-brand-muted">Registra tu primer cliente para asignarle presupuestos.</p>
        </div>
      ) : (
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-lg print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm text-slate-200">
              <thead>
                <tr className="bg-slate-900/50 border-b border-brand-border print:border-slate-300">
                  <th className="px-6 py-4 font-semibold text-brand-muted print:text-slate-600 uppercase text-xs">Empresa / Razón Social</th>
                  <th className="px-6 py-4 font-semibold text-brand-muted print:text-slate-600 uppercase text-xs">Contacto</th>
                  <th className="px-6 py-4 font-semibold text-brand-muted print:text-slate-600 uppercase text-xs">Contacto Digital</th>
                  <th className="px-6 py-4 font-semibold text-brand-muted print:text-slate-600 uppercase text-xs">Teléfono</th>
                  <th className="px-6 py-4 font-semibold text-brand-muted print:text-slate-600 uppercase text-xs">Estado</th>
                  <th className="px-6 py-4 font-semibold text-brand-muted print:text-slate-600 uppercase text-xs text-right no-print">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 print:divide-slate-200 print:text-slate-800">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-800/20 transition-colors print:hover:bg-transparent">
                    <td className="px-6 py-4 font-bold text-white print:text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-brand-green print:text-slate-500 flex-shrink-0" />
                      {client.name}
                    </td>
                    <td className="px-6 py-4 font-medium">{client.contact || '-'}</td>
                    <td className="px-6 py-4">
                      {client.email ? (
                        <div className="flex items-center gap-2 text-brand-muted print:text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-brand-muted/70 flex-shrink-0 print:hidden" />
                          <span>{client.email}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {client.phone ? (
                        <div className="flex items-center gap-2 text-brand-muted print:text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-brand-muted/70 flex-shrink-0 print:hidden" />
                          <span>{client.phone}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        client.status === 'active' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 print:bg-transparent print:text-emerald-700 print:border-emerald-300' 
                          : 'bg-slate-800 text-slate-400 border border-slate-700 print:bg-transparent print:text-slate-600 print:border-slate-300'
                      }`}>
                        {client.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 no-print">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="text-brand-muted hover:text-brand-green p-1 transition-colors cursor-pointer inline-flex"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="text-brand-muted hover:text-red-400 p-1 transition-colors cursor-pointer inline-flex"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fadeIn no-print">
          <div className="bg-brand-card border border-brand-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="border-b border-brand-border px-6 py-4 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold text-white">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-brand-muted hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Empresa / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej. La 8va Pata S.A.C."
                  className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Persona de Contacto</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={e => setFormData(p => ({ ...p, contact: e.target.value }))}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="contacto@empresa.com"
                  className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Teléfono</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+51 987 654 321"
                  className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Estado</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                  className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm h-[38px]"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>

              <div className="border-t border-brand-border pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-brand-border hover:bg-brand-border rounded-lg text-sm text-white font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-green hover:bg-brand-greenHover rounded-lg text-sm text-white font-semibold shadow-lg cursor-pointer"
                >
                  {editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
