import logging
import os
from sys import prefix
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel, validator
import asyncio
import httpx  # For making async HTTP requests
from typing import Optional

from gitingest import ingest_async
from uvicorn.main import logger

app = FastAPI()

# Enable CORS to allow cross-origin requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


class IngestRequest(BaseModel):
    github_link: str
    max_file_size: int = 10 * 1024 * 1024  # default to 10MB

    @validator('github_link')
    def validate_github_link(cls, v):
        if not v.startswith("https://github.com/"):
            raise ValueError("URL must start with https://github.com/")
        return v


async def fetch_github_content(github_link: str, max_file_size: int) -> dict:
    try:
        summary, tree, content = await ingest_async(source=github_link, max_file_size=max_file_size)
        return {
            "summary": summary,
            "tree": tree,
            "content": content
        }
    except Exception as e:
        logging.error(f"Error fetching content for {github_link}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest repository: {str(e)}")

@app.post("/ingest/")
async def ingest_github_link(ingest_request: IngestRequest) -> dict:
    github_link = ingest_request.github_link
    max_file_size = ingest_request.max_file_size
    logging.info(f"Received ingest request for github_link: {github_link}")
    return await fetch_github_content(github_link, max_file_size)


#  ping endpoint here
@app.api_route("/ping", methods=["GET", "HEAD"])
async def ping():
    return JSONResponse(content={"message": "pong"})

# 🚀 Add this block to start the server (required for Render)
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Render sets PORT dynamically
    uvicorn.run("main:app", host="0.0.0.0", port=port)