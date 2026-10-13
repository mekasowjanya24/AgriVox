import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from forecast import generate_forecast

app = Flask(__name__)
CORS(app)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'agrivox-ml-service'})


@app.route('/forecast', methods=['POST'])
def forecast_route():
    try:
        data = request.get_json(force=True)
        if not data or 'series' not in data:
            return jsonify({'error': 'Missing series in request body'}), 400

        series = data.get('series', [])
        horizon = int(data.get('horizon', 14))

        if not isinstance(series, list) or len(series) == 0:
            return jsonify({'error': 'Series must be a non-empty list of points'}), 400

        result = generate_forecast(series, horizon=horizon)
        return jsonify(result), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': 'Forecasting failed: ' + str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
