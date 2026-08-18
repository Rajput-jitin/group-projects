"""
Python URL Normalizer & Data Cleaner for MyScheme Dataset.

Performs robust URL extraction, cleaning, and normalization:
1. Fixes missing scheme (adds https:// if missing, e.g. www.standupmitra.in -> https://www.standupmitra.in)
2. Fixes malformed protocols (e.g. http:/ / -> http://, http:/ -> http://)
3. Splits multi-URL fields jammed together (e.g. "http://site1.gov.in/ https://site2.gov.in/")
4. Removes trailing unwanted words/text (e.g. "https://skillindia.nsdcindia.org/rpl-dap to register")
5. Filters out email addresses (e.g. "rg.ngt@nic.in")
6. Extracts URLs from process text when applicationProcess.url is empty
7. Normalizes and fallback deep-links to official scheme slug pages

Run with:
    python scripts/clean_urls_report.py
"""

import sys
import json
import re
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "myscheme_complete.json"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "myscheme_cleaned.json"

URL_REGEX = re.compile(r'(?:https?://|www\.)[^\s,><"\'\]\)]+', re.IGNORECASE)


def clean_single_url(raw_url: str) -> list[str]:
    """Cleans a raw URL string, fixing protocols, trailing text, multi-URLs, and emails."""
    if not raw_url or not isinstance(raw_url, str):
        return []

    text = raw_url.strip()

    # Reject if it's purely an email address
    if "@" in text and not ("http" in text or "www." in text):
        return []

    # Fix common protocol typos: "http:/ /", "http:/", "https:/ /", "https:/"
    text = re.sub(r'https?:/\s*/', 'https://', text, flags=re.IGNORECASE)
    text = re.sub(r'https?:/([^\/])', r'https://\1', text, flags=re.IGNORECASE)

    # Find all candidates (handles multiple jammed URLs)
    matches = URL_REGEX.findall(text)
    cleaned_urls = []

    for m in matches:
        u = m.strip()

        # Remove trailing punctuation (slash handled naturally)
        u = u.rstrip('.,;:)"\'')

        # Add https:// if starts with www.
        if u.lower().startswith('www.'):
            u = 'https://' + u
        elif not u.lower().startswith('http://') and not u.lower().startswith('https://'):
            u = 'https://' + u

        # Basic validity check (must have at least one dot in domain)
        if '.' in (u.split('/')[2] if len(u.split('/')) > 2 else u):
            cleaned_urls.append(u)

    return cleaned_urls


def extract_url_from_text(text: str) -> str | None:
    """Extracts valid government/official URLs from unstructured text."""
    if not text:
        return None
    cleaned_urls = clean_single_url(text)

    # Prioritize .gov.in, .nic.in, or non-myscheme official domains
    gov_urls = [u for u in cleaned_urls if ('.gov.in' in u or '.nic.in' in u) and 'myscheme.gov.in' not in u]
    if gov_urls:
        return gov_urls[0]

    other_urls = [u for u in cleaned_urls if 'myscheme.gov.in' not in u]
    if other_urls:
        return other_urls[0]

    return None


def main():
    if not DATA_PATH.exists():
        print(f"ERROR: Dataset not found at {DATA_PATH}")
        sys.exit(1)

    print(f"Reading dataset: {DATA_PATH}")
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    stats = {
        "total_schemes": len(data),
        "valid_original_url": 0,
        "fixed_automatically": 0,
        "extracted_from_process_text": 0,
        "fallback_slug_url": 0,
        "multi_urls_split": 0,
        "emails_rejected": 0,
    }

    cleaned_data = []

    for item in data:
        slug = item.get("slug")
        det = item.get("details", {})
        en = det.get("en", {}) if isinstance(det, dict) else {}
        bd = en.get("basicDetails", {}) if isinstance(en, dict) else {}
        sc = en.get("schemeContent", {}) if isinstance(en, dict) else {}
        ec = en.get("eligibilityCriteria", {}) if isinstance(en, dict) else {}
        ap = en.get("applicationProcess", []) if isinstance(en, dict) else []

        raw_url = bd.get("schemeOpenUrl") or ""

        # Check applicationProcess entries for URLs if basicDetails is empty
        proc_url_raw = ""
        proc_text_combined = ""
        if isinstance(ap, list):
            for p in ap:
                if isinstance(p, dict):
                    if not proc_url_raw and p.get("url"):
                        proc_url_raw = str(p.get("url"))
                    if p.get("process"):
                        proc_text_combined += str(p.get("process")) + " "

        combined_raw = raw_url or proc_url_raw

        cleaned_url = None
        status = "unknown"

        if combined_raw:
            # Check for emails
            if "@" in combined_raw and not ("http" in combined_raw or "www." in combined_raw):
                stats["emails_rejected"] += 1

            urls = clean_single_url(combined_raw)
            if len(urls) > 1:
                stats["multi_urls_split"] += 1

            if urls:
                cleaned_url = urls[0]
                if cleaned_url == combined_raw and combined_raw.startswith("http"):
                    stats["valid_original_url"] += 1
                    status = "Valid Original"
                else:
                    stats["fixed_automatically"] += 1
                    status = "Fixed Automatically"

        # Fallback 1: Extract from process / description text if still empty
        if not cleaned_url:
            text_to_search = f"{proc_text_combined} {sc.get('detailedDescription', '')} {ec.get('eligibilityDescription', '')}"
            extracted = extract_url_from_text(text_to_search)
            if extracted:
                cleaned_url = extracted
                stats["extracted_from_process_text"] += 1
                status = "Extracted from Process Text"

        # Fallback 2: Direct myscheme slug deep-link
        if not cleaned_url:
            if slug:
                cleaned_url = f"https://www.myscheme.gov.in/schemes/{slug}"
            else:
                cleaned_url = "https://www.myscheme.gov.in/search"
            stats["fallback_slug_url"] += 1
            status = "Fallback Slug URL"

        # Attach clean url to basicDetails
        if isinstance(bd, dict):
            bd["cleanedOfficialUrl"] = cleaned_url
            bd["urlStatus"] = status

        cleaned_data.append(item)

    print("\n" + "=" * 50)
    print("           URL NORMALIZATION & DATASET REPORT           ")
    print("=" * 50)
    print(f"Total Schemes Processed        : {stats['total_schemes']}")
    print(f"Valid Original URLs            : {stats['valid_original_url']}")
    print(f"Fixed Automatically (Protocol/Text): {stats['fixed_automatically']}")
    print(f"Extracted from Process Text    : {stats['extracted_from_process_text']}")
    print(f"Fallback to Specific Slug Page : {stats['fallback_slug_url']}")
    print(f"Multi-URLs Jammed (Split)      : {stats['multi_urls_split']}")
    print(f"Email Addresses Filtered Out   : {stats['emails_rejected']}")
    print("=" * 50)

    # Save cleaned JSON
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, indent=2)

    print(f"\nCleaned dataset exported to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
