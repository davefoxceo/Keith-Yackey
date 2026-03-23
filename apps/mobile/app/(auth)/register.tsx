import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import Button from '@/components/common/Button';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim());
      router.replace('/(auth)/onboarding');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputRowClass =
    'flex-row items-center bg-surface-raised border border-surface-overlay rounded-xl px-4';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-surface"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            className="items-center mb-10"
          >
            <Text className="text-3xl font-bold text-white">Create Account</Text>
            <Text className="text-base text-slate-400 mt-2 text-center">
              Your journey to becoming a better man starts here
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            {/* Display Name */}
            <View className="mb-4">
              <Text className="text-sm text-slate-400 mb-2 ml-1">Your Name</Text>
              <View className={inputRowClass}>
                <Ionicons name="person-outline" size={20} color={colors.text.muted} />
                <TextInput
                  className="flex-1 text-white text-base py-4 ml-3"
                  placeholder="First name"
                  placeholderTextColor={colors.text.muted}
                  autoCapitalize="words"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="text-sm text-slate-400 mb-2 ml-1">Email</Text>
              <View className={inputRowClass}>
                <Ionicons name="mail-outline" size={20} color={colors.text.muted} />
                <TextInput
                  className="flex-1 text-white text-base py-4 ml-3"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text className="text-sm text-slate-400 mb-2 ml-1">Password</Text>
              <View className={inputRowClass}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.text.muted} />
                <TextInput
                  className="flex-1 text-white text-base py-4 ml-3"
                  placeholder="Min 8 characters"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* Confirm Password */}
            <View className="mb-8">
              <Text className="text-sm text-slate-400 mb-2 ml-1">Confirm Password</Text>
              <View className={inputRowClass}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.text.muted} />
                <TextInput
                  className="flex-1 text-white text-base py-4 ml-3"
                  placeholder="Confirm password"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              variant="primary"
            />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            className="items-center mt-8"
          >
            <Text className="text-slate-400">
              Already have an account?{' '}
              <Link href="/(auth)/login" asChild>
                <Text className="text-accent font-semibold">Sign in</Text>
              </Link>
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
