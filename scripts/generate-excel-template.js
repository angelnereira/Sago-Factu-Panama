/**
 * Script to generate Excel template for invoice import
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Template data
const data = [
  {
    numeroDocumentoFiscal: 'FAC-2024-001',
    tipoReceptor: '01',
    numeroRUC: '123456789',
    digitoVerificadorRUC: '01',
    razonSocial: 'EMPRESA DEMO SA',
    direccion: 'Ave Balboa, Ciudad de Panama',
    correoElectronico: 'cliente@empresa.com',
    fechaEmision: '2024-01-15',
    formaPago: '1',
    descripcion: 'SERVICIO DE CONSULTORIA',
    cantidad: 10,
    unidad: 'UND',
    precioUnitario: 100.0,
    tasaItbms: '01',
    descuento: 0,
  },
  {
    numeroDocumentoFiscal: 'FAC-2024-001',
    tipoReceptor: '01',
    numeroRUC: '123456789',
    digitoVerificadorRUC: '01',
    razonSocial: 'EMPRESA DEMO SA',
    direccion: 'Ave Balboa, Ciudad de Panama',
    correoElectronico: 'cliente@empresa.com',
    fechaEmision: '2024-01-15',
    formaPago: '1',
    descripcion: 'SOPORTE TECNICO',
    cantidad: 5,
    unidad: 'UND',
    precioUnitario: 50.0,
    tasaItbms: '01',
    descuento: 10,
  },
  {
    numeroDocumentoFiscal: 'FAC-2024-002',
    tipoReceptor: '02',
    numeroRUC: '',
    digitoVerificadorRUC: '',
    razonSocial: 'JUAN PEREZ',
    direccion: 'Panama',
    correoElectronico: 'juan@email.com',
    fechaEmision: '2024-01-16',
    formaPago: '1',
    descripcion: 'PRODUCTO A',
    cantidad: 2,
    unidad: 'UND',
    precioUnitario: 25.0,
    tasaItbms: '01',
    descuento: 0,
  },
  {
    numeroDocumentoFiscal: 'FAC-2024-002',
    tipoReceptor: '02',
    numeroRUC: '',
    digitoVerificadorRUC: '',
    razonSocial: 'JUAN PEREZ',
    direccion: 'Panama',
    correoElectronico: 'juan@email.com',
    fechaEmision: '2024-01-16',
    formaPago: '1',
    descripcion: 'PRODUCTO B',
    cantidad: 3,
    unidad: 'UND',
    precioUnitario: 15.0,
    tasaItbms: '02',
    descuento: 5,
  },
];

// Create workbook
const wb = XLSX.utils.book_new();

// Create worksheet from data
const ws = XLSX.utils.json_to_sheet(data);

// Set column widths
ws['!cols'] = [
  { wch: 20 }, // numeroDocumentoFiscal
  { wch: 15 }, // tipoReceptor
  { wch: 15 }, // numeroRUC
  { wch: 20 }, // digitoVerificadorRUC
  { wch: 30 }, // razonSocial
  { wch: 40 }, // direccion
  { wch: 30 }, // correoElectronico
  { wch: 15 }, // fechaEmision
  { wch: 12 }, // formaPago
  { wch: 40 }, // descripcion
  { wch: 10 }, // cantidad
  { wch: 10 }, // unidad
  { wch: 15 }, // precioUnitario
  { wch: 12 }, // tasaItbms
  { wch: 12 }, // descuento
];

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Facturas');

// Add instructions sheet
const instructions = [
  ['INSTRUCCIONES PARA IMPORTAR FACTURAS'],
  [''],
  ['1. COLUMNAS REQUERIDAS'],
  [
    '   - numeroDocumentoFiscal: Número único de la factura (ej: FAC-2024-001)',
  ],
  ['   - tipoReceptor: 01 = Contribuyente, 02 = Consumidor Final'],
  ['   - razonSocial: Nombre del cliente'],
  ['   - descripcion: Descripción del producto/servicio'],
  ['   - cantidad: Cantidad de items'],
  ['   - precioUnitario: Precio por unidad'],
  ['   - tasaItbms: 00 = 0%, 01 = 7%, 02 = 10%, 03 = 15%'],
  [''],
  ['2. COLUMNAS CONDICIONALES'],
  ['   Si tipoReceptor = 01 (Contribuyente):'],
  ['     - numeroRUC: Requerido'],
  ['     - digitoVerificadorRUC: Requerido'],
  [''],
  ['3. MÚLTIPLES ITEMS POR FACTURA'],
  [
    '   Repita el numeroDocumentoFiscal en varias filas para agregar más items',
  ],
  ['   (ver FAC-2024-001 en el ejemplo)'],
  [''],
  ['4. FECHAS'],
  ['   Formato: YYYY-MM-DD (ej: 2024-01-15)'],
  ['   Máximo 7 días en el pasado'],
  [''],
  ['5. FORMA DE PAGO'],
  ['   1 = Contado'],
  ['   2 = Crédito'],
];

const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
wsInstructions['!cols'] = [{ wch: 80 }];
XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

// Save file
const outputPath = path.join(
  __dirname,
  '..',
  'public',
  'templates',
  'facturas-template.xlsx'
);

XLSX.writeFile(wb, outputPath);

console.log(`✅ Excel template created: ${outputPath}`);
