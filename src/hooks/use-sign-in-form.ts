import { useState } from 'react';

import { type SignInFailure, useAuth } from '@/hooks/use-auth';

const FAILURE_MESSAGES: Record<SignInFailure, string> = {
  'invalid-credentials': 'Incorrect email or password.',
  'email-not-confirmed': 'Confirm your email address, then sign in.',
  'rate-limited': 'Too many attempts. Wait a moment and try again.',
  network: "Couldn't reach the server. Check your connection and try again.",
  unknown: "Couldn't sign in. Please try again.",
};

/** State and submit for the Sign in screen, shared by the iOS/web and Android versions. */
export function useSignInForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (isSubmitting) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // On success the protected routes open and this screen unmounts.
      const result = await signIn(email, password);
      if (!result.ok) {
        setError(FAILURE_MESSAGES[result.reason]);
        if (result.reason === 'invalid-credentials') setPassword('');
        setIsSubmitting(false);
      }
    } catch (caught) {
      console.warn('Sign in failed', caught);
      setError(FAILURE_MESSAGES.unknown);
      setIsSubmitting(false);
    }
  };

  return {
    email,
    password,
    error,
    isSubmitting,
    setEmail: (text: string) => {
      setEmail(text);
      if (error) setError(null);
    },
    setPassword: (text: string) => {
      setPassword(text);
      if (error) setError(null);
    },
    submit,
  };
}
