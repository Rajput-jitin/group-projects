"""
Fix official_url for schemes in the database.

For schemes where official_url is the generic 'https://myscheme.gov.in':
1. Extract real URLs from process_text, eligibility_text, description fields
2. For remaining schemes with a slug, construct direct myscheme page URL
3. As last resort, leave the scheme's specific myscheme page URL using slug

Run with:
    python scripts/fix_urls.py
"""
import sys
import re
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database.session import SessionLocal
from app.models.scheme import Scheme

# Domains to skip (not real official portals)
SKIP_DOMAINS = {
    'myscheme.gov.in',
    'example.com',
    'placeholder.com',
    'google.com',
    'youtube.com',
    'wikipedia.org',
    'facebook.com',
    'twitter.com',
}

URL_PATTERN = re.compile(r'https?://[^\s,)>\u0026\u0026quot;]+\.[a-zA-Z]{2,}[^\s,)>\u0026\u0026quot;]*')


def extract_best_url(texts: list[str]) -> str | None:
    """Extract the most relevant official URL from text fields."""
    all_urls = []
    for text in texts:
        if not text:
            continue
        urls = URL_PATTERN.findall(text)
        for url in urls:
            # Clean trailing punctuation
            url = url.rstrip('.,;:')
            # Skip generic/useless URLs
            domain = url.split('/')[2] if len(url.split('/')) > 2 else ''
            if any(skip in domain for skip in SKIP_DOMAINS):
                continue
            # Prefer .gov.in and .nic.in domains (official government)
            all_urls.append(url)

    if not all_urls:
        return None

    # Prioritize .gov.in and .nic.in URLs
    gov_urls = [u for u in all_urls if '.gov.in' in u or '.nic.in' in u]
    if gov_urls:
        return gov_urls[0]

    return all_urls[0]


def main():
    db = SessionLocal()
    try:
        # Get all schemes with generic myscheme URL
        schemes = db.query(Scheme).filter(
            Scheme.official_url.in_(['https://myscheme.gov.in', 'https://myscheme.gov.in/', None, ''])
        ).all()

        print(f"Found {len(schemes)} schemes with generic/missing official_url")

        updated_from_text = 0
        updated_from_slug = 0
        still_generic = 0

        for s in schemes:
            # Try extracting real URL from text fields
            real_url = extract_best_url([s.process_text, s.eligibility_text, s.description])

            if real_url:
                s.official_url = real_url[:500]
                updated_from_text += 1
            else:
                # Use slug to construct direct scheme page on myscheme
                slug = None
                if s.details_json and isinstance(s.details_json, dict):
                    slug = s.details_json.get('slug')

                if slug:
                    s.official_url = f"https://www.myscheme.gov.in/schemes/{slug}"
                    updated_from_slug += 1
                else:
                    s.official_url = "https://www.myscheme.gov.in/search"
                    still_generic += 1

        db.commit()

        print(f"\n=== URL Fix Results ===")
        print(f"Updated from embedded text URLs: {updated_from_text}")
        print(f"Updated with direct scheme page (slug): {updated_from_slug}")
        print(f"Still generic (no slug found): {still_generic}")
        print(f"Total processed: {updated_from_text + updated_from_slug + still_generic}")

        # Verify: count remaining generic URLs
        remaining = db.query(Scheme).filter(
            Scheme.official_url.in_(['https://myscheme.gov.in', 'https://myscheme.gov.in/'])
        ).count()
        print(f"\nRemaining generic myscheme.gov.in URLs: {remaining}")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
