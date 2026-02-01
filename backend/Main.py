from fastapi import FastAPI
from pymongo import MongoClient
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 1. Разрешаем React (localhost:5173) обращаться к Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Подключение к MongoDB
# Подключение к локальной MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["my_diploma_db"]
collection = db["items"]

# Перевірка підключення
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

@app.get("/")
def read_root():
    return {"status": "Backend is running"}

@app.get("/data")
def get_data():
    data = list(collection.find({}, {"_id": 0})) 
    return data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)