import { Alert, Platform } from 'react-native';

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

export function buildSlipText(order, receipt = {}, options = {}) {
  const isReprint = Boolean(options.reprint);
  const lines = [];
  if (isReprint) {
    lines.push(center('*** REPRINT ***'));
    lines.push('');
  }
  lines.push(center(bold(receipt.businessName || 'FRESHLY GROUND EXPRESS')));
  if (receipt.headerLine1) lines.push(center(receipt.headerLine1));
  if (receipt.headerLine2) lines.push(center(receipt.headerLine2));
  if (receipt.phone) lines.push(center(receipt.phone));
  lines.push(hr());
  lines.push(bold(`ORDER #${order.number}`));
  lines.push(order.createdAtText || new Date(order.createdAt).toLocaleString('en-ZA'));
  if (receipt.showOrderType !== false) lines.push(bold(order.orderType || ''));
  if (receipt.showCustomer !== false && order.customerName) lines.push(`Customer: ${order.customerName}`);
  if (receipt.showTable !== false && order.tableNumber) lines.push(`Table: ${order.tableNumber}`);
  lines.push('');

  (order.items || []).forEach((item) => {
    const unit = Number(item.unitPrice ?? item.price ?? 0);
    const price = receipt.showPrices === false ? '' : `  ${formatMoney(item.qty * unit)}`;
    lines.push(bold(`${item.qty} x ${item.name}${price}`));
    (item.selectedModifiers || []).forEach((mod) => {
      const modPrice = receipt.showPrices === false ? '' : ` +${formatMoney(mod.price)}`;
      lines.push(`   + ${mod.name}${modPrice}`);
    });
    if (receipt.showNotes !== false && item.note) lines.push(`   NOTE: ${item.note}`);
  });

  if (receipt.showNotes !== false && order.orderNote) {
    lines.push('');
    lines.push(bold('ORDER NOTE:'));
    lines.push(order.orderNote);
  }

  lines.push('');
  lines.push(hr());
  if (receipt.showTotal !== false) lines.push(bold(`TOTAL: ${formatMoney(order.total)}`));
  lines.push(hr());
  if (receipt.footer) lines.push(center(receipt.footer));
  lines.push(...Array(Math.max(1, Number(receipt.feedLines || 4))).fill(''));
  return lines.join('\n');
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

export async function printOrderSlip(order, settings, options = {}) {
  const printer = settings?.printer;
  const receipt = settings?.receipt || {};
  if (!printer) {
    Alert.alert('USB printer not selected', 'Connect the POS-8360 by USB, tap Detect USB Printer, then select it before printing.');
    return { printed: false, reason: 'No printer selected' };
  }

  try {
    const USBPrinter = await connect(printer);
    const text = buildSlipText(order, receipt, options);
    if (typeof USBPrinter.printBill !== 'function') {
      throw new Error('USB print function is unavailable in this build.');
    }
    await Promise.resolve(USBPrinter.printBill(text, {
      cut: receipt.autoCut !== false,
      tailingLine: true,
      encoding: 'UTF-8',
    }));
    return { printed: true };
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
