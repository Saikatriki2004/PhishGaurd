# Kaggle Datasets Directory

Place the following CSV files here after downloading from Kaggle:

## Required Files

1. **phiusiil.csv**
   - Source: https://www.kaggle.com/datasets/kaggleprollc/phishing-url-websites-dataset-phiusiil
   
2. **phishstorm.csv**
   - Source: https://www.kaggle.com/datasets/joebeachcapital/phishing-urls

3. **phishing_site_urls.csv**
   - Source: https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls

## Usage

After placing files here, run:

```bash
cd "Phishing Web Sites Detection Using Machine Learning"
python merge_and_train.py
```

For faster testing with a sample:

```bash
python merge_and_train.py --sample 5000
```
