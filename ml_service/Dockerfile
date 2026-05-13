FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir flask==3.0.0 gunicorn==21.2.0 numpy==1.26.4

COPY app.py .
COPY train/ ./train/

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
