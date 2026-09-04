const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, 'utf8');
}

module.exports = function withFreshlyGroundIcon(config) {
  return withDangerousMod(config, ['android', async (cfg) => {
    const res = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');

    const foreground = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#214C3C" android:pathData="M54,12A42,42 0,1 0,54 96A42,42 0,1 0,54 12"/>
    <path android:fillColor="#FFFFFF" android:pathData="M31,40L73,40L73,66C73,77 64,84 52,84C40,84 31,77 31,66Z"/>
    <path android:fillColor="#00000000" android:strokeColor="#FFFFFF" android:strokeWidth="6" android:strokeLineCap="round" android:pathData="M73,47C87,47 88,67 73,67"/>
    <path android:fillColor="#D75A50" android:pathData="M38,31C38,26 42,24 42,20C42,17 40,15 38,14C45,15 48,19 48,23C48,28 44,30 44,34Z"/>
    <path android:fillColor="#D75A50" android:pathData="M54,31C54,26 58,24 58,20C58,17 56,15 54,14C61,15 64,19 64,23C64,28 60,30 60,34Z"/>
</vector>`;

    const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/fge_icon_background"/>
    <foreground android:drawable="@drawable/fge_launcher_foreground"/>
</adaptive-icon>`;

    const colors = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="fge_icon_background">#201812</color>
</resources>`;

    write(path.join(res, 'drawable', 'fge_launcher_foreground.xml'), foreground);
    write(path.join(res, 'values', 'fge_icon_colors.xml'), colors);
    write(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
    write(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);

    return cfg;
  }]);
};
