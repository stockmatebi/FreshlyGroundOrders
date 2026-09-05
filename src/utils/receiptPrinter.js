import { Alert, Platform } from 'react-native';
import { receiptLogoBase64 } from '../assets/receiptLogo';

let cachedPrinterModule;

function getPrinterModule() {
  if (cachedPrinterModule !== undefined) return cachedPrinterModule;
  try {
    cachedPrinterModule = require('@haroldtran/react-native-thermal-printer');
  } catch (error) {
    console.warn('Thermal printer module could not be loaded:', error?.message || error);
    cachedPrinterModule = null;
  }
  return cachedPrinterModule;
}

function getUsbPrinter() {
  const mod = getPrinterModule();
  return mod?.USBPrinter || null;
}

function getCommands() {
  const mod = getPrinterModule();
  return mod?.COMMANDS || null;
}

export function formatMoney(value) {
  return `R${Number(value || 0).toFixed(2)}`;
}

function hr() {
  const commands = getCommands();
  return commands?.HORIZONTAL_LINE?.HR_80MM || '------------------------------------------------';
}

function center(text) {
  const commands = getCommands();
  const ct = commands?.TEXT_FORMAT?.TXT_ALIGN_CT || '';
  const lt = commands?.TEXT_FORMAT?.TXT_ALIGN_LT || '';
  return `${ct}${text}${lt}`;
}

function bold(text) {
  const commands = getCommands();
  const on = commands?.TEXT_FORMAT?.TXT_BOLD_ON || '';
  const off = commands?.TEXT_FORMAT?.TXT_BOLD_OFF || '';
  return `${on}${text}${off}`;
}

function large(text) {
  const ESC = '\x1b';
  return `${ESC}!\x30${text}${ESC}!\x00`;
}

function doubleHeight(text) {
  const ESC = '\x1b';
  return `${ESC}!\x10${text}${ESC}!\x00`;
}

export function buildSlipText(order, receipt = {}, options = {}) {
  const isReprint = Boolean(options.reprint);
  const copyLabel = options.copyLabel || '';
  const lines = [];

  if (copyLabel) {
    lines.push(center(large(bold(copyLabel))));
    lines.push('');
  }

  if (isReprint) {
    lines.push(center('*** REPRINT ***'));
    lines.push('');
  }

  if (receipt.showLogo === false) {
    lines.push(center(bold(receipt.businessName || 'FRESHLY GROUND EXPRESS')));
  }
  if (receipt.headerLine1) lines.push(center(receipt.headerLine1));
  if (receipt.headerLine2) lines.push(center(receipt.headerLine2));
  if (receipt.phone) lines.push(center(receipt.phone));

  lines.push(hr());
  lines.push(center(large(bold(`ORDER #${order.number}`))));
  lines.push(order.createdAtText || new Date(order.createdAt).toLocaleString('en-ZA'));
  if (receipt.showOrderType !== false) lines.push(center(doubleHeight(bold(order.orderType || ''))));
  if (receipt.showCustomer !== false && order.customerName) lines.push(doubleHeight(`Customer: ${order.customerName}`));
  if (receipt.showTable !== false && order.tableNumber) lines.push(doubleHeight(`Table: ${order.tableNumber}`));
  lines.push('');

  (order.items || []).forEach((item) => {
    const unit = Number(item.unitPrice ?? item.price ?? 0);
    const modifierValue = (item.selectedModifiers || []).reduce((sum, mod) => sum + Number(mod.price || 0), 0);
    const lineTotal = Number(item.qty || 0) * (unit + modifierValue);
    const price = receipt.showPrices === false ? '' : `  ${formatMoney(lineTotal)}`;
    lines.push(doubleHeight(bold(`${item.qty} x ${item.name}${price}`)));
    (item.selectedModifiers || []).forEach((mod) => {
      const modPrice = receipt.showPrices === false ? '' : ` +${formatMoney(mod.price)}`;
      lines.push(bold(`   + ${mod.name}${modPrice}`));
    });
    if (receipt.showNotes !== false && item.note) lines.push(bold(`   NOTE: ${item.note}`));
  });

  if (receipt.showNotes !== false && order.orderNote) {
    lines.push('');
    lines.push(doubleHeight(bold('ORDER NOTE:')));
    lines.push(doubleHeight(bold(order.orderNote)));
  }

  lines.push('');
  lines.push(hr());
  if (receipt.showTotal !== false) lines.push(center(large(bold(`TOTAL: ${formatMoney(order.total)}`))));
  lines.push(hr());
  if (receipt.footer) lines.push(center(receipt.footer));
  return lines.join('\n') + '\n';
}

export function barcodeValue(order, receipt = {}) {
  const prefix = String(receipt.barcodePrefix || '31010001').replace(/\D/g, '') || '31010001';
  const amount = Number(order?.total || 0).toFixed(2);
  return { prefix, amount, display: `${prefix}  ${amount}` };
}

function buildCode128WithEnter(prefix, amount) {
  const data = `{B${prefix}{A\r{B${amount}`;
  const GS = '\x1d';
  const ESC = '\x1b';
  const hriNone = `${GS}H\x00`;
  const height = `${GS}h\x64`;
  const width = `${GS}w\x03`;
  const centerAlign = `${ESC}a\x01`;
  const leftAlign = `${ESC}a\x00`;
  const barcode = `${GS}k\x49${String.fromCharCode(data.length)}${data}`;
  return `${centerAlign}${hriNone}${height}${width}${barcode}\n${leftAlign}`;
}

function normalizeUsbDevice(device, index) {
  const vendorId = Number(device?.vendorId ?? device?.vendor_id);
  const productId = Number(device?.productId ?? device?.product_id);
  if (!Number.isInteger(vendorId) || !Number.isInteger(productId)) return null;
  return {
    id: `${vendorId}-${productId}-${index}`,
    name: device?.deviceName || device?.device_name || 'USB Thermal Printer',
    vendorId,
    productId,
  };
}

export async function listUsbPrinters() {
  if (Platform.OS !== 'android') return [];
  const USBPrinter = getUsbPrinter();
  if (!USBPrinter) throw new Error('USB printer module is not available in this build.');

  await USBPrinter.init();
  const devices = await USBPrinter.getDeviceList();
  return (devices || []).map(normalizeUsbDevice).filter(Boolean);
}

async function connect(printer) {
  const USBPrinter = getUsbPrinter();
  if (!USBPrinter) throw new Error('USB printer module is not available in this build.');

  const vendorId = Number(printer?.vendorId);
  const productId = Number(printer?.productId);
  if (!Number.isInteger(vendorId) || !Number.isInteger(productId)) {
    throw new Error('The selected USB printer has invalid device IDs. Please detect and select it again.');
  }

  await USBPrinter.init();
  await USBPrinter.connectPrinter(vendorId, productId);
  return USBPrinter;
}

async function printSingleCopy(USBPrinter, order, receipt, options = {}) {
  if (receipt.showLogo !== false && typeof USBPrinter.printImageBase64 === 'function') {
    await Promise.resolve(USBPrinter.printImageBase64(receiptLogoBase64, { imageWidth: 520 }));
    if (typeof USBPrinter.printText === 'function') await Promise.resolve(USBPrinter.printText('\n'));
  }

  const text = buildSlipText(order, receipt, options);
  if (typeof USBPrinter.printText === 'function') {
    await Promise.resolve(USBPrinter.printText(text));
  } else if (typeof USBPrinter.printBill === 'function') {
    await Promise.resolve(USBPrinter.printBill(text, { cut: false, tailingLine: false, encoding: 'UTF-8' }));
  } else {
    throw new Error('USB print function is unavailable in this build.');
  }

  if (receipt.showBarcode !== false) {
    const { prefix, amount, display } = barcodeValue(order, receipt);
    if (typeof USBPrinter.printText === 'function') {
      await Promise.resolve(USBPrinter.printText(center(display) + '\n'));
    }
    if (typeof USBPrinter.printRaw === 'function') {
      await Promise.resolve(USBPrinter.printRaw(buildCode128WithEnter(prefix, amount)));
    }
  }

  if (typeof USBPrinter.printBill === 'function') {
    await Promise.resolve(USBPrinter.printBill('\n', {
      cut: receipt.autoCut !== false,
      tailingLine: true,
      encoding: 'UTF-8',
    }));
  }
}

export async function printOrderSlip(order, settings, options = {}) {
  const printer = settings?.printer;
  const receipt = settings?.receipt || {};
  if (!printer) {
    Alert.alert('USB printer not selected', 'Connect the POS-8360 by USB, tap Detect USB Printer, then select it before printing.');
    return { printed: false, reason: 'No printer selected' };
  }

  try {
    const USBPrinter = await connect(printer);

    await printSingleCopy(USBPrinter, order, receipt, { ...options, copyLabel: 'KITCHEN COPY' });
    await printSingleCopy(USBPrinter, order, receipt, { ...options, copyLabel: 'CUSTOMER COPY' });

    return { printed: true, copies: 2 };
  } catch (error) {
    console.warn('USB print failed:', error?.message || error);
    Alert.alert('USB print failed', error?.message || 'Could not print. Check the USB cable, printer power and Android USB permission.');
    return { printed: false, reason: error?.message || 'Unknown printer error' };
  }
}

export async function printTestSlip(settings) {
  if (!settings?.printer) {
    Alert.alert('USB printer not selected', 'Detect and select the POS-8360 first.');
    return { printed: false, reason: 'No printer selected' };
  }

  const now = new Date();
  const order = {
    number: 'TEST',
    createdAt: now.toISOString(),
    createdAtText: now.toLocaleString('en-ZA'),
    orderType: 'USB TEST',
    customerName: '',
    tableNumber: '',
    orderNote: 'POS-8360 USB printer test',
    items: [{ id: 'test', name: 'Cappuccino', qty: 1, unitPrice: 32, selectedModifiers: [], note: '' }],
    total: 32,
  };
  return printOrderSlip(order, settings);
}
