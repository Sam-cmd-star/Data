declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { toEmail, code, role } = await req.json();
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const inviteUrl = `${req.headers.get('origin') || ''}/registro?code=${code}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Acme <onboarding@resend.dev>',
        to: [toEmail],
        subject: 'Invitación a la Plataforma CRM & Big Data',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
            <h2 style="color: #3b82f6; margin-top: 0;">¡Bienvenido a la Plataforma!</h2>
            <p style="font-size: 14px; color: #94a3b8;">Has sido invitado con el rol de: <strong>${role}</strong>.</p>
            <div style="margin: 24px 0;">
              <a href="${inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                Completar Registro
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
              Código manual: <code style="color: #60a5fa; font-weight: bold;">${code}</code>
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});