from fastapi import HTTPException, APIRouter
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import requests

router = APIRouter()

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

try:
    client = MongoClient(MONGODB_URI)
    db = client['Order_Table']
    collection = db['test2']
    new_collection = db['unique_contractors']
except Exception as e:
    raise Exception(f"Error connecting to MongoDB: {str(e)}")

def get_coordinates(company_name):
    escaped_company_name = requests.utils.quote(company_name)
    url = f"https://maps.googleapis.com/maps/api/geocode/json?address={escaped_company_name}&key={GOOGLE_API_KEY}"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        if data['status'] == 'OK' and 'results' in data and len(data['results']) > 0:
            location = data['results'][0]['geometry']['location']
            return location['lat'], location['lng']
        else:
            raise HTTPException(status_code=400, detail=f"No results for {company_name}")
    else:
        raise HTTPException(status_code=400, detail=f"Error fetching coordinates for {company_name}")

@router.post("/create-unique-contractors/")
async def create_unique_contractors():
    contractors = collection.distinct("responsible_contractor")
    new_data = []
    for contractor in contractors:
        doc = collection.find_one({"responsible_contractor": contractor})
        if doc:
            try:
                lat, lng = get_coordinates(contractor)
                new_data.append({
                    "contractor_name": contractor,
                    "latitude": lat,
                    "longitude": lng,
                    "item": doc.get("name"),
                    "submittal_number": doc.get("submittal_number"),
                    "lead_time": doc.get("lead_time"),
                })
            except HTTPException as e:
                print(f"Skipping {contractor}: {e.detail}")
            except Exception as e:
                print(f"Skipping {contractor}: {str(e)}")
    if new_data:
        new_collection.insert_many(new_data)
    return {"inserted_count": len(new_data)}
