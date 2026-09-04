import { Alert, Platform } from 'react-native';

let USBPrinter = null;
let COMMANDS = null;
try {
  const printerModule = require('@haroldtran/react-native-thermal-printer');
  USBPrinter = printerModule.USBPrinter;
  COMMANDS = printerModule.COMMANDS;
} catch {
  USBPrinter = null;
  COMMANDS = null;
}

export function formatMoney(value) {
  return `R${Number(value || 0).toFixed(2)}`;
}

function hr() {
  return COMMANDS?.HORIZONTAL_LINE?.HR_80MM || '------------------------------------------------';
}

function center(text) {
  const c = COMMANDS?.TEXT_FORMAT?.TXT_ALIGN_CT || '';
  const l = COMMANDS?.TEXT_FORMAT?.TXT_ALIGN_LT || '';
  return `${c}${text}${l}`;
}

function bold(text) {
  const on = COMMANDS?.TEXT_FORMAT?.TXT_BOLD_ON || '';
  const off = COMMANDS?.TEXT_FORMAT?.TXT_BOLD_OFF || '';
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
    const price = receipt.showPrices === false ? '' : `  ${formatMoney(item.qty * item.unitPrice)}`;
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

export async function listUsbPrinters() {
  if (Platform.OS !== 'android' || !USBPrinter) return [];
  await USBPrinter.init();
  const devices = await USBPrinter.getDeviceList();
  return (devices || []).map((device, index) => ({
    id: `${device.vendorId || 'v'}-${device.productId || 'p'}-${index}`,
    name: device.deviceName || device.device_name || 'USB Thermal Printer',
    vendorId: String(device.vendorId ?? device.vendor_id ?? ''),
    productId: String(device.productId ?? device.product_id ?? ''),
  })).filter((device) => device.vendorId && device.productId);
}

async function connect(printer) {
  if (!USBPrinter) throw new Error('USB printer library is not available in this build.');
  if (!printer?.vendorId || !printer?.productId) throw new Error('No USB printer selected.');
  await USBPrinter.init();
  await USBPrinter.connectPrinter(String(printer.vendorId), String(printer.productId));
}

export async function printOrderSlip(order, settings, options = {}) {
  const printer = settings?.printer;
  const receipt = settings?.receipt || {};
  if (!printer) {
    Alert.alert('USB printer not selected', 'Connect the POS-8360 by USB, then select it in Settings.');
    return { printed: false, reason: 'No printer selected' };
  }
  try {
    await connect(printer);
    const text = buildSlipText(order, receipt, options);
    await USBPrinter.printBill(text, {
      cut: receipt.autoCut !== false,
      tailingLine: true,
      encoding: 'UTF-8',
    });
    return { printed: true };
  } catch (error) {
    Alert.alert('USB print failed', error?.message || 'Could not print. Check the USB cable, printer power and Android USB permission.');
    return { printed: false, reason: error?.message || 'Unknown print error' };
  }
}

export async function printTestSlip(settings) {
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
