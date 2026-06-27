"""
Centralized app configuration, loaded from environment variables / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "SchemeSeva AI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql://schemeseva_user:schemeseva_pass@localhost:5432/schemeseva"

    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: str = "http://localhost:3000"

    UPLOAD_DIR: str = "uploads"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    SMS_PROVIDER_API_KEY: str = ""
    WHATSAPP_PROVIDER_API_KEY: str = ""
    EMAIL_SMTP_HOST: str = ""
    EMAIL_SMTP_USER: str = ""
    EMAIL_SMTP_PASSWORD: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
