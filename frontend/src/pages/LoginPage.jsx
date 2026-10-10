import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '../components/ui/Alert.jsx';
import AuthCard from '../components/AuthCard.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY_FORM = { email: '', password: '' };

function validate(form) {
  const errors = {};
  if (!form.email.trim()) errors.email = 'Email is required.';
  if (!form.password) errors.password = 'Password is required.';
  return errors;
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError('');
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to open your rooms and keep drawing."
      footer={
        <p className="mt-6 text-sm text-slate-500">
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={form.email}
          onChange={updateField}
          error={fieldErrors.email}
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          value={form.password}
          onChange={updateField}
          error={fieldErrors.password}
        />

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
