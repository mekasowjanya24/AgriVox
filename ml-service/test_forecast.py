import pytest
import json
from app import app


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    res = client.get('/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'ok'


def test_forecast_fallback_less_than_30_points(client):
    # Only 10 points
    series = [
        {'date': f'2026-01-{i+1:02d}', 'price': 2000 + i * 15}
        for i in range(10)
    ]
    res = client.post('/forecast', data=json.dumps({'series': series, 'horizon': 14}), content_type='application/json')
    assert res.status_code == 200
    data = res.get_json()
    assert 'points' in data
    assert len(data['points']) == 14
    assert 'mape' in data
    assert data['mape'] >= 0
    assert data['model'] == 'MovingAverage-7D'
    assert 'lower' in data['points'][0]
    assert 'upper' in data['points'][0]


def test_forecast_full_series(client):
    # 60 points
    import math
    series = [
        {'date': f'2025-{(i//28)+1:02d}-{(i%28)+1:02d}', 'price': round(2200 + 100 * math.sin(i / 5) + i * 2, 2)}
        for i in range(60)
    ]
    res = client.post('/forecast', data=json.dumps({'series': series, 'horizon': 14}), content_type='application/json')
    assert res.status_code == 200
    data = res.get_json()
    assert 'points' in data
    assert len(data['points']) == 14
    assert 'mape' in data
    assert data['mape'] is not None
    assert 'predicted' in data['points'][0]
