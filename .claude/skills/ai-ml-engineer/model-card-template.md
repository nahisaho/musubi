# Model Card Template

## Overview

Template for documenting machine learning models following best practices.

---

## Model Card Document

```markdown
# Model Card: [Model Name]

## Model Details

### Basic Information
| Field | Value |
|-------|-------|
| Model Name | [Name] |
| Version | [X.Y.Z] |
| Type | [Classification/Regression/etc.] |
| Framework | [TensorFlow/PyTorch/scikit-learn] |
| Date | YYYY-MM-DD |
| Authors | [Team/Names] |

### Description
[Brief description of what the model does]

### Intended Use
- **Primary Use Cases**: [What it's designed for]
- **Intended Users**: [Who should use it]
- **Out-of-Scope Uses**: [What it shouldn't be used for]

---

## Model Architecture

### Overview
[Description of model architecture]

### Inputs
| Name | Type | Shape | Description |
|------|------|-------|-------------|
| feature_1 | float | (1,) | Transaction amount |
| feature_2 | int | (1,) | Category code |

### Outputs
| Name | Type | Shape | Description |
|------|------|-------|-------------|
| prediction | int | (1,) | Class label |
| probability | float | (n_classes,) | Class probabilities |

### Hyperparameters
| Parameter | Value |
|-----------|-------|
| learning_rate | 0.001 |
| batch_size | 32 |
| epochs | 100 |

---

## Training Data

### Dataset Description
| Field | Value |
|-------|-------|
| Name | [Dataset name] |
| Version | [Version] |
| Size | [N samples] |
| Date Range | [Start] to [End] |

### Data Distribution
| Feature | Distribution |
|---------|--------------|
| Class 0 | 85% |
| Class 1 | 15% |

### Preprocessing
- [Step 1]: [Description]
- [Step 2]: [Description]

### Data Splits
| Split | Size | Purpose |
|-------|------|---------|
| Train | 70% | Model training |
| Validation | 15% | Hyperparameter tuning |
| Test | 15% | Final evaluation |

---

## Evaluation

### Metrics
| Metric | Value | Threshold |
|--------|-------|-----------|
| Accuracy | 0.95 | > 0.90 |
| Precision | 0.92 | > 0.85 |
| Recall | 0.88 | > 0.80 |
| F1 Score | 0.90 | > 0.85 |
| AUC-ROC | 0.97 | > 0.90 |

### Confusion Matrix
```
              Predicted
              0     1
Actual  0   850    50
        1    30   120
```

### Performance by Subgroup
| Subgroup | Accuracy | Size |
|----------|----------|------|
| Group A | 0.96 | 400 |
| Group B | 0.94 | 350 |
| Group C | 0.93 | 250 |

---

## Fairness & Bias

### Evaluation
| Metric | Group A | Group B | Threshold |
|--------|---------|---------|-----------|
| TPR | 0.89 | 0.87 | Δ < 0.05 ✅ |
| FPR | 0.08 | 0.09 | Δ < 0.05 ✅ |
| PPV | 0.91 | 0.89 | Δ < 0.05 ✅ |

### Mitigation Steps
- [Step taken to address bias]

### Known Limitations
- [Limitation 1]
- [Limitation 2]

---

## Ethical Considerations

### Potential Risks
- [Risk 1]: [Mitigation]
- [Risk 2]: [Mitigation]

### Use Cases to Avoid
- [Should not be used for X]

---

## Deployment

### Requirements
```
python>=3.9
tensorflow==2.12.0
numpy==1.24.0
```

### Resource Requirements
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| Memory | 2 GB | 4 GB |
| GPU | - | NVIDIA T4 |

### Latency
| Percentile | Latency |
|------------|---------|
| p50 | 15ms |
| p95 | 45ms |
| p99 | 80ms |

### Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| /predict | POST | Get prediction |
| /health | GET | Health check |

---

## Monitoring

### Metrics to Track
- Prediction distribution
- Latency percentiles
- Error rate
- Data drift indicators

### Alerting Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Latency p99 | > 100ms | > 200ms |
| Error Rate | > 1% | > 5% |
| Drift Score | > 0.1 | > 0.2 |

### Retraining Triggers
- [Trigger 1]: [Condition]
- [Trigger 2]: [Condition]

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | YYYY-MM-DD | Initial release |
| 1.1.0 | YYYY-MM-DD | Added feature X |
| 2.0.0 | YYYY-MM-DD | Major architecture change |

---

## References

- [Link to training code]
- [Link to data documentation]
- [Link to related papers]
- [Link to API documentation]

---

## Contact

For questions or issues:
- Team: [Team name]
- Email: [Contact email]
- Slack: [Channel]
```

---

## Quick Checklist

### Before Release
- [ ] Model architecture documented
- [ ] Training data described
- [ ] Evaluation metrics included
- [ ] Fairness analysis completed
- [ ] Ethical risks assessed
- [ ] Deployment requirements listed
- [ ] Monitoring plan defined
- [ ] Version history updated

### Review Questions
1. Is the intended use clearly defined?
2. Are limitations and risks documented?
3. Can another team reproduce training?
4. Are bias metrics acceptable?
5. Is there a monitoring plan?
