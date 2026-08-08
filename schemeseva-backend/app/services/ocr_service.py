"""
OCR service stub.

Defines the interface the documents router calls. Swap the body of
`extract_document_data()` for a real EasyOCR/Tesseract call later —
the router and response shape won't need to change.
"""
from app.models.document import DocumentTypeEnum

# Fields we'd expect to extract per document type, used to compute
# `missing_fields` even before real OCR is wired up.
EXPECTED_FIELDS: dict[DocumentTypeEnum, list[str]] = {
    DocumentTypeEnum.aadhaar_card: ["full_name", "aadhaar_number", "date_of_birth", "address"],
    DocumentTypeEnum.income_certificate: ["full_name", "annual_income", "issuing_authority", "issue_date"],
    DocumentTypeEnum.caste_certificate: ["full_name", "category", "issuing_authority"],
    DocumentTypeEnum.student_id: ["full_name", "institution_name", "course", "student_id_number"],
    DocumentTypeEnum.farmer_card: ["full_name", "land_holding", "registration_number"],
    DocumentTypeEnum.disability_certificate: ["full_name", "disability_type", "disability_percentage"],
    DocumentTypeEnum.ration_card: ["full_name", "family_members", "ration_card_number"],
    DocumentTypeEnum.residence_certificate: ["full_name", "address", "state", "issue_date"],
}


def extract_document_data(document_type: DocumentTypeEnum, file_path: str) -> tuple[dict, list[str]]:
    """
    Returns (extracted_data, missing_fields).

    TODO: replace with real OCR, e.g.:
        import easyocr
        reader = easyocr.Reader(["en", "hi"])
        raw_text = reader.readtext(file_path, detail=0)
        extracted_data = parse_fields(raw_text, document_type)
    """
    expected = EXPECTED_FIELDS.get(document_type, [])
    extracted_data: dict = {}  # left empty until real OCR is implemented
    missing_fields = expected  # everything is "missing" until extracted
    return extracted_data, missing_fields
