import { supabase } from './supabaseClient';

export async function sendInvitationEmail(toEmail: string, code: string, role: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-invite', {
      body: { toEmail, code, role },
    });

    if (error) {
      console.error('Error al invocar Edge Function:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return false;
  }
}