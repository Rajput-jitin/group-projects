# Quick Start (5 Minutes)

## 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download & install from https://www.postgresql.org/download/windows/

## 2. Create database
```bash
createdb schemeseva
```

## 3. Clone & setup backend
```bash
cd schemeseva-backend

# Copy env file
cp .env.example .env

# Install dependencies (use virtualenv recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Seed sample data (creates tables + 6 schemes)
python scripts/seed.py
```

## 4. Run server
```bash
uvicorn main:app --reload
```

Server now at **http://localhost:8000**

## 5. Test the API

**Open Swagger UI:** http://localhost:8000/docs (interactive)

**Or use curl:**

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Arjun Singh",
    "email": "test@example.com",
    "password": "Test123!",
    "age": 28,
    "state": "Uttar Pradesh",
    "occupation": "student",
    "annual_income": 200000,
    "category": "general",
    "education": "college_student"
  }'

# Login (replace email/password)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test123!"}'

# Save the access_token from login response, then check eligibility:
curl -X POST http://localhost:8000/api/eligibility/check \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 28,
    "state": "Uttar Pradesh",
    "occupation": "student",
    "annual_income": 200000
  }'

# Search schemes
curl http://localhost:8000/api/search?q=scholarship
```

## What's Implemented

✅ **User Auth** — Register, login, JWT, refresh tokens, OTP/Google stubs  
✅ **Scheme Discovery** — Search, filter, trending, categories, save/bookmark  
✅ **AI Eligibility** — Rule-based engine (ML-ready), score + confidence  
✅ **Documents** — Upload Aadhaar/certificates, OCR stub, verification  
✅ **Applications** — Apply to schemes, track status  
✅ **Recommendations** — Personalized schemes by eligibility score  
✅ **Admin Dashboard** — Analytics, user mgmt, document review  
✅ **Notifications** — Mark read, notification center stub  

## Next Steps

1. **Explore the API** at http://localhost:8000/docs
2. **Read** [`API_REFERENCE.md`](API_REFERENCE.md) for all endpoints
3. **Review** [`app/services/eligibility_service.py`](app/services/eligibility_service.py) — the rule-based eligibility engine (ready to swap for ML)
4. **Build the frontend** (Next.js) connecting to these endpoints
5. **Wire up** real integrations:
   - OCR: EasyOCR or Tesseract
   - Search: Elasticsearch (semantic search)
   - ML: Trained XGBoost/scikit-learn classifier
   - SMS/Email: Twilio / SendGrid
   - File storage: AWS S3 / Cloudinary
   - OAuth2: Google login

## File Structure at a Glance

```
app/api/           ← All 9 routers (auth, schemes, eligibility, etc.)
app/models/        ← 7 SQLAlchemy models (User, Scheme, Document, etc.)
app/schemas/       ← Pydantic request/response shapes
app/services/      ← Business logic (eligibility, search, OCR, recommendations)
app/auth/          ← JWT & OAuth2 dependencies
app/core/          ← Config, security helpers
app/database/      ← SQLAlchemy engine/session
main.py            ← FastAPI app entrypoint
scripts/seed.py    ← Create tables + sample schemes
requirements.txt   ← Python dependencies
.env.example       ← Environment template
README.md          ← Full setup & architecture guide
API_REFERENCE.md   ← All endpoints documented
MIGRATIONS.md      ← Alembic setup for production
```

## Troubleshooting

**"connection refused" PostgreSQL**
```bash
# Check if PostgreSQL is running
pg_isready
# If not, start it:
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux
```

**"ModuleNotFoundError: No module named 'fastapi'"**
```bash
# Activate virtualenv:
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows
# Re-install:
pip install -r requirements.txt
```

**"Database 'schemeseva' does not exist"**
```bash
createdb schemeseva
python scripts/seed.py
```

## Support

- **API Docs:** http://localhost:8000/docs
- **Repo Issues:** GitHub Issues
- **Architecture:** See [`README.md`](README.md)
- **Full API:** See [`API_REFERENCE.md`](API_REFERENCE.md)

---

**Ready?** Start the server and visit http://localhost:8000/docs! 🚀
