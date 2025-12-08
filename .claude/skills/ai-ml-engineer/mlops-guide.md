# MLOps Guide

## Overview

Best practices for Machine Learning Operations (MLOps) in production systems.

---

## MLOps Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Data    │───▶│  Train   │───▶│  Deploy  │───▶│ Monitor  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │
     └───────────────┴───────────────┴───────────────┘
                    Continuous Loop
```

---

## 1. Data Management

### Data Versioning

```bash
# Using DVC (Data Version Control)
dvc init
dvc add data/training_data.csv
git add data/training_data.csv.dvc .gitignore
git commit -m "Add training data v1"
```

### Data Pipeline

```python
# data_pipeline.py
from prefect import flow, task

@task
def extract_data(source: str) -> pd.DataFrame:
    return pd.read_csv(source)

@task
def transform_data(df: pd.DataFrame) -> pd.DataFrame:
    # Feature engineering
    df['feature_1'] = df['col_a'] * df['col_b']
    return df

@task
def validate_data(df: pd.DataFrame) -> bool:
    # Data quality checks
    assert df['feature_1'].isnull().sum() == 0
    return True

@flow
def data_pipeline(source: str):
    df = extract_data(source)
    df = transform_data(df)
    validate_data(df)
    return df
```

---

## 2. Experiment Tracking

### MLflow Setup

```python
import mlflow
from mlflow.tracking import MlflowClient

# Set tracking URI
mlflow.set_tracking_uri("http://mlflow-server:5000")
mlflow.set_experiment("my-experiment")

# Log experiment
with mlflow.start_run():
    # Log parameters
    mlflow.log_param("learning_rate", 0.01)
    mlflow.log_param("epochs", 100)
    
    # Train model
    model = train_model(X_train, y_train)
    
    # Log metrics
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", f1)
    
    # Log model
    mlflow.sklearn.log_model(model, "model")
    
    # Log artifacts
    mlflow.log_artifact("feature_importance.png")
```

---

## 3. Model Registry

### Model Versioning

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Register model
model_uri = f"runs:/{run_id}/model"
mv = client.create_model_version(
    name="my-model",
    source=model_uri,
    run_id=run_id
)

# Transition to staging
client.transition_model_version_stage(
    name="my-model",
    version=mv.version,
    stage="Staging"
)

# Promote to production
client.transition_model_version_stage(
    name="my-model",
    version=mv.version,
    stage="Production"
)
```

### Model Metadata

```yaml
# model_metadata.yaml
model:
  name: fraud-detector
  version: 2.1.0
  framework: scikit-learn
  
training:
  date: 2024-01-15
  dataset_version: v1.2
  metrics:
    accuracy: 0.95
    f1_score: 0.92
    
requirements:
  - scikit-learn==1.3.0
  - pandas==2.0.0
  
schema:
  input:
    - name: amount
      type: float
    - name: category
      type: string
  output:
    - name: is_fraud
      type: boolean
    - name: confidence
      type: float
```

---

## 4. Model Deployment

### Serving with FastAPI

```python
from fastapi import FastAPI
import mlflow

app = FastAPI()

# Load model on startup
model = mlflow.sklearn.load_model("models:/my-model/Production")

@app.post("/predict")
async def predict(features: dict):
    df = pd.DataFrame([features])
    prediction = model.predict(df)
    probability = model.predict_proba(df)
    
    return {
        "prediction": int(prediction[0]),
        "confidence": float(probability[0].max())
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "model_version": "2.1.0"}
```

### Deployment Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| Shadow | Run parallel to existing | Validate new model |
| Canary | Gradual traffic shift | Safe rollout |
| Blue-Green | Full switch | Quick rollback |
| A/B Test | Split traffic | Compare models |

---

## 5. Monitoring

### Prediction Logging

```python
import logging
from datetime import datetime

def log_prediction(request, response, latency_ms):
    logging.info({
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": request.id,
        "features": request.features,
        "prediction": response.prediction,
        "confidence": response.confidence,
        "latency_ms": latency_ms,
        "model_version": "2.1.0"
    })
```

### Data Drift Detection

```python
from scipy import stats

def detect_drift(reference_data, current_data, threshold=0.05):
    """Detect distribution drift using KS test."""
    drifted_features = []
    
    for column in reference_data.columns:
        statistic, p_value = stats.ks_2samp(
            reference_data[column],
            current_data[column]
        )
        
        if p_value < threshold:
            drifted_features.append({
                "feature": column,
                "p_value": p_value,
                "statistic": statistic
            })
    
    return drifted_features
```

### Performance Metrics

```python
# Prometheus metrics for ML
from prometheus_client import Counter, Histogram, Gauge

prediction_counter = Counter(
    'model_predictions_total',
    'Total predictions',
    ['model_version', 'prediction_class']
)

prediction_latency = Histogram(
    'model_prediction_latency_seconds',
    'Prediction latency',
    ['model_version']
)

model_accuracy = Gauge(
    'model_accuracy',
    'Current model accuracy',
    ['model_version']
)
```

---

## 6. CI/CD for ML

### GitHub Actions Pipeline

```yaml
# .github/workflows/ml-pipeline.yml
name: ML Pipeline

on:
  push:
    paths:
      - 'models/**'
      - 'data/**'

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Pull data
        run: dvc pull
      
      - name: Train model
        run: python train.py
      
      - name: Evaluate model
        run: python evaluate.py
      
      - name: Register model
        if: github.ref == 'refs/heads/main'
        run: python register_model.py
```

---

## 7. Best Practices

### Reproducibility Checklist

- [ ] Code versioned in Git
- [ ] Data versioned with DVC
- [ ] Dependencies pinned (requirements.txt)
- [ ] Random seeds set
- [ ] Experiments logged in MLflow
- [ ] Model artifacts stored

### Model Validation Checklist

- [ ] Performance metrics acceptable
- [ ] No data leakage
- [ ] Fairness metrics checked
- [ ] Edge cases tested
- [ ] Latency requirements met
- [ ] Memory usage acceptable

### Production Checklist

- [ ] Model card documented
- [ ] API versioned
- [ ] Health checks implemented
- [ ] Monitoring in place
- [ ] Rollback procedure defined
- [ ] A/B test framework ready
