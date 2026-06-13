"""AI service for Xeno CRM — Claude API integration with mock fallback."""
import json
import os
import re

# Try to import anthropic; fall back gracefully
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False


def get_client():
    """Get Claude API client if available."""
    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if api_key and HAS_ANTHROPIC:
        return anthropic.Anthropic(api_key=api_key)
    return None


def suggest_segment(user_input, customer_stats=None):
    """
    Convert natural language segment description into structured rules.
    Falls back to mock suggestions if no API key.
    """
    client = get_client()

    if client:
        prompt = f"""You are an AI assistant for a marketing CRM called Xeno, used by a coffee chain brand "Brew & Co."
Given a natural language description of a customer segment, produce a JSON object with:
- "name": a short, catchy segment name
- "description": a one-line description
- "rules": an array of filter rules

Each rule is an object with:
- "field": one of [total_spent, order_count, last_order_date, city, age_group, tags]
- "operator": one of [gt, lt, gte, lte, eq, neq, contains, not_contains, days_since_gt, days_since_lt]
- "value": the filter value (number, string, or for dates use days_since with integer)

Customer stats for context: {json.dumps(customer_stats or {})}

User request: "{user_input}"

Return ONLY valid JSON, no markdown, no explanation."""

        try:
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            response_text = message.content[0].text.strip()
            # Try to parse JSON from the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return json.loads(response_text)
        except Exception as e:
            print(f"Claude API error: {e}")
            return _mock_suggest_segment(user_input)
    else:
        return _mock_suggest_segment(user_input)


def draft_message(segment_info, channel, campaign_goal='', brand_voice='friendly and warm'):
    """
    Draft a personalized message template for a campaign.
    """
    client = get_client()

    if client:
        prompt = f"""You are a marketing copywriter for "Brew & Co.", a trendy coffee chain.
Draft a {channel} message template for the following campaign:

Segment: {segment_info.get('name', 'Unknown')} — {segment_info.get('description', '')}
Channel: {channel}
Campaign goal: {campaign_goal or 'Drive engagement and repeat visits'}
Brand voice: {brand_voice}

Use {{{{name}}}} as placeholder for customer's first name.
Keep it concise and engaging. Match the channel style:
- WhatsApp: casual, emoji ok, ~100 words max
- SMS: very short, ~160 chars
- Email: professional but warm, can be longer, include subject line
- RCS: rich, interactive feel, ~150 words

Return JSON with:
- "message": the message template
- "subject": email subject line (only for email, null otherwise)
- "variants": array of 2 alternative message versions

Return ONLY valid JSON."""

        try:
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )
            response_text = message.content[0].text.strip()
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return json.loads(response_text)
        except Exception as e:
            print(f"Claude API error: {e}")
            return _mock_draft_message(channel, segment_info)
    else:
        return _mock_draft_message(channel, segment_info)


def generate_insights(campaign_stats, segment_name='', channel=''):
    """
    Generate AI-powered insights from campaign performance data.
    """
    client = get_client()

    if client:
        prompt = f"""You are an analytics AI for "Brew & Co." CRM.
Analyze this campaign performance and give 3-4 actionable insights:

Campaign stats: {json.dumps(campaign_stats)}
Segment: {segment_name}
Channel: {channel}

Return JSON with:
- "summary": one-line performance summary
- "insights": array of objects with "title", "description", "type" (positive/negative/neutral), "action" (recommended next step)

Return ONLY valid JSON."""

        try:
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )
            response_text = message.content[0].text.strip()
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return json.loads(response_text)
        except Exception as e:
            print(f"Claude API error: {e}")
            return _mock_generate_insights(campaign_stats, channel)
    else:
        return _mock_generate_insights(campaign_stats, channel)


# ─── Mock Fallbacks ────────────────────────────────────────────────

def _mock_suggest_segment(user_input):
    """Return pre-built segment suggestions based on keyword matching."""
    input_lower = user_input.lower()

    if any(w in input_lower for w in ['high value', 'high-value', 'big spend', 'vip', 'premium']):
        return {
            "name": "High-Value VIPs",
            "description": "Customers who have spent significantly above average",
            "rules": [
                {"field": "total_spent", "operator": "gte", "value": 100},
                {"field": "order_count", "operator": "gte", "value": 5}
            ]
        }
    elif any(w in input_lower for w in ['inactive', 'lapsed', 'churned', 'haven\'t ordered', 'dormant', 'lost']):
        return {
            "name": "Win-Back Targets",
            "description": "Customers who haven't ordered recently and may be churning",
            "rules": [
                {"field": "last_order_date", "operator": "days_since_gt", "value": 60},
                {"field": "order_count", "operator": "gte", "value": 2}
            ]
        }
    elif any(w in input_lower for w in ['new', 'recent', 'just joined', 'first']):
        return {
            "name": "New Explorers",
            "description": "Recently acquired customers still in their first weeks",
            "rules": [
                {"field": "last_order_date", "operator": "days_since_lt", "value": 30},
                {"field": "order_count", "operator": "lte", "value": 2}
            ]
        }
    elif any(w in input_lower for w in ['mumbai', 'delhi', 'bangalore', 'city']):
        city = 'Mumbai'
        for c in ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata']:
            if c.lower() in input_lower:
                city = c
                break
        return {
            "name": f"{city} Locals",
            "description": f"All customers based in {city}",
            "rules": [
                {"field": "city", "operator": "eq", "value": city}
            ]
        }
    elif any(w in input_lower for w in ['young', 'gen z', 'youth', '18', '24']):
        return {
            "name": "Gen Z Coffee Lovers",
            "description": "Young customers aged 18-24",
            "rules": [
                {"field": "age_group", "operator": "eq", "value": "18-24"}
            ]
        }
    elif any(w in input_lower for w in ['regular', 'frequent', 'loyal', 'repeat']):
        return {
            "name": "Loyal Regulars",
            "description": "Customers who order frequently and consistently",
            "rules": [
                {"field": "order_count", "operator": "gte", "value": 8},
                {"field": "last_order_date", "operator": "days_since_lt", "value": 30}
            ]
        }
    else:
        return {
            "name": "Custom Segment",
            "description": f"Segment based on: {user_input}",
            "rules": [
                {"field": "order_count", "operator": "gte", "value": 1}
            ]
        }


def _mock_draft_message(channel, segment_info=None):
    """Return pre-built message templates per channel."""
    seg_name = segment_info.get('name', 'customers') if segment_info else 'customers'

    templates = {
        'whatsapp': {
            "message": "Hey {{name}}! ☕ We miss you at Brew & Co.! Come grab your favourite brew this week and get 20% off any drink. Just show this message at the counter. See you soon! 🎉",
            "subject": None,
            "variants": [
                "Hi {{name}}! 🌟 Your next coffee is on us — well, almost! Enjoy a FREE pastry with any drink purchase this weekend at Brew & Co. Tap to claim! ☕🥐",
                "{{name}}, guess what? 🎁 We've got something special waiting for you at Brew & Co. Pop in this week for a surprise treat. You deserve it! ✨"
            ]
        },
        'sms': {
            "message": "Hi {{name}}! Brew & Co. misses you ☕ Get 20% off your next order. Show this SMS at checkout. Valid this week!",
            "subject": None,
            "variants": [
                "{{name}}, your FREE pastry awaits! Buy any drink at Brew & Co this weekend. Show this SMS to redeem.",
                "Brew & Co: {{name}}, we saved your spot! Come back for a special 25% off deal. This week only!"
            ]
        },
        'email': {
            "message": "Dear {{name}},\n\nWe've been brewing something special just for you! As one of our valued customers, we'd love to welcome you back with an exclusive 20% discount on your next visit.\n\nWhether it's your favourite Cappuccino or our new Nitro Cold Brew, every sip is better at Brew & Co.\n\nSimply show this email at any Brew & Co. location to redeem.\n\nWarm regards,\nThe Brew & Co. Team ☕",
            "subject": f"☕ {{{{name}}}}, we've missed you at Brew & Co.!",
            "variants": [
                "Hi {{name}},\n\nThis weekend is pastry weekend at Brew & Co.! Buy any drink and get a freshly baked pastry absolutely FREE.\n\nWe know you love your coffee — now enjoy it with a Croissant, Muffin, or our famous Cinnamon Roll.\n\nSee you this weekend!\n\n— Brew & Co. ☕🥐",
                "Hello {{name}},\n\nAs a thank you for being part of the Brew & Co. family, here's an exclusive offer: 25% off your entire order this week.\n\nFrom our signature drinks to our curated merchandise, everything is better with a discount.\n\nRedeem by showing this email at checkout.\n\nCheers,\nBrew & Co. 🎉"
            ]
        },
        'rcs': {
            "message": "Hey {{name}}! ☕✨ Brew & Co. has a treat for you — 20% off your next visit! Tap below to save the offer and find your nearest store. We can't wait to see you!",
            "subject": None,
            "variants": [
                "{{name}}, your weekend just got better! 🥐☕ FREE pastry with any drink at Brew & Co. Tap to view the menu and claim your treat!",
                "Hi {{name}}! 🎁 Exclusive offer just for you: 25% off everything at Brew & Co. this week. Browse our menu and order ahead!"
            ]
        },
    }

    return templates.get(channel, templates['whatsapp'])


def _mock_generate_insights(stats, channel=''):
    """Generate mock insights based on stats."""
    insights = []

    delivery_rate = stats.get('delivery_rate', 0)
    read_rate = stats.get('read_rate', 0)
    click_rate = stats.get('click_rate', 0)
    total_sent = stats.get('total_sent', 0)

    # Delivery insight
    if delivery_rate >= 0.9:
        insights.append({
            "title": "Strong Delivery Rate",
            "description": f"Your campaign reached {delivery_rate:.0%} of recipients — well above the industry average of 85%.",
            "type": "positive",
            "action": "Maintain current contact hygiene practices."
        })
    elif delivery_rate >= 0.7:
        insights.append({
            "title": "Moderate Delivery Rate",
            "description": f"Delivery rate of {delivery_rate:.0%} suggests some contacts may have invalid details.",
            "type": "neutral",
            "action": "Consider running a contact validation pass before the next campaign."
        })
    else:
        insights.append({
            "title": "Low Delivery Rate",
            "description": f"Only {delivery_rate:.0%} of messages were delivered. This indicates data quality issues.",
            "type": "negative",
            "action": "Clean your contact list — remove bounced/invalid entries before sending again."
        })

    # Read rate insight
    if read_rate >= 0.5:
        insights.append({
            "title": "High Engagement",
            "description": f"{read_rate:.0%} of delivered messages were read — your audience is highly engaged.",
            "type": "positive",
            "action": "This segment responds well — consider increasing campaign frequency."
        })
    else:
        insights.append({
            "title": "Read Rate Could Improve",
            "description": f"Only {read_rate:.0%} of messages were read. Try adjusting send timing or message preview.",
            "type": "neutral",
            "action": "Experiment with different send times (morning vs evening) for this segment."
        })

    # Click rate insight
    if click_rate >= 0.1:
        insights.append({
            "title": "Good Click-Through",
            "description": f"{click_rate:.0%} click rate shows your CTA is compelling.",
            "type": "positive",
            "action": "Double down on this message style for future campaigns."
        })
    else:
        insights.append({
            "title": "Low Click-Through",
            "description": f"Click rate is {click_rate:.0%}. The message may need a stronger call-to-action.",
            "type": "negative",
            "action": "Try A/B testing different CTAs — urgency-based vs. reward-based."
        })

    # Channel-specific insight
    if channel == 'whatsapp':
        insights.append({
            "title": "WhatsApp Advantage",
            "description": "WhatsApp typically sees 3x higher read rates than email. Good channel choice for this segment.",
            "type": "positive",
            "action": "Consider WhatsApp as your primary channel for high-value segments."
        })
    elif channel == 'email':
        insights.append({
            "title": "Email Channel",
            "description": "Email works well for detailed content but has lower open rates. Consider pairing with a WhatsApp nudge.",
            "type": "neutral",
            "action": "Try a multi-channel approach: email for detail + WhatsApp for reminder."
        })

    return {
        "summary": f"Campaign reached {total_sent} recipients with {delivery_rate:.0%} delivery and {read_rate:.0%} read rate.",
        "insights": insights
    }
