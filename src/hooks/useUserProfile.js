import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { supabase } from '../lib/supabase';

/* --------------------------------------------------------- Supabase: phone */
/* Everything Clerk doesn't manage (today: just the phone) lives here. */

export function useProfile() {
  const { userId, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['user_profile', userId],
    enabled: Boolean(userId && isSignedIn),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profile')
        .select('phone')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return { phone: data?.phone ?? '' };
    },
  });
}

export function useSetProfile() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone }) => {
      const { error } = await supabase.from('user_profile').upsert(
        {
          user_id: userId,
          phone: phone?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_profile'] }),
  });
}

/* ------------------------------------------------------------- Clerk: name */

export function useUpdateName() {
  const { user } = useUser();
  return useMutation({
    mutationFn: async ({ firstName, lastName }) => {
      await user.update({
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
      });
    },
  });
}

/* ------------------------------------------------------- Clerk: the photo */

export function useUpdateProfilePhoto() {
  const { user } = useUser();
  return useMutation({
    mutationFn: async (localUri) => {
      const response = await fetch(localUri);
      const blob = await response.blob();
      await user.setProfileImage({ file: blob });
    },
  });
}

/* ---------------------------------------------------- Clerk: the password */

export function useUpdatePassword() {
  const { user } = useUser();
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      // Accounts that signed up with Google only (no password yet) can skip
      // currentPassword — Clerk creates the password instead of changing it.
      const params = user.passwordEnabled
        ? { currentPassword, newPassword }
        : { newPassword };
      await user.updatePassword(params);
    },
  });
}
