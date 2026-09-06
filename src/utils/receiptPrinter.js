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

function getUsbPrinter() { return getPrinterModule()?.USBPrinter || null; }
function getCommands() { return getPrinterModule()?.COMMANDS || null; }
export function formatMoney(value) { return `R${Number(value || 0).toFixed(2)}`; }
function hr() { return getCommands()?.HORIZONTAL_LINE?.HR_80MM || '------------------------------------------------'; }
function center(text) { const commands = getCommands(); return `${commands?.TEXT_FORMAT?.TXT_ALIGN_CT || ''}${text}${commands?.TEXT_FORMAT?.TXT_ALIGN_LT || ''}`; }
function bold(text) { const commands = getCommands(); return `${commands?.TEXT_FORMAT?.TXT_BOLD_ON || ''}${text}${commands?.TEXT_FORMAT?.TXT_BOLD_OFF || ''}`; }
function large(text) { const commands = getCommands(); if (commands?.TEXT_FORMAT?.TXT_4SQUARE && commands?.TEXT_FORMAT?.TXT_NORMAL) return `${commands.TEXT_FORMAT.TXT_4SQUARE}${text}${commands.TEXT_FORMAT.TXT_NORMAL}`; return `\x1b!\x30${text}\x1b!\x00`; }
function doubleHeight(text) { const commands = getCommands(); if (commands?.TEXT_FORMAT?.TXT_2HEIGHT && commands?.TEXT_FORMAT?.TXT_NORMAL) return `${commands.TEXT_FORMAT.TXT_2HEIGHT}${text}${commands.TEXT_FORMAT.TXT_NORMAL}`; return `\x1b!\x10${text}\x1b!\x00`; }

export function buildSlipText(order, receipt = {}, options = {}) {
  const isReprint = Boolean(options.reprint);
  const copyLabel = options.copyLabel || '';
  const lines = [];
  if (copyLabel) { lines.push(center(large(bold(copyLabel)))); lines.push(''); }
  if (isReprint) { lines.push(center(bold('*** REPRINT ***'))); lines.push(''); }
  lines.push(center(large(bold(receipt.businessName || 'FRESHLY GROUND EXPRESS'))));
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
    const qty = Number(item.qty || 0);
    const baseUnit = Number(item.unitPrice ?? item.price ?? 0);
    const baseLineTotal = qty * baseUnit;
    const price = receipt.showPrices === false ? '' : `  ${formatMoney(baseLineTotal)}`;
    lines.push(doubleHeight(bold(`${qty} x ${item.name}${price}`)));
    (item.selectedModifiers || []).forEach((mod) => {
      const modifierLineTotal = qty * Number(mod.price || 0);
      const modPrice = receipt.showPrices === false || modifierLineTotal === 0 ? '' : ` +${formatMoney(modifierLineTotal)}`;
      lines.push(bold(`   • ${mod.name}${modPrice}`));
    });
    if (receipt.showNotes !== false && item.note) lines.push(bold(`   NOTE: ${item.note}`));
  });
  if (receipt.showNotes !== false && order.orderNote) { lines.push(''); lines.push(doubleHeight(bold('ORDER NOTE:'))); lines.push(doubleHeight(bold(order.orderNote))); }
  lines.push(''); lines.push(hr());
  if (receipt.showTotal !== false) lines.push(center(large(bold(`TOTAL: ${formatMoney(order.total)}`))));
  lines.push(hr());
  if (order.loyaltyProgram) lines.push(center(`LOYALTY: +1 ${String(order.loyaltyProgram).toUpperCase()} POINT`));
  if (receipt.footer) lines.push(center(receipt.footer));
  return lines.join('\n') + '\n';
}

export function barcodeValue(order, receipt = {}) {
  const prefix = String(receipt.barcodePrefix || '31010001').replace(/\D/g, '') || '31010001';
  return { prefix };
}

function buildIqRetailCode128(prefix) {
  const GS = '\x1d';
  const ESC = '\x1b';
  const encoded = `{B${String(prefix)}`;
  // Plain Code 128 stock code only. No total, Enter or Tab is embedded.
  return `${ESC}a\x01${GS}H\x02${GS}h\x64${GS}w\x02${GS}k\x49${String.fromCharCode(encoded.length)}${encoded}\n${ESC}a\x00`;
}

function normalizeUsbDevice(device, index) {
  const vendorId = Number(device?.vendorId ?? device?.vendor_id);
  const productId = Number(device?.productId ?? device?.product_id);
  if (!Number.isInteger(vendorId) || !Number.isInteger(productId)) return null;
  return { id: `${vendorId}-${productId}-${index}`, name: device?.deviceName || device?.device_name || 'USB Thermal Printer', vendorId, productId };
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
  if (!Number.isInteger(vendorId) || !Number.isInteger(productId)) throw new Error('The selected USB printer has invalid device IDs. Please detect and select it again.');
  await USBPrinter.init();
  await USBPrinter.connectPrinter(vendorId, productId);
  return USBPrinter;
}

async function printReceiptLogo(USBPrinter) {
  if (typeof USBPrinter.printImageBase64 !== 'function') return false;
  try {
    const cleanBase64 = String(receiptLogoBase64 || '').replace(/\s+/g, '');
    await Promise.resolve(USBPrinter.printImageBase64(cleanBase64, { imageWidth: 320, align: 'center' }));
    if (typeof USBPrinter.printText === 'function') await Promise.resolve(USBPrinter.printText('\n'));
    return true;
  } catch (error) { console.warn('Receipt logo print failed:', error?.message || error); return false; }
}

async function printSingleCopy(USBPrinter, order, receipt, options = {}) {
  if (receipt.showLogo !== false) await printReceiptLogo(USBPrinter);
  const text = buildSlipText(order, receipt, options);
  if (typeof USBPrinter.printText === 'function') await Promise.resolve(USBPrinter.printText(text));
  else if (typeof USBPrinter.printBill === 'function') await Promise.resolve(USBPrinter.printBill(text, { cut: false, tailingLine: false, encoding: 'UTF-8' }));
  else throw new Error('USB print function is unavailable in this build.');

  if (receipt.showBarcode !== false && typeof USBPrinter.printText === 'function') {
    const { prefix } = barcodeValue(order, receipt);
    await Promise.resolve(USBPrinter.printText(center(bold('IQ RETAIL')) + '\n'));
    await Promise.resolve(USBPrinter.printText(buildIqRetailCode128(prefix)));
  }
  if (typeof USBPrinter.printBill === 'function') await Promise.resolve(USBPrinter.printBill('\n', { cut: receipt.autoCut !== false, tailingLine: true, encoding: 'UTF-8' }));
}

async function printLoyaltyRewardSlip(USBPrinter, reward, receipt) {
  if (!reward) return;
  if (receipt.showLogo !== false) await printReceiptLogo(USBPrinter);
  const lines = [
    center(large(bold('LOYALTY REWARD'))),
    center(bold('10 PURCHASES COMPLETED')),
    '',
    hr(),
    reward.customerName ? center(doubleHeight(bold(reward.customerName))) : '',
    center(doubleHeight(`${String(reward.program || '').toUpperCase()} REWARD`)),
    '',
    center(large(bold(`CLAIM UP TO ${formatMoney(reward.value)}`))),
    '',
    center('Present this slip when claiming your reward.'),
    center('One reward claim per completed loyalty cycle.'),
    hr(),
    center('FRESHLY GROUND EXPRESS'),
    '',
  ].filter((line) => line !== null);

  if (typeof USBPrinter.printText === 'function') await Promise.resolve(USBPrinter.printText(lines.join('\n') + '\n'));
  if (typeof USBPrinter.printBill === 'function') await Promise.resolve(USBPrinter.printBill('\n', { cut: true, tailingLine: true, encoding: 'UTF-8' }));
}

export async function printOrderSlip(order, settings, options = {}) {
  const printer = settings?.printer;
  const receipt = settings?.receipt || {};
  if (!printer) { Alert.alert('USB printer not selected', 'Connect the POS-8360 by USB, tap Detect USB Printer, then select it before printing.'); return { printed: false, reason: 'No printer selected' }; }
  try {
    const USBPrinter = await connect(printer);
    await printSingleCopy(USBPrinter, order, receipt, { ...options, copyLabel: 'KITCHEN COPY' });
    await printSingleCopy(USBPrinter, order, receipt, { ...options, copyLabel: 'CUSTOMER COPY' });
    if (order.loyaltyReward) await printLoyaltyRewardSlip(USBPrinter, order.loyaltyReward, receipt);
    return { printed: true, copies: order.loyaltyReward ? 3 : 2 };
  } catch (error) {
    console.warn('USB print failed:', error?.message || error);
    Alert.alert('USB print failed', error?.message || 'Could not print. Check the USB cable, printer power and Android USB permission.');
    return { printed: false, reason: error?.message || 'Unknown printer error' };
  }
}

export async function printTestSlip(settings) {
  if (!settings?.printer) { Alert.alert('USB printer not selected', 'Detect and select the POS-8360 first.'); return { printed: false, reason: 'No printer selected' }; }
  const now = new Date();
  const order = { number: 'TEST', createdAt: now.toISOString(), createdAtText: now.toLocaleString('en-ZA'), orderType: 'USB TEST', customerName: '', tableNumber: '', orderNote: 'POS-8360 USB printer test', items: [{ id: 'test', name: 'Cappuccino', qty: 1, unitPrice: 32, selectedModifiers: [], note: '' }], total: 32 };
  return printOrderSlip(order, settings);
}
