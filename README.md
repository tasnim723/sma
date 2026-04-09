FRONTEND :
cd frontend
npm install
nom run dev

backend : 

cd backend
python seed.py
uvicorn main:app --reload 
