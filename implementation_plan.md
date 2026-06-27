# Implementation Plan - Fixing Prediction Engine

The user is reporting that the prediction engine (eligibility check) is not working. Investigation reveals that the backend requires authentication for this feature, while the frontend is public and provides no login flow. Additionally, there are data type mismatches (strings vs. integers) for income and age between the frontend and backend.

## User Review Required

> [!IMPORTANT]
> The eligibility check currently requires a logged-in user in the backend. I propose making this endpoint **public** so users can see matches without registering first. If you'd prefer to keep it private, we would need to implement a full registration/login flow in the frontend.

## Proposed Changes

### Backend: Eligibility API

#### [MODIFY] [eligibility.py](file:///c:/Users/jatin/Downloads/files/schemeseva-backend/schemeseva-backend/app/api/eligibility.py)
- Make `current_user` dependency optional in `check_eligibility`.
- Update `_build_profile` to handle `user=None` by returning `None` instead of accessing user attributes.
- Skip saving `EligibilityCheck` records to the database if the user is not authenticated.

### Frontend: UI and Data Integration

#### [MODIFY] [page.tsx](file:///c:/Users/jatin/Downloads/files/frontend/src/app/page.tsx)
- Add an `INCOME_MAP` to convert user-selected income ranges (e.g., "Below ₹1 Lakh") into numerical values (e.g., `100000`) for the backend.
- Ensure `age` and `annual_income` are sent as integers.
- Handle empty or invalid inputs gracefully to prevent API errors.
- Ensure the `results` state is correctly updated with scheme objects matching the IDs returned by the backend.

## Open Questions

- Should the eligibility results be saved for guest users? (Currently planning to skip saving if not logged in).
- Are there specific income thresholds for the ranges in the dropdown? I will use reasonable defaults (e.g., 1L, 3L, 5L, 8L).

## Verification Plan

### Automated Tests
- Use `curl` to test the updated `/api/eligibility/check` endpoint without an `Authorization` header.
- Verify that it returns a list of scheme matches.

### Manual Verification
- Open `localhost:3000`.
- Fill out the eligibility form.
- Click "Analyze My Eligibility".
- Verify that matching schemes appear in the results section.
