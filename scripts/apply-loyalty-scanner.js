const fs = require('fs');

function replaceOnce(text, find, replacement, label) {
  if (!text.includes(find)) throw new Error(`Patch target missing: ${label}`);
  return text.replace(find, replacement);
}

const newOrderPath = 'src/screens/NewOrderScreen.js';
let s = fs.readFileSync(newOrderPath, 'utf8');
s = replaceOnce(s,
  "import { theme } from '../theme';",
  "import { theme } from '../theme';\nimport { LoyaltyCardScanner } from '../components/LoyaltyCardScanner';",
  'scanner import');
s = replaceOnce(s,
  'export function NewOrderScreen({ menu, onSaveMenu, settings, onSaveSettings, customers, onOrderSaved, getNextOrderNumber }) {',
  'export function NewOrderScreen({ menu, onSaveMenu, settings, onSaveSettings, customers, onSaveCustomers, onOrderSaved, getNextOrderNumber }) {',
  'NewOrder props');
s = replaceOnce(s,
  "  const [customerSearch, setCustomerSearch] = useState('');",
  "  const [customerSearch, setCustomerSearch] = useState('');\n  const [scannerOpen, setScannerOpen] = useState(false);",
  'scanner state');
s = replaceOnce(s,
  "  function clearCustomer() {\n    setSelectedCustomerId(null);\n    setProgram('');\n  }",
  "  function clearCustomer() {\n    setSelectedCustomerId(null);\n    setProgram('');\n  }\n\n  async function chooseScannedCustomer(customer) {\n    const existing = customers.find((c) => String(c.cardNumber || '') === String(customer.cardNumber || ''));\n    if (existing) return chooseCustomer(existing);\n    const clean = { ...customer, coffee: Number(customer.coffee || 0), meal: Number(customer.meal || 0), totalVisits: Number(customer.totalVisits || 0), active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };\n    await onSaveCustomers([...customers, clean]);\n    chooseCustomer(clean);\n  }",
  'scan customer handler');
s = replaceOnce(s,
  "      <TouchableOpacity style={styles.findCustomer} onPress={() => setCustomerOpen(true)}><Text style={styles.findCustomerText}>FIND</Text></TouchableOpacity>",
  "      <TouchableOpacity style={styles.scanCustomer} onPress={() => setScannerOpen(true)}><Text style={styles.findCustomerText}>SCAN CARD</Text></TouchableOpacity>\n      <TouchableOpacity style={styles.findCustomer} onPress={() => setCustomerOpen(true)}><Text style={styles.findCustomerText}>FIND</Text></TouchableOpacity>",
  'scan button');
s = replaceOnce(s,
  "    <Modal visible={customerOpen}",
  "    <LoyaltyCardScanner visible={scannerOpen} onClose={() => setScannerOpen(false)} onCustomer={chooseScannedCustomer} />\n\n    <Modal visible={customerOpen}",
  'scanner modal');
s = replaceOnce(s,
  "findCustomer:{paddingHorizontal:12,paddingVertical:9,borderRadius:9,backgroundColor:c.green},findCustomerText:",
  "scanCustomer:{paddingHorizontal:12,paddingVertical:9,borderRadius:9,backgroundColor:c.red},findCustomer:{paddingHorizontal:12,paddingVertical:9,borderRadius:9,backgroundColor:c.green},findCustomerText:",
  'scanner style');
fs.writeFileSync(newOrderPath, s);

const appPath = 'App.js';
let a = fs.readFileSync(appPath, 'utf8');
a = replaceOnce(a,
  'customers={customers} orders={orders} onOrderSaved={addOrder}',
  'customers={customers} onSaveCustomers={saveCustomers} orders={orders} onOrderSaved={addOrder}',
  'App scanner customer save prop');
fs.writeFileSync(appPath, a);
console.log('Loyalty scanner integration applied.');
