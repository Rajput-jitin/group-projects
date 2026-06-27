# Database Migrations (Alembic)

For production deployments, use Alembic to manage schema changes safely.

## Setup (one-time)

```bash
# Install Alembic
pip install alembic

# Initialize Alembic in the project
alembic init alembic
```

This creates:
```
alembic/
├── versions/       # Migration files (one per change)
├── env.py          # Alembic config
├── script.py.mako  # Migration template
└── alembic.ini     # Alembic settings
```

## Configuration

Edit `alembic.ini`:
```ini
sqlalchemy.url = driver://user:password@localhost/dbname
```

Or set `SQLALCHEMY_DATABASE_URL` as an env var and use it in `env.py`:
```python
import os
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))
```

## Workflow

### 1. Create a migration
After modifying models (e.g., add a column to User):

```bash
alembic revision --autogenerate -m "Add phone_number to User"
```

This generates `alembic/versions/001_add_phone_number_to_user.py` with up/down migrations.

### 2. Review the migration
Always review the generated migration:
```python
def upgrade():
    op.add_column('users', sa.Column('phone_number', sa.String(15)))

def downgrade():
    op.drop_column('users', 'phone_number')
```

### 3. Apply the migration
```bash
alembic upgrade head  # Apply all pending migrations
alembic upgrade +1    # Apply next migration only
```

### 4. Rollback (if needed)
```bash
alembic downgrade -1  # Rollback last migration
alembic downgrade base  # Rollback all migrations
```

## Migration Checklist

- ✅ Models updated in `app/models/`
- ✅ Migration generated with `alembic revision --autogenerate -m "description"`
- ✅ Review generated migration file for correctness
- ✅ Test locally: `alembic upgrade head`
- ✅ Test downgrade: `alembic downgrade -1 && alembic upgrade head`
- ✅ Commit migration file to Git
- ✅ Deploy to production and run `alembic upgrade head` as part of deploy script

## Common Commands

```bash
alembic current              # Show current migration level
alembic history              # Show all migrations
alembic branches             # Show branch points
alembic merge -m "message"   # Merge divergent branches
```

## Example: Add a column

```python
# In app/models/user.py
class User(Base):
    ...
    phone_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

```bash
alembic revision --autogenerate -m "Add phone_verified_at to User"
```

Generated migration:
```python
def upgrade():
    op.add_column('users', sa.Column('phone_verified_at', sa.DateTime(timezone=True), nullable=True))

def downgrade():
    op.drop_column('users', 'phone_verified_at')
```

```bash
alembic upgrade head
```

## Production Deployment

In your CI/CD pipeline (GitHub Actions, Render, Railway, etc.):

```bash
#!/bin/bash
set -e

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Example GitHub Actions workflow:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.10
      - run: pip install -r requirements.txt
      - run: alembic upgrade head
      - run: uvicorn main:app  # Or deploy to Render/Railway
```

## Tips

1. **Always test migrations locally first** on a copy of production data
2. **Write data migration scripts** for complex transforms (not just schema changes)
3. **Keep migrations small** — one logical change per migration
4. **Use descriptive names** — `001_add_email_verified_flag.py` not `001_.py`
5. **Commit migrations to version control** — they're part of your code
6. **Never edit a deployed migration** — create a new one to fix it

## Alembic docs
https://alembic.sqlalchemy.org/
