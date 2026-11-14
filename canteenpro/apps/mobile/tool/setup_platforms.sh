#!/usr/bin/env bash
# Generates android/ and ios/ folders and applies the permissions CanteenPro needs.
# Run once from apps/mobile:   bash tool/setup_platforms.sh
set -euo pipefail
cd "$(dirname "$0")/.."

flutter create --org in.canteenpro --project-name canteenpro --platforms=android,ios .
rm -f test/widget_test.dart.orig

# ---- Android: internet in release, camera, cleartext for local dev only
MAIN=android/app/src/main/AndroidManifest.xml
grep -q 'android.permission.INTERNET' "$MAIN" || sed -i.bak 's#<application#<uses-permission android:name="android.permission.INTERNET"/>\n    <uses-permission android:name="android.permission.CAMERA"/>\n    <application#' "$MAIN"
DEBUG=android/app/src/debug/AndroidManifest.xml
if [ -f "$DEBUG" ] && ! grep -q usesCleartextTraffic "$DEBUG"; then
  sed -i.bak 's#</manifest>#    <application android:usesCleartextTraffic="true"/>\n</manifest>#' "$DEBUG"
fi
# mobile_scanner / OneSignal need minSdk 21+
sed -i.bak 's/minSdk = flutter.minSdkVersion/minSdk = 23/' android/app/build.gradle* 2>/dev/null || true

# ---- iOS: camera usage text + allow http for local dev
PLIST=ios/Runner/Info.plist
if ! grep -q NSCameraUsageDescription "$PLIST"; then
  /usr/bin/sed -i.bak 's#<dict>#<dict>\n\t<key>NSCameraUsageDescription</key>\n\t<string>Scan the canteen QR code to record your meal.</string>\n\t<key>NSAppTransportSecurity</key>\n\t<dict><key>NSAllowsLocalNetworking</key><true/></dict>#' "$PLIST"
fi
find android ios -name '*.bak' -delete

flutter pub get
dart run flutter_launcher_icons || true
echo "✅ Platforms ready. Run: flutter run --dart-define=API_URL=http://10.0.2.2:4000/api"
