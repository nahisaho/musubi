# Feature Flag Guide

## Overview

Best practices for implementing and managing feature flags.

---

## What Are Feature Flags?

Feature flags (feature toggles) are a technique for controlling the release of features without deploying new code.

### Use Cases

1. **Progressive Rollout** - Release to 1%, 10%, 50%, 100%
2. **A/B Testing** - Test variations with users
3. **Kill Switch** - Quickly disable broken features
4. **Beta Features** - Enable for specific users
5. **Ops Toggles** - Circuit breakers, load shedding

---

## Implementation Patterns

### Basic Boolean Flag

```typescript
const featureFlags = {
  newCheckoutFlow: true,
  darkMode: false,
  betaFeatures: false,
};

function showNewCheckout() {
  if (featureFlags.newCheckoutFlow) {
    return <NewCheckout />;
  }
  return <LegacyCheckout />;
}
```

### User-Based Flag

```typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  allowedUsers?: string[];
  allowedRoles?: string[];
  percentage?: number;
}

function isFeatureEnabled(flag: FeatureFlag, user: User): boolean {
  if (!flag.enabled) return false;
  
  // Check user allowlist
  if (flag.allowedUsers?.includes(user.id)) return true;
  
  // Check role allowlist
  if (flag.allowedRoles?.some(role => user.roles.includes(role))) return true;
  
  // Check percentage rollout
  if (flag.percentage !== undefined) {
    const hash = hashUserId(user.id);
    return hash % 100 < flag.percentage;
  }
  
  return flag.enabled;
}
```

### Time-Based Flag

```typescript
interface ScheduledFlag {
  name: string;
  enableAt: Date;
  disableAt?: Date;
}

function isScheduledFlagEnabled(flag: ScheduledFlag): boolean {
  const now = new Date();
  if (now < flag.enableAt) return false;
  if (flag.disableAt && now > flag.disableAt) return false;
  return true;
}
```

---

## Flag Configuration

### JSON Configuration

```json
{
  "flags": {
    "new-checkout": {
      "enabled": true,
      "percentage": 50,
      "description": "New checkout flow"
    },
    "beta-features": {
      "enabled": true,
      "allowedRoles": ["beta-tester", "admin"],
      "description": "Beta features for testers"
    },
    "maintenance-mode": {
      "enabled": false,
      "description": "Enable for maintenance"
    }
  }
}
```

### Environment-Based

```typescript
const flags = {
  development: {
    debugMode: true,
    betaFeatures: true,
  },
  staging: {
    debugMode: true,
    betaFeatures: true,
  },
  production: {
    debugMode: false,
    betaFeatures: false,
  },
};

const currentFlags = flags[process.env.NODE_ENV];
```

---

## Best Practices

### 1. Naming Convention

```typescript
// Good: Clear, descriptive names
'enable-new-checkout-v2'
'show-dark-mode-toggle'
'use-graphql-api'

// Bad: Vague or cryptic
'flag1'
'test'
'temp'
```

### 2. Default to Off

```typescript
function getFlag(name: string): boolean {
  return flags[name] ?? false; // Default to false
}
```

### 3. Document Flags

```typescript
/**
 * Feature Flag: new-payment-provider
 * 
 * Purpose: Enable new Stripe payment integration
 * Owner: payments-team
 * Created: 2024-01-15
 * Target removal: 2024-03-01
 * Dependencies: Stripe SDK v3
 */
```

### 4. Clean Up Old Flags

```markdown
## Flag Lifecycle

1. **Active**: Currently controlling feature
2. **Sunset**: Feature fully rolled out, flag can be removed
3. **Archived**: Flag removed from code
```

### 5. Test Both Paths

```typescript
describe('Checkout', () => {
  it('works with new checkout enabled', () => {
    setFlag('new-checkout', true);
    // test new checkout
  });
  
  it('works with new checkout disabled', () => {
    setFlag('new-checkout', false);
    // test legacy checkout
  });
});
```

---

## Flag Service Example

```typescript
class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  
  constructor(private config: FlagConfig) {
    this.loadFlags();
  }
  
  async loadFlags(): Promise<void> {
    // Load from remote config
    const response = await fetch('/api/flags');
    const data = await response.json();
    data.flags.forEach(flag => {
      this.flags.set(flag.name, flag);
    });
  }
  
  isEnabled(name: string, context?: FlagContext): boolean {
    const flag = this.flags.get(name);
    if (!flag) return false;
    return evaluateFlag(flag, context);
  }
  
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }
}
```

---

## React Integration

```typescript
// FeatureFlagProvider.tsx
const FeatureFlagContext = createContext<FeatureFlagService>(null);

export function FeatureFlagProvider({ children }) {
  const flagService = useMemo(() => new FeatureFlagService(), []);
  
  return (
    <FeatureFlagContext.Provider value={flagService}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// useFeatureFlag.ts
export function useFeatureFlag(name: string): boolean {
  const flagService = useContext(FeatureFlagContext);
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    setEnabled(flagService.isEnabled(name));
  }, [name, flagService]);
  
  return enabled;
}

// Component usage
function MyComponent() {
  const showNewUI = useFeatureFlag('new-ui');
  
  return showNewUI ? <NewUI /> : <LegacyUI />;
}
```

---

## Flag Audit Checklist

| Flag Name | Owner | Created | Status | Cleanup Date |
|-----------|-------|---------|--------|--------------|
| new-checkout | @alice | 2024-01 | Active | - |
| dark-mode | @bob | 2024-02 | Sunset | 2024-04-01 |
| old-api | @carol | 2023-06 | Remove | Overdue! |

---

## Anti-Patterns

### ❌ Too Many Flags
```typescript
// Bad: Feature flag soup
if (flagA && flagB && !flagC && (flagD || flagE)) {
  // What is this even controlling?
}
```

### ❌ Permanent Flags
```typescript
// Bad: Flag that's been on for 2 years
if (flags.newLoginPage) { // Added in 2022
  // This should just be the code now
}
```

### ❌ Complex Flag Logic
```typescript
// Bad: Flag with side effects
if (flags.experimentX) {
  initializeExperimentX();
  trackExperiment('X');
  modifyGlobalState();
}
```
