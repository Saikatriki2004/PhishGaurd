<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/Flask-3.0+-green.svg" alt="Flask">
  <img src="https://img.shields.io/badge/ML-Scikit--Learn-orange.svg" alt="Scikit-Learn">
  <img src="https://img.shields.io/badge/Accuracy-96.8%25-brightgreen.svg" alt="Accuracy">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
</p>

<h1 align="center">🛡️ PhishGuard</h1>

<p align="center">
  <strong>AI-Powered Phishing URL Detection System</strong><br>
  Protect yourself from phishing attacks with real-time URL analysis powered by machine learning.
</p>

---

## 🎯 Overview

**PhishGuard** is a production-grade phishing detection system that uses machine learning to analyze URLs and identify potential phishing threats in real-time. It combines 30+ feature extraction techniques with a calibrated Gradient Boosting classifier to provide accurate, explainable verdicts.

### Key Features

- 🔍 **Real-time URL Analysis** - Scan any URL instantly with detailed risk assessment
- 🤖 **ML-Powered Detection** - Calibrated Gradient Boosting model with 96.8% accuracy
- 📊 **Explainable AI** - Understand why a URL is flagged with per-feature explanations
- ✅ **Trusted Domain Bypass** - Pre-verified trusted domains bypass ML for speed
- 🌐 **Threat Intelligence Map** - Visualize global phishing threats in real-time
- 📈 **Batch Scanning** - Analyze up to 50 URLs simultaneously
- 🔒 **Production-Ready** - Rate limiting, Prometheus metrics, structured logging

---

## 🖥️ Screenshots

### URL Scanner Interface
Clean, modern interface for scanning URLs with instant verdicts.

### Threat Map Dashboard
Global visualization of phishing threats and attack vectors.

### Scan History
Track and review all your previous scans with detailed logs.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Saikatriki2004/PhishGaurd.git
   cd PhishGaurd
   ```

2. **Navigate to the application directory**
   ```bash
   cd "Phishing Web Sites Detection Using Machine Learning"
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open in browser**
   ```
   http://127.0.0.1:5000
   ```

---

## 📦 Project Structure

```
PhishGaurd/
├── Phishing Web Sites Detection Using Machine Learning/
│   ├── app.py                    # Main Flask application
│   ├── decision_pipeline.py      # Core ML decision pipeline
│   ├── feature_extractor.py      # URL feature extraction
│   ├── trusted_domains.py        # Trusted domain whitelist
│   │
│   ├── models/
│   │   ├── model.pkl             # Trained ML model
│   │   └── model_metadata.json   # Model performance metrics
│   │
│   ├── src/
│   │   ├── features/             # Feature extraction modules
│   │   ├── pipeline/             # ML pipeline components
│   │   ├── training/             # Model training scripts
│   │   ├── monitoring/           # Model monitoring
│   │   ├── governance/           # AI governance & safety
│   │   └── observability/        # Metrics & logging
│   │
│   ├── templates/
│   │   ├── index.html            # Main scanner page
│   │   ├── scan_dashboard.html   # Scan dashboard
│   │   ├── scan_history.html     # Scan history viewer
│   │   ├── threat_map.html       # Global threat map
│   │   └── settings.html         # Application settings
│   │
│   ├── static/                   # CSS, JS, images
│   ├── datasets/                 # Training datasets
│   ├── tests/                    # Unit tests
│   ├── config/                   # Configuration files
│   └── requirements.txt          # Python dependencies
```

---

## 🔬 How It Works

### Detection Pipeline

```
URL Input → Validation → Trusted Domain Check → Feature Extraction → ML Inference → Verdict
```

1. **URL Validation** - Validates URL format and length
2. **Trusted Domain Gate** - Known safe domains bypass ML (e.g., google.com)
3. **Feature Extraction** - Extracts 30+ features from URL structure and content
4. **Calibrated ML** - Predicts phishing probability with calibrated confidence
5. **Tri-State Verdict** - Returns SAFE, SUSPICIOUS, or PHISHING

### Feature Categories

| Category | Features | Description |
|----------|----------|-------------|
| **URL Structure** | IP address, length, shortener, @ symbol, redirects | Analyzes URL patterns |
| **Domain Analysis** | Subdomains, hyphens, HTTPS, registration length | Domain characteristics |
| **Content Analysis** | External resources, scripts, forms, iframes | Page content signals |
| **Security Signals** | Certificate age, DNS records, WHOIS data | Security infrastructure |
| **Behavioral** | Popups, right-click disabled, status bar manipulation | Suspicious behaviors |

### Decision Thresholds

| Risk Level | Threshold | Verdict |
|------------|-----------|---------|
| Low Risk | < 55% | ✅ SAFE |
| Medium Risk | 55% - 85% | ⚠️ SUSPICIOUS |
| High Risk | ≥ 85% | 🚨 PHISHING |

---

## 📊 Model Performance

The model is trained on 11,000+ labeled URLs and achieves:

| Metric | Value |
|--------|-------|
| **Accuracy** | 96.8% |
| **Phishing Precision** | 97.5% |
| **Phishing Recall** | 95.3% |
| **F1-Score** | 96.4% |

### Confusion Matrix

|  | Predicted Legitimate | Predicted Phishing |
|--|---------------------|-------------------|
| **Actual Legitimate** | 1,208 | 24 |
| **Actual Phishing** | 46 | 933 |

---

## 🔌 API Reference

### Scan Single URL

```http
POST /scan
Content-Type: application/json

{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "verdict": "SAFE",
  "risk_score": 15.2,
  "is_trusted_domain": false,
  "explanation": {
    "summary": "This URL appears to be legitimate...",
    "positive_signals": [...],
    "risk_signals": [...]
  }
}
```

### Batch Scan (up to 50 URLs)

```http
POST /api/batch-scan
Content-Type: application/json

{
  "urls": ["https://example1.com", "https://example2.com"]
}
```

### Health Check

```http
GET /health
```

### Prometheus Metrics

```http
GET /metrics
```

---

## 🛠️ Tech Stack

### Backend
- **Flask** - Web framework
- **Scikit-learn** - Machine learning
- **XGBoost** - Gradient boosting ensemble
- **NumPy/Pandas** - Data processing

### Frontend
- **HTML5/CSS3** - Modern responsive UI
- **JavaScript** - Interactive components
- **Inter Font** - Clean typography

### Infrastructure
- **Flask-Limiter** - Rate limiting
- **Prometheus** - Metrics collection
- **Python JSON Logger** - Structured logging

---

## 🧪 Running Tests

```bash
cd "Phishing Web Sites Detection Using Machine Learning"
python -m pytest tests/ -v
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | Environment mode | `production` |
| `FLASK_DEBUG` | Debug mode | `False` |
| `RATE_LIMIT` | API rate limit | `100/hour` |

### Trusted Domains

Edit `trusted_domains_manifest.json` to add/remove trusted domains that bypass ML detection.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Dataset sources for phishing URL research
- Scikit-learn and XGBoost communities
- Flask framework contributors

---

## 📧 Contact

**Saikat** - [@Saikatriki2004](https://github.com/Saikatriki2004)

Project Link: [https://github.com/Saikatriki2004/PhishGaurd](https://github.com/Saikatriki2004/PhishGaurd)

---

<p align="center">
  Made with ❤️ for a safer internet
</p>
