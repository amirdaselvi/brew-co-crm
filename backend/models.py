"""SQLAlchemy models for Xeno CRM."""
import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Customer(db.Model):
    """A shopper / consumer."""
    __tablename__ = 'customers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    age_group = db.Column(db.String(20), nullable=True)  # "18-24", "25-34", etc.
    total_spent = db.Column(db.Float, default=0.0)
    order_count = db.Column(db.Integer, default=0)
    last_order_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    tags = db.Column(db.Text, default='[]')  # JSON array

    orders = db.relationship('Order', backref='customer', lazy='dynamic')
    communications = db.relationship('Communication', backref='customer', lazy='dynamic')

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'city': self.city,
            'age_group': self.age_group,
            'total_spent': round(self.total_spent, 2),
            'order_count': self.order_count,
            'last_order_date': self.last_order_date.isoformat() if self.last_order_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'tags': json.loads(self.tags) if self.tags else [],
        }


class Order(db.Model):
    """A purchase made by a customer."""
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    total_amount = db.Column(db.Float, nullable=False)
    items = db.Column(db.Text, default='[]')  # JSON array of product names
    status = db.Column(db.String(20), default='completed')  # completed, returned, cancelled

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'total_amount': round(self.total_amount, 2),
            'items': json.loads(self.items) if self.items else [],
            'status': self.status,
        }


class Segment(db.Model):
    """An audience segment defined by rules."""
    __tablename__ = 'segments'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    rules = db.Column(db.Text, default='[]')  # JSON rules array
    customer_count = db.Column(db.Integer, default=0)
    created_by = db.Column(db.String(20), default='manual')  # "manual" or "ai"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    campaigns = db.relationship('Campaign', backref='segment', lazy='dynamic')

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'rules': json.loads(self.rules) if self.rules else [],
            'customer_count': self.customer_count,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Campaign(db.Model):
    """A marketing campaign targeting a segment."""
    __tablename__ = 'campaigns'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    segment_id = db.Column(db.Integer, db.ForeignKey('segments.id'), nullable=False)
    segment_name = db.Column(db.String(200), nullable=True)
    channel = db.Column(db.String(20), nullable=False)  # whatsapp, sms, email, rcs
    message_template = db.Column(db.Text, nullable=False)
    subject = db.Column(db.String(300), nullable=True)  # For email
    status = db.Column(db.String(20), default='draft')  # draft, sending, sent, completed
    scheduled_at = db.Column(db.DateTime, nullable=True)
    sent_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    communications = db.relationship('Communication', backref='campaign', lazy='dynamic')
    stats = db.relationship('CampaignStats', backref='campaign', uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'segment_id': self.segment_id,
            'segment_name': self.segment_name or (self.segment.name if self.segment else 'Unknown Segment'),
            'channel': self.channel,
            'message_template': self.message_template,
            'subject': self.subject,
            'status': self.status,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'stats': self.stats.to_dict() if self.stats else None,
        }


class Communication(db.Model):
    """A single message sent to one recipient within a campaign."""
    __tablename__ = 'communications'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    channel = db.Column(db.String(20), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='queued')  # queued, sent, delivered, read, clicked, failed
    status_history = db.Column(db.Text, default='[]')  # JSON array of {status, timestamp}
    sent_at = db.Column(db.DateTime, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)
    read_at = db.Column(db.DateTime, nullable=True)
    clicked_at = db.Column(db.DateTime, nullable=True)
    failed_at = db.Column(db.DateTime, nullable=True)
    failure_reason = db.Column(db.Text, nullable=True)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'customer_id': self.customer_id,
            'customer_name': self.customer.name if self.customer else None,
            'customer_email': self.customer.email if self.customer else None,
            'channel': self.channel,
            'message': self.message,
            'status': self.status,
            'status_history': json.loads(self.status_history) if self.status_history else [],
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'clicked_at': self.clicked_at.isoformat() if self.clicked_at else None,
            'failed_at': self.failed_at.isoformat() if self.failed_at else None,
            'failure_reason': self.failure_reason,
        }


class CampaignStats(db.Model):
    """Denormalized campaign statistics for fast reads."""
    __tablename__ = 'campaign_stats'

    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), primary_key=True)
    total_sent = db.Column(db.Integer, default=0)
    delivered = db.Column(db.Integer, default=0)
    failed = db.Column(db.Integer, default=0)
    read = db.Column(db.Integer, default=0)
    clicked = db.Column(db.Integer, default=0)
    delivery_rate = db.Column(db.Float, default=0.0)
    read_rate = db.Column(db.Float, default=0.0)
    click_rate = db.Column(db.Float, default=0.0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'campaign_id': self.campaign_id,
            'total_sent': self.total_sent,
            'delivered': self.delivered,
            'failed': self.failed,
            'read': self.read,
            'clicked': self.clicked,
            'delivery_rate': round(self.delivery_rate, 4),
            'read_rate': round(self.read_rate, 4),
            'click_rate': round(self.click_rate, 4),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def recalculate(self):
        """Recalculate rates from counts."""
        if self.total_sent > 0:
            self.delivery_rate = self.delivered / self.total_sent
        if self.delivered > 0:
            self.read_rate = self.read / self.delivered
            self.click_rate = self.clicked / self.delivered
        self.updated_at = datetime.utcnow()
