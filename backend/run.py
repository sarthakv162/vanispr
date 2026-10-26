"""
Entry point to run the VaniSPR FastAPI server
Supports local development and cloud deployment (Render, Railway, Fly.io)
"""
import os
import sys
import uvicorn

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    is_dev = os.environ.get("ENV", "development").lower() == "development" and port == 8000
    uvicorn.run("app.main:app", host=host, port=port, reload=is_dev)
