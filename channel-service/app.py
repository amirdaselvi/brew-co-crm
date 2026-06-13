"""
Channel Service — Stubbed messaging delivery simulator.

Receives send requests from the CRM, simulates delivery lifecycle,
and calls back the CRM with status updates (delivered/read/clicked/failed).
"""
import threading
import time
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests as http_requests
from simulator import simulate_outcome

app = Flask(__name__)
CORS(app)

# Track active simulations
active_simulations = {}
stats = {
    'total_received': 0,
    'total_callbacks_sent': 0,
    'total_callbacks_failed': 0,
}


def send_callback(callback_url, comm_id, status, failure_reason=None, retry_count=0, max_retries=3):
    """Send a status callback to the CRM with retry logic."""
    payload = {
        'id': comm_id,
        'status': status,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }
    if failure_reason:
        payload['failure_reason'] = failure_reason

    try:
        response = http_requests.post(callback_url, json=payload, timeout=10)
        if response.status_code in (200, 201):
            stats['total_callbacks_sent'] += 1
            return True
        else:
            raise Exception(f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        if retry_count < max_retries:
            # Exponential backoff: 1s, 2s, 4s
            backoff = 2 ** retry_count
            print(f"  ⚠ Callback failed for {comm_id} ({status}), retrying in {backoff}s... [{e}]")
            time.sleep(backoff)
            return send_callback(callback_url, comm_id, status, failure_reason, retry_count + 1, max_retries)
        else:
            print(f"  ✗ Callback permanently failed for {comm_id} ({status}) after {max_retries} retries: {e}")
            stats['total_callbacks_failed'] += 1
            return False


def process_message(comm_id, channel, callback_url):
    """Simulate the delivery lifecycle for a single message in a background thread."""
    events = simulate_outcome(channel)

    for event in events:
        # Wait the simulated delay
        time.sleep(event['delay'])

        # Send callback to CRM
        send_callback(
            callback_url,
            comm_id,
            event['status'],
            event.get('failure_reason'),
        )

    # Remove from active simulations
    active_simulations.pop(comm_id, None)


@app.route('/channel/send', methods=['POST'])
def receive_send_request():
    """
    Receive a send request from the CRM.
    Immediately acknowledges, then processes asynchronously.
    """
    data = request.get_json()

    comm_id = data.get('id')
    channel = data.get('channel', 'email')
    callback_url = data.get('callback_url')

    if not comm_id or not callback_url:
        return jsonify({'error': 'Missing id or callback_url'}), 400

    stats['total_received'] += 1

    # Process in background thread
    thread = threading.Thread(
        target=process_message,
        args=(comm_id, channel, callback_url),
        daemon=True,
    )
    active_simulations[comm_id] = {
        'channel': channel,
        'started_at': datetime.now(timezone.utc).isoformat(),
    }
    thread.start()

    return jsonify({
        'message': 'Accepted for delivery',
        'id': comm_id,
        'channel': channel,
    }), 202


@app.route('/channel/status', methods=['GET'])
def service_status():
    """Health check and stats."""
    return jsonify({
        'status': 'ok',
        'service': 'channel-service',
        'active_simulations': len(active_simulations),
        'stats': stats,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


if __name__ == '__main__':
    print("🚀 Channel Service starting on port 5001...")
    app.run(debug=True, port=5001)
