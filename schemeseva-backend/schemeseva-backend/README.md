# SchemeSeva AI Backend

FastAPI + PostgreSQL backend for India's AI-powered Government Scheme Discovery and Eligibility Prediction Platform.

## Project Structure

```
schemeseva-backend/
├── app/
│   ├── api/                    # FastAPI routers
│   │   ├── auth.py            # Register, login, refresh, OTP, Google login
│   │   ├── users.py           # Profile CRUD, my documents/schemes/applications
│   │   ├── schemes.py         # Discover schemes, trending, categories, admin CRUD
│   │   ├── eligibility.py     # Core feature: AI eligibility checking
│   │   ├── documents.py       # Upload, OCR stub, verification
│   │   ├── applications.py    # Track applications across schemes
│   │   ├── notifications.py   # Alerts, deadline reminders
│   │   ├── search.py          # Keyword search, semantic search (stub), recommendations
│   │   └── admin.py           # Analytics, user mgmt, document review
│   ├── auth/
│   │   └── dependencies.py    # OAuth2 + JWT: get_current_user, get_current_admin
│   ├── core/
│   │   ├── config.py          # Settings from .env
│   │   └── security.py        # Password hashing, JWT encode/decode
│   ├── database/
│   │   ├── base.py            # SQLAlchemy declarative base
│   │   └── session.py         # Engine, SessionLocal, get_db()
│   ├── models/                # SQLAlchemy ORM models (7 total)
│   │   ├── user.py            # User profile + enums (gender, category, occupation, etc.)
│   │   ├── scheme.py          # Scheme metadata + eligibility criteria fields
│   │   ├── document.py        # Uploaded documents + OCR results
│   │   ├── eligibility.py     # Eligibility check results
│   │   ├── application.py     # Application tracker
│   │   ├── notification.py    # Notifications, saved schemes, search history
│   │   └── __init__.py        # Registers all models for Alembic
│   ├── schemas/               # Pydantic schemas (request/response)
│   │   ├── common.py
│   │   ├── user.py
│   │   ├── auth.py
│   │   ├── scheme.py
│   │   ├── document.py
│   │   ├── eligibility.py
│   │   ├── application.py
│   │   └── notification.py
│   ├── services/
│   │   ├── eligibility_service.py  # Rule-based eligibility engine (drop-in for ML later)
│   │   ├── scheme_service.py       # Search/filter, Elasticsearch-ready
│   │   ├── recommendation_service.py # Personalized schemes, collaborative filtering stub
│   │   └── ocr_service.py          # Document OCR (EasyOCR/Tesseract stub)
│   ├── utils/
│   │   └── pagination.py
│   └── __init__.py
├── scripts/
│   └── seed.py                # Create tables + insert 6 sample schemes
├── main.py                    # FastAPI app entrypoint
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Setup

### Prerequisites
- Python 3.10+
- PostgreSQL 12+
- pip / virtualenv

### 1. Create `.env` file

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/schemeseva
SECRET_KEY=your-long-random-secret-here
ALGORITHM=HS256
CORS_ORIGINS=http://localhost:3000,http://localhost:8080

# Placeholders (wire up later for OTP/email/OAuth2):
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SMS_PROVIDER_API_KEY=
EMAIL_SMTP_HOST=
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Create database (local PostgreSQL)

```bash
createdb schemeseva
```

### 4. Initialize schema + seed sample data

```bash
python scripts/seed.py
```

This:
- Creates all 7 tables (users, schemes, documents, eligibility_checks, applications, notifications, saved_schemes, search_history)
- Inserts 6 sample government schemes (PM Kisan, PM Awas, Ayushman Bharat, etc.)

## Running the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Key Features Implemented

### 1. **Authentication**
- Email/password registration & login
- JWT access + refresh tokens
- Admin role guard
- OTP (SMS/mobile) — stub, wire up SMS provider in `auth.py`
- Google OAuth2 — stub, wire up Google `id_token` verification

**Endpoints:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/otp/send
POST   /api/auth/otp/verify
POST   /api/auth/login/google
```

### 2. **Scheme Discovery**
- Search & advanced filters (state, category, occupation, income, education, age, etc.)
- Trending schemes ranked by popularity
- Categories breakdown (Student, Farmer, Women, Housing, etc.)
- Save/unsave schemes
- Admin CRUD (create, update, delete)

**Endpoints:**
```
GET    /api/schemes?q=&state=&occupation=&income_max=&page=&page_size=
GET    /api/schemes/trending
GET    /api/schemes/categories
GET    /api/schemes/{id}
POST   /api/schemes/{id}/save
DELETE /api/schemes/{id}/save
POST   /api/schemes (admin)
PUT    /api/schemes/{id} (admin)
DELETE /api/schemes/{id} (admin)
```

### 3. **AI Eligibility Prediction** ⭐
- Rule-based transparency engine matching user profile against scheme criteria
- Evaluates: age, income, education, occupation, category (SC/ST/OBC/EWS), state, disability, rural status
- Outputs:
  - `is_eligible` (boolean)
  - `eligibility_score` (0–100%, % criteria met)
  - `confidence_score` (0–100%, % of user profile populated)
  - `matched_criteria` (which rules passed)
  - `missing_requirements` (which rules failed)
  - `unknown_criteria` (which data was missing)

**Swap-in plan for ML:** Keep the function signature, replace body with trained XGBoost/scikit-learn classifier that outputs probability → map to scores.

**Endpoints:**
```
POST   /api/eligibility/check
GET    /api/eligibility/history
GET    /api/eligibility/{id}
```

### 4. **Document Upload + OCR**
- Upload Aadhaar, income cert, caste cert, student ID, farmer card, disability cert, ration card, residence cert
- File formats: PDF, JPG, PNG
- OCR stub (wire up EasyOCR or Tesseract)
- Extracted data + missing fields detection
- Verification workflow (pending → verified/rejected)

**Endpoints:**
```
POST   /api/documents/upload (multipart form)
GET    /api/documents
GET    /api/documents/{id}
POST   /api/documents/{id}/ocr (reprocess)
DELETE /api/documents/{id}
```

### 5. **Application Tracker**
- Apply to schemes (creates Application record)
- Track status: applied → under review → approved/rejected
- Admin status updates with notes

**Endpoints:**
```
POST   /api/applications
GET    /api/applications
GET    /api/applications/{id}
PUT    /api/applications/{id}/status (admin)
```

### 6. **Personalized Recommendations**
- Rank all schemes by user's eligibility score
- Pull from saved schemes + application history
- Collaborative filtering stub (upgrade to similar-user recommendations)

**Endpoints:**
```
GET    /api/recommendations?limit=10
```

### 7. **Search**
- Keyword search: name, description, ministry
- Semantic/NLP search stub (wire up Elasticsearch + embeddings, Hindi support)

**Endpoints:**
```
GET    /api/search?q=scholarship&limit=20
```

### 8. **Notification Center**
- Mark read/unread
- Stub: Email/SMS/WhatsApp alerts on scheme deadlines, application status updates

**Endpoints:**
```
GET    /api/notifications?unread_only=false
PUT    /api/notifications/{id}/read
PUT    /api/notifications/read-all
```

### 9. **User Dashboard**
- Profile CRUD
- My documents, saved schemes, applications, eligibility history

**Endpoints:**
```
GET    /api/users/me
PUT    /api/users/me
GET    /api/users/me/documents
GET    /api/users/me/saved-schemes
GET    /api/users/me/applications
GET    /api/users/me/eligibility-history
```

### 10. **Admin Dashboard**
- Analytics: total users, schemes, eligibility checks, most-viewed schemes, state-wise breakdown
- User deactivation
- Document verification workflow

**Endpoints:**
```
GET    /api/admin/analytics
GET    /api/admin/users?page=&page_size=
PUT    /api/admin/users/{id}/deactivate
GET    /api/admin/documents/pending
PUT    /api/admin/documents/{id}/verify?approve=true/false
```

## Architecture Notes

### Database Design
- **User:** Profile (demographics, income, occupation, education, disability, state/district)
- **Scheme:** Metadata + eligibility criteria as structured fields (age range, income ceiling, eligible states/occupations/categories)
- **Document:** File path + OCR results + verification status
- **EligibilityCheck:** Result of a user's eligibility check — saved for history
- **Application:** User's application to a scheme, status tracked
- **SavedScheme:** Many-to-many (user bookmarks scheme)
- **SearchHistory:** Tracks queries for analytics & recommendations

### Eligibility Engine
**File:** `app/services/eligibility_service.py`

Currently transparent & rule-based:
1. Build profile from user + request (request overrides)
2. For each scheme criterion:
   - If user's profile field is `None` → "unknown"
   - If it satisfies the criterion → "matched"
   - If it fails → "missing"
3. Score = `matched / total_criteria * 100`
4. Eligible if no criteria failed (unknowns allowed)

**Upgrade path:** Swap `evaluate_user_against_scheme()` body for:
```python
# Pseudo-code
clf = load_trained_xgboost_model()
features = vectorize_profile(profile, scheme)
probability = clf.predict_proba(features)[0][1]  # class 1 = eligible
eligibility_score = probability * 100
```

### Search Service
**File:** `app/services/scheme_service.py`

Currently uses PostgreSQL ILIKE (case-insensitive substring match).

**Upgrade path:** Swap for Elasticsearch:
```python
# Pseudo-code
from elasticsearch import Elasticsearch
es = Elasticsearch()
results = es.search(index="schemes", body={
    "query": {"multi_match": {"query": q, "fields": ["name", "description"]}}
})
```

Also add embeddings-based semantic search (e.g., "scholarship for engineering students in UP").

### OCR Service
**File:** `app/services/ocr_service.py`

Currently a stub returning empty `extracted_data` and all fields as "missing".

**Upgrade path:**
```python
import easyocr
reader = easyocr.Reader(["en", "hi"])
raw = reader.readtext(file_path, detail=0)
text = "\n".join(raw)
extracted = parse_fields(text, document_type)  # regex/NLP to extract structured fields
```

## Testing the API

### 1. Register a user
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Arjun Singh",
    "email": "arjun@example.com",
    "password": "SecurePass123",
    "age": 28,
    "state": "Uttar Pradesh",
    "occupation": "student",
    "annual_income": 200000,
    "category": "general",
    "education": "college_student"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "arjun@example.com", "password": "SecurePass123"}'
```

Response:
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### 3. Check eligibility (use the access_token above)
```bash
curl -X POST http://localhost:8000/api/eligibility/check \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 28,
    "state": "Uttar Pradesh",
    "occupation": "student",
    "annual_income": 200000,
    "category": "general",
    "education": "college_student"
  }'
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
      "matched_criteria": ["...", "..."],
      "missing_requirements": []
    },
    ...
  ]
}
```

### 4. Search schemes
```bash
curl http://localhost:8000/api/search?q=scholarship
```

### 5. Get recommendations
```bash
curl http://localhost:8000/api/recommendations \
  -H "Authorization: Bearer <access_token>"
```

## Deployment

### Local Docker

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t schemeseva-backend .
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e SECRET_KEY=... \
  schemeseva-backend
```

### Railway / Render

1. Push to GitHub
2. Connect repo in Railway/Render dashboard
3. Set environment variables (DATABASE_URL, SECRET_KEY, etc.)
4. Deploy

Example Railway deploy button:
```
[Deploy on Railway](https://railway.app/new?repo=YOUR_REPO_URL)
```

## Future Enhancements

### Phase 2 (ML & Search)
- [ ] Real OCR (EasyOCR/Tesseract)
- [ ] Trained eligibility classifier (XGBoost/scikit-learn)
- [ ] Elasticsearch semantic search
- [ ] Hindi/regional language support
- [ ] Voice search (Whisper API)

### Phase 3 (Notifications & Engagement)
- [ ] Email/SMS alerts via SendGrid/Twilio
- [ ] WhatsApp integration
- [ ] Scheme deadline reminders
- [ ] Application status notifications

### Phase 4 (Admin & Analytics)
- [ ] Fraud detection (suspicious patterns)
- [ ] Export analytics to CSV/dashboard
- [ ] Batch user management
- [ ] Scheme feedback/ratings from users

### Phase 5 (Frontend & Mobile)
- [ ] Next.js frontend
- [ ] React Native mobile app
- [ ] Dark mode support
- [ ] Accessibility (WCAG)

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost/schemeseva` |
| `SECRET_KEY` | JWT signing key (min 32 chars) | `your-secret-key-here` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiry for access token | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | JWT expiry for refresh token | `7` |
| `CORS_ORIGINS` | Comma-separated frontend origins | `http://localhost:3000,https://schemeseva.in` |
| `UPLOAD_DIR` | Local upload directory | `uploads` |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | (get from Google Cloud Console) |
| `SMS_PROVIDER_API_KEY` | Twilio / AWS SNS key | (set up SMS provider) |
| `EMAIL_SMTP_HOST` | SMTP server for email | `smtp.gmail.com` |

## Support & Contribution

For issues, feature requests, or PRs, open an issue on GitHub.

---

**Built with:** FastAPI, SQLAlchemy, PostgreSQL, Pydantic, JWT, bcrypt
