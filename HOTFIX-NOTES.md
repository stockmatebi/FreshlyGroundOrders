# V2.0.1 startup hotfix

- Defers loading the USB thermal-printer native module until the user actually detects or prints to a USB printer.
- Defers optional report/share native modules until those actions are used.
- Adds an app-level error boundary so a JavaScript render failure stays visible instead of appearing as an immediate close.
- Adds a branded Android adaptive launcher icon (espresso background, green coffee mark, white cup and red steam) through an Expo config plugin.
- Bumps Android `versionCode` to 3 and app version to 2.0.1.

The POS-8360 USB printer still needs a physical-device test after the startup hotfix is installed.
