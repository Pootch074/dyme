import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';

/** State and submit for the Sign in screen, shared by the iOS/web and Android versions. */
export function useSignInForm() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (isSubmitting) return;
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // On success the protected routes open and this screen unmounts.
      if (!(await signIn(username, password))) {
        setError('Incorrect username or password.');
        setPassword('');
        setIsSubmitting(false);
      }
    } catch (caught) {
      console.warn('Sign in failed', caught);
      setError("Couldn't sign in. Please try again.");
      setIsSubmitting(false);
    }
  };

  return {
    username,
    password,
    error,
    isSubmitting,
    setUsername: (text: string) => {
      setUsername(text);
      if (error) setError(null);
    },
    setPassword: (text: string) => {
      setPassword(text);
      if (error) setError(null);
    },
    submit,
  };
}
