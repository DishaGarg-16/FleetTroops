# Multi-Stage Dockerfile for Zero-Cost Hosting (e.g. Render, Hugging Face Spaces, Railway)
# Stage 1: Build the React 18 Frontend via Rsbuild (Pure JS/WASM - No blocked native binaries)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Serve Python 3.12 FastAPI backend + Mount Static Frontend Assets
FROM python:3.12-slim AS final
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for ultra-fast dependency installation
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy backend requirements and install into system Python
COPY backend/requirements.txt ./backend/
RUN uv pip install --system --no-cache -r backend/requirements.txt greenlet

# Copy backend application source
COPY backend/ ./backend/

# Copy built frontend static files from Stage 1 into backend static directory
COPY --from=frontend-builder /app/frontend/dist /app/backend/static

# Create uploads directory
RUN mkdir -p /app/backend/uploads

WORKDIR /app/backend

# Seed database on build / startup
RUN python -m app.core.seed

EXPOSE 8000

# Start FastAPI serving both API routes and static frontend
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

