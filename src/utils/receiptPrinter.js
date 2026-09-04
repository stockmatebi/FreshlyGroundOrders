import { Alert } from 'react-native';

let BLEPrinter = null;
try {
  const printerModule = require('@poriyaalar/react-native-thermal-receipt-printer');
  BLEPrinter = printerModule.BLEPrinter;
} catch (error) {
  BLEPrinter = null;
}

export function formatMoney(value) {
  return `R${Number(value || 0).toFixed(2)}`;
}

export function buildSlipText(order) {
  const lines = [];
  lines.push('<CB>FRESHLY GROUND EXPRESS</CB>');
  lines.push('------------------------------------------');
  lines.push(`<B>ORDER #${order.number}</B>`);
  lines.push(order.createdAtText);
  lines.push('');
  lines.push(`<B>${order.orderType.toUpperCase()}</B>`);
  if (order.customerName) lines.push(`Customer: ${order.customerName}`);
  if (order.tableNumber) lines.push(`Table: ${order.tableNumber}`);
  lines.push('');

  order.items.forEach((item) => {
    lines.push(`<B>${item.qty} x ${item.name}</B>`);
    if (item.note) lines.push(`   NOTE: ${item.note}`);
  });

  if (order.orderNote) {
    lines.push('');
    lines.push('<B>ORDER NOTE:</B>');
    lines.push(order.orderNote);
  }

  lines.push('');
  lines.push('------------------------------------------');
  lines.push(`<B>TOTAL: ${formatMoney(order.total)}</B>`);
  lines.push('------------------------------------------');
  lines.push('<C>THANK YOU</C>');
  lines.push('\n\n\n');
  return lines.join('\n');
}

export async function printOrderSlip(order, printer) {
  const text = buildSlipText(order);

  if (!printer?.address) {
    Alert.alert('Printer not selected', 'Select the paired thermal printer in Settings first.');
    return { printed: false, reason: 'No printer selected' };
  }

  if (!BLEPrinter) {
    Alert.alert('Printer library not available', 'Bluetooth printing requires the APK/dev build.');
    return { printed: false, reason: 'Library unavailable' };
  }

  try {
    await BLEPrinter.init();
    await BLEPrinter.connectPrinter(printer.address);
    BLEPrinter.printBill(text);
    return { printed: true };
  } catch (error) {
    Alert.alert('Print failed', error?.message || 'Could not print slip. Check Bluetooth pairing and printer power.');
    return { printed: false, reason: error?.message || 'Unknown printer error' };
  }
}

export async function listBluetoothPrinters() {
  if (!BLEPrinter) return [];

  await BLEPrinter.init();
  const devices = await BLEPrinter.getDeviceList();
  return (devices || []).map((device) => ({
    name: device.device_name || 'Bluetooth Printer',
    address: device.inner_mac_address,
  })).filter((device) => Boolean(device.address));
}
