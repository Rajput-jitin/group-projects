"""
AI Chatbot router for SchemeSeva AI.
Provides real intelligent scheme matching, conversational assistance,
and structured scheme recommendations for user queries in English & Hindi.
"""
import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.scheme import Scheme, SchemeTypeEnum
from app.schemas.scheme import SchemeRead

router = APIRouter(prefix="/api", tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "bot"
    text: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] | None = None
    lang: str | None = "en"


class ChatResponse(BaseModel):
    reply: str
    matched_schemes: list[SchemeRead] = []


def is_hindi(text: str) -> bool:
    """Detect if text contains Devanagari characters or common Hindi words."""
    if re.search(r"[\u0900-\u097F]", text):
        return True
    hindi_keywords = ["kisan", "yojana", " छात्रवृत्ति", "योजना", "नमस्ते", "पात्रता", "सरकारी", "kya", "kaise", "hai", "mujhe"]
    return any(k in text.lower() for k in hindi_keywords)


@router.post("/chat", response_model=ChatResponse)
def ai_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    msg = payload.message.strip()
    if not msg:
        return ChatResponse(reply="Please ask a question about government schemes, scholarships, or subsidies.")

    msg_lower = msg.lower()
    hindi_mode = is_hindi(msg) or payload.lang == "hi"

    # Search for top matching schemes in DB
    query_builder = db.query(Scheme)

    # Keywords extraction
    words = [w for w in re.split(r"\W+", msg_lower) if len(w) > 2 and w not in ["the", "and", "for", "with", "what", "how", "can", "get", "you", "are", "have", "want", "need", "schemes", "yojana", "scheme"]]

    matched = []
    if words:
        filters = []
        for word in words[:4]:
            like = f"%{word}%"
            filters.append(
                Scheme.name.ilike(like) |
                Scheme.description.ilike(like) |
                Scheme.ministry.ilike(like) |
                Scheme.eligibility_text.ilike(like)
            )
        # Apply combined search or OR search
        matched = query_builder.filter(*filters).limit(5).all()

        # If too few matches, try OR matching
        if len(matched) < 2 and len(words) > 1:
            or_filters = [Scheme.name.ilike(f"%{w}%") | Scheme.description.ilike(f"%{w}%") for w in words]
            from sqlalchemy import or_
            matched = db.query(Scheme).filter(or_(*or_filters)).limit(5).all()

    # Fallback if no specific keyword matched
    if not matched:
        # Check category keywords
        if any(k in msg_lower for k in ["farmer", "kisan", "crop", "agriculture", "land"]):
            matched = db.query(Scheme).filter(Scheme.scheme_type == SchemeTypeEnum.agriculture).limit(5).all()
        elif any(k in msg_lower for k in ["student", "scholarship", "study", "college", "school", "education"]):
            matched = db.query(Scheme).filter(Scheme.scheme_type == SchemeTypeEnum.scholarship).limit(5).all()
        elif any(k in msg_lower for k in ["woman", "women", "female", "girl", "mother", "mahila"]):
            matched = db.query(Scheme).filter(Scheme.scheme_type == SchemeTypeEnum.women_welfare).limit(5).all()
        elif any(k in msg_lower for k in ["health", "medical", "hospital", "ayushman", "treatment"]):
            matched = db.query(Scheme).filter(Scheme.scheme_type == SchemeTypeEnum.health).limit(5).all()
        elif any(k in msg_lower for k in ["startup", "business", "loan", "entrepreneur", "mudra"]):
            matched = db.query(Scheme).filter(Scheme.scheme_type == SchemeTypeEnum.startup).limit(5).all()
        else:
            matched = db.query(Scheme).order_by(Scheme.popularity_score.desc()).limit(4).all()

    # Convert matches to Pydantic SchemeRead
    schemes_read = [SchemeRead.model_validate(s) for s in matched]

    # Synthesize intelligent response
    count = len(schemes_read)
    top_names = ", ".join([s.name for s in schemes_read[:3]])

    if hindi_mode:
        reply = (
            f"नमस्ते! आपके प्रश्न के आधार पर मुझे {count} प्रासंगिक सरकारी योजनाएं मिली हैं:\n\n"
            f" मुख्य योजनाएं: **{top_names}**\n\n"
            f"आप नीचे दिए गए कार्ड्स पर **Details** बटन क्लिक करके पूर्ण पात्रता, आवश्यक दस्तावेज और आवेदन की प्रक्रिया देख सकते हैं।"
        )
    else:
        reply = (
            f"Hello! Based on your query, I found **{count} matching government schemes**:\n\n"
            f"📌 Top recommendations: **{top_names}**\n\n"
            f"Click on the **Details** button on any card below to inspect complete eligibility criteria, required documents, and step-by-step application steps!"
        )

    return ChatResponse(reply=reply, matched_schemes=schemes_read)
