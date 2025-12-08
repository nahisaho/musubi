# Azure Architecture Patterns

## Overview

Common architecture patterns for Microsoft Azure cloud deployments.

---

## Compute Patterns

### Serverless API

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│ API Management│───▶│Azure Functions│───▶│  Cosmos DB   │
└──────────────┘    └───────────────┘    └──────────────┘
```

```json
// function.json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get"],
      "route": "users/{id}"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    },
    {
      "type": "cosmosDB",
      "direction": "in",
      "name": "user",
      "databaseName": "mydb",
      "collectionName": "users",
      "id": "{id}",
      "partitionKey": "{id}"
    }
  ]
}
```

### Container-based API

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│App Gateway   │───▶│     AKS       │───▶│ Azure SQL    │
└──────────────┘    │  Kubernetes   │    │   Database   │
                    └───────────────┘    └──────────────┘
```

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api
    spec:
      containers:
      - name: api
        image: myregistry.azurecr.io/my-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: connection-string
```

---

## Data Patterns

### Event-Driven Architecture

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│   Producer   │───▶│  Event Grid   │───▶│   Consumer   │
│              │    │    or         │    │   Function   │
│              │    │  Service Bus  │    │              │
└──────────────┘    └───────────────┘    └──────────────┘
```

### Stream Processing

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  Event Hubs  │───▶│Stream Analytics│───▶│ Data Lake    │
│              │    │               │    │   Storage    │
└──────────────┘    └───────────────┘    └──────────────┘
```

---

## Security Patterns

### Virtual Network

```bicep
// vnet.bicep
resource vnet 'Microsoft.Network/virtualNetworks@2021-02-01' = {
  name: 'my-vnet'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      {
        name: 'web-subnet'
        properties: {
          addressPrefix: '10.0.1.0/24'
          networkSecurityGroup: {
            id: webNsg.id
          }
        }
      }
      {
        name: 'db-subnet'
        properties: {
          addressPrefix: '10.0.2.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}
```

### Managed Identity

```bicep
// Using managed identity with Key Vault
resource functionApp 'Microsoft.Web/sites@2021-02-01' = {
  name: 'my-function'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    siteConfig: {
      appSettings: [
        {
          name: 'KeyVaultUri'
          value: keyVault.properties.vaultUri
        }
      ]
    }
  }
}

// Grant access to Key Vault
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2021-04-01-preview' = {
  name: '${keyVault.name}/add'
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: functionApp.identity.principalId
        permissions: {
          secrets: ['get', 'list']
        }
      }
    ]
  }
}
```

---

## High Availability

### Multi-Region Deployment

```
       ┌─────────────────────────────────────────────┐
       │              Azure Front Door               │
       └─────────────────────┬───────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
┌─────────────────┐                   ┌─────────────────┐
│   East US       │                   │   West Europe   │
│                 │                   │                 │
│  ┌───────────┐  │                   │  ┌───────────┐  │
│  │    AKS    │  │                   │  │    AKS    │  │
│  └─────┬─────┘  │                   │  └─────┬─────┘  │
│        │        │                   │        │        │
│  ┌─────┴─────┐  │                   │  ┌─────┴─────┐  │
│  │ Cosmos DB │◀─┼───────────────────┼─▶│ Cosmos DB │  │
│  │  (Geo-    │  │                   │  │   (Geo-   │  │
│  │ replicated)│ │                   │  │replicated)│  │
│  └───────────┘  │                   │  └───────────┘  │
└─────────────────┘                   └─────────────────┘
```

---

## Azure Well-Architected

### Reliability
- [ ] Availability zones used
- [ ] Traffic Manager/Front Door configured
- [ ] Geo-replication enabled
- [ ] Backup and restore tested

### Security
- [ ] Azure AD authentication
- [ ] Managed identities used
- [ ] Key Vault for secrets
- [ ] Private endpoints configured

### Cost Optimization
- [ ] Reserved instances evaluated
- [ ] Right-sized resources
- [ ] Auto-scaling configured
- [ ] Cost alerts set up

### Operational Excellence
- [ ] ARM/Bicep templates
- [ ] Azure DevOps pipelines
- [ ] Application Insights
- [ ] Log Analytics workspace

### Performance
- [ ] CDN for static content
- [ ] Redis Cache configured
- [ ] Appropriate service tiers
- [ ] Performance monitoring

---

## Bicep Template Structure

```bicep
// main.bicep
targetScope = 'subscription'

param location string = 'eastus'
param environment string = 'prod'

resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-myapp-${environment}'
  location: location
}

module network './modules/network.bicep' = {
  scope: rg
  name: 'network'
  params: {
    location: location
    environment: environment
  }
}

module compute './modules/compute.bicep' = {
  scope: rg
  name: 'compute'
  params: {
    location: location
    environment: environment
    subnetId: network.outputs.subnetId
  }
}
```

---

## Service Selection Guide

| Need | Service |
|------|---------|
| Simple web app | App Service |
| Containers | AKS or Container Apps |
| Serverless | Functions |
| SQL database | Azure SQL |
| NoSQL database | Cosmos DB |
| Messaging | Service Bus |
| Events | Event Grid |
| Storage | Blob Storage |
| CDN | Azure CDN / Front Door |
| Secrets | Key Vault |
| Monitoring | Application Insights |
