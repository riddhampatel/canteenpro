# CanteenPro mobile app (Flutter)

One app, two experiences:

| Signed in as | Login | Tabs |
|---|---|---|
| **Employee** | mobile number + 4-digit PIN | Home (opt-in, today's menu, wallet), Scan (counter QR), History (rate meals), Profile (meal QR, wallet, notifications, change PIN) |
| **Canteen staff** (owner / manager / cashier / kitchen) | email + password | Dashboard, Serve (camera / code), Menu (sold-out toggles + forecast), More (transactions, guests, employee wallet & PIN, announcements) |

## First run
```bash
cd apps/mobile
bash tool/setup_platforms.sh            # generates android/ & ios/, adds camera + internet permissions
flutter run --dart-define=API_URL=http://10.0.2.2:4000/api      # Android emulator → API on your machine
# iOS simulator: --dart-define=API_URL=http://localhost:4000/api
# Real phone on same Wi-Fi: --dart-define=API_URL=http://<your-LAN-IP>:4000/api
```
Optional: `--dart-define=ONESIGNAL_APP_ID=<id>` to enable push notifications.

Demo logins (after `npm run db:seed` in the API):
- Employee: phone `9876543210`, PIN `1234`
- Manager: `manager@canteenpro.in` / `Demo@123`

## Release build
```bash
flutter build apk --release --dart-define=API_URL=https://api.yourdomain.com/api --dart-define=ONESIGNAL_APP_ID=xxxx
flutter build ipa --release --dart-define=API_URL=https://api.yourdomain.com/api --dart-define=ONESIGNAL_APP_ID=xxxx
```
