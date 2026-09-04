export const defaultSettings = {
  printer: null,
  receipt: {
    businessName: 'FRESHLY GROUND EXPRESS',
    headerLine1: 'Howick',
    headerLine2: '',
    phone: '',
    footer: 'THANK YOU',
    showPrices: true,
    showTotal: true,
    showOrderType: true,
    showCustomer: true,
    showTable: true,
    showNotes: true,
    autoCut: true,
    feedLines: 4,
  },
};

export function mergeSettings(saved = {}) {
  return {
    ...defaultSettings,
    ...saved,
    receipt: {
      ...defaultSettings.receipt,
      ...(saved.receipt || {}),
    },
  };
}
