FROM python:3.12-slim

WORKDIR /app

# Copy backend requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Expose port
EXPOSE 8080

# Run the application
CMD ["uvicorn", "backend.auth:app", "--host", "0.0.0.0", "--port", "8080"]
