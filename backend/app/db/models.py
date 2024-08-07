from sqlalchemy import Column, Integer, String, DateTime
from .db import Base

# Define your FeedItem model
class FeedItem(Base):
    __tablename__ = "test1"

    id = Column(String, primary_key=True, index=True)
    spec_description = Column(String, nullable=False)
    date_last_updated = Column(String, nullable=False)
    responsible_contractor = Column(String, nullable=False)
    lead_time = Column(Integer, nullable=False)
    procurement_status = Column(String, nullable=False)
    submittal_number = Column(String, nullable=False)
