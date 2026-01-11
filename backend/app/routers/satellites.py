"""
Satellite data endpoints
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.services.cache import cache, SatelliteData

router = APIRouter()


class SatelliteResponse(BaseModel):
    """Satellite response model"""
    norad_id: int
    name: str
    line1: str
    line2: str
    satellite_type: str
    altitude: Optional[float] = None
    inclination: Optional[float] = None
    eccentricity: Optional[float] = None
    period: Optional[float] = None
    
    class Config:
        from_attributes = True


class SatelliteListResponse(BaseModel):
    """List of satellites response"""
    satellites: List[SatelliteResponse]
    total: int
    timestamp: datetime


@router.get("/", response_model=SatelliteListResponse)
async def get_satellites(
    limit: int = Query(1000, ge=1, le=20000),
    offset: int = Query(0, ge=0),
    type: Optional[str] = Query(None, description="Filter by type: satellite, station, debris, rocket-body"),
    min_altitude: Optional[float] = Query(None, ge=0),
    max_altitude: Optional[float] = Query(None, le=50000),
):
    """Get list of satellites with optional filtering"""
    
    satellites = cache.filter_satellites(
        sat_type=type,
        min_altitude=min_altitude,
        max_altitude=max_altitude,
        limit=limit + offset,
    )
    
    # Apply offset
    satellites = satellites[offset:offset + limit]
    
    return SatelliteListResponse(
        satellites=[SatelliteResponse(**vars(sat)) for sat in satellites],
        total=len(cache.satellites),
        timestamp=datetime.utcnow(),
    )


@router.get("/search")
async def search_satellites(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(50, ge=1, le=200),
):
    """Search satellites by name or NORAD ID"""
    
    satellites = cache.search_satellites(q, limit=limit)
    
    return {
        "query": q,
        "results": [SatelliteResponse(**vars(sat)) for sat in satellites],
        "count": len(satellites),
    }


@router.get("/{norad_id}", response_model=SatelliteResponse)
async def get_satellite(norad_id: int):
    """Get satellite by NORAD ID"""
    
    satellite = cache.get_satellite(norad_id)
    
    if not satellite:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not found")
    
    return SatelliteResponse(**vars(satellite))


@router.get("/{norad_id}/tle")
async def get_satellite_tle(norad_id: int):
    """Get raw TLE data for a satellite"""
    
    satellite = cache.get_satellite(norad_id)
    
    if not satellite:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not found")
    
    return {
        "norad_id": norad_id,
        "name": satellite.name,
        "tle": f"{satellite.name}\n{satellite.line1}\n{satellite.line2}",
        "line1": satellite.line1,
        "line2": satellite.line2,
    }


@router.get("/tle/all")
async def get_all_tle():
    """
    Get ALL TLE data for frontend visualization.
    Returns compact format optimized for bulk loading.
    """
    satellites = cache.get_all_satellites()
    
    # Return compact TLE format for efficient transfer
    tle_data = []
    for sat in satellites:
        tle_data.append({
            "n": sat.name,  # name (shortened key)
            "id": sat.norad_id,
            "l1": sat.line1,
            "l2": sat.line2,
            "t": sat.satellite_type,
        })
    
    return {
        "count": len(tle_data),
        "timestamp": datetime.utcnow().isoformat(),
        "last_update": cache.last_update.isoformat() if cache.last_update else None,
        "satellites": tle_data,
    }


@router.get("/tle/categories")
async def get_tle_by_category():
    """
    Get TLE data organized by category for chunked loading.
    Frontend can load critical satellites first, then bulk.
    """
    satellites = cache.get_all_satellites()
    
    categories = {
        "stations": [],      # Space stations (highest priority)
        "special": [],       # Hubble, etc.
        "gps": [],           # Navigation
        "starlink": [],      # Starlink constellation
        "oneweb": [],        # OneWeb constellation
        "iridium": [],       # Iridium constellation
        "other_active": [],  # Other active satellites
        "debris": [],        # Debris
        "rocket_bodies": [], # Rocket bodies
    }
    
    for sat in satellites:
        name_upper = sat.name.upper()
        entry = {
            "n": sat.name,
            "id": sat.norad_id,
            "l1": sat.line1,
            "l2": sat.line2,
            "t": sat.satellite_type,
        }
        
        if sat.satellite_type == "station" or "ISS" in name_upper or "TIANGONG" in name_upper or "CSS" in name_upper:
            categories["stations"].append(entry)
        elif "HUBBLE" in name_upper or "HST" in name_upper:
            categories["special"].append(entry)
        elif "GPS" in name_upper or "NAVSTAR" in name_upper:
            categories["gps"].append(entry)
        elif "STARLINK" in name_upper:
            categories["starlink"].append(entry)
        elif "ONEWEB" in name_upper:
            categories["oneweb"].append(entry)
        elif "IRIDIUM" in name_upper:
            categories["iridium"].append(entry)
        elif sat.satellite_type == "debris":
            categories["debris"].append(entry)
        elif sat.satellite_type == "rocket-body":
            categories["rocket_bodies"].append(entry)
        else:
            categories["other_active"].append(entry)
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "last_update": cache.last_update.isoformat() if cache.last_update else None,
        "categories": {k: {"count": len(v), "satellites": v} for k, v in categories.items()},
        "total": len(satellites),
    }


@router.get("/stats/summary")
async def get_stats():
    """Get satellite statistics"""
    
    satellites = cache.get_all_satellites()
    
    stats = {
        "total": len(satellites),
        "by_type": {},
        "by_altitude": {
            "leo": 0,  # < 2000 km
            "meo": 0,  # 2000-35786 km
            "geo": 0,  # ~35786 km
            "heo": 0,  # > 35786 km
        }
    }
    
    for sat in satellites:
        # Count by type
        sat_type = sat.satellite_type or "unknown"
        stats["by_type"][sat_type] = stats["by_type"].get(sat_type, 0) + 1
        
        # Count by altitude
        if sat.altitude is not None:
            if sat.altitude < 2000:
                stats["by_altitude"]["leo"] += 1
            elif sat.altitude < 35786:
                stats["by_altitude"]["meo"] += 1
            elif sat.altitude < 36500:
                stats["by_altitude"]["geo"] += 1
            else:
                stats["by_altitude"]["heo"] += 1
    
    stats["last_update"] = cache.last_update.isoformat() if cache.last_update else None
    
    return stats
