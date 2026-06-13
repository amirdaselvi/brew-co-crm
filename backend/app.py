"""Xeno CRM — Main Flask Application."""
import json
import uuid
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from models import db, Customer, Order, Segment, Campaign, Communication, CampaignStats
import ai_service
import requests as http_requests


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    CORS(app, origins=app.config.get('CORS_ORIGINS', ['*']))

    with app.app_context():
        db.create_all()
        # Self-healing migration: Add segment_name to campaigns if it doesn't exist
        try:
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            columns = [c['name'] for c in inspector.get_columns('campaigns')]
            if 'segment_name' not in columns:
                db.session.execute(db.text("ALTER TABLE campaigns ADD COLUMN segment_name VARCHAR(200)"))
                db.session.commit()
                print("🔄 Migrated campaigns table: added segment_name column")
        except Exception as e:
            print(f"⚠ Migration failed: {e}")

    return app


app = create_app()


# ─── Health ──────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "xeno-crm", "timestamp": datetime.utcnow().isoformat()})


# ─── Data Seeding ────────────────────────────────────────────────────

@app.route('/api/data/seed', methods=['POST'])
def seed_data():
    from seed_data import seed_database
    customers, orders = seed_database()
    return jsonify({"message": "Database seeded", "customers": customers, "orders": orders})


# ─── Customers ───────────────────────────────────────────────────────

@app.route('/api/customers', methods=['GET'])
def list_customers():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '', type=str)
    city = request.args.get('city', '', type=str)
    age_group = request.args.get('age_group', '', type=str)
    min_spent = request.args.get('min_spent', None, type=float)
    max_spent = request.args.get('max_spent', None, type=float)
    sort_by = request.args.get('sort_by', 'created_at', type=str)
    sort_order = request.args.get('sort_order', 'desc', type=str)

    query = Customer.query

    if search:
        query = query.filter(
            (Customer.name.ilike(f'%{search}%')) |
            (Customer.email.ilike(f'%{search}%'))
        )
    if city:
        query = query.filter(Customer.city == city)
    if age_group:
        query = query.filter(Customer.age_group == age_group)
    if min_spent is not None:
        query = query.filter(Customer.total_spent >= min_spent)
    if max_spent is not None:
        query = query.filter(Customer.total_spent <= max_spent)

    # Sorting
    sort_column = getattr(Customer, sort_by, Customer.created_at)
    if sort_order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "customers": [c.to_dict() for c in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": per_page,
    })


@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    orders = Order.query.filter_by(customer_id=customer_id).order_by(Order.order_date.desc()).all()
    comms = Communication.query.filter_by(customer_id=customer_id).order_by(Communication.sent_at.desc()).all()

    return jsonify({
        "customer": customer.to_dict(),
        "orders": [o.to_dict() for o in orders],
        "communications": [c.to_dict() for c in comms],
    })


@app.route('/api/customers', methods=['POST'])
def create_customer():
    data = request.get_json()

    # Bulk create
    if isinstance(data, list):
        customers = []
        for item in data:
            c = Customer(
                name=item['name'],
                email=item['email'],
                phone=item.get('phone'),
                city=item.get('city'),
                age_group=item.get('age_group'),
                tags=json.dumps(item.get('tags', [])),
            )
            db.session.add(c)
            customers.append(c)
        db.session.commit()
        return jsonify({"message": f"Created {len(customers)} customers", "count": len(customers)}), 201

    # Single create
    c = Customer(
        name=data['name'],
        email=data['email'],
        phone=data.get('phone'),
        city=data.get('city'),
        age_group=data.get('age_group'),
        tags=json.dumps(data.get('tags', [])),
    )
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@app.route('/api/customers/stats', methods=['GET'])
def customer_stats():
    """Aggregate customer statistics for dashboard."""
    total = Customer.query.count()
    total_revenue = db.session.query(db.func.sum(Customer.total_spent)).scalar() or 0
    avg_spent = db.session.query(db.func.avg(Customer.total_spent)).scalar() or 0
    cities = db.session.query(Customer.city, db.func.count(Customer.id)).group_by(Customer.city).all()
    age_groups = db.session.query(Customer.age_group, db.func.count(Customer.id)).group_by(Customer.age_group).all()

    return jsonify({
        "total_customers": total,
        "total_revenue": round(total_revenue, 2),
        "avg_spent": round(avg_spent, 2),
        "cities": {city: count for city, count in cities if city},
        "age_groups": {ag: count for ag, count in age_groups if ag},
    })


# ─── Orders ──────────────────────────────────────────────────────────

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()

    if isinstance(data, list):
        count = 0
        for item in data:
            o = Order(
                customer_id=item['customer_id'],
                total_amount=item['total_amount'],
                items=json.dumps(item.get('items', [])),
                status=item.get('status', 'completed'),
                order_date=datetime.fromisoformat(item['order_date']) if item.get('order_date') else datetime.utcnow(),
            )
            db.session.add(o)
            count += 1

            # Update customer aggregates
            customer = Customer.query.get(item['customer_id'])
            if customer and item.get('status', 'completed') == 'completed':
                customer.total_spent += item['total_amount']
                customer.order_count += 1
                customer.last_order_date = o.order_date

        db.session.commit()
        return jsonify({"message": f"Created {count} orders"}), 201

    o = Order(
        customer_id=data['customer_id'],
        total_amount=data['total_amount'],
        items=json.dumps(data.get('items', [])),
        status=data.get('status', 'completed'),
    )
    db.session.add(o)

    customer = Customer.query.get(data['customer_id'])
    if customer and data.get('status', 'completed') == 'completed':
        customer.total_spent += data['total_amount']
        customer.order_count += 1
        customer.last_order_date = o.order_date

    db.session.commit()
    return jsonify(o.to_dict()), 201


# ─── Segments ────────────────────────────────────────────────────────

@app.route('/api/segments', methods=['GET'])
def list_segments():
    segments = Segment.query.order_by(Segment.created_at.desc()).all()
    return jsonify({"segments": [s.to_dict() for s in segments]})


@app.route('/api/segments', methods=['POST'])
def create_segment():
    data = request.get_json()
    rules = data.get('rules', [])

    segment = Segment(
        name=data['name'],
        description=data.get('description', ''),
        rules=json.dumps(rules),
        created_by=data.get('created_by', 'manual'),
    )

    # Calculate customer count
    customers = _apply_segment_rules(rules)
    segment.customer_count = len(customers)

    db.session.add(segment)
    db.session.commit()
    return jsonify(segment.to_dict()), 201


@app.route('/api/segments/<int:segment_id>', methods=['GET'])
def get_segment(segment_id):
    segment = Segment.query.get_or_404(segment_id)
    return jsonify(segment.to_dict())


@app.route('/api/segments/<int:segment_id>', methods=['DELETE'])
def delete_segment(segment_id):
    segment = Segment.query.get_or_404(segment_id)
    db.session.delete(segment)
    db.session.commit()
    return jsonify({"message": "Segment deleted"})


@app.route('/api/segments/<int:segment_id>/customers', methods=['GET'])
def segment_customers(segment_id):
    segment = Segment.query.get_or_404(segment_id)
    rules = json.loads(segment.rules)
    customers = _apply_segment_rules(rules)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    start = (page - 1) * per_page
    end = start + per_page
    return jsonify({
        "customers": [c.to_dict() for c in customers[start:end]],
        "total": len(customers),
        "page": page,
        "pages": (len(customers) + per_page - 1) // per_page,
    })


@app.route('/api/segments/preview', methods=['POST'])
def preview_segment():
    """Preview customers matching given rules without saving."""
    data = request.get_json()
    rules = data.get('rules', [])
    customers = _apply_segment_rules(rules)
    return jsonify({
        "count": len(customers),
        "sample": [c.to_dict() for c in customers[:10]],
    })


def _apply_segment_rules(rules):
    """Apply segment filter rules to the customer base."""
    query = Customer.query

    for rule in rules:
        field = rule.get('field')
        operator = rule.get('operator')
        value = rule.get('value')

        if field == 'total_spent':
            value = float(value)
            if operator == 'gt':
                query = query.filter(Customer.total_spent > value)
            elif operator == 'lt':
                query = query.filter(Customer.total_spent < value)
            elif operator == 'gte':
                query = query.filter(Customer.total_spent >= value)
            elif operator == 'lte':
                query = query.filter(Customer.total_spent <= value)
            elif operator == 'eq':
                query = query.filter(Customer.total_spent == value)

        elif field == 'order_count':
            value = int(value)
            if operator == 'gt':
                query = query.filter(Customer.order_count > value)
            elif operator == 'lt':
                query = query.filter(Customer.order_count < value)
            elif operator == 'gte':
                query = query.filter(Customer.order_count >= value)
            elif operator == 'lte':
                query = query.filter(Customer.order_count <= value)
            elif operator == 'eq':
                query = query.filter(Customer.order_count == value)

        elif field == 'city':
            if operator == 'eq':
                query = query.filter(Customer.city == value)
            elif operator == 'neq':
                query = query.filter(Customer.city != value)

        elif field == 'age_group':
            if operator == 'eq':
                query = query.filter(Customer.age_group == value)
            elif operator == 'neq':
                query = query.filter(Customer.age_group != value)

        elif field == 'last_order_date':
            if operator == 'days_since_gt':
                cutoff = datetime.utcnow() - timedelta(days=int(value))
                query = query.filter(
                    (Customer.last_order_date < cutoff) | (Customer.last_order_date.is_(None))
                )
            elif operator == 'days_since_lt':
                cutoff = datetime.utcnow() - timedelta(days=int(value))
                query = query.filter(Customer.last_order_date >= cutoff)

        elif field == 'tags':
            if operator == 'contains':
                query = query.filter(Customer.tags.like(f'%"{value}"%'))
            elif operator == 'not_contains':
                query = query.filter(~Customer.tags.like(f'%"{value}"%'))

    return query.all()


# ─── Campaigns ───────────────────────────────────────────────────────

@app.route('/api/campaigns', methods=['GET'])
def list_campaigns():
    campaigns = Campaign.query.order_by(Campaign.created_at.desc()).all()
    return jsonify({"campaigns": [c.to_dict() for c in campaigns]})


@app.route('/api/campaigns', methods=['POST'])
def create_campaign():
    data = request.get_json()
    segment = Segment.query.get(data['segment_id'])
    campaign = Campaign(
        name=data['name'],
        segment_id=data['segment_id'],
        segment_name=segment.name if segment else 'Unknown Segment',
        channel=data['channel'],
        message_template=data['message_template'],
        subject=data.get('subject'),
        status='draft',
    )
    db.session.add(campaign)
    db.session.commit()

    # Create stats row
    stats = CampaignStats(campaign_id=campaign.id)
    db.session.add(stats)
    db.session.commit()

    return jsonify(campaign.to_dict()), 201


@app.route('/api/campaigns/<int:campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    comms = Communication.query.filter_by(campaign_id=campaign_id).all()

    return jsonify({
        "campaign": campaign.to_dict(),
        "communications": [c.to_dict() for c in comms],
    })


@app.route('/api/campaigns/<int:campaign_id>/send', methods=['POST'])
def send_campaign(campaign_id):
    """Execute a campaign — send messages to all segment customers via channel service."""
    campaign = Campaign.query.get_or_404(campaign_id)

    if campaign.status not in ('draft', 'sent'):
        return jsonify({"error": f"Campaign is already {campaign.status}"}), 400

    segment = Segment.query.get(campaign.segment_id)
    if not segment:
        return jsonify({"error": "Segment not found"}), 404

    rules = json.loads(segment.rules)
    customers = _apply_segment_rules(rules)

    if not customers:
        return jsonify({"error": "No customers match this segment"}), 400

    campaign.status = 'sending'
    campaign.sent_at = datetime.utcnow()
    db.session.commit()

    # Create communications and send to channel service
    channel_url = app.config['CHANNEL_SERVICE_URL']
    callback_url = app.config['CRM_CALLBACK_URL']
    sent_count = 0
    errors = []

    for customer in customers:
        # Personalize message
        message = campaign.message_template.replace('{{name}}', customer.name.split()[0])

        comm_id = str(uuid.uuid4())
        comm = Communication(
            id=comm_id,
            campaign_id=campaign.id,
            customer_id=customer.id,
            channel=campaign.channel,
            message=message,
            status='queued',
            sent_at=datetime.utcnow(),
            status_history=json.dumps([{"status": "queued", "timestamp": datetime.utcnow().isoformat()}]),
        )
        db.session.add(comm)

        # Send to channel service
        try:
            http_requests.post(
                f'{channel_url}/channel/send',
                json={
                    "id": comm_id,
                    "recipient": customer.email,
                    "phone": customer.phone,
                    "message": message,
                    "channel": campaign.channel,
                    "subject": campaign.subject,
                    "callback_url": f'{callback_url}/api/receipts',
                },
                timeout=5,
            )
            comm.status = 'sent'
            sent_count += 1
        except Exception as e:
            comm.status = 'failed'
            comm.failed_at = datetime.utcnow()
            comm.failure_reason = str(e)
            errors.append({"customer_id": customer.id, "error": str(e)})

    # Update stats
    stats = CampaignStats.query.get(campaign.id)
    if not stats:
        stats = CampaignStats(campaign_id=campaign.id)
        db.session.add(stats)
    stats.total_sent = sent_count
    stats.failed = len(errors)
    stats.recalculate()

    campaign.status = 'sent'
    db.session.commit()

    return jsonify({
        "message": f"Campaign sent to {sent_count} recipients",
        "sent": sent_count,
        "failed": len(errors),
        "errors": errors[:5],  # Return first 5 errors only
    })


# ─── Receipts (Webhook from Channel Service) ────────────────────────

@app.route('/api/receipts', methods=['POST'])
def receive_receipt():
    """Process delivery status callbacks from the channel service."""
    data = request.get_json()
    comm_id = data.get('id')
    new_status = data.get('status')
    timestamp = data.get('timestamp', datetime.utcnow().isoformat())
    failure_reason = data.get('failure_reason')

    if not comm_id or not new_status:
        return jsonify({"error": "Missing id or status"}), 400

    comm = Communication.query.get(comm_id)
    if not comm:
        return jsonify({"error": "Communication not found"}), 404

    # Status progression: queued → sent → delivered → read → clicked
    # Also: failed can happen at any point
    STATUS_ORDER = {'queued': 0, 'sent': 1, 'delivered': 2, 'read': 3, 'clicked': 4, 'failed': -1}

    current_rank = STATUS_ORDER.get(comm.status, 0)
    new_rank = STATUS_ORDER.get(new_status, 0)

    # Only advance forward (or fail)
    if new_status == 'failed' or new_rank > current_rank:
        # Update status history
        history = json.loads(comm.status_history or '[]')
        history.append({"status": new_status, "timestamp": timestamp})
        comm.status_history = json.dumps(history)

        old_status = comm.status
        comm.status = new_status

        # Set timestamps
        if new_status == 'delivered':
            comm.delivered_at = datetime.fromisoformat(timestamp)
        elif new_status == 'read':
            comm.read_at = datetime.fromisoformat(timestamp)
        elif new_status == 'clicked':
            comm.clicked_at = datetime.fromisoformat(timestamp)
        elif new_status == 'failed':
            comm.failed_at = datetime.fromisoformat(timestamp)
            comm.failure_reason = failure_reason

        # Update campaign stats
        stats = CampaignStats.query.get(comm.campaign_id)
        if stats:
            if new_status == 'delivered' and old_status != 'delivered':
                stats.delivered += 1
            elif new_status == 'read' and old_status != 'read':
                stats.read += 1
                if old_status not in ('delivered', 'read', 'clicked'):
                    stats.delivered += 1
            elif new_status == 'clicked' and old_status != 'clicked':
                stats.clicked += 1
                if old_status not in ('read', 'clicked'):
                    stats.read += 1
                if old_status not in ('delivered', 'read', 'clicked'):
                    stats.delivered += 1
            elif new_status == 'failed' and old_status != 'failed':
                stats.failed += 1
            stats.recalculate()

            # Check if all messages have reached a terminal state
            if stats.delivered + stats.failed >= stats.total_sent:
                campaign = Campaign.query.get(comm.campaign_id)
                if campaign and campaign.status != 'completed':
                    campaign.status = 'completed'

        db.session.commit()
        return jsonify({"message": "Status updated", "status": new_status})
    else:
        return jsonify({"message": "Status not advanced (already at or past this state)"}), 200


# ─── AI Endpoints ────────────────────────────────────────────────────

@app.route('/api/ai/suggest-segment', methods=['POST'])
def ai_suggest_segment():
    data = request.get_json()
    user_input = data.get('prompt', '')

    if not user_input:
        return jsonify({"error": "Prompt is required"}), 400

    # Get customer stats for context
    stats = {
        "total_customers": Customer.query.count(),
        "avg_spent": round(db.session.query(db.func.avg(Customer.total_spent)).scalar() or 0, 2),
        "max_spent": round(db.session.query(db.func.max(Customer.total_spent)).scalar() or 0, 2),
    }

    result = ai_service.suggest_segment(user_input, stats)

    # Preview count
    rules = result.get('rules', [])
    customers = _apply_segment_rules(rules)
    result['customer_count'] = len(customers)
    result['sample_customers'] = [c.to_dict() for c in customers[:5]]

    return jsonify(result)


@app.route('/api/ai/draft-message', methods=['POST'])
def ai_draft_message():
    data = request.get_json()
    segment_id = data.get('segment_id')
    channel = data.get('channel', 'whatsapp')
    campaign_goal = data.get('goal', '')

    segment_info = {}
    if segment_id:
        segment = Segment.query.get(segment_id)
        if segment:
            segment_info = segment.to_dict()

    result = ai_service.draft_message(segment_info, channel, campaign_goal)
    return jsonify(result)


@app.route('/api/ai/insights', methods=['POST'])
def ai_insights():
    data = request.get_json()
    campaign_id = data.get('campaign_id')

    if not campaign_id:
        return jsonify({"error": "campaign_id required"}), 400

    campaign = Campaign.query.get_or_404(campaign_id)
    stats = CampaignStats.query.get(campaign_id)

    if not stats:
        return jsonify({"error": "No stats available yet"}), 404

    result = ai_service.generate_insights(
        stats.to_dict(),
        segment_name=campaign.segment.name if campaign.segment else '',
        channel=campaign.channel,
    )
    return jsonify(result)


# ─── Dashboard ───────────────────────────────────────────────────────

@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    """Aggregate dashboard data."""
    total_customers = Customer.query.count()
    total_orders = Order.query.count()
    total_revenue = db.session.query(db.func.sum(Customer.total_spent)).scalar() or 0
    active_campaigns = Campaign.query.filter(Campaign.status.in_(['sending', 'sent'])).count()
    total_campaigns = Campaign.query.count()

    # Recent campaigns with stats
    recent_campaigns = Campaign.query.order_by(Campaign.created_at.desc()).limit(5).all()

    # Messages sent today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    messages_today = Communication.query.filter(Communication.sent_at >= today).count()

    # Avg delivery rate across all campaigns
    all_stats = CampaignStats.query.all()
    avg_delivery = 0
    if all_stats:
        rates = [s.delivery_rate for s in all_stats if s.total_sent > 0]
        avg_delivery = sum(rates) / len(rates) if rates else 0

    # Channel distribution
    channel_dist = db.session.query(
        Campaign.channel, db.func.count(Campaign.id)
    ).group_by(Campaign.channel).all()

    return jsonify({
        "total_customers": total_customers,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "active_campaigns": active_campaigns,
        "total_campaigns": total_campaigns,
        "messages_today": messages_today,
        "avg_delivery_rate": round(avg_delivery, 4),
        "recent_campaigns": [c.to_dict() for c in recent_campaigns],
        "channel_distribution": {ch: cnt for ch, cnt in channel_dist},
    })


# ─── Error Handlers ─────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
