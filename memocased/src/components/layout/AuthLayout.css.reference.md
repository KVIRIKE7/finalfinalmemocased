# AuthLayout — CSS Class Reference

Every class emitted by `AuthLayout`, `SignIn`, and `SignUp`. 
Apply styles to these names in your stylesheet of choice (CSS Modules, 
vanilla CSS, Tailwind @apply, etc.).

---

## Layout Shell

| Class | Element | Role |
|---|---|---|
| `.auth-layout` | `<div>` root | Full-viewport flex row container |
| `.auth-layout__backdrop` | `<section>` | Left panel, 60% width, hidden on mobile |
| `.auth-layout__backdrop-image` | `<img>` | Cover-fit backdrop photo |
| `.auth-layout__backdrop-skeleton` | `<div>` | Shimmer placeholder while loading |
| `.auth-layout__backdrop-overlay` | `<div>` | Gradient scrim over the image |
| `.auth-layout__backdrop-attribution` | `<p>` | Show name watermark, bottom of left panel |
| `.auth-layout__backdrop-attribution-label` | `<span>` | "Now featured:" prefix text |
| `.auth-layout__panel` | `<section>` | Right panel, 40% desktop / 100% mobile |
| `.auth-layout__panel-header` | `<header>` | Logo + toggle button row |
| `.auth-layout__logo-link` | `<a>` | Wraps the logo, links to `/` |
| `.auth-layout__logo-wordmark` | `<span>` | Text "Memocased" (replace with SVG) |
| `.auth-layout__toggle-button` | `<a>` | "Join Now" / "Sign In" pill button |
| `.auth-layout__panel-main` | `<main>` | Scrollable form slot |

---

## Shared Form Elements (used on both pages)

| Class | Element | Role |
|---|---|---|
| `.auth-form-wrapper` | `<div>` | Centered column inside the panel |
| `.auth-form-heading` | `<div>` | Groups `h1` + subtitle paragraph |
| `.auth-form-heading__title` | `<h1>` | Main page heading |
| `.auth-form-heading__subtitle` | `<p>` | Supporting tagline below heading |
| `.auth-form-error-banner` | `<div>` | Red alert box for form-level errors |
| `.auth-form-error-banner__icon` | `<span>` | ⚠ icon inside the banner |
| `.auth-form-error-banner__message` | `<p>` | Error message text |
| `.auth-form` | `<form>` | The form element itself |
| `.auth-form__field-group` | `<div>` | Wraps label + input + error per field |
| `.auth-form__label` | `<label>` | Field label |
| `.auth-form__input` | `<input>` | Text / email / password input |
| `.auth-form__input--error` | modifier | Applied to input when field has an error |
| `.auth-form__field-error` | `<p>` | Per-field validation message |
| `.auth-form__field-hint` | `<p>` | Neutral helper text (e.g. "Min 8 chars") |
| `.auth-form__submit-button` | `<button>` | Primary CTA, full-width |
| `.auth-form-footer` | `<p>` | "Already have an account?" line |
| `.auth-form-footer__link` | `<a>` | The underlined link inside footer |

---

## Page Loader (router-level Suspense fallback)

| Class | Element | Role |
|---|---|---|
| `.page-loader` | `<div>` | Centered full-screen loading state |
| `.page-loader__spinner` | `<span>` | Animated spinner element |

---

## Home Placeholder

| Class | Element | Role |
|---|---|---|
| `.home-placeholder` | `<div>` | Centered content wrapper |
| `.home-placeholder__title` | `<h1>` | Welcome heading |
| `.home-placeholder__body` | `<p>` | Supporting copy |

---

## Responsive Breakpoint Notes

The layout is built mobile-first. Apply these at your breakpoints:

```
/* Mobile (default): single column */
.auth-layout           → flex-direction: column
.auth-layout__backdrop → display: none
.auth-layout__panel    → width: 100%

/* Desktop (e.g. ≥ 768px) */
.auth-layout           → flex-direction: row
.auth-layout__backdrop → display: block; width: 60%
.auth-layout__panel    → width: 40%
```