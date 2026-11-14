# CanteenPro Mobile App API (Employee Only)

This file contains **ONLY** the API endpoints used by the **Mobile Application** (for employees who eat at the canteen). There are **no web or admin APIs** in this document.

- **Base URL:** `http://localhost:4000/api`
  - Android Emulator: `http://10.0.2.2:4000/api`
  - Real Phone (on same Wi-Fi): `http://<YOUR-IP>:4000/api`
- **Auth Header:** `Authorization: Bearer <token>` (received after login)

---

## 1. Authentication (Login & PIN)

### `POST /api/employee/auth/check`
Step 1 of mobile login: checks if the entered mobile number is registered.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "phone": "9876543210"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "exists": true,
    "accounts": [
      {
        "tenantName": "Acme Corp",
        "canteenName": "Main Cafeteria"
      }
    ]
  }
  ```

---

### `POST /api/employee/auth/login`
Step 2: Authenticates phone number with 4-digit PIN and returns JWT token.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "phone": "9876543210",
    "pin": "1234"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "mustChangePin": false,
    "employee": {
      "id": "emp_01jk9",
      "name": "Rahul Sharma",
      "employeeCode": "EMP001",
      "photoUrl": null,
      "qr": "cpe:emp_01jk9:b83f...",
      "externalId": "emp_emp_01jk9"
    },
    "tenant": {
      "id": "ten_01",
      "name": "Acme Corp",
      "logoUrl": null
    },
    "canteen": {
      "id": "can_01",
      "name": "Main Cafeteria"
    }
  }
  ```

---

### `POST /api/employee/auth/change-pin`
Allows employee to change their 4-digit PIN.
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "currentPin": "1234",
    "newPin": "5678"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "ok": true
  }
  ```

---

## 2. Home & Daily Meal Actions

### `GET /api/employee/home`
Main home screen: fetches today's meal status, current meal session, wallet balance, and opt-in status.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "employee": {
      "name": "Rahul Sharma",
      "employeeCode": "EMP001",
      "walletBalance": 500
    },
    "today": "2026-11-06",
    "currentSession": {
      "id": "sess_lunch",
      "name": "Lunch",
      "startTime": "12:30",
      "endTime": "14:30",
      "status": "OPTED_IN"
    },
    "sessions": [
      {
        "id": "sess_breakfast",
        "name": "Breakfast",
        "status": "SKIPPED"
      },
      {
        "id": "sess_lunch",
        "name": "Lunch",
        "status": "OPTED_IN"
      }
    ]
  }
  ```

---

### `GET /api/employee/menu`
Displays the full today / weekly menu with items, prices, and dietary tags.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  [
    {
      "id": "sess_lunch",
      "name": "Lunch",
      "startTime": "12:30",
      "endTime": "14:30",
      "items": [
        {
          "id": "item_1",
          "name": "Special Veg Thali",
          "price": 80,
          "foodType": "VEG",
          "isAvailable": true
        },
        {
          "id": "item_2",
          "name": "Chicken Biryani",
          "price": 120,
          "foodType": "NON_VEG",
          "isAvailable": true
        }
      ]
    }
  ]
  ```

---

### `PUT /api/employee/opt-ins`
Opt-in or opt-out of an upcoming meal session before cut-off time.
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "mealSessionId": "sess_lunch",
    "status": "OPTED_IN"
  }
  ```
  *(Options for status: `"OPTED_IN"` or `"OPTED_OUT"`)*
- **Response (200 OK):**
  ```json
  {
    "ok": true,
    "status": "OPTED_IN"
  }
  ```

---

### `GET /api/employee/opt-ins`
Gets the employee's opt-in schedule for the week.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  [
    {
      "date": "2026-11-06",
      "mealSessionId": "sess_lunch",
      "status": "OPTED_IN"
    }
  ]
  ```

---

## 3. QR Scan (Order & Collect Meal)

### `POST /api/employee/scan`
When the employee points the mobile camera at the QR code placed on the counter.
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "code": "cp_counter_qr_payload_string"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "billNo": "B01-2041",
    "total": 80,
    "subsidyAmount": 30,
    "amountPaid": 50,
    "paymentMode": "WALLET",
    "walletBalance": 450
  }
  ```

---

## 4. Wallet & Receipts

### `GET /api/employee/wallet`
Returns wallet credit balance and statement of all recharges and meal deductions.
- **Query Params:** `?pageSize=100`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "balance": 450,
    "transactions": [
      {
        "id": "tx_01",
        "type": "DEBIT",
        "amount": 50,
        "balanceAfter": 450,
        "description": "Lunch - Bill B01-2041",
        "createdAt": "2026-11-06T13:15:00Z"
      },
      {
        "id": "tx_02",
        "type": "CREDIT",
        "amount": 500,
        "balanceAfter": 500,
        "description": "Counter Cash Recharge",
        "createdAt": "2026-11-05T10:00:00Z"
      }
    ]
  }
  ```

---

### `GET /api/employee/history`
Returns past meal receipts, item breakdown, and bill numbers.
- **Query Params:** `?pageSize=100`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  [
    {
      "id": "ord_101",
      "billNo": "B01-2041",
      "createdAt": "2026-11-06T13:15:00Z",
      "total": 50,
      "items": [
        {
          "name": "Special Veg Thali",
          "quantity": 1,
          "price": 80
        }
      ],
      "rating": null
    }
  ]
  ```

---

### `POST /api/employee/feedback`
Submit star rating (1 to 5) and feedback on a past meal.
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "orderId": "ord_101",
    "rating": 5,
    "comment": "Food was fresh and tasty!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "ok": true
  }
  ```

---

## 5. Profile & Notifications

### `GET /api/employee/me`
Fetches employee profile, photo, dynamic Meal QR token, and canteen details.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "id": "emp_01jk9",
    "name": "Rahul Sharma",
    "employeeCode": "EMP001",
    "phone": "9876543210",
    "dietaryPref": "VEG",
    "walletBalance": 450,
    "canteen": {
      "id": "can_01",
      "name": "Main Cafeteria"
    }
  }
  ```

---

### `PATCH /api/employee/me`
Updates dietary preference from the mobile profile screen.
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "dietaryPref": "VEG"
  }
  ```
  *(Options: `"VEG"`, `"NON_VEG"`, `"EGG"`)*
- **Response (200 OK):**
  ```json
  {
    "ok": true
  }
  ```

---

### `GET /api/employee/notifications`
Lists notifications and announcements sent to the employee.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  [
    {
      "id": "notif_01",
      "title": "Lunch is Served",
      "body": "Counters 1 and 2 are now serving lunch.",
      "read": false,
      "createdAt": "2026-11-06T12:30:00Z"
    }
  ]
  ```

---

### `POST /api/employee/notifications/:id/read`
Marks a specific notification as read.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  { "ok": true }
  ```

---

### `POST /api/employee/notifications/read-all`
Marks all notifications as read.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  { "ok": true }
  ```

---

## 📋 Complete Quick-Reference Table

| # | HTTP Method | Endpoint | Description | Auth Required? |
|---|---|---|---|---|
| 1 | `POST` | `/api/employee/auth/check` | Check if phone number is registered | ❌ No |
| 2 | `POST` | `/api/employee/auth/login` | Phone + 4-digit PIN login | ❌ No |
| 3 | `POST` | `/api/employee/auth/change-pin` | Change 4-digit PIN | ✅ Yes (Bearer) |
| 4 | `GET` | `/api/employee/home` | Home dashboard (wallet, today's meal) | ✅ Yes (Bearer) |
| 5 | `GET` | `/api/employee/menu` | Today / Weekly menu list | ✅ Yes (Bearer) |
| 6 | `PUT` | `/api/employee/opt-ins` | Opt-in or Opt-out for meal | ✅ Yes (Bearer) |
| 7 | `GET` | `/api/employee/opt-ins` | View upcoming meal opt-in schedule | ✅ Yes (Bearer) |
| 8 | `POST` | `/api/employee/scan` | Scan counter QR code to place order | ✅ Yes (Bearer) |
| 9 | `GET` | `/api/employee/wallet` | Wallet balance & statement | ✅ Yes (Bearer) |
| 10 | `GET` | `/api/employee/history` | Past order receipts and bills | ✅ Yes (Bearer) |
| 11 | `POST` | `/api/employee/feedback` | Rate a past meal (1 to 5 stars) | ✅ Yes (Bearer) |
| 12 | `GET` | `/api/employee/me` | Employee profile & meal QR code | ✅ Yes (Bearer) |
| 13 | `PATCH` | `/api/employee/me` | Update dietary preference | ✅ Yes (Bearer) |
| 14 | `GET` | `/api/employee/notifications` | List announcements & notifications | ✅ Yes (Bearer) |
| 15 | `POST` | `/api/employee/notifications/:id/read` | Mark one notification read | ✅ Yes (Bearer) |
| 16 | `POST` | `/api/employee/notifications/read-all` | Mark all notifications read | ✅ Yes (Bearer) |
