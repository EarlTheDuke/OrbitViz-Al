"""
WebSocket manager for real-time satellite position updates
"""

import asyncio
import json
import logging
from typing import Dict, List, Set, Optional
from datetime import datetime
from dataclasses import dataclass
from fastapi import WebSocket, WebSocketDisconnect
from sgp4.api import Satrec, jday
import math

from app.services.cache import cache, SatelliteData

logger = logging.getLogger(__name__)

# Earth radius in km
EARTH_RADIUS_KM = 6371
SCALE_FACTOR = 1 / 1000  # Scale down for Three.js


@dataclass
class SatellitePosition:
    """Satellite position data"""
    norad_id: int
    name: str
    x: float
    y: float
    z: float
    latitude: float
    longitude: float
    altitude: float
    velocity: float
    satellite_type: str


class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.broadcast_task: Optional[asyncio.Task] = None
        self.is_broadcasting = False
        self.update_interval = 1.0  # Seconds between updates
        self.batch_size = 500  # Satellites per batch
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")
        
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "satellite_count": len(cache.satellites),
            "update_interval": self.update_interval,
        })
        
        # Start broadcasting if not already running
        if not self.is_broadcasting:
            self.start_broadcasting()
    
    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"Client disconnected. Total connections: {len(self.active_connections)}")
        
        # Stop broadcasting if no connections
        if len(self.active_connections) == 0:
            self.stop_broadcasting()
    
    def start_broadcasting(self):
        """Start the position broadcast loop"""
        if not self.is_broadcasting:
            self.is_broadcasting = True
            self.broadcast_task = asyncio.create_task(self._broadcast_loop())
            logger.info("Started position broadcasting")
    
    def stop_broadcasting(self):
        """Stop the position broadcast loop"""
        self.is_broadcasting = False
        if self.broadcast_task:
            self.broadcast_task.cancel()
            self.broadcast_task = None
        logger.info("Stopped position broadcasting")
    
    async def _broadcast_loop(self):
        """Main broadcast loop - calculates and sends positions"""
        while self.is_broadcasting:
            try:
                if self.active_connections:
                    # Calculate positions for all satellites
                    positions = await self._calculate_all_positions()
                    
                    # Send in batches to avoid overwhelming clients
                    for i in range(0, len(positions), self.batch_size):
                        batch = positions[i:i + self.batch_size]
                        await self._broadcast({
                            "type": "positions",
                            "timestamp": datetime.utcnow().isoformat(),
                            "batch_index": i // self.batch_size,
                            "total_batches": math.ceil(len(positions) / self.batch_size),
                            "satellites": [self._position_to_dict(p) for p in batch],
                        })
                
                await asyncio.sleep(self.update_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Broadcast error: {e}")
                await asyncio.sleep(1)  # Brief pause on error
    
    async def _broadcast(self, message: dict):
        """Send message to all connected clients"""
        if not self.active_connections:
            return
        
        message_json = json.dumps(message)
        disconnected = set()
        
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected clients
        if disconnected:
            async with self._lock:
                self.active_connections -= disconnected
    
    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """Send message to a specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.warning(f"Failed to send personal message: {e}")
    
    async def _calculate_all_positions(self) -> List[SatellitePosition]:
        """Calculate current positions for all satellites"""
        positions = []
        now = datetime.utcnow()
        jd, fr = jday(now.year, now.month, now.day, 
                     now.hour, now.minute, now.second + now.microsecond / 1e6)
        
        for sat_data in cache.get_all_satellites():
            try:
                pos = self._calculate_position(sat_data, jd, fr)
                if pos:
                    positions.append(pos)
            except Exception as e:
                # Skip satellites with calculation errors
                pass
        
        return positions
    
    def _calculate_position(self, sat: SatelliteData, jd: float, fr: float) -> Optional[SatellitePosition]:
        """Calculate position for a single satellite using SGP4"""
        try:
            # Create SGP4 satellite object
            satrec = Satrec.twoline2rv(sat.line1, sat.line2)
            
            # Propagate to current time
            e, r, v = satrec.sgp4(jd, fr)
            
            if e != 0:  # Propagation error
                return None
            
            # r is position in km (ECI coordinates)
            # v is velocity in km/s
            x_eci, y_eci, z_eci = r
            vx, vy, vz = v
            
            # Convert ECI to ECEF (simplified - ignoring Earth rotation for now)
            # For accurate conversion, we'd need GMST calculation
            gmst = self._calculate_gmst(jd, fr)
            cos_gmst = math.cos(gmst)
            sin_gmst = math.sin(gmst)
            
            x_ecef = x_eci * cos_gmst + y_eci * sin_gmst
            y_ecef = -x_eci * sin_gmst + y_eci * cos_gmst
            z_ecef = z_eci
            
            # Calculate geodetic coordinates
            r_mag = math.sqrt(x_ecef**2 + y_ecef**2 + z_ecef**2)
            latitude = math.degrees(math.asin(z_ecef / r_mag))
            longitude = math.degrees(math.atan2(y_ecef, x_ecef))
            altitude = r_mag - EARTH_RADIUS_KM
            
            # Calculate velocity magnitude
            velocity = math.sqrt(vx**2 + vy**2 + vz**2)
            
            # Scale positions for Three.js (using same scale as frontend)
            scale = EARTH_RADIUS_KM * SCALE_FACTOR
            scaled_radius = (EARTH_RADIUS_KM + altitude) * SCALE_FACTOR
            
            # Convert lat/lng to 3D coordinates (same as frontend)
            lat_rad = math.radians(latitude)
            lng_rad = math.radians(longitude)
            
            x_3d = scaled_radius * math.cos(lat_rad) * math.cos(lng_rad)
            y_3d = scaled_radius * math.sin(lat_rad)
            z_3d = -scaled_radius * math.cos(lat_rad) * math.sin(lng_rad)
            
            return SatellitePosition(
                norad_id=sat.norad_id,
                name=sat.name,
                x=round(x_3d, 6),
                y=round(y_3d, 6),
                z=round(z_3d, 6),
                latitude=round(latitude, 4),
                longitude=round(longitude, 4),
                altitude=round(altitude, 2),
                velocity=round(velocity, 3),
                satellite_type=sat.satellite_type,
            )
            
        except Exception as e:
            return None
    
    def _calculate_gmst(self, jd: float, fr: float) -> float:
        """Calculate Greenwich Mean Sidereal Time in radians"""
        # Julian centuries from J2000.0
        t = ((jd - 2451545.0) + fr) / 36525.0
        
        # GMST in degrees
        gmst_deg = (280.46061837 + 360.98564736629 * ((jd - 2451545.0) + fr) +
                   0.000387933 * t**2 - t**3 / 38710000.0) % 360.0
        
        return math.radians(gmst_deg)
    
    def _position_to_dict(self, pos: SatellitePosition) -> dict:
        """Convert SatellitePosition to dictionary"""
        return {
            "noradId": pos.norad_id,
            "name": pos.name,
            "position": {"x": pos.x, "y": pos.y, "z": pos.z},
            "latitude": pos.latitude,
            "longitude": pos.longitude,
            "altitude": pos.altitude,
            "velocity": pos.velocity,
            "type": pos.satellite_type,
        }


# Global connection manager instance
connection_manager = ConnectionManager()
