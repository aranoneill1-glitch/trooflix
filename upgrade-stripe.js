const fs = require('fs');

// ==========================================
// 1. UPGRADE CHECKOUT API
// ==========================================
const apiPath = 'src/app/api/stripe/merch/route.ts';
let api = `import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServerClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId, items } = await req.json();
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing data or empty cart" }, { status: 400 });
    }

    const productIds = items.map((i: any) => i.id);
    const { data: products } = await supabaseAdmin.from("products").select("*").in("id", productIds);

    if (!products || products.length === 0) return NextResponse.json({ error: "Products not found" }, { status: 404 });

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email;

    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://trooflixtv.com";

    const lineItems = items.map((cartItem: any) => {
      const dbProduct = products.find((p: any) => p.id === cartItem.id);
      if (!dbProduct) return null;
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: dbProduct.name,
            description: dbProduct.description || undefined,
            images: dbProduct.image_url ? [dbProduct.image_url] : undefined,
          },
          unit_amount: dbProduct.price_cents,
        },
        quantity: cartItem.quantity,
      };
    }).filter(Boolean);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userEmail,
      line_items: lineItems,
      payment_intent_data: {
        description: \`Trooflix Merch Order\`,
      },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "IE", "NZ"],
      },
      success_url: \`\${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}\`,
      cancel_url: \`\${baseUrl}/merchandise\`,
      client_reference_id: userId,
      metadata: {
        type: "merch_cart",
        userId: userId,
        items: JSON.stringify(items),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Stripe merch error:", e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
`;
fs.writeFileSync(apiPath, api);
console.log('OK: Upgraded Stripe checkout API for multiple items.');

// ==========================================
// 2. UPGRADE WEBHOOK
// ==========================================
const webhookPath = 'src/app/api/stripe/webhook/route.ts';
let webhook = fs.readFileSync(webhookPath, 'utf8');

const oldWebhookBlock = `      if (session.metadata?.type === "merch") {
        const sessionDetails = session as any;
        const shipping = sessionDetails.collected_information?.shipping_details || sessionDetails.shipping_details;
        
        // FIX: Safely extract metadata into variables to satisfy TypeScript
        const userId = session.metadata?.userId;
        const creatorId = session.metadata?.creatorId;
        const productId = session.metadata?.productId;

        if (!userId || !creatorId || !productId) {
          return new NextResponse("Missing metadata", { status: 400 });
        }
        
        const { error } = await supabaseAdmin.from("merch_orders").upsert({
          buyer_user_id: userId,
          creator_id: Number(creatorId),
          product_id: Number(productId),
          stripe_session_id: session.id,
          amount_cents: session.amount_total || 0,
          status: "paid",
          shipping_name: shipping?.name || null,
          shipping_address: shipping?.address?.line1 || null,
          shipping_city: shipping?.address?.city || null,
          shipping_postal_code: shipping?.address?.postal_code || null,
          shipping_country: shipping?.address?.country || null,
        }, { onConflict: "stripe_session_id" });

        if (error) return new NextResponse(\`Database Error: \${error.message}\`, { status: 500 });`;

const newWebhookBlock = `      if (session.metadata?.type === "merch_cart") {
        const sessionDetails = session as any;
        const shipping = sessionDetails.collected_information?.shipping_details || sessionDetails.shipping_details;
        
        const userId = session.metadata?.userId;
        const itemsJson = session.metadata?.items;

        if (!userId || !itemsJson) {
          return new NextResponse("Missing metadata", { status: 400 });
        }

        const items = JSON.parse(itemsJson);
        let lastCreatorId = null;

        for (const item of items) {
          const { data: product } = await supabaseAdmin.from("products").select("creator_id, price_cents").eq("id", item.id).maybeSingle();
          if (!product) continue;
          
          lastCreatorId = product.creator_id;

          await supabaseAdmin.from("merch_orders").insert({
            buyer_user_id: userId,
            creator_id: Number(product.creator_id),
            product_id: Number(item.id),
            stripe_session_id: session.id,
            amount_cents: (product.price_cents * item.quantity),
            status: "paid",
            shipping_name: shipping?.name || null,
            shipping_address: shipping?.address?.line1 || null,
            shipping_city: shipping?.address?.city || null,
            shipping_postal_code: shipping?.address?.postal_code || null,
            shipping_country: shipping?.address?.country || null,
          });
        }`;

if (!webhook.includes(oldWebhookBlock)) {
  console.error("Webhook old block not found! Check formatting.");
  process.exit(1);
}

webhook = webhook.replace(oldWebhookBlock, newWebhookBlock);

// Fix the push notification to use the lastCreatorId found
const oldPush = `          const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
          const creator = creators.find((c: any) => Number(c.id) === Number(creatorId));`;
const newPush = `          const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
          const creator = creators.find((c: any) => Number(c.id) === Number(lastCreatorId));`;

webhook = webhook.replace(oldPush, newPush);

fs.writeFileSync(webhookPath, webhook);
console.log('OK: Upgraded Webhook to handle multiple items per order.');

// ==========================================
// 3. UPGRADE FRONTEND CHECKOUT BUTTON
// ==========================================
const frontendPath = 'src/components/NotificationBell.tsx';
let frontend = fs.readFileSync(frontendPath, 'utf8');

const oldCheckout = `  const handleCheckout = () => {
    if (basketItems.length === 0) return;
    alert("Checkout successful! (Mock integration)");
    setBasketItems([]);
    localStorage.removeItem("trooflix_basket");
  };`;

const newCheckout = `  const handleCheckout = async () => {
    if (basketItems.length === 0) return;
    setCheckoutLoading(true);
    
    try {
      const user = await getCachedUser();
      if (!user) {
        alert("Please log in to checkout.");
        setCheckoutLoading(false);
        return;
      }

      const items = basketItems.map(item => ({ id: item.id, quantity: item.quantity }));
      const res = await fetch("/api/stripe/merch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, items })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert("Checkout error: " + err.message);
      setCheckoutLoading(false);
    }
  };`;

if (frontend.includes(oldCheckout)) {
  frontend = frontend.replace(oldCheckout, newCheckout);
  
  // Add checkout loading state
  frontend = frontend.replace(
    'const [basketItems, setBasketItems] = useState<any[]>([]);',
    'const [basketItems, setBasketItems] = useState<any[]>([]);\n  const [checkoutLoading, setCheckoutLoading] = useState(false);'
  );

  // Update the checkout button UI
  frontend = frontend.replace(
    'onClick={handleCheckout} className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition">\n                          Checkout',
    'onClick={handleCheckout} disabled={checkoutLoading} className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50">\n                          {checkoutLoading ? "Redirecting to Stripe..." : "Checkout"}'
  );
  
  fs.writeFileSync(frontendPath, frontend);
  console.log('OK: Wired up real Stripe checkout to the Basket.');
} else {
  console.error('Frontend checkout block not found!');
}
