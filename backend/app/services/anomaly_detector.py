"""
Anomaly Detection Service for Satellite Orbital Behavior
Uses statistical analysis and ML-inspired algorithms to detect unusual patterns
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import math
import numpy as np
from collections import defaultdict

from sgp4.api import Satrec, jday


@dataclass
class OrbitalState:
    """Represents satellite orbital state at a point in time"""
    timestamp: datetime
    position: Tuple[float, float, float]  # x, y, z in km
    velocity: Tuple[float, float, float]  # vx, vy, vz in km/s
    altitude: float
    speed: float


@dataclass
class AnomalyEvent:
    """Detected anomaly event"""
    norad_id: int
    satellite_name: str
    anomaly_type: str
    severity: str  # low, medium, high, critical
    confidence: float  # 0.0 - 1.0
    detected_at: datetime
    description: str
    details: Dict
    recommended_action: str


class AnomalyDetector:
    """
    Detects anomalies in satellite behavior including:
    - Unexpected orbital maneuvers
    - Altitude changes
    - Velocity anomalies
    - Potential collisions
    - Debris events
    - Communication anomalies (simulated)
    """
    
    # Thresholds for anomaly detection
    ALTITUDE_CHANGE_THRESHOLD_KM = 5.0  # Significant altitude change
    VELOCITY_CHANGE_THRESHOLD_KMS = 0.05  # Significant velocity change
    MANEUVER_DETECTION_THRESHOLD = 0.1  # Delta-v threshold for maneuver
    DEBRIS_PROXIMITY_KM = 10.0  # Close debris approach
    
    def __init__(self):
        self.historical_data: Dict[int, List[OrbitalState]] = defaultdict(list)
        self.anomalies: List[AnomalyEvent] = []
        
    def propagate_state(self, satrec: Satrec, dt: datetime) -> Optional[OrbitalState]:
        """Propagate satellite to get orbital state at given time"""
        try:
            jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, 
                        dt.second + dt.microsecond / 1e6)
            e, r, v = satrec.sgp4(jd, fr)
            
            if e != 0:
                return None
            
            # Calculate derived values
            altitude = math.sqrt(r[0]**2 + r[1]**2 + r[2]**2) - 6371.0
            speed = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
            
            return OrbitalState(
                timestamp=dt,
                position=tuple(r),
                velocity=tuple(v),
                altitude=altitude,
                speed=speed
            )
        except Exception:
            return None
    
    def detect_maneuver(self, norad_id: int, name: str, 
                       states: List[OrbitalState]) -> Optional[AnomalyEvent]:
        """
        Detect potential orbital maneuvers by analyzing velocity changes
        """
        if len(states) < 3:
            return None
        
        for i in range(1, len(states) - 1):
            prev_state = states[i - 1]
            curr_state = states[i]
            next_state = states[i + 1]
            
            # Calculate velocity changes
            dv1 = self._velocity_magnitude(
                curr_state.velocity[0] - prev_state.velocity[0],
                curr_state.velocity[1] - prev_state.velocity[1],
                curr_state.velocity[2] - prev_state.velocity[2]
            )
            
            dv2 = self._velocity_magnitude(
                next_state.velocity[0] - curr_state.velocity[0],
                next_state.velocity[1] - curr_state.velocity[1],
                next_state.velocity[2] - curr_state.velocity[2]
            )
            
            # Sudden velocity change indicates maneuver
            if dv1 > self.MANEUVER_DETECTION_THRESHOLD:
                return AnomalyEvent(
                    norad_id=norad_id,
                    satellite_name=name,
                    anomaly_type="orbital_maneuver",
                    severity="medium",
                    confidence=min(0.95, 0.5 + dv1 * 2),
                    detected_at=curr_state.timestamp,
                    description=f"Potential orbital maneuver detected: Δv ≈ {dv1*1000:.1f} m/s",
                    details={
                        "delta_v_km_s": round(dv1, 4),
                        "delta_v_m_s": round(dv1 * 1000, 2),
                        "altitude_km": round(curr_state.altitude, 2),
                        "pre_maneuver_speed": round(prev_state.speed, 4),
                        "post_maneuver_speed": round(curr_state.speed, 4),
                    },
                    recommended_action="Monitor for follow-up maneuvers. Update tracking parameters."
                )
        
        return None
    
    def detect_altitude_anomaly(self, norad_id: int, name: str,
                               states: List[OrbitalState],
                               expected_altitude: float) -> Optional[AnomalyEvent]:
        """
        Detect unexpected altitude changes
        """
        if not states:
            return None
        
        latest = states[-1]
        altitude_diff = abs(latest.altitude - expected_altitude)
        
        if altitude_diff > self.ALTITUDE_CHANGE_THRESHOLD_KM:
            severity = "low"
            if altitude_diff > 20:
                severity = "medium"
            if altitude_diff > 50:
                severity = "high"
            if altitude_diff > 100:
                severity = "critical"
            
            return AnomalyEvent(
                norad_id=norad_id,
                satellite_name=name,
                anomaly_type="altitude_deviation",
                severity=severity,
                confidence=min(0.95, 0.6 + altitude_diff / 200),
                detected_at=latest.timestamp,
                description=f"Altitude deviation of {altitude_diff:.1f} km from expected",
                details={
                    "expected_altitude_km": round(expected_altitude, 2),
                    "actual_altitude_km": round(latest.altitude, 2),
                    "deviation_km": round(altitude_diff, 2),
                    "deviation_percent": round(altitude_diff / expected_altitude * 100, 2) if expected_altitude > 0 else 0,
                },
                recommended_action="Verify TLE data freshness. Check for recent maneuvers."
            )
        
        return None
    
    def detect_decay_anomaly(self, norad_id: int, name: str,
                            states: List[OrbitalState]) -> Optional[AnomalyEvent]:
        """
        Detect unusual orbital decay patterns
        """
        if len(states) < 2:
            return None
        
        # Calculate decay rate
        first_state = states[0]
        last_state = states[-1]
        
        time_diff_days = (last_state.timestamp - first_state.timestamp).total_seconds() / 86400
        if time_diff_days < 0.01:
            return None
        
        altitude_change = last_state.altitude - first_state.altitude
        decay_rate = altitude_change / time_diff_days  # km/day
        
        # Unusual decay (rapid descent or unexpected climb)
        if decay_rate < -10:  # Rapid decay
            return AnomalyEvent(
                norad_id=norad_id,
                satellite_name=name,
                anomaly_type="rapid_decay",
                severity="high",
                confidence=0.85,
                detected_at=last_state.timestamp,
                description=f"Rapid orbital decay detected: {abs(decay_rate):.1f} km/day",
                details={
                    "decay_rate_km_day": round(decay_rate, 2),
                    "current_altitude_km": round(last_state.altitude, 2),
                    "estimated_days_to_reentry": round(last_state.altitude / abs(decay_rate), 1) if decay_rate != 0 else None,
                },
                recommended_action="Immediate attention required. Potential re-entry imminent."
            )
        elif decay_rate > 0.5:  # Unexpected climb without maneuver
            return AnomalyEvent(
                norad_id=norad_id,
                satellite_name=name,
                anomaly_type="altitude_increase",
                severity="medium",
                confidence=0.75,
                detected_at=last_state.timestamp,
                description=f"Unexpected altitude increase: {decay_rate:.2f} km/day",
                details={
                    "altitude_change_rate_km_day": round(decay_rate, 2),
                    "current_altitude_km": round(last_state.altitude, 2),
                },
                recommended_action="Investigate possible undetected maneuver or tracking error."
            )
        
        return None
    
    def detect_tumbling(self, norad_id: int, name: str,
                       states: List[OrbitalState]) -> Optional[AnomalyEvent]:
        """
        Detect potential tumbling behavior (simulated based on velocity variations)
        """
        if len(states) < 5:
            return None
        
        # Calculate velocity variance
        speeds = [s.speed for s in states]
        mean_speed = sum(speeds) / len(speeds)
        variance = sum((s - mean_speed) ** 2 for s in speeds) / len(speeds)
        std_dev = math.sqrt(variance)
        
        # High variance in speed might indicate tumbling
        coefficient_of_variation = std_dev / mean_speed if mean_speed > 0 else 0
        
        if coefficient_of_variation > 0.001:  # Threshold for potential tumbling
            return AnomalyEvent(
                norad_id=norad_id,
                satellite_name=name,
                anomaly_type="potential_tumbling",
                severity="low",
                confidence=min(0.8, 0.4 + coefficient_of_variation * 100),
                detected_at=states[-1].timestamp,
                description="Velocity variations suggest potential attitude anomaly",
                details={
                    "speed_variance": round(variance, 8),
                    "speed_std_dev": round(std_dev, 6),
                    "coefficient_of_variation": round(coefficient_of_variation, 6),
                    "mean_speed_km_s": round(mean_speed, 4),
                },
                recommended_action="Monitor for attitude-related issues. May affect tracking accuracy."
            )
        
        return None
    
    def analyze_satellite(self, norad_id: int, name: str, 
                         satrec: Satrec, expected_altitude: float,
                         hours_to_analyze: int = 24) -> List[AnomalyEvent]:
        """
        Perform comprehensive anomaly analysis on a satellite
        """
        anomalies = []
        
        # Generate orbital states
        now = datetime.utcnow()
        states = []
        
        # Sample at 10-minute intervals
        for i in range(int(hours_to_analyze * 6)):
            dt = now - timedelta(hours=hours_to_analyze) + timedelta(minutes=i * 10)
            state = self.propagate_state(satrec, dt)
            if state:
                states.append(state)
        
        if not states:
            return anomalies
        
        # Run detection algorithms
        maneuver = self.detect_maneuver(norad_id, name, states)
        if maneuver:
            anomalies.append(maneuver)
        
        altitude_anomaly = self.detect_altitude_anomaly(norad_id, name, states, expected_altitude)
        if altitude_anomaly:
            anomalies.append(altitude_anomaly)
        
        decay_anomaly = self.detect_decay_anomaly(norad_id, name, states)
        if decay_anomaly:
            anomalies.append(decay_anomaly)
        
        tumbling = self.detect_tumbling(norad_id, name, states)
        if tumbling:
            anomalies.append(tumbling)
        
        return anomalies
    
    def _velocity_magnitude(self, vx: float, vy: float, vz: float) -> float:
        """Calculate velocity magnitude"""
        return math.sqrt(vx**2 + vy**2 + vz**2)
    
    def batch_analyze(self, satellites: List[dict], sample_size: int = 100) -> Dict:
        """
        Analyze multiple satellites for anomalies
        Returns summary statistics and top anomalies
        """
        all_anomalies = []
        analyzed_count = 0
        error_count = 0
        
        # Sample satellites for analysis
        import random
        sample = random.sample(satellites, min(sample_size, len(satellites)))
        
        for sat in sample:
            try:
                satrec = Satrec.twoline2rv(sat['line1'], sat['line2'])
                anomalies = self.analyze_satellite(
                    sat['norad_id'],
                    sat['name'],
                    satrec,
                    sat.get('altitude', 400)
                )
                all_anomalies.extend(anomalies)
                analyzed_count += 1
            except Exception as e:
                error_count += 1
                continue
        
        # Sort by severity and confidence
        severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        all_anomalies.sort(key=lambda x: (severity_order.get(x.severity, 4), -x.confidence))
        
        # Group by type
        by_type = defaultdict(int)
        by_severity = defaultdict(int)
        for a in all_anomalies:
            by_type[a.anomaly_type] += 1
            by_severity[a.severity] += 1
        
        return {
            'total_analyzed': analyzed_count,
            'errors': error_count,
            'anomalies_found': len(all_anomalies),
            'by_type': dict(by_type),
            'by_severity': dict(by_severity),
            'top_anomalies': all_anomalies[:20]
        }


# Singleton instance
anomaly_detector = AnomalyDetector()
