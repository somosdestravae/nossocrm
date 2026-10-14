export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Método não permitido' }, { status: 405 });
    }

    const origin = request.headers.get('origin');
    const allowedOrigin = process.env.SITE_ORIGIN;

    if (allowedOrigin && origin !== allowedOrigin) {
      return Response.json({ error: 'Origem não autorizada' }, { status: 403 });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const clean = (value, limit = 200) =>
      String(value || '').trim().slice(0, limit);

    const name = clean(body.name, 80);
    const phone = clean(body.phone, 30);
    const email = clean(body.email, 120);
    const company = clean(body.company, 80);

    if (!name || (!phone && !email)) {
      return Response.json(
        { error: 'Nome e telefone ou e-mail são obrigatórios' },
        { status: 400 }
      );
    }

    const crmResponse = await fetch(process.env.CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.CRM_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        deal_title: `Orçamento do site — ${company || name}`,
        contact_name: name,
        company_name: company || undefined,
        phone: phone || undefined,
        email: email || undefined,
        source: 'site-destravae',
        notes: [
          `Estoque: ${clean(body.stock)}`,
          `Canais: ${clean(body.channels)}`,
          `Produtos/SKUs: ${clean(body.skus)}`,
          `Pedidos por mês: ${clean(body.orders)}`,
        ].join('\n'),
      }),
    });

    if (!crmResponse.ok) {
      return Response.json(
        { error: 'O CRM não aceitou o lead' },
        { status: 502 }
      );
    }

    return Response.json({ ok: true });
  },
};
