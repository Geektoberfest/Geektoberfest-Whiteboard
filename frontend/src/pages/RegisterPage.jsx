import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Alert from '../components/ui/Alert.jsx';
import AuthCard from '../components/AuthCard.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' };

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="One account for every room you create or join."
      footer={
        <p className="mt-6 text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Input
          id="name"
          name="name"
          type="text"
          label="Name"
          autoComplete="name"
          value={form.name}
          onChange={updateField}
          error={fieldErrors.name}
          hint="This is the name collaborators see in the participant list."
        />
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
          autoComplete="new-password"
          value={form.password}
          onChange={updateField}
          error={fieldErrors.password}
          hint="At least 8 characters."
        />
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={updateField}
          error={fieldErrors.confirmPassword}
        />

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}
