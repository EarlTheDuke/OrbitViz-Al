"""
OrbitViz AI - FastAPI Backend
Real-time satellite tracking with AI-powered predictions
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import asyncio

from app.routers import satellites, predictions, analysis, anomaly
from app.services.data_fetcher import DataFetcher
from app.services.cache import cache
from app.services.websocket_manager import connection_manager
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize data fetcher
data_fetcher = DataFetcher()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("🚀 OrbitViz AI Backend starting up...")
    
    # Initial data fetch
    await data_fetcher.fetch_all_tle_data()
    logger.info(f"✅ Loaded {len(cache.satellites)} satellites")
    
    yield
    
    # Shutdown
    logger.info("👋 OrbitViz AI Backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="OrbitViz AI",
    description="Real-time satellite tracking with AI-powered collision detection and orbital predictions",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for HTTP requests
# Note: WebSocket connections don't go through CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "*",  # For development - remove in production
    ],
    allow_credentials=False,  # Changed to False to allow "*" origin
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(satellites.router, prefix="/api/satellites", tags=["Satellites"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(anomaly.router, prefix="/api/anomaly", tags=["Anomaly Detection"])


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "name": "OrbitViz AI",
        "version": "1.0.0",
        "description": "Real-time satellite tracking with AI predictions",
        "endpoints": {
            "satellites": "/api/satellites",
            "predictions": "/api/predictions",
            "analysis": "/api/analysis",
            "docs": "/docs",
        },
        "status": "operational",
        "satellite_count": len(cache.satellites),
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "satellites_loaded": len(cache.satellites),
        "cache_updated": cache.last_update.isoformat() if cache.last_update else None,
    }


@app.post("/api/refresh")
async def refresh_data(background_tasks: BackgroundTasks):
    """Trigger a data refresh"""
    background_tasks.add_task(data_fetcher.fetch_all_tle_data)
    return {"message": "Data refresh started", "status": "pending"}


# ============================================
# WebSocket Endpoints
# ============================================

@app.websocket("/ws/positions")
async def websocket_positions(websocket: WebSocket):
    """
    WebSocket endpoint for real-time satellite position updates.
    
    Messages sent to client:
    - type: "connection" - Initial connection confirmation
    - type: "positions" - Batch of satellite positions
    
    Messages from client:
    - type: "subscribe" - Subscribe to specific satellites (optional)
    - type: "unsubscribe" - Unsubscribe from satellites
    - type: "set_interval" - Change update interval
    """
    # Accept WebSocket connection (CORS is handled differently for WebSockets)
    # We accept all origins for development; in production, validate origin header
    origin = websocket.headers.get("origin", "")
    logger.info(f"WebSocket connection attempt from origin: {origin}")
    
    await connection_manager.connect(websocket)
    
    try:
        while True:
            # Listen for client messages
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=60.0  # Keep-alive timeout
                )
                
                # Handle client commands
                msg_type = data.get("type")
                
                if msg_type == "ping":
                    await connection_manager.send_personal_message(
                        websocket,
                        {"type": "pong", "timestamp": data.get("timestamp")}
                    )
                
                elif msg_type == "set_interval":
                    interval = data.get("interval", 1.0)
                    # Clamp interval between 0.5 and 10 seconds
                    connection_manager.update_interval = max(0.5, min(10.0, float(interval)))
                    await connection_manager.send_personal_message(
                        websocket,
                        {"type": "interval_updated", "interval": connection_manager.update_interval}
                    )
                
                elif msg_type == "get_status":
                    await connection_manager.send_personal_message(
                        websocket,
                        {
                            "type": "status",
                            "connections": len(connection_manager.active_connections),
                            "satellite_count": len(cache.satellites),
                            "update_interval": connection_manager.update_interval,
                            "is_broadcasting": connection_manager.is_broadcasting,
                        }
                    )
                    
            except asyncio.TimeoutError:
                # Send keep-alive ping
                await connection_manager.send_personal_message(
                    websocket,
                    {"type": "ping"}
                )
                
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await connection_manager.disconnect(websocket)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
