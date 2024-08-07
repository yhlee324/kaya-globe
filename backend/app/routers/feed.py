from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.db import get_db 
from ..db.models import FeedItem 
from pydantic import BaseModel, Field

router = APIRouter()

# Pydantic model for response validation
class FeedItemResponse(BaseModel):
    id: str
    spec_description: str = Field(default="No description provided")
    date_last_updated: str = Field(default="2024-07-23T12:00:00Z")
    responsible_contractor: str = Field(default="Unknown Contractor")
    lead_time: int = Field(default=0)
    procurement_status: str = Field(default="Unknown Status")
    submittal_number: str = Field(default="N/A")

    class Config:
        orm_mode = True

# GET /feed_items
@router.get("/feed_items", response_model=List[FeedItemResponse])
def get_feed_items(db: Session = Depends(get_db), last_updated: Optional[str] = None):
    try:
        query = db.query(FeedItem).order_by(FeedItem.date_last_updated.desc())

        if last_updated:
            query = query.filter(FeedItem.date_last_updated > last_updated)

        items = query.limit(100).all()

        feed_items = [
            {
                "id": item.id,
                "spec_description": item.spec_description or "No description provided",
                "date_last_updated": item.date_last_updated or "2024-07-23T12:00:00Z",
                "responsible_contractor": item.responsible_contractor or "Unknown Contractor",
                "lead_time": item.lead_time or 10,
                "procurement_status": item.procurement_status or "Unknown Status",
                "submittal_number": item.submittal_number or "N/A"
            }
            for item in items
        ]

        return feed_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
