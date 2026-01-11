"""
Collision and re-entry analysis endpoints
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import math
import random

from sgp4.api import Satrec, jday

from app.services.cache import cache
from app.config import settings

router = APIRouter()


class ConjunctionEvent(BaseModel):
    """Conjunction (close approach) event"""
    satellite1_id: int
    satellite1_name: str
    satellite2_id: int
    satellite2_name: str
    distance_km: float
    time: datetime
    risk_level: str
    collision_probability: float


class CollisionAnalysisResponse(BaseModel):
    """Collision analysis response"""
    satellite_id: int
    satellite_name: str
    analysis_period_hours: int
    conjunctions: List[ConjunctionEvent]
    risk_summary: dict


class ReentryPrediction(BaseModel):
    """Re-entry prediction model"""
    satellite_id: int
    satellite_name: str
    current_altitude_km: float
    decay_rate_km_per_day: float
    predicted_reentry_date: Optional[datetime]
    confidence: str
    factors: dict


def get_risk_level(distance_km: float) -> str:
    """Determine risk level based on distance"""
    if distance_km < 1:
        return "critical"
    if distance_km < 5:
        return "high"
    if distance_km < 10:
        return "moderate"
    if distance_km < 25:
        return "low"
    return "safe"


def calculate_collision_probability(distance_km: float, relative_velocity: float = 10) -> float:
    """Calculate collision probability (simplified model)"""
    # This is a simplified model. Real collision probability
    # calculations use covariance matrices and are much more complex.
    
    if distance_km < 1:
        base_prob = 0.5 + 0.4 * (1 - distance_km)
    elif distance_km < 5:
        base_prob = 0.1 + 0.4 * (5 - distance_km) / 4
    elif distance_km < 10:
        base_prob = 0.01 + 0.09 * (10 - distance_km) / 5
    elif distance_km < 25:
        base_prob = 0.001 + 0.009 * (25 - distance_km) / 15
    else:
        base_prob = 0.0001
    
    # Adjust for relative velocity
    velocity_factor = min(relative_velocity / 10, 2.0)
    
    return min(base_prob * velocity_factor, 0.99)


def propagate_position(satrec: Satrec, dt: datetime) -> tuple:
    """Propagate satellite to position at datetime"""
    jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)
    e, r, v = satrec.sgp4(jd, fr)
    if e != 0:
        return None, None
    return r, v


def calculate_distance(pos1: tuple, pos2: tuple) -> float:
    """Calculate distance between two positions in km"""
    if pos1 is None or pos2 is None:
        return float('inf')
    dx = pos1[0] - pos2[0]
    dy = pos1[1] - pos2[1]
    dz = pos1[2] - pos2[2]
    return math.sqrt(dx**2 + dy**2 + dz**2)


@router.get("/conjunctions/{norad_id}", response_model=CollisionAnalysisResponse)
async def analyze_conjunctions(
    norad_id: int,
    hours: int = Query(24, ge=1, le=168, description="Analysis period in hours"),
    threshold_km: float = Query(25, ge=1, le=100, description="Distance threshold in km"),
    limit: int = Query(20, ge=1, le=100),
):
    """Analyze potential conjunctions for a satellite"""
    
    target = cache.get_satellite(norad_id)
    if not target:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not found")
    
    try:
        target_satrec = Satrec.twoline2rv(target.line1, target.line2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse TLE: {e}")
    
    # Get candidates at similar altitudes
    candidates = []
    for sat in cache.get_all_satellites():
        if sat.norad_id == norad_id:
            continue
        if sat.altitude is None or target.altitude is None:
            continue
        if abs(sat.altitude - target.altitude) < 100:  # Within 100 km altitude
            try:
                satrec = Satrec.twoline2rv(sat.line1, sat.line2)
                candidates.append((sat, satrec))
            except:
                continue
    
    # Limit candidates for performance
    candidates = candidates[:500]
    
    # Time parameters
    now = datetime.utcnow()
    time_step = timedelta(minutes=5)
    steps = int(hours * 60 / 5)
    
    conjunctions = []
    
    for candidate, cand_satrec in candidates:
        min_distance = float('inf')
        min_distance_time = None
        
        for i in range(steps):
            dt = now + time_step * i
            
            target_pos, target_vel = propagate_position(target_satrec, dt)
            cand_pos, cand_vel = propagate_position(cand_satrec, dt)
            
            distance = calculate_distance(target_pos, cand_pos)
            
            if distance < min_distance:
                min_distance = distance
                min_distance_time = dt
        
        if min_distance <= threshold_km:
            conjunctions.append(ConjunctionEvent(
                satellite1_id=norad_id,
                satellite1_name=target.name,
                satellite2_id=candidate.norad_id,
                satellite2_name=candidate.name,
                distance_km=round(min_distance, 3),
                time=min_distance_time,
                risk_level=get_risk_level(min_distance),
                collision_probability=round(calculate_collision_probability(min_distance), 6),
            ))
    
    # Sort by distance
    conjunctions.sort(key=lambda x: x.distance_km)
    conjunctions = conjunctions[:limit]
    
    # Risk summary
    risk_summary = {
        "critical": sum(1 for c in conjunctions if c.risk_level == "critical"),
        "high": sum(1 for c in conjunctions if c.risk_level == "high"),
        "moderate": sum(1 for c in conjunctions if c.risk_level == "moderate"),
        "low": sum(1 for c in conjunctions if c.risk_level == "low"),
        "total_analyzed": len(candidates),
    }
    
    return CollisionAnalysisResponse(
        satellite_id=norad_id,
        satellite_name=target.name,
        analysis_period_hours=hours,
        conjunctions=conjunctions,
        risk_summary=risk_summary,
    )


@router.get("/reentry/{norad_id}", response_model=ReentryPrediction)
async def predict_reentry(norad_id: int):
    """Predict re-entry for a satellite based on orbital decay"""
    
    satellite = cache.get_satellite(norad_id)
    if not satellite:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not found")
    
    altitude = satellite.altitude or 0
    
    # Check if satellite is in a decaying orbit
    if altitude > 1000:
        return ReentryPrediction(
            satellite_id=norad_id,
            satellite_name=satellite.name,
            current_altitude_km=altitude,
            decay_rate_km_per_day=0,
            predicted_reentry_date=None,
            confidence="N/A",
            factors={
                "reason": "Satellite is in stable orbit above atmospheric drag region",
                "altitude_threshold_km": 1000,
            }
        )
    
    # Simplified decay model
    # Real models use atmospheric density models (NRLMSISE-00, etc.)
    # and solar activity indices (F10.7, Ap, etc.)
    
    # Base decay rate depends on altitude
    if altitude < 200:
        base_decay = 20 + random.uniform(-5, 5)  # km/day
        confidence = "high"
    elif altitude < 300:
        base_decay = 5 + random.uniform(-2, 2)
        confidence = "medium"
    elif altitude < 400:
        base_decay = 1 + random.uniform(-0.5, 0.5)
        confidence = "medium"
    elif altitude < 600:
        base_decay = 0.1 + random.uniform(-0.05, 0.05)
        confidence = "low"
    else:
        base_decay = 0.01 + random.uniform(-0.005, 0.005)
        confidence = "very low"
    
    # Estimate days until reentry (altitude < 80 km)
    if base_decay > 0:
        days_until_reentry = (altitude - 80) / base_decay
        predicted_date = datetime.utcnow() + timedelta(days=days_until_reentry)
    else:
        predicted_date = None
    
    # Solar activity factor (placeholder)
    solar_factor = 1.0 + random.uniform(-0.2, 0.2)
    adjusted_decay = base_decay * solar_factor
    
    return ReentryPrediction(
        satellite_id=norad_id,
        satellite_name=satellite.name,
        current_altitude_km=round(altitude, 1),
        decay_rate_km_per_day=round(adjusted_decay, 4),
        predicted_reentry_date=predicted_date,
        confidence=confidence,
        factors={
            "atmospheric_model": "simplified",
            "solar_activity": "moderate",
            "drag_coefficient": "estimated",
            "note": "This is a simplified prediction. Actual re-entry depends on many factors including solar activity and satellite characteristics."
        }
    )


@router.get("/debris-density")
async def get_debris_density(
    altitude_min: float = Query(200, ge=0),
    altitude_max: float = Query(2000, le=50000),
):
    """Get debris density statistics by altitude"""
    
    satellites = cache.get_all_satellites()
    
    # Group by altitude bands
    bands = {}
    band_size = 100  # km
    
    for sat in satellites:
        if sat.altitude is None:
            continue
        if sat.altitude < altitude_min or sat.altitude > altitude_max:
            continue
        
        band = int(sat.altitude / band_size) * band_size
        if band not in bands:
            bands[band] = {"total": 0, "debris": 0, "satellites": 0, "rocket_bodies": 0}
        
        bands[band]["total"] += 1
        if sat.satellite_type == "debris":
            bands[band]["debris"] += 1
        elif sat.satellite_type == "rocket-body":
            bands[band]["rocket_bodies"] += 1
        else:
            bands[band]["satellites"] += 1
    
    # Calculate density (objects per km^3 shell)
    density_data = []
    for band, counts in sorted(bands.items()):
        # Volume of spherical shell
        r1 = 6371 + band
        r2 = 6371 + band + band_size
        volume = (4/3) * math.pi * (r2**3 - r1**3)
        
        density_data.append({
            "altitude_band_km": f"{band}-{band + band_size}",
            "object_count": counts["total"],
            "debris_count": counts["debris"],
            "satellite_count": counts["satellites"],
            "rocket_body_count": counts["rocket_bodies"],
            "density_per_million_km3": round(counts["total"] / (volume / 1e6), 6),
        })
    
    return {
        "altitude_range": {"min": altitude_min, "max": altitude_max},
        "bands": density_data,
        "total_objects": sum(b["object_count"] for b in density_data),
    }
