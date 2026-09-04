# Freshly Ground Orders V2

Android order-taking app for Freshly Ground Express.

## V2 features

- High-contrast Freshly Ground Express POS layout
- Fast category-based order entry
- Editable categories, items, descriptions and prices
- Optional item modifiers / add-ons
- Sold-out toggles without deleting menu items
- Daily order numbers (001, 002, 003... reset each day)
- Local sales archive grouped by trading day
- Daily totals, average order value and product summary
- Email / Share Daily Sales PDF through the Android share sheet
- Reprint slips clearly marked as REPRINT
- Editable 80 mm till-slip template
- Local backup and restore
- USB thermal printing only — no Bluetooth workflow

## Printer

Target printer: **Shenzhen Zijiang POS-8360**, 80 mm USB ESC/POS thermal receipt printer.

The app uses `@haroldtran/react-native-thermal-printer` USBPrinter support. Connect the printer by USB/OTG, open **Settings → USB Printer**, detect the printer, select it, and run **Print Test Slip**.

## Data

Menu, settings and orders are stored locally with AsyncStorage. V1 menu/order data is migrated automatically on first V2 launch. Historical orders keep their original item prices.

## Build

Expo SDK 54 / React Native 0.81.5. Android package remains `com.freshlyground.orders` and the existing EAS project ID is retained.

Use the GitHub Action **Build Freshly Ground APK**, or run:

```bash
npm install
npx eas-cli@latest build --platform android --profile preview
```

The preview EAS profile produces an APK.
