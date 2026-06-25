import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function ClientView({ project, items, onBack }) {
  const tc = project.exchange_rate || 3.6;

  // Filter items
  const productionItems = items.filter(i => i.type === 'production');
  const realizationItems = items.filter(i => i.type === 'realization');

  // Filter out production items with 0 total cost to keep client view clean
  const activeProductionItems = productionItems.filter(item => (item.total_usd || 0) > 0);

  // Group active production items by category
  const activeProductionCategories = [...new Set(activeProductionItems.map(i => i.category))];

  // MATHEMATICAL COMPUTATIONS (Mirroring BudgetEditor)
  const productionSubtotalUsd = productionItems.reduce((sum, item) => sum + (item.total_usd || 0), 0);
  const productionSubtotalPen = productionSubtotalUsd * tc;
  
  const productionAdminFeeUsd = productionSubtotalUsd * (project.admin_fee_rate || 0.04);
  const productionAdminFeePen = productionSubtotalPen * (project.admin_fee_rate || 0.04);
  
  const totalProductionUsd = productionSubtotalUsd + productionAdminFeeUsd;
  const totalProductionPen = productionSubtotalPen + productionAdminFeePen;

  // Realization Totals
  const realizationSubtotal1Usd = realizationItems.reduce((sum, item) => sum + (item.total_usd || 0), 0);
  const realizationSubtotal1Pen = realizationSubtotal1Usd * tc;
  
  const realizationSubtotal2Usd = realizationSubtotal1Usd; // 0% Admin fee for realization
  const realizationSubtotal2Pen = realizationSubtotal2Usd * tc;

  const realizationMarkupUsd = realizationSubtotal2Usd * (project.markup_realization_rate || 0.15);
  const realizationMarkupPen = realizationSubtotal2Pen * (project.markup_realization_rate || 0.15);

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
    project.agency_commission_rate || 0
  );
  const agencyCommissionPen = agencyCommissionUsd * tc;

  const totalRealizationUsd = realizationSubtotal2Usd + realizationMarkupUsd + agencyCommissionUsd;
  const totalRealizationPen = totalRealizationUsd * tc;

  // Financing
  const financingFeeUsd = (totalProductionUsd + totalRealizationUsd) * (project.financing_fee_rate || 0.016);
  const financingFeePen = financingFeeUsd * tc;

  // Grand Total
  const grandTotalProjectUsd = totalProductionUsd + totalRealizationUsd + financingFeeUsd;
  const grandTotalProjectPen = grandTotalProjectUsd * tc;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 no-print-bg">
      {/* Action Toolbar - Hides when printing */}
      <div className="container mx-auto max-w-4xl mb-6 flex justify-between items-center no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-brand-border bg-brand-card hover:bg-brand-border text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Editor
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-green hover:bg-brand-greenHover text-white text-sm font-semibold rounded-lg transition-colors shadow-lg cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* Main Budget Presentation Sheet */}
      <div className="container mx-auto max-w-4xl bg-white text-slate-900 rounded-xl shadow-md border border-slate-100 p-8 sm:p-12 print-container print:shadow-none print:border-none print:rounded-none">
        
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-100 pb-8 mb-8">
          <div>
            <img src={logoImg} alt="La 8va Pata Logo" className="h-9 w-auto object-contain mb-3" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Presupuesto Audiovisual</h1>
            <p className="text-slate-400 text-[10px] mt-0.5">Av. José Pardo 1357 - 801 Miraflores • RUC: 20602017487</p>
          </div>
          <div className="text-left sm:text-right font-sans text-xs space-y-1.5 text-slate-600">
            <div><span className="font-medium text-slate-400">Nº Presupuesto:</span> <span className="font-semibold text-slate-900">{project.budget_number || '-'}</span></div>
            <div><span className="font-medium text-slate-400">Fecha:</span> <span className="font-semibold text-slate-900">{new Date(project.created_at).toLocaleDateString()}</span></div>
            <div>
              <span className="font-medium text-slate-400">T. Cambio Comercial:</span> <span className="font-semibold text-slate-900">{tc.toFixed(3)}</span>
              {project.exchange_rate_sunat && (
                <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">
                  (Ref. SUNAT: {parseFloat(project.exchange_rate_sunat).toFixed(3)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Project Metadata Information */}
        <div className="bg-slate-50/50 rounded-lg p-5 border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-xs">
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">Cliente</span>
            <span className="font-medium text-slate-800 text-sm">{project.client || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">Producto</span>
            <span className="font-medium text-slate-800 text-sm">{project.product || '-'}</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">Motivo</span>
            <span className="font-medium text-slate-800 text-sm">{project.reason || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">Director</span>
            <span className="font-medium text-slate-800 text-sm">{project.director || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">Agencia</span>
            <span className="font-medium text-slate-800 text-sm">{project.agency || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">Días de Rodaje</span>
            <span className="font-medium text-slate-800 text-sm">{project.shoot_days || 1} {project.shoot_days === 1 ? 'día' : 'días'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">Contacto 8va Pata</span>
            <span className="font-medium text-slate-800 text-sm">{project.contact_8va_pata || '-'}</span>
          </div>
        </div>

        {/* Financial Summary Table */}
        <div className="mb-10">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3.5">Resumen del Presupuesto</h2>
          <div className="overflow-hidden border border-slate-100 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-sans text-xs font-medium tracking-tight">
                  <th className="px-6 py-3 font-medium">Descripción del Servicio</th>
                  <th className="px-6 py-3 text-right font-medium whitespace-nowrap w-32">Total USD</th>
                  <th className="px-6 py-3 text-right font-medium whitespace-nowrap w-36">Total Soles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-sans text-slate-600">
                <tr>
                  <td className="px-6 py-4 text-slate-800 font-normal">
                    Servicio de Producción
                    <span className="text-[10px] text-slate-400 block font-normal mt-0.5">(Casting, modelos, estudio, arte, vestuario, viáticos y gastos de producción)</span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap tabular-nums">${totalProductionUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap tabular-nums">S/. {totalProductionPen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-800 font-normal">
                    Servicio de Realización
                    <span className="text-[10px] text-slate-400 block font-normal mt-0.5">(Director, productor ejecutivo, director de foto, equipos, sonido y post-producción)</span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap tabular-nums">${totalRealizationUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap tabular-nums">S/. {totalRealizationPen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-800 font-normal">
                    Financiamiento x 30 días
                    <span className="text-[10px] text-slate-400 block font-normal mt-0.5">({(project.financing_fee_rate * 100).toFixed(1)}% sobre los subtotales de producción y realización)</span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap tabular-nums">${financingFeeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap tabular-nums">S/. {financingFeePen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr className="bg-slate-50/80 text-xs font-semibold text-slate-900 border-t border-slate-200">
                  <td className="px-6 py-4 font-sans font-semibold">GRAN TOTAL DEL PROYECTO</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap tabular-nums font-semibold">${grandTotalProjectUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap tabular-nums font-semibold">S/. {grandTotalProjectPen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Production Items Breakdown */}
        {activeProductionItems.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Desglose Detallado de Producción</h2>
            
            <div className="space-y-6">
              {activeProductionCategories.map(cat => {
                const catItems = activeProductionItems.filter(i => i.category === cat);
                const catTotal = catItems.reduce((sum, item) => sum + (item.total_usd || 0), 0);
                
                return (
                  <div key={cat} className="border border-slate-100 rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-3 flex justify-between items-center">
                      <h3 className="font-semibold text-xs text-slate-800 tracking-tight">{cat}</h3>
                      <div className="text-xs font-semibold text-slate-600 tabular-nums">
                        Subtotal: ${catTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Category Items */}
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-slate-100 text-slate-400 text-[10px] uppercase font-semibold tracking-wider">
                          <th className="px-6 py-2.5 font-medium">Concepto</th>
                          <th className="px-4 py-2.5 text-right w-20 font-medium whitespace-nowrap">Cant.</th>
                          <th className="px-4 py-2.5 text-right w-20 font-medium whitespace-nowrap">Días</th>
                          <th className="px-4 py-2.5 text-right w-28 font-medium whitespace-nowrap">Tarifa (USD)</th>
                          <th className="px-6 py-2.5 text-right w-36 font-medium whitespace-nowrap">Total USD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-sans text-slate-600">
                        {catItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/20 transition-colors">
                            <td className="px-6 py-2.5 font-sans font-normal text-slate-700 text-xs">{item.item_name}</td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums text-slate-500 text-xs">{item.quantity}</td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums text-slate-500 text-xs">{item.days}</td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums text-slate-500 text-xs">${(item.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-6 py-2.5 text-right whitespace-nowrap tabular-nums font-medium text-slate-900 text-xs">${(item.total_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Budget Footer Notes */}
        <div className="border-t border-slate-100 pt-6 mt-12 text-slate-400 text-[9px] leading-relaxed">
          <p className="font-semibold text-slate-500 mb-1.5">CONDICIONES COMERCIALES:</p>
          <ul className="list-disc pl-4 space-y-1 text-slate-400">
            <li>Este presupuesto no incluye impuestos de ley (IGV).</li>
            <li>Forma de pago: 50% de adelanto al inicio del proyecto y 50% a la entrega o contra presentación del presupuesto final.</li>
            <li>La validez de esta cotización es de 15 días calendario a partir de la fecha de emisión.</li>
            <li>No incluye cancelaciones de rodaje por causas meteorológicas o decisiones de fuerza mayor ajenas a la productora.</li>
          </ul>
        </div>
      </div>

      {/* Global CSS style injection to force print optimization */}
      <style>{`
        @media print {
          /* 1. Hide all elements marked as no-print */
          .no-print {
            display: none !important;
          }
          
          /* 2. Reset html, body, root, and app containers to white background and dark text */
          html, body, #root, .no-print-bg, .min-h-screen.bg-brand-bg.text-brand-text {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
          
          /* 3. Strip all shadows, borders and force dark text on the sheet container */
          .print-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          
          /* 4. Force dark text for all descendants inside the print sheet to override Tailwind color utilities (e.g., text-slate-400, text-white, etc.) */
          .print-container * {
            color: #0f172a !important;
            background-color: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          
          /* 5. Keep specific border lines and dividers visible */
          .print-container,
          .print-container .border,
          .print-container .border-b,
          .print-container .border-b-2,
          .print-container .border-t,
          .print-container .border-t-2,
          .print-container th,
          .print-container td,
          .print-container tr,
          .print-container div,
          .print-container .divide-y > * {
            border-color: #e2e8f0 !important; /* slate-200 (delicate lines) */
          }
          
          /* 6. Style the table headers for printing (light gray background, dark bold text) */
          .print-container thead tr {
            background-color: #f8fafc !important;
            border-bottom: 1px solid #cbd5e1 !important;
          }
          
          .print-container thead th {
            background-color: #f8fafc !important;
            color: #0f172a !important;
            font-weight: 600 !important;
          }
          
          /* 7. Category subheaders background gray shading */
          .print-container [class*="bg-slate-50"],
          .print-container .bg-slate-100 {
            background-color: #f8fafc !important;
          }
          
          /* 8. Make secondary and notes texts a lighter but highly readable gray */
          .print-container .text-slate-400,
          .print-container .text-slate-500,
          .print-container .text-slate-600 {
            color: #475569 !important; /* slate-600 */
          }
          
          /* 9. Preserve green text for totals to make it stand out on paper */
          .print-container .text-brand-green {
            color: #047857 !important; /* emerald-700 for printer contrast */
            font-weight: 700 !important;
          }
        }
      `}</style>
    </div>
  );
}
