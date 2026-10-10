from flask import Flask
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)

    # Configure CORS with appropriate restrictions
    # In development, allow localhost; in production, configure allowed origins
    allowed_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:5000').split(',')

    CORS(app, resources={
        r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST"],
            "allow_headers": ["Content-Type"],
            "max_age": 3600
        }
    })

    # Register routes within app context
    with app.app_context():
        from app import routes

    return app
