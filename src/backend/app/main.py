from fastapi import FastAPI
from app.routers import geocode, feed

app = FastAPI()

# routers
app.include_router(geocode.router)
app.include_router(feed.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
