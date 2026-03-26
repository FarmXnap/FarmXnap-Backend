# FarmXnap API

## Base URL

The base URL for all API requests is:

`https://farmxnap.onrender.com/api/v1`

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
  "lga": "lga",
  "address": "1, Carter Street, Lagos",
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
  "lga": "lga",
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

### **4. Login Request**

Request an OTP for an existing user to log back in.

- **Endpoint:** `POST /auth/login_request`
- **Auth Required:** No
- **Content-Type:** `application/json`

**Request Body:**

JSON

```json
{
  "phone_number": "+2348012345678"
}
```

**Success Response (200 OK):**

JSON

```json
{
  "message": "OTP sent to your phone number",
  "data": {
    "OTP": "123456",
    "links": {
      "verify_login": {
        "method": "POST",
        "href": "/api/v1/auth/login_verify"
      }
    }
  }
}
```

**Error Responses**

422 (Unprocessable Entity)

```json
{
  "errors": ["Phone Number is required.", "Phone Number is not valid."]
}
```

404 (Not Found)

```json
{
  "error": "User not found."
}
```

### **5. Login Verify**

Verify the OTP and receive a fresh session token.

- **Endpoint:** `POST /auth/login_verify`
- **Auth Required:** No
- **Content-Type:** `application/json`

**Request Body:**

JSON

```json
{
  "phone_number": "+2348012345678",
  "otp": "123456"
}
```

**Success Response (200 OK):**

JSON

```json
{
  "message": "Login successful.",
  "data": {
    "token": "oat_abc123...",
    "user": {
      "id": "clx1234567890abcdefg",
      "role": "farmer",
      "phone_number": "+2348012345678"
    }
  }
}
```

**Error Responses**

422 (Unprocessable Entity)

```json
{
  "errors": ["Phone Number is required.", "Phone Number is not valid.", "OTP is required."]
}
```

401 (Unauthorized)

```json
{
  "error": "Invalid phone number or OTP."
}
```

### **6. Logout**

Invalidate the current session token.

- **Endpoint:** `POST /auth/logout`
- **Auth Required:** Yes

**Success Response (200 OK):**

JSON

```json
{
  "message": "Logout successful."
}
```

401 (Unauthorized)

```json
{
  "error": "Unauthorized access"
}
```

### **Frontend Implementation Note**

[!IMPORTANT]

> Auth Flow: For the demo, OTPs are returned in the API response. Autofill these for a smoother flow.

> Token Persistence: Store the token in localStorage or a secure cookie. If any request returns a 401 Unauthorized, clear the storage and redirect the user to the Phone Number screen.

---

### **7. List Products by A Verified Agro-dealer**

Fetch a list of products by a verified agro-dealer.

- **Endpoint:** `GET /products`
- **Auth Required:** Yes
- **Authorization:** Verified `agrodealer` role
- **Content-Type:** `application/json`

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": "hgertxs38i5v0nf2g493el7n",
      "name": "Mancozeb 80WP",
      "category": "Fungicide",
      "unit": "1kg",
      "price": "3500.00",
      "stock_quantity": 48,
      "target_problems": "Early blight, Downy mildew.",
      "agro_dealer_profile_id": "rahv942immebxa0qcrnivd7z",
      "links": {
        { "create":
          { "method": "POST", "href": "/api/v1/products" }
        }
      }
    },
    // ...
  ]
}
```

**Error Responses**

401 (Unauthorized)

```json
{
  "error": "Unauthorized access"
}
```

403 (Forbidden)

```json
{
  "error": "You do not have permission to access this resource."
}
```

403 (Forbidden)

```json
{
  "error": "You cannot perform this action until you complete verification.'"
}
```

### **8. Create a Product by A Verified Agro-dealer**

Create a product.

- **Endpoint:** `POST /products/`
- **Auth Required:** Yes
- **Authorization:** Verified `agrodealer` role
- **Content-Type:** `application/json`

**Request Body:**

JSON

```json
{
  "name": "Mancozeb 80WP",
  "active_ingredient": "Mancozeb 80WP",
  "price": 3500,
  "stock_quantity": 4,
  "description": "This product targets the following... and should be applied by...", // optional
  "category": "Fungicide",
  "unit": "1 kg",
  "target_problems": "Early blight, Downy mildew" // optional
}
```

**Success Response (201 Created):**

```json
{
  "message": "Product created successfully.",
  "data": {
    "id": "lbap3onpjxz49st1u857e6p1",
    "name": "Mancozeb 80WP"
  }
}
```

**Error Responses**

401 (Unauthorized)

```json
{
  "error": "Unauthorized access"
}
```

403 (Forbidden)

```json
{
  "error": "You do not have permission to access this resource."
}
```

403 (Forbidden)

```json
{
  "error": "You cannot perform this action until you complete verification.'"
}
```

422 (Unprocessable Entity)

```json
{
  "errors": [
    "Product name is required.",
    "Active Ingredient is required.",
    "Price is required.",
    "Stock Quantity is required",
    "Stock Quantity must be a number.",
    "Category is required.",
    "Category is invalid.",
    "Unit is required."
  ]
}
```

---

### **9. Scan an image and get diagnosis and treatment results**

- **Endpoint:** `POST /farmer_profiles/:farmer_profile_id/diagnose`
- **Auth Required:** Yes
- **Authorization:** `farmer` role
- **Content-Type:** `multipart/form-data`

```
{
  image: file
}
```

**Success Response (200 Ok):**

```json
{
  "data": {
    "diagnosis": {
      "crop": "Maize",
      "disease": "Eyespot",
      "instructions": "Apply a recommended fungicide containing active ingredients like Azoxystrobin to control the spread of the disease."
    },
    "treatments": [
      {
        "name": "Azoxystrobin",
        "active_ingredient": "Azoxystrobin",
        "price": "75190.60",
        "stock_quantity": 24,
        "unit": "1kg",
        "description": "Systemic protection for maize leaves against aggressive fungal infections.",
        "target_problems": "Maize eyespot, rust, rice blast, and powdery mildew.",
        "category": "Fungicide",
        "business_name": "Bailey - Schmidt",
        "business_address": "3098 Newton Road",
        "state": "Lagos",
        "bank": "Stokes Group",
        "account_number": "5239701059",
        "phone_number": "28653272469",
        "rank": 3
      },
      {
        "name": "Mancozeb 80WP",
        "active_ingredient": "Mancozeb 80WP",
        "price": "74574.84",
        "stock_quantity": 50,
        "unit": "1kg",
        "description": "A protective wettable powder for maize and other cereal crops...",
        "target_problems": "Maize leaf spot, blight, and rust",
        "category": "Fungicide",
        "business_name": "Bailey - Schmidt",
        "business_address": "3098 Newton Road",
        "state": "Lagos",
        "bank": "Stokes Group",
        "account_number": "5239701059",
        "phone_number": "28653272469",
        "rank": 0.8121841996908188
      }
    ]
  }
}
```

If the crop in the image is diagnosed as healthy, a success response is still returned:

```json
{
  "data": {
    "diagnosis": {
      "crop": "Maize",
      "instructions": "Your crop looks healthy! Keep up the good work with regular weeding and watering."
    }
  }
}
```

### **Frontend Implementation Note**

> The treatment results are returned in descending order of relevance based on a weighted PostgreSQL similarity search. The rank field represents how closely the product matches the AI's diagnosed active ingredient and target crop.
> To provide a better user experience for the farmer, use the rank value to label the results:

```JavaScript
/**
 * Higher rank indicates a stronger match between the AI diagnosis
 * and the specific product's active ingredients/crop category.
 */
const getMatchLabel = (rank) => {
  if (rank > 2.5) return "Best Match (Exact Chemical)";
  if (rank > 0.5) return "Recommended for this Crop";
  return "General Treatment";
}
```

**Error Responses**

401 (Unauthorized)

```json
{
  "error": "Unauthorized access"
}
```

403 (Forbidden)

```json
{
  "error": "You do not have permission to access this resource."
}
```

422 (Unprocessable Entity)

```json
{
  "errors": [
    "Image is required.",
    "Image extension is not supported. Only jpg, jpeg, png, webp, heic, heif are supported.",
    "Image size must not exceed 10mb."
  ]
}
```

If the image is not of a crop:

400 (Bad request)

```json
{
  "error": "This doesn't look like a crop. Please upload a clear photo of the affected plant leaves."
}
```

---

## **Admin Endpoints**

### **Frontend Implementation Note**

> For this demo, there is no dedicated signup flow for admin. Therefore, the endpoints for the admin dashboard are protected by a static secret key. Every request must include the following header:

```json
{
  "X-Admin-Secret": "one-milli"
}
```

[!CAUTION]
Forbidden (403): If this header is missing or incorrect, the server will return a 403 Forbidden response.

```json
{
  "error": "You are not authorized to view this."
}
```

### **1. List All Users & Profiles**

Fetch a master list of all registered users (Farmers and Agro-Dealers) with their profile details.

- **Endpoint:** `GET /users`
- **Auth Required:** Admin Auth
- **Content-Type:** `application/json`

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": "hbj6l649zdfw0jc425yu5d9y",
      "phone_number": "08012345678",
      "role": "farmer",
      "farmerProfile": {
        "id": "cbj4l649zdfw0jd425yu5d7z",
        "user_id": "hbj6l649zdfw0jc425yu5d9y",
        "full_name": "Deborah Okeke",
        "state": "Lagos",
        "lga": "My LGA",
        "primary_crop": "Plantain",
        "created_at": "2026-03-22T14:11:48.959+00:00",
        "updated_at": "2026-03-22T14:11:48.959+00:00"
      },
      "agroDealerProfile": null,
      "links": {}
    }
    {
      "id": "lbspcekxgldpfmmifpm8nwic",
      "phone_number": "08012345678",
      "role": "agrodealer",
      "farmerProfile": null,
      "agroDealerProfile": {
        "id": "lbap3onpjxz49st1u857e6p1",
        "user_id": "lbspcekxgldpfmmifpm8nwic",
        "business_name": "Torp Inc",
        "cac_registration_number": "crinis",
        "state": "Georgia",
        "is_verified": false,
        "created_at": "2026-03-22T14:12:32.978+00:00",
        "updated_at": "2026-03-22T14:12:32.978+00:00"
      },
      "links": {
        "verify_agro_dealer": {
          "method": "PATCH",
          "href": "/api/v1/users/lbspcekxgldpfmmifpm8nwic/agro_dealer_profiles/lbap3onpjxz49st1u857e6p1/verify"
        }
      }
    }
  ]
}
```

### **Frontend Implementation Note**

> The client should use the role to correctly populate the profile list screen on the admin dashboard.

### **2. Verify Agro-Dealer**

Mark an agro-dealer as verified.
(Ideally, this is done after admin have reviewed the business documents)

- **Endpoint:** `PATCH /users/:user_id/agro_dealer_profiles/:id/verify`
- **Auth Required:** Admin Auth
- **Content-Type:** `application/json`

**Success Response (200 OK):**

```json
{
  "message": "AgroDealer verified successfully.",
  "data": {
    "id": "lbap3onpjxz49st1u857e6p1",
    "business_name": "Lekki Farm Spray",
    "is_verified": true
  }
}
```

**Note:**
This endpoint is idempotent. If the dealer is already verified, it will return success without error.

**Error Responses**

404 (Not Found)

```json
{
  "error": "AgroDealer not found."
}
```
