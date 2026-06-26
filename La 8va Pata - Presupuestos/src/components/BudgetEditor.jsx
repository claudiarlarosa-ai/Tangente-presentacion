import React, { useState, useEffect } from 'react';
import { getBudgetItems, saveBudgetItems, updateProject, resetProjectBudgetCosts } from '../lib/storage';
import { exportToExcel } from '../lib/excelExporter';
import { ArrowLeft, Save, FileSpreadsheet, RefreshCw, Info, ChevronDown, ChevronRight, Settings, Trash2, Eye } from 'lucide-react';

export default function BudgetEditor({ project, onBack, onUpdateProject, onOpenClientView }) {
  const [items, setItems] = useState([]);
  const [currentProject, setCurrentProject] = useState(project);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('production'); // 'production' or 'realization'
  const [expandedCategories, setExpandedCategories] = useState({});
  const [saving, setSaving] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      const data = await getBudgetItems(project.id);
      setItems(data);
      
      // Auto-expand first categories
      const cats = [...new Set(data.map(i => i.category))];
      const initialExpanded = {};
      cats.forEach((cat, idx) => {
        initialExpanded[cat] = idx < 2; // Expand first 2 by default
      });
      setExpandedCategories(initialExpanded);
      setLoading(false);
    }
    loadItems();
  }, [project.id]);

  const handleItemChange = (itemId, field, value) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.id !== itemId) return item;
        
        const updated = { ...item, [field]: value };
        
        // Re-calculate totals
        const qty = parseFloat(updated.quantity) || 0;
        const days = parseFloat(updated.days) || 0;
        const unitCost = parseFloat(updated.unit_cost) || 0;
        
        updated.total_usd = qty * days * unitCost;
        updated.total_pen = updated.total_usd * (currentProject.exchange_rate || 3.6);
        
        return updated;
      })
    );
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Filter items
  const productionItems = items.filter(i => i.type === 'production');
  const realizationItems = items.filter(i => i.type === 'realization');

  // Group items by category
  const productionCategories = [...new Set(productionItems.map(i => i.category))];
  const realizationCategories = [...new Set(realizationItems.map(i => i.category))];

  // MATHEMATICAL COMPUTATIONS (Syncing with Excel formulas)
  const tc = currentProject.exchange_rate || 3.6;

  // 1. Production Totals
  const getCategoryTotalUsd = (catItems) => catItems.reduce((sum, item) => sum + (item.total_usd || 0), 0);
  
  const productionSubtotalUsd = productionItems.reduce((sum, item) => sum + (item.total_usd || 0), 0);
  const productionSubtotalPen = productionSubtotalUsd * tc;
  
  const productionAdminFeeUsd = productionSubtotalUsd * (currentProject.admin_fee_rate || 0.04);
  const productionAdminFeePen = productionSubtotalPen * (currentProject.admin_fee_rate || 0.04);
  
  const totalProductionUsd = productionSubtotalUsd + productionAdminFeeUsd;
  const totalProductionPen = productionSubtotalPen + productionAdminFeePen;

  // 2. Realization Totals
  const realizationSubtotal1Usd = realizationItems.reduce((sum, item) => sum + (item.total_usd || 0), 0);
  const realizationSubtotal1Pen = realizationSubtotal1Usd * tc;
  
  const realizationAdminFeeUsd = realizationSubtotal1Usd * 0.0; // Fixed at 0%
  
  const realizationSubtotal2Usd = realizationSubtotal1Usd + realizationAdminFeeUsd;
  const realizationSubtotal2Pen = realizationSubtotal2Usd * tc;

  const realizationMarkupUsd = realizationSubtotal2Usd * (currentProject.markup_realization_rate || 0.15);
  const realizationMarkupPen = realizationSubtotal2Pen * (currentProject.markup_realization_rate || 0.15);

  // Agency Commission Formula mapping
  const calculateAgencyCommission = (sub2, markup, rate) => {
    if (rate === 0.10) return (sub2 + markup) / 9;
    if (rate === 0.13) return (sub2 + markup) / 6.5;
    if (rate === 0.15) return (sub2 + markup) / 5.5;
    if (rate === 0.20) return (sub2 + markup) / 4;
    return (sub2 + markup) * rate;
  };

  const agencyCommissionUsd = calculateAgencyCommission(
    realizationSubtotal2Usd,
    realizationMarkupUsd,
    currentProject.agency_commission_rate || 0
  );
  const agencyCommissionPen = agencyCommissionUsd * tc;

  const totalRealizationUsd = realizationSubtotal2Usd + realizationMarkupUsd + agencyCommissionUsd;
  const totalRealizationPen = totalRealizationUsd * tc;

  // 3. Project Summary Totals
  const totalProjectProductionUsd = totalProductionUsd;
  const totalProjectRealizationUsd = totalRealizationUsd;
  
  const financingFeeUsd = (totalProjectProductionUsd + totalProjectRealizationUsd) * (currentProject.financing_fee_rate || 0.016);
  const financingFeePen = financingFeeUsd * tc;

  const grandTotalProjectUsd = totalProjectProductionUsd + totalProjectRealizationUsd + financingFeeUsd;
  const grandTotalProjectPen = grandTotalProjectUsd * tc;

  // Realization spent tracker
  const totalRealizationSpentUsd = realizationItems.reduce((sum, item) => sum + (parseFloat(item.amount_to_liquidate) || 0), 0);
  const totalRealizationSpentPen = totalRealizationSpentUsd * tc;

  const handleSaveAll = async () => {
    setSaving(true);
    await saveBudgetItems(project.id, items);
    await updateProject(project.id, currentProject);
    setSaving(false);
    alert('Presupuesto guardado exitosamente.');
  };

  const handleViewClient = async () => {
    setSaving(true);
    try {
      await saveBudgetItems(project.id, items);
      const updated = await updateProject(project.id, currentProject);
      onUpdateProject(updated);
      onOpenClientView(updated, items);
    } catch (error) {
      console.error(error);
      alert('Error al guardar antes de abrir la vista de cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCosts = async () => {
    if (confirm('¿Está seguro de restablecer todas las tarifas de este presupuesto a los costos estándar de la plantilla? Los valores de Cantidad, Días y Liquidaciones no se modificarán.')) {
      setLoading(true);
      const updated = await resetProjectBudgetCosts(project.id);
      
      // Ensure PEN amounts are computed with the project's exchange rate
      const tcRate = currentProject.exchange_rate || 3.6;
      const finalItems = updated.map(item => ({
        ...item,
        total_pen: item.total_usd * tcRate
      }));
      
      setItems(finalItems);
      setLoading(false);
      alert('Tarifas restablecidas con éxito para este presupuesto.');
    }
  };

  const handleClearQuantities = async () => {
    if (confirm('¿Está seguro de limpiar todas las cantidades y días de este presupuesto? Se establecerán en 0, pero las tarifas (costos unitarios) se mantendrán.')) {
      setItems(prevItems => 
        prevItems.map(item => ({
          ...item,
          quantity: 0,
          days: 0,
          total_usd: 0,
          total_pen: 0
        }))
      );
      alert('Cantidades y días restablecidos a 0. Haz clic en Guardar Cambios para conservar este estado.');
    }
  };

  const handleExport = async () => {
    setSaving(true);
    try {
      const buffer = await exportToExcel(currentProject, productionItems, realizationItems);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Presupuesto_${currentProject.name.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Error exportando presupuesto.');
    }
    setSaving(false);
  };

  const handleUpdateMetadata = async (e) => {
    e.preventDefault();
    const updated = await updateProject(project.id, currentProject);
    onUpdateProject(updated);
    
    // Update items' total soles based on the new exchange rate
    setItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        total_pen: item.total_usd * (updated.exchange_rate || 3.6)
      }))
    );

    setShowMetadataModal(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Top Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-brand-border pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 border border-brand-border bg-brand-card hover:bg-brand-border text-white rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white leading-tight">{currentProject.name}</h1>
              <button
                onClick={() => setShowMetadataModal(true)}
                className="p-1 text-brand-muted hover:text-white transition-colors cursor-pointer"
                title="Editar Información"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <p className="text-brand-muted text-xs mt-0.5">
              Cliente: <span className="text-white font-semibold">{currentProject.client}</span> • 
              Producto: <span className="text-white font-semibold">{currentProject.product}</span> • 
              T. Cambio: <span className="text-white font-semibold">{tc}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={handleClearQuantities}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-brand-border bg-brand-card hover:bg-brand-border text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            title="Establecer todas las cantidades y días de este presupuesto en 0"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            Limpiar Cantidades
          </button>

          <button
            onClick={handleResetCosts}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-red-500/35 hover:border-red-500 bg-red-950/15 hover:bg-red-950/30 text-red-400 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            title="Restablecer tarifas del presupuesto a los costos estándar"
          >
            <RefreshCw className="w-4 h-4" />
            Restablecer Tarifas
          </button>

          <button
            onClick={handleExport}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-brand-border bg-brand-card hover:bg-brand-border text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Descargar para Google Sheets
          </button>

          <button
            onClick={handleViewClient}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-brand-border bg-brand-card hover:bg-brand-border text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            title="Ver presupuesto terminado listo para enviar al cliente"
          >
            <Eye className="w-4 h-4 text-brand-green" />
            Vista Cliente
          </button>
          
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-green hover:bg-brand-greenHover text-white text-sm font-semibold rounded-lg transition-colors shadow-lg cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* PROJECT SUMMARY CARDS PANEL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="bg-brand-card border border-brand-border rounded-xl p-4 sm:p-5 shadow-sm col-span-1">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">Servicio de Producción</span>
          <div className="text-lg sm:text-xl font-black text-white font-mono">${totalProjectProductionUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-[10px] sm:text-xs text-brand-muted mt-1 font-mono">S/. {totalProductionPen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-xl p-4 sm:p-5 shadow-sm col-span-1">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">Servicio de Realización</span>
          <div className="text-lg sm:text-xl font-black text-white font-mono">${totalProjectRealizationUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-[10px] sm:text-xs text-brand-muted mt-1 font-mono">S/. {totalRealizationPen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-xl p-4 sm:p-5 shadow-sm col-span-1">
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1">Financiamiento ({(currentProject.financing_fee_rate * 100).toFixed(1)}%)</span>
          <div className="text-lg sm:text-xl font-black text-white font-mono">${financingFeeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-[10px] sm:text-xs text-brand-muted mt-1 font-mono">S/. {financingFeePen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="bg-brand-card/30 border-2 border-brand-green/30 rounded-xl p-4 sm:p-5 shadow-md bg-gradient-to-r from-brand-green/5 to-transparent col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold text-brand-green uppercase tracking-wider block mb-1">GRAN TOTAL DEL PROYECTO</span>
          <div className="text-xl sm:text-2xl font-black text-brand-green font-mono">${grandTotalProjectUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-[10px] sm:text-xs text-brand-muted mt-1 font-mono">S/. {grandTotalProjectPen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab('production')}
          className={`px-4 sm:px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'production'
              ? 'border-brand-green text-brand-green bg-brand-green/5'
              : 'border-transparent text-brand-muted hover:text-white'
          }`}
        >
          <span className="hidden sm:inline">Presupuesto de </span>Producción
        </button>
        
        <button
          onClick={() => setActiveTab('realization')}
          className={`px-4 sm:px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'realization'
              ? 'border-brand-green text-brand-green bg-brand-green/5'
              : 'border-transparent text-brand-muted hover:text-white'
          }`}
        >
          <span className="hidden sm:inline">Desglose Interno de </span>Realización <span className="hidden sm:inline">& Liquidación</span><span className="inline sm:hidden">& Liq.</span>
        </button>
      </div>

      {/* Loading state / Budget Editor Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-green"></div>
        </div>
      ) : activeTab === 'production' ? (
        // PRODUCTION SHEET TAB
        <div className="space-y-6">
          {productionCategories.map(cat => {
            const catItems = productionItems.filter(i => i.category === cat);
            const catTotalUsd = getCategoryTotalUsd(catItems);
            const isExpanded = expandedCategories[cat];

            return (
              <div key={cat} className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm transition-all">
                {/* Category Header */}
                <div 
                  onClick={() => toggleCategory(cat)}
                  className="bg-slate-900/50 px-6 py-4 flex justify-between items-center border-b border-brand-border cursor-pointer hover:bg-slate-900/70"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-brand-green" /> : <ChevronRight className="w-4 h-4 text-brand-green" />}
                    <h3 className="text-brand-green font-bold text-sm tracking-wide uppercase">{cat}</h3>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-xs text-brand-muted uppercase font-light">Subtotal Categoría:</span>
                    <span className="text-sm font-bold text-white font-mono">${catTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Items list */}
                {isExpanded && (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-brand-border text-brand-muted text-[10px] uppercase font-bold tracking-wider">
                            <th className="px-6 py-3 w-1/2">Descripción</th>
                            <th className="px-4 py-3 text-right w-20">Cant.</th>
                            <th className="px-4 py-3 text-right w-20">Días</th>
                            <th className="px-4 py-3 text-right w-28">Tarifa (USD)</th>
                            <th className="px-6 py-3 text-right w-36">Total USD</th>
                            <th className="px-6 py-3 text-right w-36">Total Soles</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/40 text-sm">
                          {catItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-800/10 transition-colors">
                              <td className="px-6 py-2 text-white font-medium">{item.item_name}</td>
                              
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  value={item.quantity === 0 ? '' : item.quantity}
                                  onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-16 bg-slate-900 border border-brand-border rounded px-2 py-1 text-right text-xs text-white focus:outline-none focus:border-brand-green font-mono"
                                />
                              </td>

                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  value={item.days === 0 ? '' : item.days}
                                  onChange={e => handleItemChange(item.id, 'days', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-16 bg-slate-900 border border-brand-border rounded px-2 py-1 text-right text-xs text-white focus:outline-none focus:border-brand-green font-mono"
                                />
                              </td>

                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_cost === 0 ? '' : item.unit_cost}
                                  onChange={e => handleItemChange(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-24 bg-slate-900 border border-brand-border rounded px-2 py-1 text-right text-xs text-white focus:outline-none focus:border-brand-green font-mono"
                                />
                              </td>

                              <td className="px-6 py-2 text-right font-mono text-white">
                                ${(item.total_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              <td className="px-6 py-2 text-right font-mono text-brand-muted text-xs">
                                S/. {(item.total_pen || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="block md:hidden divide-y divide-brand-border/40">
                      {catItems.map(item => (
                        <div key={item.id} className="p-4 space-y-3 hover:bg-slate-800/10 transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-semibold text-white text-sm leading-snug">{item.item_name}</span>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold text-white font-mono">${(item.total_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              <div className="text-[10px] text-brand-muted font-mono">S/. {(item.total_pen || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-brand-muted mb-1">Cant.</label>
                              <input
                                type="number"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-slate-900 border border-brand-border rounded px-2 py-1.5 text-center text-base text-white focus:outline-none focus:border-brand-green font-mono"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-brand-muted mb-1">Días</label>
                              <input
                                type="number"
                                value={item.days === 0 ? '' : item.days}
                                onChange={e => handleItemChange(item.id, 'days', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-slate-900 border border-brand-border rounded px-2 py-1.5 text-center text-base text-white focus:outline-none focus:border-brand-green font-mono"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-brand-muted mb-1">Tarifa (USD)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_cost === 0 ? '' : item.unit_cost}
                                onChange={e => handleItemChange(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="w-full bg-slate-900 border border-brand-border rounded px-2 py-1.5 text-right text-base text-white focus:outline-none focus:border-brand-green font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Production Sheet Totals Summary Section */}
          <div className="bg-brand-card border border-brand-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-1 text-sm text-brand-muted max-w-md">
              <div className="flex gap-2 items-center text-white font-bold mb-2">
                <Info className="w-4 h-4 text-brand-green" />
                Resumen de Producción
              </div>
              <p>Los gastos administrativos se calculan de manera fija al 4.0% sobre el subtotal acumulado de las categorías descritas anteriormente.</p>
            </div>
            
            <div className="w-full md:w-96 space-y-3 font-mono text-sm">
              <div className="flex justify-between border-b border-brand-border pb-2 text-brand-muted">
                <span>SUBTOTAL PRODUCCIÓN:</span>
                <span className="text-white">${productionSubtotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-brand-border pb-2 text-brand-muted">
                <span>Gastos Adm. ({(currentProject.admin_fee_rate * 100).toFixed(1)}%):</span>
                <span className="text-white">${productionAdminFeeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-2 text-lg font-black text-brand-green">
                <span>TOTAL PRODUCCIÓN:</span>
                <span>${totalProductionUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-right text-xs text-brand-muted">S/. {totalProductionPen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      ) : (
        // REALIZATION SHEET TAB (Control & Liquidation)
        <div className="space-y-6">
          {realizationCategories.map(cat => {
            const catItems = realizationItems.filter(i => i.category === cat);
            const catTotalUsd = getCategoryTotalUsd(catItems);
            const isExpanded = expandedCategories[cat];

            return (
              <div key={cat} className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm transition-all">
                {/* Category Header */}
                <div 
                  onClick={() => toggleCategory(cat)}
                  className="bg-slate-900/50 px-6 py-4 flex justify-between items-center border-b border-brand-border cursor-pointer hover:bg-slate-900/70"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-brand-green" /> : <ChevronRight className="w-4 h-4 text-brand-green" />}
                    <h3 className="text-brand-green font-bold text-sm tracking-wide uppercase">{cat}</h3>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-xs text-brand-muted uppercase font-light">Subtotal Categoría:</span>
                    <span className="text-sm font-bold text-white font-mono">${catTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Items list */}
                {isExpanded && (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                          <tr className="border-b border-brand-border text-brand-muted text-[10px] uppercase font-bold tracking-wider">
                            <th className="px-6 py-3 w-1/4">Descripción</th>
                            <th className="px-3 py-3 text-right w-16">Cant.</th>
                            <th className="px-3 py-3 text-right w-16">Días</th>
                            <th className="px-3 py-3 text-right w-24">Tarifa (USD)</th>
                            <th className="px-4 py-3 text-right w-28">Presupuestado</th>
                            {/* Liquidación columns */}
                            <th className="px-4 py-3 text-right w-28 border-l border-brand-border bg-emerald-950/20 text-emerald-400">Ejecutado (Monto Liquidar)</th>
                            <th className="px-4 py-3 w-40 bg-emerald-950/20 text-emerald-400">Proveedor / Nombre</th>
                            <th className="px-4 py-3 w-28 bg-emerald-950/20 text-emerald-400">Nº Comprobante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/40 text-sm">
                          {catItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-800/10 transition-colors">
                              <td className="px-6 py-2 text-white font-medium">{item.item_name}</td>
                              
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  value={item.quantity === 0 ? '' : item.quantity}
                                  onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-12 bg-slate-900 border border-brand-border rounded px-1.5 py-1 text-right text-xs text-white focus:outline-none focus:border-brand-green font-mono"
                                />
                              </td>

                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  value={item.days === 0 ? '' : item.days}
                                  onChange={e => handleItemChange(item.id, 'days', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-12 bg-slate-900 border border-brand-border rounded px-1.5 py-1 text-right text-xs text-white focus:outline-none focus:border-brand-green font-mono"
                                />
                              </td>

                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_cost === 0 ? '' : item.unit_cost}
                                  onChange={e => handleItemChange(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-20 bg-slate-900 border border-brand-border rounded px-1.5 py-1 text-right text-xs text-white focus:outline-none focus:border-brand-green font-mono"
                                />
                              </td>

                              <td className="px-4 py-2 text-right font-mono text-white">
                                ${(item.total_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* Liquidation controls */}
                              <td className="px-4 py-2 text-right border-l border-brand-border bg-emerald-950/5">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.amount_to_liquidate === 0 ? '' : item.amount_to_liquidate}
                                  onChange={e => handleItemChange(item.id, 'amount_to_liquidate', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-24 bg-slate-950 border border-emerald-900/40 rounded px-2 py-1 text-right text-xs text-emerald-400 focus:outline-none focus:border-brand-green font-mono"
                                />
                              </td>

                              <td className="px-4 py-2 bg-emerald-950/5">
                                <input
                                  type="text"
                                  value={item.invoice_name || ''}
                                  onChange={e => handleItemChange(item.id, 'invoice_name', e.target.value)}
                                  placeholder="Nombre / Empresa"
                                  className="w-full bg-slate-950 border border-emerald-900/40 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-green"
                                />
                              </td>

                              <td className="px-4 py-2 bg-emerald-950/5">
                                <input
                                  type="text"
                                  value={item.invoice_number || ''}
                                  onChange={e => handleItemChange(item.id, 'invoice_number', e.target.value)}
                                  placeholder="E001-0123"
                                  className="w-full bg-slate-950 border border-emerald-900/40 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-green font-mono"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="block md:hidden divide-y divide-brand-border/40">
                      {catItems.map(item => (
                        <div key={item.id} className="p-4 space-y-3 hover:bg-slate-800/10 transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-semibold text-white text-sm leading-snug">{item.item_name}</span>
                            <div className="text-right flex-shrink-0">
                              <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Presupuestado</div>
                              <div className="text-sm font-bold text-white font-mono">${(item.total_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                          </div>
                          
                          {/* Row 1: Budget inputs */}
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-brand-muted mb-1">Cant.</label>
                              <input
                                type="number"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-slate-900 border border-brand-border rounded px-2 py-1.5 text-center text-base text-white focus:outline-none focus:border-brand-green font-mono"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-brand-muted mb-1">Días</label>
                              <input
                                type="number"
                                value={item.days === 0 ? '' : item.days}
                                onChange={e => handleItemChange(item.id, 'days', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-slate-900 border border-brand-border rounded px-2 py-1.5 text-center text-base text-white focus:outline-none focus:border-brand-green font-mono"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-brand-muted mb-1">Tarifa (USD)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_cost === 0 ? '' : item.unit_cost}
                                onChange={e => handleItemChange(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="w-full bg-slate-900 border border-brand-border rounded px-2 py-1.5 text-right text-base text-white focus:outline-none focus:border-brand-green font-mono"
                              />
                            </div>
                          </div>

                          {/* Row 2: Liquidation inputs */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-brand-border/20 bg-emerald-950/5 p-2 rounded-lg">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-emerald-400 mb-1">Ejecutado (USD)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount_to_liquidate === 0 ? '' : item.amount_to_liquidate}
                                onChange={e => handleItemChange(item.id, 'amount_to_liquidate', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="w-full bg-slate-950 border border-emerald-900/40 rounded px-2 py-1.5 text-right text-base text-emerald-400 focus:outline-none focus:border-brand-green font-mono"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-emerald-400 mb-1">Proveedor</label>
                              <input
                                type="text"
                                value={item.invoice_name || ''}
                                onChange={e => handleItemChange(item.id, 'invoice_name', e.target.value)}
                                placeholder="Proveedor"
                                className="w-full bg-slate-950 border border-emerald-900/40 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-green"
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] uppercase font-bold text-emerald-400 mb-1">Nº Comprob.</label>
                              <input
                                type="text"
                                value={item.invoice_number || ''}
                                onChange={e => handleItemChange(item.id, 'invoice_number', e.target.value)}
                                placeholder="Nº Comp."
                                className="w-full bg-slate-950 border border-emerald-900/40 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-green font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Realization Sheet Totals Summary Section */}
          <div className="bg-brand-card border border-brand-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-2 text-sm text-brand-muted max-w-md">
              <div className="flex gap-2 items-center text-white font-bold mb-2">
                <Info className="w-4 h-4 text-brand-green" />
                Resumen de Realización & Liquidación
              </div>
              <p>El presupuesto interno calcula un **Markup del 15%** y aplica el porcentaje de comisión de agencia definido en la ficha técnica.</p>
              <div className="pt-2">
                <div className="text-xs uppercase font-bold text-emerald-400">Total Liquidado (Gastos Reales):</div>
                <div className="text-xl font-black text-white font-mono mt-1">${totalRealizationSpentUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-[10px] text-brand-muted font-mono">S/. {totalRealizationSpentPen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
            
            <div className="w-full md:w-96 space-y-3 font-mono text-sm">
              <div className="flex justify-between border-b border-brand-border pb-2 text-brand-muted">
                <span>SUBTOTAL REALIZACIÓN 1:</span>
                <span className="text-white">${realizationSubtotal1Usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-brand-border pb-2 text-brand-muted">
                <span>SUBTOTAL REALIZACIÓN 2:</span>
                <span className="text-white">${realizationSubtotal2Usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-brand-border pb-2 text-brand-muted">
                <span>MARK UP ({(currentProject.markup_realization_rate * 100).toFixed(1)}%):</span>
                <span className="text-white">${realizationMarkupUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-brand-border pb-2 text-brand-muted">
                <span>Comisión Agencia ({(currentProject.agency_commission_rate * 100).toFixed(1)}%):</span>
                <span className="text-white">${agencyCommissionUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-2 text-lg font-black text-brand-green">
                <span>TOTAL REALIZACIÓN:</span>
                <span>${totalRealizationUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-right text-xs text-brand-muted">S/. {totalRealizationPen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Editor Modal */}
      {showMetadataModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fadeIn">
          <div className="bg-brand-card border border-brand-border w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slideUp">
            <div className="border-b border-brand-border px-6 py-4 flex justify-between items-center bg-slate-900/50 flex-shrink-0">
              <h3 className="text-lg font-bold text-white">Editar Información General</h3>
              <button
                onClick={() => setShowMetadataModal(false)}
                className="text-brand-muted hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdateMetadata} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Nombre del Proyecto</label>
                  <input
                    type="text"
                    required
                    value={currentProject.name}
                    onChange={e => setCurrentProject(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Cliente</label>
                  <input
                    type="text"
                    value={currentProject.client || ''}
                    onChange={e => setCurrentProject(p => ({ ...p, client: e.target.value }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Agencia</label>
                  <input
                    type="text"
                    value={currentProject.agency || ''}
                    onChange={e => setCurrentProject(p => ({ ...p, agency: e.target.value }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Producto</label>
                  <input
                    type="text"
                    value={currentProject.product || ''}
                    onChange={e => setCurrentProject(p => ({ ...p, product: e.target.value }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Motivo</label>
                  <input
                    type="text"
                    value={currentProject.reason || ''}
                    onChange={e => setCurrentProject(p => ({ ...p, reason: e.target.value }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Director</label>
                  <input
                    type="text"
                    value={currentProject.director || ''}
                    onChange={e => setCurrentProject(p => ({ ...p, director: e.target.value }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Número de Presupuesto</label>
                  <input
                    type="text"
                    value={currentProject.budget_number || ''}
                    onChange={e => setCurrentProject(p => ({ ...p, budget_number: e.target.value }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Días de Rodaje</label>
                  <input
                    type="number"
                    min="1"
                    value={currentProject.shoot_days || 1}
                    onChange={e => setCurrentProject(p => ({ ...p, shoot_days: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-white mb-1.5">Tipo de Cambio (USD-PEN) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={currentProject.exchange_rate}
                    onChange={e => setCurrentProject(p => ({ ...p, exchange_rate: parseFloat(e.target.value) || 3.6 }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Comisión de la Agencia</label>
                  <select
                    value={currentProject.agency_commission_rate}
                    onChange={e => setCurrentProject(p => ({ ...p, agency_commission_rate: parseFloat(e.target.value) }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm h-[38px]"
                  >
                    <option value="0.0">Sin Comisión (0%)</option>
                    <option value="0.10">Comisión 10% (Fórmula /9)</option>
                    <option value="0.13">Comisión 13% (Fórmula /6.5)</option>
                    <option value="0.15">Comisión 15% (Fórmula /5.5)</option>
                    <option value="0.20">Comisión 20% (Fórmula /4)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-brand-muted mb-1.5">Estado del Presupuesto</label>
                  <select
                    value={currentProject.status}
                    onChange={e => setCurrentProject(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-slate-900 border border-brand-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-brand-green text-base md:text-sm h-[38px]"
                  >
                    <option value="draft">Borrador / En Proceso</option>
                    <option value="sent">Enviado / En Proceso</option>
                    <option value="approved">Aprobado</option>
                    <option value="rejected">Rechazado</option>
                    <option value="liquidated">Liquidado</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-brand-border pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentProject(project);
                    setShowMetadataModal(false);
                  }}
                  className="px-4 py-2 border border-brand-border hover:bg-brand-border rounded-lg text-sm text-white font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-green hover:bg-brand-greenHover rounded-lg text-sm text-white font-semibold shadow-lg cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
