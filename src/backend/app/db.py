from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://user:password@localhost/dbname"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# FeedItem model
class FeedItem(Base):
    __tablename__ = "feed_items"

    _id = Column(Integer, primary_key=True, index=True)
    item = Column(String)
    created_at = Column(DateTime)
    contractor_name = Column(String)
    lead_time = Column(Integer)
    status = Column(String)
    submittal_number = Column(String)
