export const defaultSettings = {
  printer: null,
  weekdaySpecial: { description: "Ask about today's weekday special", soldOut: false },
  quickItemIds: ['cappuccino-small','latte','filter-coffee','tea','breakfast-special','wors-roll'],
  loyalty: { enabled: true, target: 10 },
  receipt: { businessName:'FRESHLY GROUND EXPRESS',headerLine1:'Howick',headerLine2:'',phone:'',footer:'THANK YOU',showLogo:true,showPrices:true,showTotal:true,showOrderType:true,showCustomer:true,showTable:true,showNotes:true,showBarcode:true,barcodePrefix:'31010001',autoCut:true,feedLines:4 },
};
export function mergeSettings(saved={}) { return {...defaultSettings,...saved,weekdaySpecial:{...defaultSettings.weekdaySpecial,...(saved.weekdaySpecial||{})},loyalty:{...defaultSettings.loyalty,...(saved.loyalty||{})},receipt:{...defaultSettings.receipt,...(saved.receipt||{})}}; }
