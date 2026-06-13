"""Channel delivery outcome simulator."""
import random
import time

# Channel-specific delivery profiles
CHANNEL_PROFILES = {
    'whatsapp': {
        'delivered': 0.92,
        'read_given_delivered': 0.78,
        'clicked_given_read': 0.18,
        'fail_rate': 0.08,
        'delivery_delay': (0.1, 0.5),    # seconds
        'read_delay': (0.5, 1.2),
        'click_delay': (1.0, 2.0),
    },
    'sms': {
        'delivered': 0.95,
        'read_given_delivered': 0.62,
        'clicked_given_read': 0.08,
        'fail_rate': 0.05,
        'delivery_delay': (0.1, 0.4),
        'read_delay': (0.5, 1.2),
        'click_delay': (1.0, 2.0),
    },
    'email': {
        'delivered': 0.85,
        'read_given_delivered': 0.28,
        'clicked_given_read': 0.22,
        'fail_rate': 0.15,
        'delivery_delay': (0.2, 0.6),
        'read_delay': (0.6, 1.5),
        'click_delay': (1.2, 2.5),
    },
    'rcs': {
        'delivered': 0.80,
        'read_given_delivered': 0.58,
        'clicked_given_read': 0.15,
        'fail_rate': 0.20,
        'delivery_delay': (0.1, 0.5),
        'read_delay': (0.5, 1.2),
        'click_delay': (1.0, 2.0),
    },
}

# Failure reasons by channel
FAILURE_REASONS = {
    'whatsapp': [
        'Number not registered on WhatsApp',
        'User has blocked business messages',
        'Template message rejected',
        'Rate limit exceeded',
    ],
    'sms': [
        'Invalid phone number',
        'Number unreachable',
        'Carrier rejected message',
        'DND (Do Not Disturb) enabled',
    ],
    'email': [
        'Email address does not exist',
        'Mailbox full',
        'Spam filter blocked',
        'Domain blacklisted',
        'Hard bounce',
    ],
    'rcs': [
        'Device does not support RCS',
        'Carrier not enabled for RCS',
        'Message expired',
        'User opted out',
    ],
}


def simulate_outcome(channel):
    """
    Determine the delivery outcome for a message.
    Returns a list of status events with delays.
    """
    profile = CHANNEL_PROFILES.get(channel, CHANNEL_PROFILES['email'])
    events = []

    # Step 1: Delivered or Failed?
    if random.random() < profile['fail_rate']:
        reason = random.choice(FAILURE_REASONS.get(channel, ['Unknown error']))
        delay = random.uniform(*profile['delivery_delay'])
        events.append({
            'status': 'failed',
            'delay': delay,
            'failure_reason': reason,
        })
        return events

    # Delivered
    delay = random.uniform(*profile['delivery_delay'])
    events.append({
        'status': 'delivered',
        'delay': delay,
    })

    # Step 2: Read?
    if random.random() < profile['read_given_delivered']:
        delay = random.uniform(*profile['read_delay'])
        events.append({
            'status': 'read',
            'delay': delay,
        })

        # Step 3: Clicked?
        if random.random() < profile['clicked_given_read']:
            delay = random.uniform(*profile['click_delay'])
            events.append({
                'status': 'clicked',
                'delay': delay,
            })

    return events
