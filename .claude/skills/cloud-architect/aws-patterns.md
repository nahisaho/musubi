# AWS Architecture Patterns

## Overview

Common architecture patterns for AWS cloud deployments.

---

## Compute Patterns

### Serverless API

```
┌──────────┐    ┌─────────────┐    ┌──────────┐
│ API GW   │───▶│   Lambda    │───▶│ DynamoDB │
└──────────┘    └─────────────┘    └──────────┘
```

```yaml
# serverless.yml
service: my-api

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1

functions:
  getUser:
    handler: src/handlers/getUser.handler
    events:
      - http:
          path: users/{id}
          method: get
    environment:
      TABLE_NAME: !Ref UsersTable

resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: users
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
```

### Container-based API

```
┌──────────┐    ┌─────────────┐    ┌──────────┐
│   ALB    │───▶│    ECS      │───▶│   RDS    │
└──────────┘    │   Fargate   │    │ Postgres │
                └─────────────┘    └──────────┘
```

```yaml
# task-definition.json
{
  "family": "my-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "my-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgres://..."
        }
      ]
    }
  ]
}
```

---

## Data Patterns

### Event-Driven Architecture

```
┌──────────┐    ┌─────────────┐    ┌──────────┐
│ Producer │───▶│   EventBridge│───▶│ Consumer │
└──────────┘    │     or SNS  │    │  Lambda  │
                └─────────────┘    └──────────┘
```

### Stream Processing

```
┌──────────┐    ┌─────────────┐    ┌──────────┐
│ Kinesis  │───▶│   Lambda    │───▶│    S3    │
│ Stream   │    │  Processor  │    │ Data Lake│
└──────────┘    └─────────────┘    └──────────┘
```

---

## Security Patterns

### VPC Architecture

```yaml
# CloudFormation VPC
Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.10.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
```

### IAM Best Practices

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/users",
      "Condition": {
        "StringEquals": {
          "dynamodb:LeadingKeys": ["${aws:userid}"]
        }
      }
    }
  ]
}
```

---

## High Availability

### Multi-AZ Deployment

```
         ┌───────────────────────────────────────┐
         │              Region                   │
         │                                       │
         │   ┌─────────────┐  ┌─────────────┐   │
         │   │    AZ-a     │  │    AZ-b     │   │
         │   │             │  │             │   │
         │   │ ┌─────────┐ │  │ ┌─────────┐ │   │
         │   │ │   EC2   │ │  │ │   EC2   │ │   │
         │   │ └────┬────┘ │  │ └────┬────┘ │   │
         │   │      │      │  │      │      │   │
         │   │ ┌────┴────┐ │  │ ┌────┴────┐ │   │
         │   │ │ RDS     │◀┼──┼▶│ RDS     │ │   │
         │   │ │ Primary │ │  │ │ Standby │ │   │
         │   │ └─────────┘ │  │ └─────────┘ │   │
         │   └─────────────┘  └─────────────┘   │
         └───────────────────────────────────────┘
```

---

## Cost Optimization

### Compute Savings

| Option | Savings | Use Case |
|--------|---------|----------|
| Reserved Instances | Up to 72% | Predictable workloads |
| Savings Plans | Up to 72% | Flexible compute |
| Spot Instances | Up to 90% | Fault-tolerant |

### Storage Tiers

| Tier | Cost | Access |
|------|------|--------|
| S3 Standard | $$$ | Frequent |
| S3 IA | $$ | Infrequent |
| S3 Glacier | $ | Archive |

---

## Well-Architected Checklist

### Operational Excellence
- [ ] Infrastructure as code
- [ ] Automated deployments
- [ ] Monitoring and alerting

### Security
- [ ] Least privilege IAM
- [ ] Encryption at rest and in transit
- [ ] VPC isolation

### Reliability
- [ ] Multi-AZ deployment
- [ ] Auto-scaling configured
- [ ] Disaster recovery plan

### Performance
- [ ] Right-sized resources
- [ ] Caching implemented
- [ ] CDN for static content

### Cost Optimization
- [ ] Reserved/spot usage
- [ ] Resource tagging
- [ ] Cost monitoring
