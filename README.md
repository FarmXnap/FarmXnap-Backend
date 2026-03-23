# FarmXnap API

## Base URL

The base URL for all API requests is:

`https://farmxnap-api.onrender.com/api/v1`

The endpoints are **HATEOAS-compliant** i.e relevant action links are returned in the responses.

### **Authentication**

The API uses **Opaque Access Tokens (OAT)**.

- All protected routes require an `Authorization` header.
- Format: `Authorization: Bearer <token>`

---

### **1. User Initialization**

Initialize a new user and get OTP for verification.

- **Endpoint:** `POST /users`
- **Auth Required:** No
- **Content-Type:** `application/json`

**Request Body:**

JSON

```json
{
  "phone_number": "+2348012345678"
}
```

**Success Response (201 Created):**

JSON

```json
{
  "message": "OTP sent to your phone number.",
  "data": {
    "token": "oat_NQ.Yk15TkJZV3J...",
    "user": {
      "id": "hbj6l649zdfw0jc425yu5d9y",
      "phone_number": "+2348012345678"
    },
    "OTP": "345097",
    "links": {
      "create_farmer_profile": {
        "method": "POST",
        "href": "/api/v1/users/hbj6l649zdfw0jc425yu5d9y/farmer_profiles"
      },
      "create_agro_dealer_profile": {
        "method": "POST",
        "href": "/api/v1/users/hbj6l649zdfw0jc425yu5d9y/agro_dealer_profiles"
      }
    }
  }
}
```

### **Frontend Implementation Note**

> For this demo, no real OTP is sent to the phone number. Instead the backend returns the OTP in the response. The client is expected to autofill it in during verification, for ease of demo.

**Error Responses**

422 (Unprocessable Entity)

```json
{
  "errors": ["Phone Number is required.", "Phone Number is not valid."]
}
```

400 (Bad Request)

```json
{
  "error": "Phone Number already in use for a profile."
}
```

---

### **2. Farmer Registration**

Create a new farmer profile account. The OTP is verified here.

- **Endpoint:** `POST /users/:user_id/farmer_profiles`
- **Auth Required:** No
- **Content-Type:** `application/json`

**Request Body:**

JSON

```json
{
  "otp": "345097",
  "transaction_pin": "1234",
  "full_name": "Deborah Okeke",
  "phone_number": "+2348012345678",
  "state": "My State",
  "lga": "lga", // optional
  "primary_crop": "Plantain"
}
```

**Success Response (201 Created):**

JSON

```json
{
  "message": "You have successfully registered as a farmer.",
  "data": {
    "token": "oat_NQ.Yk15TkJZV3J...",
    "user": {
      "id": "hbj6l649zdfw0jc425yu5d9y",
      "role": "farmer"
    }
  }
}
```

### **Frontend Implementation Note**

> [!IMPORTANT]
>
> For automatic login after registration, please store the `token` in `localStorage` or a secure state manager. Ensure all subsequent requests include the `Bearer` prefix in the headers. The token does not expire for 30 days.
> The user's `role` is returned in the response. The client should use this role to redirect to the appropriate dashboard (Farmer or AgroDealer).

**Error Responses**

404 (Not Found)

```json
{
  "error": "User not found."
}
```

422 (Unprocessable Entity)

```json
{
  "errors": [
    "OTP is required.",
    "Transaction Pin is required.",
    "Transaction Pin must be 4 digits.",
    "Full Name is required.",
    "State is required.",
    "Primary Crop is required."
  ]
}
```

400 (Bad Request)

```json
{
  "error": "OTP is incorrect."
}
```

---

### **3. AgroDealer Registration**

Create a new agro-dealer profile account. The OTP is verified here.

- **Endpoint:** `POST /users/:user_id/agro_dealer_profiles`
- **Auth Required:** No
- **Content-Type:** `application/json`

**Request Body:**

JSON

```json
{
  "otp": "345097",
  "transaction_pin": "1234",
  "business_name": "Test Enterprise",
  "business_address": "1, Allen Avenue, Ikeja",
  "state": "My State",
  "cac_registration_number": "RC-123456",
  "bank": "First Bank",
  "account_number": "1234567890"
}
```

**Success Response (201 Created):**

JSON

```json
{
  "message": "You have successfully registered as an agro-dealer.",
  "data": {
    "token": "oat_NQ.Yk15TkJZV3J...",
    "user": {
      "id": "hbj6l649zdfw0jc425yu5d9y",
      "role": "agrodealer"
    }
  }
}
```

### **Frontend Implementation Note**

> [!IMPORTANT]
>
> For automatic login after registration, please store the `token` in `localStorage` or a secure state manager. Ensure all subsequent requests include the `Bearer` prefix in the headers. The token does not expire for 30 days.
> The user's `role` is returned in the response. The client should use this role to redirect to the appropriate dashboard (Farmer or AgroDealer).

**Error Responses**

404 (Not Found)

```json
{
  "error": "User not found."
}
```

422 (Unprocessable Entity)

```json
{
  "errors": [
    "OTP is required.",
    "Transaction Pin is required.",
    "Transaction Pin must be 4 digits.",
    "Business Name is required.",
    "CAC Registration Number is required.",
    "Business Address is required.",
    "Bank is required.",
    "Account Number is required.",
    "Account Number must be 10 digits.",
    "State is required."
  ]
}
```

400 (Bad Request)

```json
{
  "error": "OTP is incorrect."
}
```
