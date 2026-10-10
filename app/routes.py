from flask import current_app, render_template, jsonify, request
from app.scramble import ScrambleGenerator
import logging

# Configure logger
logger = logging.getLogger(__name__)

@current_app.route('/')
def index():
    """Render main application page"""
    return render_template('index.html')

@current_app.route('/api/scramble', methods=['GET'])
def get_scramble():
    """
    Generate a random scramble
    Query params:
        type: cube type (2x2x2, 3x3x3, 4x4x4) - default: 3x3x3
    """
    cube_type = request.args.get('type', '3x3x3')

    # Validate cube type
    valid_types = ['2x2x2', '3x3x3', '4x4x4']
    if cube_type not in valid_types:
        return jsonify({
            'success': False,
            'error': 'Invalid cube type. Must be one of: 2x2x2, 3x3x3, 4x4x4'
        }), 400

    try:
        scramble = ScrambleGenerator.generate(cube_type)
        return jsonify({
            'success': True,
            'scramble': scramble,
            'cube_type': cube_type
        })
    except Exception as e:
        # Log the actual error for debugging
        logger.error(f"Scramble generation error for {cube_type}: {str(e)}", exc_info=True)
        # Return generic error to client
        return jsonify({
            'success': False,
            'error': 'Failed to generate scramble. Please try again.'
        }), 500

@current_app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Cyber Cube Timer API'
    })
