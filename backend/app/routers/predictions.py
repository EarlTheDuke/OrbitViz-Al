"""
Orbital prediction endpoints
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import math

from sgp4.api import Satrec, jday
from sgp4.api import WGS72

from app.services.cache import cache

router = APIRouter()

# Earth constants
EARTH_RADIUS_KM = 6371.0
GM = 398600.4418  # km^3/s^2


class PositionResponse(BaseModel):
    """Position at a point in time"""
    timestamp: datetime
    latitude: float
    longitude: float
    altitude: float
    velocity: float
    x: float
    y: float
    z: float


class OrbitPredictionResponse(BaseModel):
    """Orbit prediction response"""
    norad_id: int
    name: str
    positions: List[PositionResponse]
    orbital_period_minutes: float
    

def tle_to_satrec(line1: str, line2: str) -> Satrec:
    """Convert TLE to SGP4 satellite record"""
    return Satrec.twoline2rv(line1, line2)


def propagate_satellite(satrec: Satrec, dt: datetime) -> dict:
    """Propagate satellite position to given datetime"""
    
    # Convert datetime to Julian date
    jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second + dt.microsecond / 1e6)
    
    # Propagate
    e, r, v = satrec.sgp4(jd, fr)
    
    if e != 0:
        return None
    
    # r is position in km (TEME frame), v is velocity in km/s
    x, y, z = r
    vx, vy, vz = v
    
    # Calculate velocity magnitude
    velocity = math.sqrt(vx**2 + vy**2 + vz**2)
    
    # Convert TEME to geodetic (simplified)
    # For accurate conversion, we'd need proper frame transformations
    r_mag = math.sqrt(x**2 + y**2 + z**2)
    altitude = r_mag - EARTH_RADIUS_KM
    
    # Approximate lat/lon
    latitude = math.degrees(math.asin(z / r_mag))
    longitude = math.degrees(math.atan2(y, x))
    
    # Adjust longitude for Earth rotation (simplified)
    gmst = calculate_gmst(jd + fr)
    longitude = (longitude - gmst) % 360
    if longitude > 180:
        longitude -= 360
    
    return {
        "x": x,
        "y": y,
        "z": z,
        "latitude": latitude,
        "longitude": longitude,
        "altitude": altitude,
        "velocity": velocity,
    }


def calculate_gmst(jd: float) -> float:
    """Calculate Greenwich Mean Sidereal Time in degrees"""
    t = (jd - 2451545.0) / 36525.0
    gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + t * t * (0.000387933 - t / 38710000.0)
    return gmst % 360


@router.get("/orbit/{norad_id}", response_model=OrbitPredictionResponse)
async def predict_orbit(
    norad_id: int,
    hours: float = Query(2.0, ge=0.1, le=168, description="Hours to predict ahead"),
    points: int = Query(100, ge=10, le=500, description="Number of points"),
):
    """Predict orbital path for a satellite"""
    
    satellite = cache.get_satellite(norad_id)
    if not satellite:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not found")
    
    # Create SGP4 satellite record
    try:
        satrec = tle_to_satrec(satellite.line1, satellite.line2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse TLE: {e}")
    
    # Generate positions
    now = datetime.utcnow()
    positions = []
    time_step = timedelta(hours=hours) / points
    
    for i in range(points):
        dt = now + time_step * i
        pos = propagate_satellite(satrec, dt)
        
        if pos:
            positions.append(PositionResponse(
                timestamp=dt,
                latitude=pos["latitude"],
                longitude=pos["longitude"],
                altitude=pos["altitude"],
                velocity=pos["velocity"],
                x=pos["x"],
                y=pos["y"],
                z=pos["z"],
            ))
    
    return OrbitPredictionResponse(
        norad_id=norad_id,
        name=satellite.name,
        positions=positions,
        orbital_period_minutes=satellite.period or 0,
    )


@router.get("/position/{norad_id}")
async def get_current_position(norad_id: int):
    """Get current position of a satellite"""
    
    satellite = cache.get_satellite(norad_id)
    if not satellite:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not found")
    
    try:
        satrec = tle_to_satrec(satellite.line1, satellite.line2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse TLE: {e}")
    
    now = datetime.utcnow()
    pos = propagate_satellite(satrec, now)
    
    if not pos:
        raise HTTPException(status_code=500, detail="Failed to propagate satellite position")
    
    return {
        "norad_id": norad_id,
        "name": satellite.name,
        "timestamp": now.isoformat(),
        "position": {
            "latitude": pos["latitude"],
            "longitude": pos["longitude"],
            "altitude": pos["altitude"],
            "velocity": pos["velocity"],
        },
        "eci": {
            "x": pos["x"],
            "y": pos["y"],
            "z": pos["z"],
        }
    }


@router.get("/passes/{norad_id}")
async def get_satellite_passes(
    norad_id: int,
    lat: float = Query(..., ge=-90, le=90, description="Observer latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Observer longitude"),
    hours: float = Query(24, ge=1, le=168, description="Hours to predict"),
    min_elevation: float = Query(10, ge=0, le=90, description="Minimum elevation in degrees"),
):
    """Get visible passes for a satellite from a ground location"""
    
    satellite = cache.get_satellite(norad_id)
    if not satellite:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not found")
    
    try:
        satrec = tle_to_satrec(satellite.line1, satellite.line2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse TLE: {e}")
    
    # Simplified pass prediction
    # For accurate predictions, we'd need proper visibility calculations
    passes = []
    now = datetime.utcnow()
    time_step = timedelta(minutes=1)
    
    in_pass = False
    pass_start = None
    max_elevation = 0
    max_elevation_time = None
    
    for i in range(int(hours * 60)):
        dt = now + time_step * i
        pos = propagate_satellite(satrec, dt)
        
        if pos:
            # Calculate elevation angle (simplified)
            sat_lat = math.radians(pos["latitude"])
            sat_lon = math.radians(pos["longitude"])
            obs_lat = math.radians(lat)
            obs_lon = math.radians(lon)
            
            # Angular distance
            dlon = sat_lon - obs_lon
            cos_angle = (math.sin(obs_lat) * math.sin(sat_lat) + 
                        math.cos(obs_lat) * math.cos(sat_lat) * math.cos(dlon))
            angle = math.degrees(math.acos(max(-1, min(1, cos_angle))))
            
            # Approximate elevation (very simplified)
            elevation = 90 - angle if pos["altitude"] > 100 else 0
            
            if elevation > min_elevation:
                if not in_pass:
                    in_pass = True
                    pass_start = dt
                    max_elevation = elevation
                    max_elevation_time = dt
                elif elevation > max_elevation:
                    max_elevation = elevation
                    max_elevation_time = dt
            else:
                if in_pass:
                    passes.append({
                        "start": pass_start.isoformat(),
                        "end": dt.isoformat(),
                        "max_elevation": round(max_elevation, 1),
                        "max_elevation_time": max_elevation_time.isoformat(),
                        "duration_minutes": (dt - pass_start).total_seconds() / 60,
                    })
                    in_pass = False
                    max_elevation = 0
        
        if len(passes) >= 10:  # Limit to 10 passes
            break
    
    return {
        "norad_id": norad_id,
        "name": satellite.name,
        "observer": {"latitude": lat, "longitude": lon},
        "passes": passes,
        "count": len(passes),
    }
