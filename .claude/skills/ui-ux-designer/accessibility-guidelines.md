# UI/UX Accessibility Guidelines

## Overview

Guidelines for creating accessible user interfaces following WCAG 2.1 standards.

---

## WCAG Principles (POUR)

### 1. Perceivable
Content can be perceived by all users.

### 2. Operable
Interface can be operated by all users.

### 3. Understandable
Content and operation is understandable.

### 4. Robust
Content works with assistive technologies.

---

## Common Accessibility Patterns

### Images

```html
<!-- Informative image -->
<img src="chart.png" alt="Sales increased 25% from January to March">

<!-- Decorative image -->
<img src="decoration.png" alt="" role="presentation">

<!-- Complex image -->
<figure>
  <img src="flowchart.png" alt="User registration process">
  <figcaption>
    Detailed description: User enters email, confirms via link, 
    sets password, completes profile.
  </figcaption>
</figure>
```

### Forms

```html
<!-- Label association -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" required
       aria-describedby="email-hint">
<span id="email-hint">We'll never share your email.</span>

<!-- Error handling -->
<label for="password">Password</label>
<input type="password" id="password" 
       aria-invalid="true"
       aria-describedby="password-error">
<span id="password-error" role="alert">
  Password must be at least 8 characters.
</span>
```

### Buttons

```html
<!-- Text button -->
<button type="submit">Submit form</button>

<!-- Icon button -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Toggle button -->
<button type="button" 
        aria-pressed="false"
        onclick="toggleDarkMode()">
  Dark Mode
</button>
```

### Navigation

```html
<!-- Skip link -->
<a href="#main" class="skip-link">Skip to main content</a>

<!-- Landmark regions -->
<header role="banner">...</header>
<nav role="navigation" aria-label="Main menu">...</nav>
<main id="main" role="main">...</main>
<footer role="contentinfo">...</footer>

<!-- Breadcrumb -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li aria-current="page">Widget</li>
  </ol>
</nav>
```

---

## Keyboard Navigation

### Focus Management

```css
/* Visible focus indicator */
:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Focus-visible for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### Tab Order

```html
<!-- Natural tab order -->
<input type="text">
<button>Submit</button>

<!-- Skip decorative elements -->
<div tabindex="-1">Decorative</div>

<!-- Custom focusable element -->
<div role="button" tabindex="0" 
     onkeydown="handleKeyDown(event)">
  Custom Button
</div>
```

### Keyboard Shortcuts

```javascript
document.addEventListener('keydown', (e) => {
  // Escape to close modal
  if (e.key === 'Escape' && modalOpen) {
    closeModal();
  }
  
  // Arrow keys for navigation
  if (e.key === 'ArrowDown') {
    focusNextItem();
  }
});
```

---

## Color and Contrast

### Contrast Requirements

| Element | Ratio | Level |
|---------|-------|-------|
| Normal text | 4.5:1 | AA |
| Large text (18px+) | 3:1 | AA |
| UI components | 3:1 | AA |
| Enhanced | 7:1 | AAA |

### Color Independence

```css
/* Don't rely on color alone */
/* Bad */
.error { color: red; }

/* Good */
.error {
  color: red;
  border: 2px solid red;
}
.error::before {
  content: "⚠ ";
}
```

---

## ARIA Patterns

### Modal Dialog

```html
<div role="dialog" 
     aria-modal="true" 
     aria-labelledby="dialog-title"
     aria-describedby="dialog-desc">
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-desc">Are you sure you want to delete?</p>
  <button onclick="confirm()">Yes, delete</button>
  <button onclick="closeDialog()">Cancel</button>
</div>
```

### Tabs

```html
<div role="tablist" aria-label="Settings">
  <button role="tab" 
          id="tab-1" 
          aria-selected="true"
          aria-controls="panel-1">
    General
  </button>
  <button role="tab" 
          id="tab-2" 
          aria-selected="false"
          aria-controls="panel-2"
          tabindex="-1">
    Privacy
  </button>
</div>
<div role="tabpanel" 
     id="panel-1" 
     aria-labelledby="tab-1">
  General settings content
</div>
<div role="tabpanel" 
     id="panel-2" 
     aria-labelledby="tab-2"
     hidden>
  Privacy settings content
</div>
```

### Live Regions

```html
<!-- Status messages -->
<div role="status" aria-live="polite">
  Form submitted successfully!
</div>

<!-- Important alerts -->
<div role="alert" aria-live="assertive">
  Session expiring in 2 minutes!
</div>

<!-- Loading indicator -->
<div role="status" aria-busy="true" aria-live="polite">
  Loading results...
</div>
```

---

## Testing Checklist

### Automated
- [ ] Run axe-core or Lighthouse
- [ ] Validate HTML
- [ ] Check color contrast

### Manual
- [ ] Navigate with keyboard only
- [ ] Test with screen reader
- [ ] Zoom to 200%
- [ ] Disable CSS
- [ ] Check focus order

### Screen Readers
- [ ] VoiceOver (macOS/iOS)
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)
- [ ] TalkBack (Android)

---

## Common Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| Missing alt text | Blind users can't understand images | Add descriptive alt |
| No focus indicator | Keyboard users get lost | Add visible outline |
| Color only meaning | Colorblind miss info | Add text/icons |
| No labels | Screen readers can't identify fields | Associate labels |
| Mouse-only UI | Keyboard users blocked | Add keyboard support |

---

## Accessibility Statement Template

```markdown
# Accessibility Statement

[Company] is committed to ensuring accessibility for all users.

## Standards
We aim to conform to WCAG 2.1 Level AA standards.

## Current Status
We are continuously improving accessibility. Known issues:
- [Issue 1]: [Expected fix date]
- [Issue 2]: [Expected fix date]

## Feedback
If you encounter accessibility barriers:
- Email: accessibility@example.com
- Phone: 1-800-XXX-XXXX

Last updated: [Date]
```
