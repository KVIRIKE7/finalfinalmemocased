// ─────────────────────────────────────────────────────────────────────────────
// SignIn Page  —  /auth/signin
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import type { SignInFormFields, SignInFormErrors } from "../types/auth";

// ── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_FIELDS: SignInFormFields = {
  identifier: "",
  password: "",
};

const INITIAL_ERRORS: SignInFormErrors = {};

// ── Validation ────────────────────────────────────────────────────────────────

function validate(fields: SignInFormFields): SignInFormErrors {
  const errors: SignInFormErrors = {};

  if (!fields.identifier.trim()) {
    errors.identifier = "Email or username is required.";
  }

  if (!fields.password) {
    errors.password = "Password is required.";
  } else if (fields.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignIn(): React.ReactElement {
  const navigate = useNavigate();

  const [fields, setFields] = useState<SignInFormFields>(INITIAL_FIELDS);
  const [errors, setErrors] = useState<SignInFormErrors>(INITIAL_ERRORS);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.currentTarget;

    setFields((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear the field-level error as the user corrects their input
    if (errors[name as keyof SignInFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    const validationErrors = validate(fields);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors(INITIAL_ERRORS);

    try {
      // ── Mock successful sign-in ──────────────────────────────────────────
      // Replace this block with your real auth service call when ready:
      //   const session = await authService.signIn(fields);
      await new Promise<void>((resolve) => setTimeout(resolve, 600));

      navigate("/home");
    } catch {
      setErrors({ form: "Invalid credentials. Please try again." });
      setIsSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasFieldErrors =
    Boolean(errors.identifier) || Boolean(errors.password);

  return (
    <AuthLayout toggleHref="/auth/signup" toggleLabel="Join Now">
      <div className="auth-form-wrapper">
        {/* ── Heading ──────────────────────────────────────────────────── */}
        <div className="auth-form-heading">
          <h1 className="auth-form-heading__title">Sign in to your account</h1>
          <p className="auth-form-heading__subtitle">
            Track every show. Rate every episode.
          </p>
        </div>

        {/* ── Form-level error banner ───────────────────────────────────── */}
        {errors.form && (
          <div
            className="auth-form-error-banner"
            role="alert"
            aria-live="assertive"
          >
            <span className="auth-form-error-banner__icon" aria-hidden="true">
              ⚠
            </span>
            <p className="auth-form-error-banner__message">{errors.form}</p>
          </div>
        )}

        {/* ── Sign In Form ─────────────────────────────────────────────── */}
        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Sign in form"
        >
          {/* Email or Username */}
          <div className="auth-form__field-group">
            <label
              className="auth-form__label"
              htmlFor="signin-identifier"
            >
              Email or Username
            </label>
            <input
              className={[
                "auth-form__input",
                errors.identifier ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              id="signin-identifier"
              name="identifier"
              type="text"
              autoComplete="username email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={fields.identifier}
              onChange={handleChange}
              aria-invalid={Boolean(errors.identifier)}
              aria-describedby={
                errors.identifier ? "signin-identifier-error" : undefined
              }
              disabled={isSubmitting}
              placeholder="you@example.com"
            />
            {errors.identifier && (
              <p
                className="auth-form__field-error"
                id="signin-identifier-error"
                role="alert"
              >
                {errors.identifier}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="auth-form__field-group">
            <label className="auth-form__label" htmlFor="signin-password">
              Password
            </label>
            <input
              className={[
                "auth-form__input",
                errors.password ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              id="signin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={fields.password}
              onChange={handleChange}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "signin-password-error" : undefined
              }
              disabled={isSubmitting}
              placeholder="••••••••"
            />
            {errors.password && (
              <p
                className="auth-form__field-error"
                id="signin-password-error"
                role="alert"
              >
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            className="auth-form__submit-button"
            type="submit"
            disabled={isSubmitting || hasFieldErrors}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* ── Footer link ──────────────────────────────────────────────── */}
        <p className="auth-form-footer">
          Don't have an account?{" "}
          <a className="auth-form-footer__link" href="/auth/signup">
            Create one for free
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}