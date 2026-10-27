"""
Entry point to run the Warehouse Management System application.

Usage:
    python run.py
    
Or with uvicorn:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
import os
import uvicorn

if __name__ == "__main__":
    # Get environment variables
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("RELOAD", "True").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info")
    
    # Run Uvicorn server
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level
    )
