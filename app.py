"""
Phishing URL Detection SaaS - Flask Backend (Production-Grade)

This Flask application enforces the COMPLETE decision pipeline:
1. URL validation
2. Trusted domain gate (PRE-ML)
3. Feature extraction with failure tracking
4. Calibrated ML inference
5. Tri-state verdicts (SAFE/SUSPICIOUS/PHISHING)
6. Per-feature explanations

Phase 4: Added observability (rate limiting, metrics, structured logging)

CRITICAL RULES:
- Trusted domains NEVER show phishing verdicts
- Only calibrated models are accepted
- All responses include explanations
"""

import logging
import time
from typing import Dict, Any, Tuple

from flask import Flask, request, render_template, jsonify, g

# Import decision pipeline (enforces calibration at startup)
from decision_pipeline import DecisionPipeline, Verdict, analyze_url

# Import telemetry (fail-safe, non-blocking)
from explanation_telemetry import record_explanation_telemetry

# Import observability (Phase 4)
try:
    from src.observability import setup_logging, get_metrics, setup_rate_limiter, setup_prometheus_endpoint, RATE_LIMITS
    OBSERVABILITY_AVAILABLE = True
except ImportError:
    OBSERVABILITY_AVAILABLE = False

# Configure logging (use structured logging if available)
if OBSERVABILITY_AVAILABLE:
    setup_logging(level=logging.INFO, json_format=False)  # Set json_format=True for production
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Import and register settings blueprint
from settings_routes import settings_bp
app.register_blueprint(settings_bp)

# Setup Prometheus metrics endpoint (Phase 4)
prometheus_metrics = None
if OBSERVABILITY_AVAILABLE:
    prometheus_metrics = setup_prometheus_endpoint(app)
    if prometheus_metrics:
        logger.info("[APP] Prometheus metrics enabled at /metrics")

# Setup rate limiting (Phase 4)
limiter = None
if OBSERVABILITY_AVAILABLE:
    limiter = setup_rate_limiter(app)
    if limiter:
        logger.info("[APP] Rate limiting enabled")

# Get metrics collector
metrics = get_metrics() if OBSERVABILITY_AVAILABLE else None

# Initialize decision pipeline at startup
# This will CRASH if no calibrated model exists (by design)
try:
    pipeline = DecisionPipeline()
    logger.info("[APP] Decision pipeline initialized successfully")
except ValueError as e:
    logger.critical(f"[APP] FATAL: {e}")
    raise SystemExit(f"Cannot start: {e}")


def validate_url_input(url: str) -> Tuple[bool, str]:
    """
    Validate that input is a valid URL.
    
    Args:
        url: The URL string to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not url or not isinstance(url, str):
        return False, "URL is required"
    
    url = url.strip()
    if len(url) < 4:
        return False, "URL is too short"
    
    if len(url) > 2000:
        return False, "URL is too long (max 2000 characters)"
    
    if ' ' in url:
        return False, "URL cannot contain spaces"
    
    return True, ""


@app.route("/", methods=["GET"])
def index():
    """Render the main scanner page."""
    return render_template("index.html")


@app.route("/scan", methods=["POST"])
def scan_url():
    """
    Analyze a URL through the decision pipeline.
    
    Expects JSON: { "url": "https://example.com" }
    
    Returns JSON: {
        "success": true,
        "verdict": "SAFE|SUSPICIOUS|PHISHING",
        "risk_score": 15.2,
        "is_trusted_domain": true,
        "explanation": {...},
        "warnings": [...],
        "url": "..."
    }
    """
    try:
        start_time = time.time()
        
        # Get URL from request
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({
                "success": False,
                "error": "URL is required"
            }), 400
        
        url = data['url'].strip()
        
        # Validate URL format
        is_valid, error = validate_url_input(url)
        if not is_valid:
            return jsonify({
                "success": False,
                "error": error
            }), 400
        
        # Run through decision pipeline
        result = pipeline.analyze(url)
        
        # Record metrics (Phase 4)
        if metrics:
            metrics.record_request(result.verdict.value, source="single")
            if result.is_trusted_domain:
                metrics.record_trusted_bypass()
        
        # Record telemetry (non-blocking, fail-safe)
        drift_status = "warning" if result.warnings else "none"
        record_explanation_telemetry(
            explanation=result.explanation,
            verdict=result.verdict.value,
            drift_status=drift_status
        )
        
        # Calculate latency
        latency_ms = round((time.time() - start_time) * 1000, 2)
        
        # Build response
        response = {
            "success": True,
            "verdict": result.verdict.value,
            "risk_score": round(result.risk_score, 1),
            "is_trusted_domain": result.is_trusted_domain,
            "ml_bypassed": result.ml_bypassed,
            "explanation": result.explanation,
            "warnings": result.warnings,
            "url": url,
            "risk_level": pipeline.get_risk_level_description(result.risk_score),
            "latency_ms": latency_ms  # Phase 4: Response timing
        }
        
        # Add trust info if available
        if result.trust_check:
            response["trust_info"] = result.trust_check.to_dict()
        
        # Add failure report if there were issues
        if result.failure_flags and result.failure_flags.any_failed():
            response["network_issues"] = result.failure_flags.to_dict()
        
        return jsonify(response)
    
    except ValueError as e:
        # URL validation errors from pipeline
        logger.warning(f"[SCAN] Validation error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400
    
    except Exception as e:
        # Unexpected errors
        logger.error(f"[SCAN] Unexpected error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "An unexpected error occurred during analysis"
        }), 500


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "pipeline_ready": pipeline is not None,
        "model_type": "CalibratedClassifierCV"
    })


@app.route("/api/trusted-domains", methods=["GET"])
def list_trusted_domains():
    """List sample trusted domains (for transparency)."""
    sample_domains = [
        "google.com", "github.com", "microsoft.com", "amazon.com",
        "facebook.com", "twitter.com", "linkedin.com", "apple.com"
    ]
    return jsonify({
        "sample_trusted_domains": sample_domains,
        "total_trusted": len(pipeline.trusted_checker.trusted_domains),
        "note": "Trusted domains bypass ML and are always marked SAFE"
    })


@app.route("/api/user-answers", methods=["GET"])
def get_user_answers():
    """
    Get user-facing Q&A for explanation UI.
    
    Returns JSON with questions, tooltips, and disclaimers.
    """
    import json
    import os
    
    answers_path = os.path.join(
        os.path.dirname(__file__), "config", "user_answers.json"
    )
    
    try:
        with open(answers_path, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        logger.error(f"[API] Failed to load user answers: {e}")
        return jsonify({"error": "Could not load answers"}), 500


@app.route("/api/telemetry/summary", methods=["GET"])
def get_telemetry_summary():
    """
    Get aggregate telemetry summary (operators only).
    
    Returns anonymous, aggregate metrics only.
    """
    from explanation_telemetry import get_telemetry
    
    summary = get_telemetry().get_summary()
    return jsonify(summary)


@app.route("/api/batch-scan", methods=["POST"])
def batch_scan():
    """
    Batch analyze multiple URLs (Phase 3 feature).
    
    Expects JSON: { "urls": ["https://example1.com", "https://example2.com", ...] }
    
    Returns JSON: {
        "success": true,
        "results": [
            { "url": "...", "verdict": "...", "risk_score": ... },
            ...
        ],
        "total": 2,
        "phishing_count": 1,
        "safe_count": 1
    }
    
    Limits:
    - Max 50 URLs per request
    - Concurrent processing for speed
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    try:
        data = request.get_json()
        if not data or 'urls' not in data:
            return jsonify({"success": False, "error": "urls array is required"}), 400
        
        urls = data['urls']
        if not isinstance(urls, list):
            return jsonify({"success": False, "error": "urls must be an array"}), 400
        
        # Limit batch size
        MAX_BATCH = 50
        if len(urls) > MAX_BATCH:
            return jsonify({
                "success": False, 
                "error": f"Maximum {MAX_BATCH} URLs per batch"
            }), 400
        
        # Validate all URLs first
        valid_urls = []
        for url in urls:
            is_valid, _ = validate_url_input(url)
            if is_valid:
                valid_urls.append(url.strip())
        
        if not valid_urls:
            return jsonify({"success": False, "error": "No valid URLs provided"}), 400
        
        # Process URLs concurrently
        results = []
        phishing_count = 0
        safe_count = 0
        suspicious_count = 0
        
        def analyze_single(url):
            try:
                result = pipeline.analyze(url)
                return {
                    "url": url,
                    "verdict": result.verdict.value,
                    "risk_score": round(result.risk_score, 1),
                    "is_trusted_domain": result.is_trusted_domain,
                    "ml_bypassed": result.ml_bypassed
                }
            except Exception as e:
                return {
                    "url": url,
                    "verdict": "ERROR",
                    "error": str(e)
                }
        
        # Use thread pool for concurrent analysis
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(analyze_single, url): url for url in valid_urls}
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                
                verdict = result.get("verdict", "ERROR")
                if verdict == "PHISHING":
                    phishing_count += 1
                elif verdict == "SAFE":
                    safe_count += 1
                elif verdict == "SUSPICIOUS":
                    suspicious_count += 1
        
        return jsonify({
            "success": True,
            "results": results,
            "total": len(results),
            "phishing_count": phishing_count,
            "safe_count": safe_count,
            "suspicious_count": suspicious_count
        })
    
    except Exception as e:
        logger.error(f"[BATCH] Error: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# THREAT MAP ROUTES (GAP 1: STRICT API CONTRACTS)
# ============================================================

@app.route("/dashboard", methods=["GET"])
def dashboard():
    """Render the scan dashboard page."""
    return render_template("scan_dashboard.html")


@app.route("/scan-history", methods=["GET"])
def scan_history():
    """Render the scan history page."""
    return render_template("scan_history.html")


@app.route("/threat-map", methods=["GET"])
def threat_map():
    """Render the threat map page."""
    return render_template("threat_map.html")


@app.route("/api/threats/map-data", methods=["GET"])
def get_threat_map_data():
    """
    Return simulated threat map data.
    
    Schema per item:
    {
        "threat_id": string,
        "type": "malware" | "credential_harvesting" | "social_engineering",
        "severity": "critical" | "suspicious" | "safe",
        "source": { "lat": number, "lng": number },
        "target": { "lat": number, "lng": number },
        "attack_vector": "email" | "sms" | "web" | "network",
        "timestamp": ISO-8601 string
    }
    """
    import random
    from datetime import datetime, timedelta
    
    # Simulated threat data covering multiple regions
    threat_sources = [
        {"lat": 55.75, "lng": 37.62, "region": "Moscow, RU"},
        {"lat": 31.23, "lng": 121.47, "region": "Shanghai, CN"},
        {"lat": 6.52, "lng": 3.38, "region": "Lagos, NG"},
        {"lat": 22.57, "lng": 114.06, "region": "Shenzhen, CN"},
        {"lat": 50.45, "lng": 30.52, "region": "Kyiv, UA"},
        {"lat": -23.55, "lng": -46.64, "region": "São Paulo, BR"},
        {"lat": 28.61, "lng": 77.21, "region": "Delhi, IN"},
        {"lat": 1.35, "lng": 103.82, "region": "Singapore, SG"}
    ]
    
    threat_targets = [
        {"lat": 40.71, "lng": -74.01, "region": "New York, US"},
        {"lat": 51.51, "lng": -0.13, "region": "London, UK"},
        {"lat": 37.77, "lng": -122.42, "region": "San Francisco, US"},
        {"lat": 48.86, "lng": 2.35, "region": "Paris, FR"},
        {"lat": 35.68, "lng": 139.69, "region": "Tokyo, JP"},
        {"lat": 52.52, "lng": 13.40, "region": "Berlin, DE"}
    ]
    
    types = ["malware", "credential_harvesting", "social_engineering"]
    severities = ["critical", "suspicious", "safe"]
    vectors = ["email", "sms", "web", "network"]
    
    threats = []
    now = datetime.utcnow()
    
    for i in range(30):  # 30 simulated threats
        source = random.choice(threat_sources)
        target = random.choice(threat_targets)
        ts = now - timedelta(seconds=random.randint(0, 300))
        
        threats.append({
            "threat_id": f"THR-{i:04d}-{ts.strftime('%H%M%S')}",
            "type": random.choice(types),
            "severity": random.choices(severities, weights=[0.4, 0.35, 0.25])[0],
            "source": {"lat": source["lat"], "lng": source["lng"]},
            "target": {"lat": target["lat"], "lng": target["lng"]},
            "attack_vector": random.choice(vectors),
            "timestamp": ts.isoformat() + "Z"
        })
    
    return jsonify(threats)


@app.route("/api/threats/live", methods=["GET"])
def get_live_threats():
    """
    Return simulated live threat feed.
    
    Schema per item:
    {
        "id": string,
        "label": string,
        "entity": string,
        "location": string,
        "severity": string,
        "timestamp": ISO-8601 string
    }
    """
    import random
    from datetime import datetime, timedelta
    
    labels = ["Malware C2", "Cred Harvester", "Port Scan", "Phishing Kit", "Ransomware"]
    entities = [
        "192.168.45.22 → FinCorp",
        "login-microsoft-secure.com",
        "10.0.4.120 → Gateway",
        "secure-paypal-verify.net",
        "45.33.32.156 → AWS-EC2"
    ]
    locations = ["Moscow, RU", "Lagos, NG", "Shenzhen, CN", "São Paulo, BR", "Kyiv, UA"]
    
    live_items = []
    now = datetime.utcnow()
    
    for i in range(5):
        ts = now - timedelta(seconds=random.randint(2, 60))
        severity = random.choices(["critical", "suspicious", "safe"], weights=[0.5, 0.35, 0.15])[0]
        
        live_items.append({
            "id": f"LIVE-{ts.strftime('%H%M%S')}-{i}",
            "label": random.choice(labels),
            "entity": random.choice(entities),
            "location": random.choice(locations),
            "severity": severity,
            "timestamp": ts.isoformat() + "Z"
        })
    
    return jsonify(live_items)


@app.route("/api/threats/regions", methods=["GET"])
def get_threat_regions():
    """
    Return top source regions.
    
    Schema per item:
    {
        "region": string,
        "count": number
    }
    """
    regions = [
        {"region": "Eastern Europe", "count": 4281},
        {"region": "Southeast Asia", "count": 2104},
        {"region": "North America", "count": 982}
    ]
    return jsonify(regions)


if __name__ == "__main__":

    print("\n" + "="*60)
    print("[*] PHISHING URL DETECTION SCANNER (Production-Grade)")
    print("="*60)
    print("[+] Decision Pipeline: Initialized")
    print("[+] Model: Calibrated (CalibratedClassifierCV)")
    print("[+] Trusted Domains: Loaded")
    print("[+] Server: http://127.0.0.1:5000")
    print("="*60)
    print("")
    print("DECISION THRESHOLDS:")
    print("  SAFE:       risk < 55%")
    print("  SUSPICIOUS: 55% <= risk < 85%")
    print("  PHISHING:   risk >= 85%")
    print("")
    print("="*60 + "\n")
    
    app.run(debug=True, host="0.0.0.0", port=5000)