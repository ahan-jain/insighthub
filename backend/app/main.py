from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title = "InsightHub")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """
    Health check endpoint.
    Returns: JSON response
    """
    return {"status": "healthy", "service": "insight-hub"}
@app.get("/")
def root():
    return {"message": "InsightHub v1.0"}