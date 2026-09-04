# Freshly Ground Orders

Android order-taking app starter for Freshly Ground Express with Bluetooth thermal receipt printing.

## Clean install on Windows

1. Extract this ZIP to a new folder, for example `C:\Freshly Ground Orders`.
2. Open Command Prompt in that folder.
3. Run `npm install`.
4. Run `npm install -g eas-cli` if EAS is not installed.
5. Run `eas login`.
6. Run `eas build:configure` and choose Android when prompted.
7. Run `eas build -p android --profile preview`.

The preview profile in `eas.json` creates an APK.

## Printer

Pair the Bluetooth thermal printer in Android Settings first. In the app, open Settings, tap Find Paired Printers, then select the printer.

The project uses `@poriyaalar/react-native-thermal-receipt-printer` and its BLEPrinter API.
