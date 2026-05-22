# ml_service/Dockerfile

# Slim Python image — no unnecessary tools, keeps the image lightweight
FROM python:3.12-slim

WORKDIR /app

# Install Flask as the web framework, Gunicorn as the production WSGI server
# and NumPy for the AI model computations
RUN pip install --no-cache-dir flask==3.0.0 gunicorn==21.2.0 numpy==1.26.4

# Copy the application entry point and the pre-trained model files
COPY app.py .
COPY train/ ./train/

# Expose the ML service port — internal only, not accessible from outside Docker
EXPOSE 5000

# Start the app with Gunicorn using 2 worker processes
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]