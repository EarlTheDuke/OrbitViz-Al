"""
In-memory cache for satellite data
"""

from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field
import threading


@dataclass
class SatelliteData:
    """Satellite data structure"""
    norad_id: int
    name: str
    line1: str
    line2: str
    satellite_type: str = "satellite"
    altitude: Optional[float] = None
    inclination: Optional[float] = None
    eccentricity: Optional[float] = None
    period: Optional[float] = None


@dataclass
class CacheStore:
    """Thread-safe cache store"""
    satellites: Dict[int, SatelliteData] = field(default_factory=dict)
    last_update: Optional[datetime] = None
    _lock: threading.Lock = field(default_factory=threading.Lock)
    
    def update_satellites(self, satellites: List[SatelliteData]):
        """Update satellite cache"""
        with self._lock:
            self.satellites = {sat.norad_id: sat for sat in satellites}
            self.last_update = datetime.utcnow()
    
    def get_satellite(self, norad_id: int) -> Optional[SatelliteData]:
        """Get satellite by NORAD ID"""
        return self.satellites.get(norad_id)
    
    def get_all_satellites(self) -> List[SatelliteData]:
        """Get all satellites"""
        return list(self.satellites.values())
    
    def search_satellites(self, query: str, limit: int = 100) -> List[SatelliteData]:
        """Search satellites by name or NORAD ID"""
        query = query.lower()
        results = []
        
        for sat in self.satellites.values():
            if (query in sat.name.lower() or 
                query in str(sat.norad_id)):
                results.append(sat)
                if len(results) >= limit:
                    break
        
        return results
    
    def filter_satellites(
        self,
        sat_type: Optional[str] = None,
        min_altitude: Optional[float] = None,
        max_altitude: Optional[float] = None,
        limit: int = 1000
    ) -> List[SatelliteData]:
        """Filter satellites by criteria"""
        results = []
        
        for sat in self.satellites.values():
            # Type filter
            if sat_type and sat_type != "all" and sat.satellite_type != sat_type:
                continue
            
            # Altitude filter
            if sat.altitude is not None:
                if min_altitude is not None and sat.altitude < min_altitude:
                    continue
                if max_altitude is not None and sat.altitude > max_altitude:
                    continue
            
            results.append(sat)
            if len(results) >= limit:
                break
        
        return results


# Global cache instance
cache = CacheStore()
