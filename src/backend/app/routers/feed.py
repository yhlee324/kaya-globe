from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db import SessionLocal, FeedItem

router = APIRouter()

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Define your endpoint to get feed items
@router.get("/feed_items", response_model=List[FeedItem])
def get_feed_items(db: Session = Depends(get_db)):
    try:
        items = db.query(FeedItem).all()
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
