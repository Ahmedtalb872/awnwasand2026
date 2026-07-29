import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface MembershipCard {
  id: string;
  user_id: string;
  card_id: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  qr_code_url: string;
}

export const useMembershipCard = () => {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();

  // ── Fetch existing card from DB ──────────────────────────────────────────
  const fetchCard = async (): Promise<MembershipCard | null> => {
    if (!userProfile) return null;

    const { data, error } = await supabase
      .from('membership_cards')
      .select('*')
      .eq('user_id', userProfile.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching membership card:', error);
      throw error;
    }

    return data;
  };

  // ── Create card — card_id MUST come from unique_short_id in the users table ─
  const createCard = async (): Promise<MembershipCard> => {
    if (!userProfile) throw new Error('User not found');

    // Fetch the latest unique_short_id directly from Supabase
    // (in case it was assigned by an admin after the user logged in)
    const { data: freshUser, error: userError } = await supabase
      .from('users')
      .select('unique_short_id')
      .eq('id', userProfile.id)
      .single();

    if (userError) throw new Error('تعذّر جلب بيانات المستخدم من قاعدة البيانات.');

    const cardId = freshUser?.unique_short_id;

    if (!cardId) {
      throw new Error(
        'لم يتم تعيين رقم عضوية لهذا الحساب بعد. يرجى التواصل مع الإدارة.'
      );
    }

    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(issueDate.getFullYear() + 1);

    const newCard = {
      user_id: userProfile.id,
      card_id: cardId,           // always from DB — never random
      issue_date: issueDate.toISOString(),
      expiry_date: expiryDate.toISOString(),
      status: 'نشطة',
    };

    const { data, error } = await supabase
      .from('membership_cards')
      .insert(newCard)
      .select()
      .single();

    if (error) {
      // Card already exists → return the existing one
      if (error.code === '23505') {
        const { data: existingCard, error: fetchError } = await supabase
          .from('membership_cards')
          .select('*')
          .eq('user_id', userProfile.id)
          .single();
        if (fetchError) throw fetchError;
        return existingCard;
      }
      console.error('Error creating membership card:', error);
      throw error;
    }

    return data;
  };

  const query = useQuery({
    queryKey: ['membership_card', userProfile?.id],
    queryFn: fetchCard,
    enabled: !!userProfile,
  });

  const generateMutation = useMutation({
    mutationFn: createCard,
    onSuccess: (data) => {
      queryClient.setQueryData(['membership_card', userProfile?.id], data);
    },
  });

  return {
    card: query.data,
    isLoading: query.isLoading,
    error: query.error,
    generateCard: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    generateError: generateMutation.error,
  };
};
