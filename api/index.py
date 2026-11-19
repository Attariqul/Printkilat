import os
from app import create_app

# WSGI entry point for Vercel Python Serverless Functions
app = create_app(os.environ.get("FLASK_ENV", "production"))
