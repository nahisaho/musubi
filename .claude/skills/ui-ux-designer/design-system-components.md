# Design System Components

## Overview

Guidelines for creating and maintaining design system components.

---

## Component Structure

### Atomic Design Hierarchy

```
Atoms → Molecules → Organisms → Templates → Pages
```

| Level | Description | Examples |
|-------|-------------|----------|
| Atoms | Basic elements | Button, Input, Label |
| Molecules | Simple groups | Form field, Card |
| Organisms | Complex sections | Header, Form, Table |
| Templates | Page layouts | Dashboard layout |
| Pages | Specific instances | Home page |

---

## Component API Design

### Props Pattern

```typescript
interface ButtonProps {
  // Variants
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  
  // States
  disabled?: boolean;
  loading?: boolean;
  
  // Content
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  
  // Actions
  onClick?: () => void;
  
  // Accessibility
  'aria-label'?: string;
}
```

### Composition Pattern

```tsx
// Bad: Props explosion
<Card 
  title="Title"
  subtitle="Subtitle"
  image="/img.jpg"
  headerAction={<Button>Edit</Button>}
  footerLeft={<Button>Cancel</Button>}
  footerRight={<Button>Save</Button>}
/>

// Good: Composition
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Action><Button>Edit</Button></Card.Action>
  </Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>
    <Button>Cancel</Button>
    <Button>Save</Button>
  </Card.Footer>
</Card>
```

---

## Design Tokens

### Color Tokens

```css
:root {
  /* Base colors */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-900: #1e3a8a;
  
  /* Semantic colors */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Text colors */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-disabled: #9ca3af;
  
  /* Background colors */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
}
```

### Spacing Tokens

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
}
```

### Typography Tokens

```css
:root {
  /* Font families */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'Fira Code', monospace;
  
  /* Font sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  
  /* Font weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

---

## Component Documentation

### Component Card Template

```markdown
# Button

Buttons are used to trigger actions or navigation.

## Usage

```jsx
import { Button } from '@/components';

<Button variant="primary" size="md">
  Click me
</Button>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'ghost' | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Button size |
| disabled | boolean | false | Disabled state |
| loading | boolean | false | Loading state |

## Variants

[Visual examples of each variant]

## Sizes

[Visual examples of each size]

## States

- Default
- Hover
- Active
- Focus
- Disabled
- Loading

## Accessibility

- Uses `<button>` element
- Includes focus ring
- Disabled buttons have `aria-disabled`
- Loading buttons announce to screen readers

## Do's and Don'ts

✅ Use primary for main actions
✅ Use ghost for less important actions
❌ Don't use more than one primary per view
❌ Don't disable without explanation
```

---

## Component States

### Interactive States

```css
.button {
  /* Default */
  background: var(--color-primary-500);
  
  /* Hover */
  &:hover:not(:disabled) {
    background: var(--color-primary-600);
  }
  
  /* Active */
  &:active:not(:disabled) {
    background: var(--color-primary-700);
    transform: scale(0.98);
  }
  
  /* Focus */
  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
  
  /* Disabled */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

### Loading State

```tsx
function Button({ loading, children, ...props }) {
  return (
    <button 
      disabled={loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner aria-hidden="true" />
          <span className="sr-only">Loading...</span>
        </>
      ) : children}
    </button>
  );
}
```

---

## Responsive Design

### Breakpoints

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}

@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Responsive Components

```tsx
// Responsive button sizing
<Button 
  size={{ base: 'sm', md: 'md', lg: 'lg' }}
>
  Responsive Button
</Button>

// Stack to row on larger screens
<Stack 
  direction={{ base: 'column', md: 'row' }}
  gap={4}
>
  <Item />
  <Item />
</Stack>
```

---

## Component Checklist

### Design
- [ ] Follows design tokens
- [ ] Has all necessary variants
- [ ] Responsive behavior defined
- [ ] Dark mode support

### Development
- [ ] TypeScript types defined
- [ ] Props documented
- [ ] Unit tests written
- [ ] Storybook stories created

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader tested
- [ ] Focus management
- [ ] Color contrast

### Documentation
- [ ] Usage examples
- [ ] Props table
- [ ] Do's and don'ts
- [ ] Related components
