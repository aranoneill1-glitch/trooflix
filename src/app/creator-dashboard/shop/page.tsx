"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Plus, Trash2, Edit, ShoppingBag, Package, X, Image as ImageIcon, GripVertical, Save, ArrowUp, ArrowDown, Lock } from "lucide-react";
import { Reorder } from "framer-motion";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

type Product = {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  inventory_count: number;
  type?: string | null;
  image_url: string;
  active: boolean;
  sort_order?: number;
};

function ManageShopContent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  
  const [userId, setUserId] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorToolsUnlocked, setCreatorToolsUnlocked] = useState<boolean | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [productType, setProductType] = useState("merch");
  const [inventory, setInventory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCachedUser().then(async (user) => {
      if (!user) return;
      setUserId(user.id);
      try {
        const p = await fetch(`/api/profile?user_id=${user.id}`).then(r => r.json());
        const unlocked = !!p?.profile?.creator_tools_unlocked;
        setCreatorToolsUnlocked(unlocked);
        if (!unlocked) { setLoading(false); return; }
      } catch { setCreatorToolsUnlocked(false); setLoading(false); return; }
      const cr = await fetch(`/api/me/creator?user_id=${user.id}`).then(r => r.json());
      if (cr.creator) {
        setCreatorId(cr.creator.id);
        fetchProducts(cr.creator.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchProducts = async (cid: string) => {
    try {
      const res = await fetch(`/api/creator/products?creatorId=${cid}`);
      const data = await res.json();
      let loadedProducts = Array.isArray(data.products) ? data.products : [];
      
      loadedProducts.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      setProducts(loadedProducts);

      // If the URL has ?edit=123, open that product automatically
      if (editId) {
        const productToEdit = loadedProducts.find((p: any) => String(p.id) === editId);
        if (productToEdit) openModal(productToEdit);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product?: Product) => {
    setImageFile(null);
    if (product) {
      setEditingId(product.id);
      setName(product.name);
      setDescription(product.description || "");
      setPrice((product.price_cents / 100).toFixed(2));
      setInventory(product.inventory_count.toString());
      setProductType(product.type || "merch");
      setImageUrl(product.image_url || "");
    } else {
      setEditingId(null);
      setName("");
      setDescription("");
      setPrice("");
      setProductType("merch");
      setInventory("");
      setImageUrl("");
    }
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorId || !name || !price) return;
    setSaving(true);

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const presign = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: imageFile.name,
            contentType: imageFile.type || "image/jpeg",
            folder: "products",
          }),
        });
        if (!presign.ok) throw new Error("Could not prepare upload");
        const { signedUrl, publicUrl } = await presign.json();

        const put = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": imageFile.type || "image/jpeg" },
          body: imageFile,
        });
        if (!put.ok) throw new Error("Upload failed (" + put.status + ")");

        finalImageUrl = publicUrl;
      }

      const priceCents = Math.round(Number(price) * 100);
      const payload = {
        creatorId,
        userId,
        name,
        description,
        price_cents: priceCents,
        type: productType,
        inventory_count: Number(inventory) || 0,
        image_url: finalImageUrl,
      };

      const url = editingId ? `/api/creator/products?id=${editingId}` : "/api/creator/products";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchProducts(creatorId);
      } else {
        alert("Failed to save product");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/creator/products?id=${id}&userId=${encodeURIComponent(userId || "")}`, { method: "DELETE" });
      if (res.ok && creatorId) {
        fetchProducts(creatorId);
      }
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const saveOrder = async () => {
    setIsReordering(false);
    const supabase = createClient();
    
    const updates = products.map((p, index) => ({
      id: p.id,
      sort_order: index,
      name: p.name,
      price_cents: p.price_cents,
      image_url: p.image_url,
      description: p.description,
      inventory_count: p.inventory_count,
      creator_id: creatorId
    }));

    const { error } = await supabase.from("products").upsert(updates);
    if (error) {
      alert("Failed to save new order: " + error.message);
    } else {
      alert("Order saved successfully!");
    }
  };

  const moveItem = (index: number, direction: number) => {
    const newProducts = [...products];
    const target = index + direction;
    if (target >= 0 && target < newProducts.length) {
      [newProducts[index], newProducts[target]] = [newProducts[target], newProducts[index]];
      setProducts(newProducts);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  if (creatorToolsUnlocked === false) {
    return (
      <main className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-[28px] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="w-16 h-16 rounded-full bg-yellow-400/[0.12] flex items-center justify-center mx-auto mb-5 border border-yellow-400/20">
            <Lock size={30} className="text-yellow-400" />
          </div>
          <h1 className="text-2xl font-black mb-2 tracking-tight">Unlock Creator Tools</h1>
          <p className="text-white/60 text-sm mb-7 leading-relaxed">Buy any coin pack to unlock Live, Shop, and Premium. Your coins go straight to creators — not us.</p>
          <Link href="/wallet?topup=true&unlock=creator-tools" className="inline-flex items-center gap-2 bg-[#E53945]/90 hover:bg-[#E53945] text-white font-bold px-7 py-3.5 rounded-full transition backdrop-blur-xl border border-red-400/20 shadow-[0_10px_30px_rgba(229,57,69,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]">
            Buy Coins to Unlock
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans selection:bg-[#E53945]/30 overflow-x-hidden">
      <TopBar />

      <div className="max-w-6xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+6rem)] pb-6">
        <Link href="/creator-dashboard" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white mb-6 transition">
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>

        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] mb-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(229,57,69,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_30%)]" />
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60 mb-4">
                <ShoppingBag size={13} className="text-[#ff6b75]" /> Creator Shop
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Manage Shop</h1>
              <p className="text-sm md:text-base text-white/60 max-w-xl">Design, organize, and sell your products with a cleaner storefront workflow.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <div className="px-3 py-1.5 rounded-full bg-black/20 border border-white/10 text-xs font-semibold text-white/70">{products.length} {products.length === 1 ? "product" : "products"}</div>
                <div className="px-3 py-1.5 rounded-full bg-black/20 border border-white/10 text-xs font-semibold text-white/70">{products.reduce((sum, p) => sum + (p.inventory_count || 0), 0)} items in stock</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {isReordering ? (
                <>
                  <button onClick={() => { setIsReordering(false); fetchProducts(creatorId!); }} className="px-5 py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-full text-sm font-bold transition backdrop-blur-xl">Cancel</button>
                  <button onClick={saveOrder} className="flex items-center gap-2 bg-[#E53945]/90 hover:bg-[#E53945] text-white font-bold px-6 py-3 rounded-full transition border border-red-400/20 shadow-[0_10px_30px_rgba(229,57,69,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <Save size={18} /> Save Order
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsReordering(true)} className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold px-5 py-3 rounded-full transition border border-white/10 backdrop-blur-xl">
                    <GripVertical size={18} /> Reorder
                  </button>
                  <button onClick={() => openModal()} className="flex items-center gap-2 bg-[#E53945]/90 hover:bg-[#E53945] text-white font-bold px-6 py-3 rounded-full transition border border-red-400/20 shadow-[0_10px_30px_rgba(229,57,69,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <Plus size={18} /> Add Product
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20 md:py-28 bg-white/[0.04] border border-white/10 rounded-[32px] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="w-20 h-20 mx-auto rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mb-5">
              <Package size={34} className="text-white/35" />
            </div>
            <h2 className="text-2xl font-black mb-2 tracking-tight">Your shop is ready for its first drop</h2>
            <p className="text-sm text-white/50 mb-7 max-w-sm mx-auto">Add a product, set your price, and start selling directly to your audience.</p>
            <button onClick={() => openModal()} className="inline-flex items-center gap-2 bg-white text-black font-bold px-7 py-3.5 rounded-full transition hover:bg-white/90 shadow-[0_10px_30px_rgba(255,255,255,0.12)]">
              <Plus size={18} /> Create Product
            </button>
          </div>
        ) : isReordering ? (
          <Reorder.Group axis="y" values={products} onReorder={setProducts} className="flex flex-col gap-3">
            {products.map((product, index) => (
              <Reorder.Item
                key={product.id}
                value={product}
                className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-[24px] p-3 md:p-4 flex items-center gap-4 cursor-grab active:cursor-grabbing relative shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                style={{ touchAction: "none" }}
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden shrink-0 bg-black/40 border border-white/10 pointer-events-none">
                  {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" draggable={false} /> : <div className="w-full h-full flex items-center justify-center text-white/20"><ImageIcon size={22} /></div>}
                </div>
                <div className="flex-1 min-w-0 pointer-events-none">
                  <h3 className="font-bold text-sm md:text-base truncate">{product.name}</h3>
                  <p className="text-emerald-400 text-xs md:text-sm font-bold mt-1">${(product.price_cents / 100).toFixed(2)}</p>
                  <p className="text-[11px] text-white/45 mt-1">{product.inventory_count} in stock</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => moveItem(index, -1)} disabled={index === 0} className="p-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-xl disabled:opacity-30 text-white transition">
                    <ArrowUp size={16} />
                  </button>
                  <button onClick={() => moveItem(index, 1)} disabled={index === products.length - 1} className="p-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-xl disabled:opacity-30 text-white transition">
                    <ArrowDown size={16} />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map((product) => (
              <div key={product.id} className="group relative bg-white/[0.04] border border-white/10 rounded-[24px] overflow-hidden backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-white/20">
                <div className="aspect-square relative bg-black/30">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/15"><ImageIcon size={30} /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-black/0" />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <button onClick={() => openModal(product)} className="p-2 bg-black/35 hover:bg-black/55 backdrop-blur-xl border border-white/10 rounded-full text-white transition" title="Edit">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => deleteProduct(product.id)} className="p-2 bg-black/35 hover:bg-red-500/75 backdrop-blur-xl border border-white/10 rounded-full text-white transition" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-3.5">
                  <h3 className="text-sm font-bold text-white truncate">{product.name}</h3>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <span className="text-sm font-black text-emerald-400">${(product.price_cents / 100).toFixed(2)}</span>
                    <span className="text-[11px] text-white/45 font-medium">{product.inventory_count} in stock</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#141418]/[0.92] backdrop-blur-2xl border border-white/10 rounded-t-[30px] sm:rounded-[30px] w-full max-w-lg overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1">Shop</p>
                <h2 className="text-xl font-black tracking-tight">{editingId ? "Edit Product" : "Add New Product"}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-full transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveProduct} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Product Image</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-52 rounded-[24px] flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden border ${imageUrl ? 'border-white/10' : 'border-dashed border-white/15 hover:border-[#E53945]/60 bg-white/[0.03]'}`}
                >
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                      <div className="absolute inset-0 bg-black/45 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                        <ImageIcon size={24} className="text-white mb-2" />
                        <span className="text-sm font-bold text-white">Change Image</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mb-3">
                        <ImageIcon size={26} className="text-white/35" />
                      </div>
                      <span className="text-sm font-bold text-white/65">Click to upload image</span>
                      <span className="text-[11px] text-white/35 mt-1">JPG, PNG or WEBP</span>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Product Type</label>
                <div className="flex bg-white/[0.04] border border-white/10 rounded-2xl p-1 mb-4">
                  <button type="button" onClick={() => setProductType("merch")} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition ${productType === "merch" ? "bg-white text-black shadow-sm" : "text-white/55 hover:text-white"}`}>Merch</button>
                  <button type="button" onClick={() => setProductType("book")} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition ${productType === "book" ? "bg-white text-black shadow-sm" : "text-white/55 hover:text-white"}`}>Book</button>
                </div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Product Name</label>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vintage Logo Tee" className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-[#E53945]/60 focus:bg-white/[0.07] transition" />
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product..." rows={3} className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-[#E53945]/60 focus:bg-white/[0.07] transition resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Price ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                    <input required type="number" step="0.01" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25.00" className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-8 pr-4 py-3.5 text-white outline-none focus:border-[#E53945]/60 focus:bg-white/[0.07] transition" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Inventory</label>
                  <input required type="number" min="0" value={inventory} onChange={(e) => setInventory(e.target.value)} placeholder="100" className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-[#E53945]/60 focus:bg-white/[0.07] transition" />
                </div>
              </div>

              <button type="submit" disabled={saving} className="w-full mt-2 bg-[#E53945]/90 hover:bg-[#E53945] disabled:opacity-50 text-white font-bold py-4 rounded-full transition border border-red-400/20 shadow-[0_10px_30px_rgba(229,57,69,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]">
                {saving ? "Saving..." : "Save Product"}
              </button>
            </form>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </main>
  );
}

export default function ManageShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>}>
      <ManageShopContent />
    </Suspense>
  );
}
