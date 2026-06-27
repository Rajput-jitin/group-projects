# API Reference

## Base URL
`http://localhost:8000` (local) or `https://api.schemeseva.in` (production)

## Authentication
All endpoints except `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/search` require:
```
Authorization: Bearer <access_token>
```

## Response Format
All responses are JSON. Success: HTTP 2xx. Error: HTTP 4xx/5xx with `{"detail": "error message"}`.

---

## Auth Endpoints

### `POST /api/auth/register` — Create account
```json
{
  "full_name": "Arjun Singh",
  "email": "arjun@example.com",
  "password": "SecurePass123",
  "age": 28,
  "gender": "male",
  "state": "Uttar Pradesh",
  "district": "Ghaziabad",
  "is_rural": false,
  "occupation": "student",
  "annual_income": 200000,
  "category": "general",
  "education": "college_student",
  "disability_status": false,
  "marital_status": "single",
  "language_preference": "en"
}
```
Response: 201 Created + UserRead

### `POST /api/auth/login` — Get tokens
```json
{"email": "arjun@example.com", "password": "SecurePass123"}
```
Response: `{access_token: "...", refresh_token: "...", token_type: "bearer"}`

### `POST /api/auth/refresh` — Refresh access token
```json
{"refresh_token": "eyJhbGc..."}
```
Response: New tokens

### `GET /api/auth/me` — Current user profile
Response: UserRead

---

## Scheme Discovery

### `GET /api/schemes` — Search & filter
Query params (all optional):
- `q` — Keyword (name, description, ministry)
- `state` — Filter by state
- `district` — Filter by district
- `is_rural` — true/false
- `age` — User age (for eligibility matching context)
- `gender` — male/female/other
- `category` — general/obc/sc/st/ews
- `disability_status` — true/false
- `education` — school_student/college_student/graduate/postgraduate/etc
- `occupation` — student/farmer/business_owner/etc
- `income_min` — Minimum annual income (₹)
- `income_max` — Maximum annual income (₹)
- `scheme_type` — scholarship/housing/agriculture/employment/health/startup/women_welfare/pension/insurance/skill_development
- `benefits_type` — direct_cash_transfer/subsidy/loan/scholarship/insurance/training
- `status` — open/closing_soon/upcoming/closed
- `sort_by` — newest/match/popular (default: newest)
- `page` — Page number (default: 1)
- `page_size` — Results per page (default: 20)

Example:
```
GET /api/schemes?q=scholarship&state=UP&occupation=student&income_max=300000&page=1&page_size=10
```

Response: `{items: [...], total: N, page: 1, page_size: 10, total_pages: X}`

### `GET /api/schemes/trending` — Top schemes by views
```
GET /api/schemes/trending?limit=10
```
Response: `[SchemeRead, ...]`

### `GET /api/schemes/categories` — Scheme count by type
Response: `[{scheme_type: "scholarship", total_schemes: 45}, ...]`

### `GET /api/schemes/{scheme_id}` — Scheme detail (increments view count)
Response: SchemeRead

### `POST /api/schemes/{scheme_id}/save` — Bookmark a scheme
Response: `{message: "Scheme saved"}`

### `DELETE /api/schemes/{scheme_id}/save` — Remove bookmark
Response: `{message: "Scheme removed from saved list"}`

---

## AI Eligibility (Core Feature)

### `POST /api/eligibility/check` — Check eligibility against schemes
Request (all fields optional if logged in; fall back to user's saved profile):
```json
{
  "age": 28,
  "gender": "male",
  "state": "Uttar Pradesh",
  "is_rural": false,
  "occupation": "student",
  "annual_income": 200000,
  "category": "general",
  "education": "college_student",
  "disability_status": false,
  "scheme_id": "uuid-..." // optional: check only this scheme
}
```

Response:
```json
{
  "checked_schemes_count": 6,
  "eligible_count": 4,
  "results": [
    {
      "scheme_id": "uuid-...",
      "scheme_name": "National Scholarship for Higher Education",
      "is_eligible": true,
      "eligibility_score": 100.0,
      "confidence_score": 100.0,
      "matched_criteria": [
        "Age between 17-30",
        "Annual income within scheme limit",
        "Education in [college_student, graduate, postgraduate]"
      ],
      "missing_requirements": []
    },
    ...
  ]
}
```

### `GET /api/eligibility/history` — Past checks
Response: `[EligibilityCheckRead, ...]`

### `GET /api/eligibility/{check_id}` — Single check detail
Response: EligibilityCheckRead

---

## Document Upload + OCR

### `POST /api/documents/upload` — Upload document
Multipart form:
- `document_type` (form field) — aadhaar_card / income_certificate / caste_certificate / student_id / farmer_card / disability_certificate / ration_card / residence_certificate
- `file` (multipart file) — PDF, JPG, or PNG

Response: DocumentRead (includes `ocr_extracted_data` if OCR ran)

### `GET /api/documents` — My documents
Response: `[DocumentRead, ...]`

### `GET /api/documents/{document_id}` — Document detail
Response: DocumentRead

### `POST /api/documents/{document_id}/ocr` — Reprocess OCR
Response: DocumentRead with updated extraction results

### `DELETE /api/documents/{document_id}` — Delete document
Response: `{message: "Document deleted"}`

---

## Applications

### `POST /api/applications` — Apply to a scheme
```json
{
  "scheme_id": "uuid-...",
  "notes": "Submitting for B.Tech scholarship"
}
```
Response: 201 Created + ApplicationRead

### `GET /api/applications` — My applications
Response: `[ApplicationRead, ...]`

### `GET /api/applications/{application_id}` — Application detail
Response: ApplicationRead

---

## Recommendations

### `GET /api/recommendations` — Personalized schemes
Query params:
- `limit` — Max results (default: 10)

Response: `[SchemeMatchResult, ...]` (ranked by eligibility_score)

---

## Search

### `GET /api/search` — Keyword search (anonymous-friendly)
Query params:
- `q` — Search query
- `limit` — Max results (default: 20)

Response: `[SchemeRead, ...]`

---

## Notifications

### `GET /api/notifications` — List notifications
Query params:
- `unread_only` — true/false (default: false)

Response: `[NotificationRead, ...]`

### `PUT /api/notifications/{notification_id}/read` — Mark read
Response: NotificationRead

### `PUT /api/notifications/read-all` — Mark all as read
Response: `{message: "All notifications marked as read"}`

---

## User Profile

### `GET /api/users/me` — My profile
Response: UserRead

### `PUT /api/users/me` — Update my profile
```json
{
  "full_name": "Arjun Singh",
  "age": 28,
  "state": "Delhi",
  "occupation": "student",
  "annual_income": 250000
  // ... any fields to update
}
```
Response: UserRead

### `GET /api/users/me/documents` — My uploaded documents
Response: `[DocumentRead, ...]`

### `GET /api/users/me/saved-schemes` — My bookmarks
Response: `[SchemeRead, ...]`

### `GET /api/users/me/applications` — My applications
Response: `[ApplicationRead, ...]`

### `GET /api/users/me/eligibility-history` — My checks
Response: `[EligibilityCheckRead, ...]`

---

## Admin Endpoints

All require `is_admin=true` on the current user.

### `GET /api/admin/analytics` — Dashboard stats
Response:
```json
{
  "total_users": 5000,
  "total_schemes": 150,
  "total_eligibility_checks": 25000,
  "most_viewed_schemes": [{id: "...", name: "PM Kisan", views: 10000}, ...],
  "state_wise_users": [{state: "UP", count: 800}, ...]
}
```

### `GET /api/admin/users` — List users
Query params:
- `page` — Page number (default: 1)
- `page_size` — Results per page (default: 50)

Response: `[UserRead, ...]`

### `PUT /api/admin/users/{user_id}/deactivate` — Disable user
Response: UserRead (is_active: false)

### `GET /api/admin/documents/pending` — Unverified uploads
Response: `[DocumentRead, ...]` (status: pending)

### `PUT /api/admin/documents/{document_id}/verify` — Approve/reject document
Query params:
- `approve` — true/false

Response: DocumentRead (status: verified or rejected)

### `POST /api/schemes` — Create scheme (admin)
```json
{
  "name": "New Scheme Name",
  "ministry": "Ministry Name",
  "description": "...",
  "scheme_type": "scholarship",
  "benefits_type": "direct_cash_transfer",
  "min_age": 18,
  "max_age": 35,
  "income_max": 500000,
  "eligible_states": ["UP", "MP"]
}
```
Response: 201 Created + SchemeRead

### `PUT /api/schemes/{scheme_id}` — Update scheme (admin)
Response: SchemeRead

### `DELETE /api/schemes/{scheme_id}` — Delete scheme (admin)
Response: `{message: "Scheme deleted"}`

---

## Error Responses

### 400 Bad Request
```json
{"detail": "Invalid email format"}
```

### 401 Unauthorized
```json
{"detail": "Could not validate credentials"}
```

### 403 Forbidden
```json
{"detail": "Admin access required"}
```

### 404 Not Found
```json
{"detail": "Scheme not found"}
```

### 500 Internal Server Error
```json
{"detail": "Internal server error"}
```

---

## Data Types

### Gender
`male`, `female`, `other`

### Category
`general`, `obc`, `sc`, `st`, `ews`

### Education
`school_student`, `college_student`, `diploma`, `graduate`, `postgraduate`, `research_scholar`, `none`

### Occupation
`student`, `farmer`, `business_owner`, `startup_founder`, `government_employee`, `private_employee`, `unemployed`, `senior_citizen`

### Scheme Type
`scholarship`, `housing`, `agriculture`, `employment`, `health`, `startup`, `women_welfare`, `pension`, `insurance`, `skill_development`

### Benefits Type
`direct_cash_transfer`, `subsidy`, `loan`, `scholarship`, `insurance`, `training`

### Scheme Status
`open`, `closing_soon`, `upcoming`, `closed`

### Document Type
`aadhaar_card`, `income_certificate`, `caste_certificate`, `student_id`, `farmer_card`, `disability_certificate`, `ration_card`, `residence_certificate`

### Application Status
`applied`, `under_review`, `approved`, `rejected`

### Notification Type
`new_scheme`, `deadline_alert`, `status_update`, `ministry_announcement`, `security_alert`

---

## Rate Limiting

Not yet implemented. To add:
- Use `slowapi` library
- 100 requests/minute per IP (public endpoints)
- 1000 requests/minute per user (authenticated endpoints)

---

## Pagination

All list endpoints use `PaginatedResponse`:
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

---

## Examples

### Full flow: Register → Check eligibility → Apply to scheme

```bash
# 1. Register
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Arjun",
    "email": "a@example.com",
    "password": "Pass123",
    "age": 28,
    "occupation": "student",
    "annual_income": 200000,
    "state": "UP"
  }' | jq -r '.id')

# 2. Login
ACCESS=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "a@example.com", "password": "Pass123"}' | jq -r '.access_token')

# 3. Check eligibility
curl -s -X POST http://localhost:8000/api/eligibility/check \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 28,
    "occupation": "student",
    "annual_income": 200000,
    "state": "UP"
  }' | jq '.results[] | select(.is_eligible)'

# 4. Apply to eligible scheme
SCHEME_ID=$(curl -s http://localhost:8000/api/schemes | jq -r '.items[0].id')
curl -s -X POST http://localhost:8000/api/applications \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"scheme_id\": \"$SCHEME_ID\"}" | jq
```
