"""
SchemeSeva AI — backend entrypoint.

Run locally with:
    uvicorn main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, applications, auth, documents, eligibility, notifications, schemes, search, users
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered Government Scheme Discovery and Eligibility Prediction Platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(schemes.router)
app.include_router(eligibility.router)
app.include_router(documents.router)
app.include_router(applications.router)
app.include_router(notifications.router)
app.include_router(search.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/health")
def health():
    return {"status": "healthy"}
