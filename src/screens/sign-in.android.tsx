import { Button, Column, Icon, IconButton, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  fillMaxWidth,
  imePadding,
  padding,
  verticalScroll,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { ControlledTextField } from '@/components/compose/text-field';
import { useSignInForm } from '@/hooks/use-sign-in-form';

/** The only screen available while signed out. */
export default function SignInScreen() {
  const form = useSignInForm();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <ComposeScreen>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), imePadding(), padding(24, 64, 24, 24)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <ScreenHeader title="Welcome back" subtitle="Sign in to continue." />

        <ControlledTextField
          value={form.username}
          onChangeText={form.setUsername}
          label="Username"
          exact
          isError={Boolean(form.error)}
        />
        <ControlledTextField
          value={form.password}
          onChangeText={form.setPassword}
          label="Password"
          keyboardType="password"
          exact
          masked={!showPassword}
          isError={Boolean(form.error)}
          supportingText={form.error}
          trailing={
            <IconButton onClick={() => setShowPassword((shown) => !shown)}>
              <Icon
                source={showPassword ? Icons.visibilityOff : Icons.visibility}
                contentDescription={showPassword ? 'Hide password' : 'Show password'}
              />
            </IconButton>
          }
        />

        <Button
          onClick={form.submit}
          enabled={!form.isSubmitting}
          modifiers={[fillMaxWidth()]}>
          <Row verticalAlignment="center">
            <Icon source={Icons.login} size={18} />
            <Spacer modifiers={[width(8)]} />
            <Text>{form.isSubmitting ? 'Signing in…' : 'Sign in'}</Text>
          </Row>
        </Button>
      </Column>
    </ComposeScreen>
  );
}
