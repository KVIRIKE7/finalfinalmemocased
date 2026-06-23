// ─────────────────────────────────────────────────────────────────────────────
// SignUp Page  —  /auth/signup
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import type { SignUpFormFields, SignUpFormErrors } from "../types/auth";
import { signUp } from "../services/authService";
import { useUser } from "../store/UserContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_FIELDS: SignUpFormFields = {
  fullName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const INITIAL_ERRORS: SignUpFormErrors = {};

// ── Validation ────────────────────────────────────────────────────────────────

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields: SignUpFormFields): SignUpFormErrors {
  const errors: SignUpFormErrors = {};

  if (!fields.fullName.trim()) {
    errors.fullName = "Full name is required.";
  } else if (fields.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  }

  if (!fields.username.trim()) {
    errors.username = "Username is required.";
  } else if (!USERNAME_REGEX.test(fields.username)) {
    errors.username =
      "Username must be 3–20 characters and contain only letters, numbers, or underscores.";
  }

  if (!fields.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!EMAIL_REGEX.test(fields.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!fields.password) {
    errors.password = "Password is required.";
  } else if (fields.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!fields.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (fields.confirmPassword !== fields.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignUp(): React.ReactElement {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const [fields, setFields] = useState<SignUpFormFields>(INITIAL_FIELDS);
  const [errors, setErrors] = useState<SignUpFormErrors>(INITIAL_ERRORS);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.currentTarget;

    setFields((prev) => ({ ...prev, [name]: value }));

    // Clear the field error as the user types a correction
    if (errors[name as keyof SignUpFormErrors]) {
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
      const { user, error } = await signUp({
        fullName: fields.fullName,
        username: fields.username,
        email:    fields.email,
        password: fields.password,
      });

      if (error || !user) {
        setErrors({ form: error ?? "Could not create your account. Please try again." });
        setIsSubmitting(false);
        return;
      }

      setUser(user);
      navigate(`/${user.username}`);
    } catch {
      setErrors({ form: "Could not create your account. Please try again." });
      setIsSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthLayout toggleHref="/auth/signin" toggleLabel="Sign In">
      <div className="auth-form-wrapper">
        {/* ── Heading ──────────────────────────────────────────────────── */}
        <div className="auth-form-heading">
          <h1 className="auth-form-heading__title">Create Your Account</h1>
          <p className="auth-form-heading__subtitle">
            Free forever. No spoilers guaranteed.
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

        {/* ── Sign Up Form ─────────────────────────────────────────────── */}
        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Create account form"
        >
          {/* Full Name */}
          <div className="auth-form__field-group">
            <label className="auth-form__label" htmlFor="signup-fullName">
              Full Name
            </label>
            <input
              className={[
                "auth-form__input",
                errors.fullName ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              id="signup-fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              value={fields.fullName}
              onChange={handleChange}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={
                errors.fullName ? "signup-fullName-error" : undefined
              }
              disabled={isSubmitting}
              placeholder="Jane Doe"
            />
            {errors.fullName && (
              <p
                className="auth-form__field-error"
                id="signup-fullName-error"
                role="alert"
              >
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Username */}
          <div className="auth-form__field-group">
            <label className="auth-form__label" htmlFor="signup-username">
              Username
            </label>
            <input
              className={[
                "auth-form__input",
                errors.username ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              id="signup-username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={fields.username}
              onChange={handleChange}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={
                errors.username ? "signup-username-error" : undefined
              }
              disabled={isSubmitting}
              placeholder="janedoe_tv"
            />
            {errors.username && (
              <p
                className="auth-form__field-error"
                id="signup-username-error"
                role="alert"
              >
                {errors.username}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="auth-form__field-group">
            <label className="auth-form__label" htmlFor="signup-email">
              Email Address
            </label>
            <input
              className={[
                "auth-form__input",
                errors.email ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={fields.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "signup-email-error" : undefined
              }
              disabled={isSubmitting}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p
                className="auth-form__field-error"
                id="signup-email-error"
                role="alert"
              >
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="auth-form__field-group">
            <label className="auth-form__label" htmlFor="signup-password">
              Password
            </label>
            <input
              className={[
                "auth-form__input",
                errors.password ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={fields.password}
              onChange={handleChange}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "signup-password-error" : "signup-password-hint"
              }
              disabled={isSubmitting}
              placeholder="••••••••"
            />
            {errors.password ? (
              <p
                className="auth-form__field-error"
                id="signup-password-error"
                role="alert"
              >
                {errors.password}
              </p>
            ) : (
              <p className="auth-form__field-hint" id="signup-password-hint">
                Minimum 8 characters.
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="auth-form__field-group">
            <label
              className="auth-form__label"
              htmlFor="signup-confirmPassword"
            >
              Confirm Password
            </label>
            <input
              className={[
                "auth-form__input",
                errors.confirmPassword ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              id="signup-confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={fields.confirmPassword}
              onChange={handleChange}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword
                  ? "signup-confirmPassword-error"
                  : undefined
              }
              disabled={isSubmitting}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p
                className="auth-form__field-error"
                id="signup-confirmPassword-error"
                role="alert"
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            className="auth-form__submit-button"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        {/* ── Footer link ──────────────────────────────────────────────── */}
        <p className="auth-form-footer">
          Already have an account?{" "}
          <a className="auth-form-footer__link" href="/auth/signin">
            Sign in instead
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}