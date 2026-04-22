from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "QSL Card Tracker API"
    secret_key: str = "replace_with_a_long_random_string"
    access_token_expire_minutes: int = 720
    database_url: str = "sqlite:///./qsl.db"
    admin_username: str = "admin"
    admin_password: str = "ChangeMe123!"
    cors_origins: str = "http://localhost:5173"
    cors_origin_regex: str = r"^https?://.*:5173$"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
