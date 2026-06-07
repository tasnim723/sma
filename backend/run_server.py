import uvicorn
from main import app

if __name__ == "__main__":
    # reload=False keeps the server stable — file changes won't kill the worker
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
