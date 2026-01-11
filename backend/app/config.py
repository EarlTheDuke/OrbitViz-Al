"""
Configuration settings for OrbitViz AI Backend
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # App settings
    app_name: str = "OrbitViz AI"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS settings
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Data sources
    celestrak_base_url: str = "https://celestrak.org/NORAD/elements/gp.php"
    
    # Cache settings
    cache_ttl_seconds: int = 600  # 10 minutes
    
    # Prediction settings
    prediction_horizon_hours: int = 24
    conjunction_threshold_km: float = 25.0
    
    # ML Model paths
    collision_model_path: str = "models/collision_model.joblib"
    reentry_model_path: str = "models/reentry_model.joblib"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
