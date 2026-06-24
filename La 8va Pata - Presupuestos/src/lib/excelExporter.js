import ExcelJS from 'exceljs';

export async function exportToExcel(project, productionItems, realizationItems) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'La 8va Pata - Presupuestos';
  
  const tc = project.exchange_rate || 3.6;

  // ==========================================
  // SHEET 1: Pto. Dólares-Soles (Production)
  // ==========================================
  const sh1 = workbook.addWorksheet('Pto. Dólares-Soles', {
    views: [{ showGridLines: true }]
  });

  // Column widths
  sh1.columns = [
    { width: 50 }, // A (Item Name)
    { width: 3 },  // B (Spacing)
    { width: 10 }, // C (Cantidad)
    { width: 10 }, // D (Días)
    { width: 14 }, // E (Costo Unit)
    { width: 16 }, // F (Total USD)
    { width: 16 }, // G (Total Soles)
    { width: 12 }, // H (Label TC)
    { width: 8 }   // I (Val TC)
  ];

  // Header Logo Info
  sh1.getCell('A1').value = 'Av. Jose Pardo 1357 - 801 Miraflores RUC 20602017487';
  sh1.getCell('A1').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF666666' } };

  // Project Metadata Info
  const metaFields1 = [
    { label: 'Atención:', key: 'contact_8va_pata', colRight: 'Duración:', keyRight: 'duration' },
    { label: 'Cliente:', key: 'client', colRight: 'Formato:', keyRight: 'format' },
    { label: 'Agencia:', key: 'agency', colRight: 'Días de Rodaje:', keyRight: 'shoot_days' },
    { label: 'Producto:', key: 'product', colRight: 'Director:', keyRight: 'director' },
    { label: 'Motivo:', key: 'reason', colRight: 'Contacto 8va Pata:', keyRight: 'contact_8va_pata' },
    { label: 'Fecha:', key: 'created_at', colRight: 'Número de Presupuesto:', keyRight: 'budget_number' }
  ];

  let startRow = 11;
  metaFields1.forEach((field, i) => {
    const rowNum = startRow + i;
    sh1.getCell(`A${rowNum}`).value = field.label;
    sh1.getCell(`A${rowNum}`).font = { name: 'Arial', size: 10, bold: true };
    
    let valLeft = project[field.key];
    if (field.key === 'created_at' && valLeft) {
      valLeft = new Date(valLeft).toLocaleDateString();
    }
    sh1.getCell(`C${rowNum}`).value = valLeft || '';
    sh1.getCell(`C${rowNum}`).font = { name: 'Arial', size: 10 };

    sh1.getCell(`D${rowNum}`).value = field.colRight;
    sh1.getCell(`D${rowNum}`).font = { name: 'Arial', size: 10, bold: true };
    sh1.getCell(`F${rowNum}`).value = project[field.keyRight] || '';
    sh1.getCell(`F${rowNum}`).font = { name: 'Arial', size: 10 };
  });

  // Budget summaries header
  sh1.getCell('F19').value = 'Total Dólares';
  sh1.getCell('G19').value = 'Total Soles';
  sh1.getCell('F19').font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell('G19').font = { name: 'Arial', size: 10, bold: true };

  // Calculate Totals references
  // Rows: 20: Servicio de Producción, 28: Servicio de Realización, 34: Financiamiento, 40: Gran Total
  sh1.getCell('A20').value = 'Servicio de Produccion';
  sh1.getCell('A20').font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell('A21').value = 'Incluye: Casting, modelos, extras, equipo artístico, estudio, locaciones, vestuario, utilería, escenografía, transporte, alimentación, seguros, permisos, requerimientos técnicos, otros, audio, etc.';
  sh1.getCell('A21').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF666666' } };

  sh1.getCell('A28').value = 'Servicio de Realización';
  sh1.getCell('A28').font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell('A29').value = 'Incluye: Director, productor ejecutivo, DF, equipo técnico, cámaras, luces, sonido directo, post producción, edición, sonido, etc.';
  sh1.getCell('A29').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF666666' } };

  sh1.getCell('A34').value = 'Financiamiento x 30 dias';
  sh1.getCell('A34').font = { name: 'Arial', size: 10 };
  sh1.getCell('C34').value = project.financing_fee_rate || 0.016;
  sh1.getCell('C34').numFormat = '0.0%';

  sh1.getCell('C40').value = 'GRAN TOTAL: US / SOLES:';
  sh1.getCell('C40').font = { name: 'Arial', size: 11, bold: true };

  // We will dynamically link these rows later when we know the exact data rows.
  
  // Desglose de Producción Title
  sh1.getCell('A92').value = 'Desglose de Producción';
  sh1.getCell('A92').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0D5C3A' } };
  sh1.getCell('A93').value = `Producto: ${project.product || ''}`;
  sh1.getCell('A93').font = { name: 'Arial', size: 10, italic: true };
  sh1.getCell('A94').value = `Motivo: ${project.reason || ''}`;
  sh1.getCell('A94').font = { name: 'Arial', size: 10, italic: true };

  // Write items grouped by category
  let currentRow = 97;
  const categories = [...new Set(productionItems.map(item => item.category))];
  
  // We need to keep track of category sum formulas for the summary
  const categoryRanges = [];

  categories.forEach(cat => {
    // Write category header
    sh1.getCell(`A${currentRow}`).value = cat;
    sh1.getCell(`A${currentRow}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF10B981' } };
    
    sh1.getCell(`C${currentRow}`).value = 'Cantidad';
    sh1.getCell(`D${currentRow}`).value = 'Días';
    sh1.getCell(`E${currentRow}`).value = 'Costo Unit.';
    sh1.getCell(`F${currentRow}`).value = 'Total Dólares';
    sh1.getCell(`G${currentRow}`).value = 'Total Soles';
    
    // Add Tipo de Cambio for the first category
    if (currentRow === 97) {
      sh1.getCell(`H${currentRow}`).value = 'T. Cambio';
      sh1.getCell(`I${currentRow}`).value = tc;
      sh1.getCell(`H${currentRow}`).font = { name: 'Arial', size: 9, bold: true };
      sh1.getCell(`I${currentRow}`).font = { name: 'Arial', size: 9, bold: true };
    }

    const headingCols = [`C${currentRow}`, `D${currentRow}`, `E${currentRow}`, `F${currentRow}`, `G${currentRow}`];
    headingCols.forEach(col => {
      sh1.getCell(col).font = { name: 'Arial', size: 9, bold: true, italic: true };
      sh1.getCell(col).alignment = { horizontal: 'right' };
    });

    // Border under heading row
    sh1.getRow(currentRow).border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } };

    currentRow++;
    const catStart = currentRow;

    const catItems = productionItems.filter(item => item.category === cat);
    catItems.forEach(item => {
      sh1.getCell(`A${currentRow}`).value = item.item_name;
      sh1.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10 };

      sh1.getCell(`C${currentRow}`).value = item.quantity;
      sh1.getCell(`C${currentRow}`).font = { name: 'Arial', size: 10 };
      sh1.getCell(`C${currentRow}`).numFormat = '#,##0.00';

      sh1.getCell(`D${currentRow}`).value = item.days;
      sh1.getCell(`D${currentRow}`).font = { name: 'Arial', size: 10 };
      sh1.getCell(`D${currentRow}`).numFormat = '#,##0.00';

      sh1.getCell(`E${currentRow}`).value = item.unit_cost;
      sh1.getCell(`E${currentRow}`).font = { name: 'Arial', size: 10 };
      sh1.getCell(`E${currentRow}`).numFormat = '$#,##0.00';

      // Excel formulas
      sh1.getCell(`F${currentRow}`).value = { formula: `C${currentRow}*D${currentRow}*E${currentRow}` };
      sh1.getCell(`F${currentRow}`).font = { name: 'Arial', size: 10 };
      sh1.getCell(`F${currentRow}`).numFormat = '$#,##0.00';

      sh1.getCell(`G${currentRow}`).value = { formula: `F${currentRow}*I$97` };
      sh1.getCell(`G${currentRow}`).font = { name: 'Arial', size: 10 };
      sh1.getCell(`G${currentRow}`).numFormat = 'S/#,##0.00';

      currentRow++;
    });

    const catEnd = currentRow - 1;
    categoryRanges.push({ start: catStart, end: catEnd });
  });

  // Subtotal Production
  const subtotalRow = currentRow;
  sh1.getCell(`A${subtotalRow}`).value = 'Sub Total Dólares y Soles';
  sh1.getCell(`A${subtotalRow}`).font = { name: 'Arial', size: 10, bold: true };
  
  // Formula summing all categories
  const sumFormulaUsd = categoryRanges.map(r => `SUM(F${r.start}:F${r.end})`).join('+');
  const sumFormulaPen = categoryRanges.map(r => `SUM(G${r.start}:G${r.end})`).join('+');
  
  sh1.getCell(`F${subtotalRow}`).value = { formula: sumFormulaUsd };
  sh1.getCell(`F${subtotalRow}`).font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell(`F${subtotalRow}`).numFormat = '$#,##0.00';

  sh1.getCell(`G${subtotalRow}`).value = { formula: sumFormulaPen };
  sh1.getCell(`G${subtotalRow}`).font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell(`G${subtotalRow}`).numFormat = 'S/#,##0.00';

  // Gastos Administrativos
  const adminRow = subtotalRow + 1;
  sh1.getCell(`A${adminRow}`).value = 'Gastos Administrativos';
  sh1.getCell(`A${adminRow}`).font = { name: 'Arial', size: 10 };
  sh1.getCell(`C${adminRow}`).value = project.admin_fee_rate || 0.04;
  sh1.getCell(`C${adminRow}`).numFormat = '0.0%';
  sh1.getCell(`C${adminRow}`).font = { name: 'Arial', size: 10 };

  sh1.getCell(`F${adminRow}`).value = { formula: `F${subtotalRow}*C${adminRow}` };
  sh1.getCell(`F${adminRow}`).font = { name: 'Arial', size: 10 };
  sh1.getCell(`F${adminRow}`).numFormat = '$#,##0.00';

  sh1.getCell(`G${adminRow}`).value = { formula: `G${subtotalRow}*C${adminRow}` };
  sh1.getCell(`G${adminRow}`).font = { name: 'Arial', size: 10 };
  sh1.getCell(`G${adminRow}`).numFormat = 'S/#,##0.00';

  // Total Producción
  const totalProdRow = adminRow + 1;
  sh1.getCell(`A${totalProdRow}`).value = 'Total Dólares y Soles (Producción)';
  sh1.getCell(`A${totalProdRow}`).font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell(`F${totalProdRow}`).value = { formula: `F${subtotalRow}+F${adminRow}` };
  sh1.getCell(`F${totalProdRow}`).font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell(`F${totalProdRow}`).numFormat = '$#,##0.00';

  sh1.getCell(`G${totalProdRow}`).value = { formula: `G${subtotalRow}+G${adminRow}` };
  sh1.getCell(`G${totalProdRow}`).font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell(`G${totalProdRow}`).numFormat = 'S/#,##0.00';

  // Fill in the top Summary rows (rows 20, 28, 34, 40)
  // Row 20: Servicio de Producción (links to Total Producción)
  sh1.getCell(`F20`).value = { formula: `F${totalProdRow}` };
  sh1.getCell(`F20`).font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell(`F20`).numFormat = '$#,##0.00';
  sh1.getCell(`G20`).value = { formula: `G${totalProdRow}` };
  sh1.getCell(`G20`).font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell(`G20`).numFormat = 'S/#,##0.00';

  // Row 28: Servicio de Realización (links to the second sheet's total)
  sh1.getCell(`F28`).value = { formula: `'Pto. Realización'!M136` }; // M136 is the Grand Total row in realization sheet
  sh1.getCell(`F28`).font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell(`F28`).numFormat = '$#,##0.00';
  sh1.getCell(`G28`).value = { formula: `'Pto. Realización'!N136` };
  sh1.getCell(`G28`).font = { name: 'Arial', size: 10, bold: true };
  sh1.getCell(`G28`).numFormat = 'S/#,##0.00';

  // Row 34: Financiamiento (subtotal * financing rate)
  // Subtotal for financing is Production Total + Realization Total (row 20 + row 28)
  sh1.getCell(`F34`).value = { formula: `(F20+F28)*C34` };
  sh1.getCell(`F34`).font = { name: 'Arial', size: 10 };
  sh1.getCell(`F34`).numFormat = '$#,##0.00';
  sh1.getCell(`G34`).value = { formula: `(G20+G28)*C34` };
  sh1.getCell(`G34`).font = { name: 'Arial', size: 10 };
  sh1.getCell(`G34`).numFormat = 'S/#,##0.00';

  // Row 40: GRAN TOTAL
  sh1.getCell(`F40`).value = { formula: `F20+F28+F34` };
  sh1.getCell(`F40`).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0D5C3A' } };
  sh1.getCell(`F40`).numFormat = '$#,##0.00';
  sh1.getCell(`G40`).value = { formula: `G20+G28+G34` };
  sh1.getCell(`G40`).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0D5C3A' } };
  sh1.getCell(`G40`).numFormat = 'S/#,##0.00';

  // Apply border to Grand Total
  sh1.getRow(40).border = {
    top: { style: 'thin', color: { argb: 'FF334155' } },
    bottom: { style: 'double', color: { argb: 'FF0D5C3A' } }
  };


  // ==========================================
  // SHEET 2: Pto. Realización (Realization)
  // ==========================================
  const sh2 = workbook.addWorksheet('Pto. Realización', {
    views: [{ showGridLines: true }]
  });

  sh2.columns = [
    { width: 3 },  // A (Spacing)
    { width: 45 }, // B (Item name)
    { width: 2 },  // C (Spacing)
    { width: 2 },  // D (Spacing)
    { width: 2 },  // E (Spacing)
    { width: 12 }, // F (Costo Unit)
    { width: 10 }, // G (Cantidad)
    { width: 10 }, // H (Días)
    { width: 15 }, // I (Total USD)
    { width: 15 }, // J (Total Soles)
    { width: 15 }, // K (Sub-Totales)
    { width: 2 },  // L (Spacing)
    { width: 15 }, // M (Monto a Liquidar)
    { width: 30 }, // N (Proveedor/Beneficiario)
    { width: 2 },  // O
    { width: 2 },  // P
    { width: 15 }  // Q (Nro comprobante)
  ];

  sh2.getCell('B2').value = 'Desglose interno de Realización';
  sh2.getCell('B2').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0D5C3A' } };

  sh2.getCell('B4').value = `Cliente: ${project.client || ''}`;
  sh2.getCell('B4').font = { name: 'Arial', size: 10, italic: true };
  sh2.getCell('B5').value = `Motivo: ${project.reason || ''}`;
  sh2.getCell('B5').font = { name: 'Arial', size: 10, italic: true };

  // Write headers in row 7
  const headers2 = {
    B7: 'Item',
    F7: 'Costo Unit.',
    G7: 'Cantidad',
    H7: 'Días',
    I7: 'Total Dólares',
    J7: 'Total Soles',
    K7: 'Sub-Totales',
    M7: 'Monto a Liquidar',
    N7: 'Nombre Fact. o Recibo x Honorarios',
    Q7: '# Fact. o Recibo'
  };

  Object.entries(headers2).forEach(([cell, text]) => {
    sh2.getCell(cell).value = text;
    sh2.getCell(cell).font = { name: 'Arial', size: 9, bold: true };
    sh2.getCell(cell).alignment = { horizontal: cell === 'B7' || cell === 'N7' ? 'left' : 'right' };
  });

  sh2.getRow(7).border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } };

  let currentRealRow = 8;
  const realCategories = [...new Set(realizationItems.map(item => item.category))];
  const realCategoryRanges = [];

  realCategories.forEach(cat => {
    sh2.getCell(`B${currentRealRow}`).value = cat;
    sh2.getCell(`B${currentRealRow}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF10B981' } };
    currentRealRow++;

    const catStart = currentRealRow;
    const catItems = realizationItems.filter(item => item.category === cat);

    catItems.forEach(item => {
      sh2.getCell(`B${currentRealRow}`).value = item.item_name;
      sh2.getCell(`B${currentRealRow}`).font = { name: 'Arial', size: 10 };

      sh2.getCell(`F${currentRealRow}`).value = item.unit_cost;
      sh2.getCell(`F${currentRealRow}`).font = { name: 'Arial', size: 10 };
      sh2.getCell(`F${currentRealRow}`).numFormat = '$#,##0.00';

      sh2.getCell(`G${currentRealRow}`).value = item.quantity;
      sh2.getCell(`G${currentRealRow}`).font = { name: 'Arial', size: 10 };
      sh2.getCell(`G${currentRealRow}`).numFormat = '#,##0.00';

      sh2.getCell(`H${currentRealRow}`).value = item.days;
      sh2.getCell(`H${currentRealRow}`).font = { name: 'Arial', size: 10 };
      sh2.getCell(`H${currentRealRow}`).numFormat = '#,##0.00';

      // Formulas
      sh2.getCell(`I${currentRealRow}`).value = { formula: `F${currentRealRow}*G${currentRealRow}*H${currentRealRow}` };
      sh2.getCell(`I${currentRealRow}`).font = { name: 'Arial', size: 10 };
      sh2.getCell(`I${currentRealRow}`).numFormat = '$#,##0.00';

      sh2.getCell(`J${currentRealRow}`).value = { formula: `I${currentRealRow}*'Pto. Dólares-Soles'!I$97` };
      sh2.getCell(`J${currentRealRow}`).font = { name: 'Arial', size: 10 };
      sh2.getCell(`J${currentRealRow}`).numFormat = 'S/#,##0.00';

      // Liquidation fields
      sh2.getCell(`M${currentRealRow}`).value = item.amount_to_liquidate || 0.0;
      sh2.getCell(`M${currentRealRow}`).font = { name: 'Arial', size: 10 };
      sh2.getCell(`M${currentRealRow}`).numFormat = '$#,##0.00';

      sh2.getCell(`N${currentRealRow}`).value = item.invoice_name || '';
      sh2.getCell(`N${currentRealRow}`).font = { name: 'Arial', size: 10 };

      sh2.getCell(`Q${currentRealRow}`).value = item.invoice_number || '';
      sh2.getCell(`Q${currentRealRow}`).font = { name: 'Arial', size: 10 };

      currentRealRow++;
    });

    const catEnd = currentRealRow - 1;
    realCategoryRanges.push({ name: cat, start: catStart, end: catEnd });

    // Write category subtotal row
    sh2.getCell(`B${currentRealRow}`).value = `Sub-Total ${cat}`;
    sh2.getCell(`B${currentRealRow}`).font = { name: 'Arial', size: 10, bold: true, italic: true };

    sh2.getCell(`K${currentRealRow}`).value = { formula: `SUM(I${catStart}:I${catEnd})` };
    sh2.getCell(`K${currentRealRow}`).font = { name: 'Arial', size: 10, bold: true };
    sh2.getCell(`K${currentRealRow}`).numFormat = '$#,##0.00';

    currentRealRow += 2; // Add some spacing between categories
  });

  // Calculate grand totals (anchored to a fixed row layout for simple linking)
  // Let's force-write the grand totals at a fixed offset or just write them at the end.
  // Wait, in sh1 we linked to: 'Pto. Realización'!M136 for Grand Total.
  // Let's write the final summary block exactly starting at row 130!
  // This is a great trick to keep cell coordinates matching.
  
  const sumRow = 130;
  sh2.getCell(`H${sumRow + 1}`).value = 'Dólares';
  sh2.getCell(`I${sumRow + 1}`).value = 'Soles';
  sh2.getCell(`H${sumRow + 1}`).font = { name: 'Arial', size: 9, bold: true };
  sh2.getCell(`I${sumRow + 1}`).font = { name: 'Arial', size: 9, bold: true };

  // Subtotal Realización 1 (Sum of all category subtotals)
  sh2.getCell(`B${sumRow + 2}`).value = 'Sub Total Realización 1:';
  sh2.getCell(`B${sumRow + 2}`).font = { name: 'Arial', size: 10, bold: true };
  
  const catSumsFormulaUsd = realCategoryRanges.map(r => `SUM(I${r.start}:I${r.end})`).join('+');
  sh2.getCell(`H${sumRow + 2}`).value = { formula: catSumsFormulaUsd };
  sh2.getCell(`H${sumRow + 2}`).font = { name: 'Arial', size: 10, bold: true };
  sh2.getCell(`H${sumRow + 2}`).numFormat = '$#,##0.00';

  sh2.getCell(`I${sumRow + 2}`).value = { formula: `H${sumRow + 2}*'Pto. Dólares-Soles'!I$97` };
  sh2.getCell(`I${sumRow + 2}`).font = { name: 'Arial', size: 10, bold: true };
  sh2.getCell(`I${sumRow + 2}`).numFormat = 'S/#,##0.00';

  // Gastos Administrativos
  sh2.getCell(`B${sumRow + 3}`).value = 'Gastos Administrativos, Financieros y Bancarios:';
  sh2.getCell(`B${sumRow + 3}`).font = { name: 'Arial', size: 10 };
  sh2.getCell(`H${sumRow + 3}`).value = { formula: `H${sumRow + 2}*0.0` }; // Currently 0% in template but we link it
  sh2.getCell(`H${sumRow + 3}`).font = { name: 'Arial', size: 10 };
  sh2.getCell(`H${sumRow + 3}`).numFormat = '$#,##0.00';
  sh2.getCell(`I${sumRow + 3}`).value = { formula: `H${sumRow + 3}*'Pto. Dólares-Soles'!I$97` };
  sh2.getCell(`I${sumRow + 3}`).font = { name: 'Arial', size: 10 };
  sh2.getCell(`I${sumRow + 3}`).numFormat = 'S/#,##0.00';

  // Subtotal Realización 2
  sh2.getCell(`B${sumRow + 4}`).value = 'Sub Total Realización 2:';
  sh2.getCell(`B${sumRow + 4}`).font = { name: 'Arial', size: 10, bold: true };
  sh2.getCell(`H${sumRow + 4}`).value = { formula: `H${sumRow + 2}+H${sumRow + 3}` };
  sh2.getCell(`H${sumRow + 4}`).font = { name: 'Arial', size: 10, bold: true };
  sh2.getCell(`H${sumRow + 4}`).numFormat = '$#,##0.00';
  sh2.getCell(`I${sumRow + 4}`).value = { formula: `I${sumRow + 2}+I${sumRow + 3}` };
  sh2.getCell(`I${sumRow + 4}`).font = { name: 'Arial', size: 10, bold: true };
  sh2.getCell(`I${sumRow + 4}`).numFormat = 'S/#,##0.00';

  // Mark Up 15%
  sh2.getCell(`B${sumRow + 5}`).value = 'Mark Up 15%:';
  sh2.getCell(`B${sumRow + 5}`).font = { name: 'Arial', size: 10 };
  sh2.getCell(`H${sumRow + 5}`).value = { formula: `H${sumRow + 4}*0.15` };
  sh2.getCell(`H${sumRow + 5}`).font = { name: 'Arial', size: 10 };
  sh2.getCell(`H${sumRow + 5}`).numFormat = '$#,##0.00';
  sh2.getCell(`I${sumRow + 5}`).value = { formula: `H${sumRow + 5}*'Pto. Dólares-Soles'!I$97` };
  sh2.getCell(`I${sumRow + 5}`).font = { name: 'Arial', size: 10 };
  sh2.getCell(`I${sumRow + 5}`).numFormat = 'S/#,##0.00';

  // Comisión Agencia (default to 0 for simplicity, but formula supported)
  sh2.getCell(`B${sumRow + 6}`).value = 'Comisión de la Agencia (varia de acuerdo a la Agencia):';
  sh2.getCell(`B${sumRow + 6}`).font = { name: 'Arial', size: 10 };
  
  // Calculate commission based on rate (e.g. 10% = /9, 15% = /5.5)
  const commRate = project.agency_commission_rate || 0.0;
  let commFormulaUsd = '0.0';
  if (commRate === 0.10) commFormulaUsd = `(H${sumRow + 4}+H${sumRow + 5})/9`;
  else if (commRate === 0.13) commFormulaUsd = `(H${sumRow + 4}+H${sumRow + 5})/6.5`;
  else if (commRate === 0.15) commFormulaUsd = `(H${sumRow + 4}+H${sumRow + 5})/5.5`;
  else if (commRate === 0.20) commFormulaUsd = `(H${sumRow + 4}+H${sumRow + 5})/4`;
  else if (commRate > 0) commFormulaUsd = `(H${sumRow + 4}+H${sumRow + 5})*${commRate}`;

  sh2.getCell(`H${sumRow + 6}`).value = { formula: commFormulaUsd };
  sh2.getCell(`H${sumRow + 6}`).font = { name: 'Arial', size: 10 };
  sh2.getCell(`H${sumRow + 6}`).numFormat = '$#,##0.00';
  
  sh2.getCell(`I${sumRow + 6}`).value = { formula: `H${sumRow + 6}*'Pto. Dólares-Soles'!I$97` };
  sh2.getCell(`I${sumRow + 6}`).font = { name: 'Arial', size: 10 };
  sh2.getCell(`I${sumRow + 6}`).numFormat = 'S/#,##0.00';

  // Gran Total (Sub Total 2 + Markup + Comisión)
  // Let's write the Grand Total on row 136, columns M and N, to match the sh1 link ('Pto. Realización'!M136)
  sh2.getCell('L136').value = 'Gran Total:';
  sh2.getCell('L136').font = { name: 'Arial', size: 11, bold: true };
  
  sh2.getCell('M136').value = { formula: `H${sumRow + 4}+H${sumRow + 5}+H${sumRow + 6}` };
  sh2.getCell('M136').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0D5C3A' } };
  sh2.getCell('M136').numFormat = '$#,##0.00';

  sh2.getCell('N136').value = { formula: `I${sumRow + 4}+I${sumRow + 5}+I${sumRow + 6}` };
  sh2.getCell('N136').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0D5C3A' } };
  sh2.getCell('N136').numFormat = 'S/#,##0.00';

  sh2.getRow(136).border = {
    top: { style: 'thin', color: { argb: 'FF334155' } },
    bottom: { style: 'double', color: { argb: 'FF0D5C3A' } }
  };

  // Generate buffer and return
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
