"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Package, Camera } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

type Product = {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  active: boolean;
};

export default function StudioShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorId, setCreatorId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const load = async () => {
    const user = await getCachedUser();
    if (!user) return;
    
    const cRes = await fetch(`/api/me/creator?user_id=${user.id}`);
    const cData = await cRes.json();
    
    if (cData.creator && cData.creator.id) {
      setCreatorId(cData.creator.id);
      const pRes = await fetch(`/api/creator/products?creatorId=${cData.creator.id}`);
      const pData = await pRes.json();
      setProducts(pData.products || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // 1. Get presigned URL from your existing R2 upload API
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          folder: "merch", // Puts merch in its own folder
        }),
      });
      
      if (!presign.ok) throw new Error("Upload prep failed");
      const { signedUrl, publicUrl } = await presign.json();

      // 2. Upload directly to R2
      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });

      if (!put.ok) throw new Error("Upload to R2 failed");
      
      // 3. Save the public URL to state
      setImageUrl(publicUrl);
    } catch (err: any) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorId || !name || !price) return;
    setSaving(true);

    const priceCents = Math.round(Number(price) * 100);
    
    await fetch("/api/creator/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorId,
        name,
        description,
        price_cents: priceCents,
        image_url: imageUrl,
      }),
    });

    setName("");
    setDescription("");
    setPrice("");
    setImageUrl("");
    await load();
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-white/50 text-center">Loading…</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition">
        <ChevronLeft size={16} /> Back to dashboard
      </Link>

      <h1 className="text-2xl font-black mb-1">Your Shop</h1>
      <p className="text-white/50 text-sm mb-6">
        Add physical products to sell directly to your fans.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Add Product Form */}
        <div className="md:col-span-1">
          <form onSubmit={handleAdd} className="bg-[#141418] border border-white/5 rounded-xl p-5 space-y-4">
            <h2 className="font-bold text-lg mb-2">Add Product</h2>

            {/* Image Upload Box */}
            <div>
              <label className="text-xs text-white/50 block mb-1">Product Image</label>
              <label className="block border-2 border-dashed border-white/10 hover:border-red-600/50 rounded-xl overflow-hidden cursor-pointer transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-black/20">
                    <div className="text-center">
                      <Camera size={24} className="mx-auto mb-2 text-white/40" />
                      <p className="text-xs text-white/50">
                        {uploadingImage ? "Uploading..." : "Click to upload"}
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
            
            <div>
              <label className="text-xs text-white/50 block mb-1">Product Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-red-600" placeholder="T-Shirt" />
            </div>

            <div>
              <label className="text-xs text-white/50 block mb-1">Price ($)</label>
              <input required type="number" step="0.01" min="1" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-red-600" placeholder="25.00" />
            </div>

            <div>
              <label className="text-xs text-white/50 block mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-red-600 resize-none" placeholder="Soft cotton..." />
            </div>

            <button disabled={saving || uploadingImage} type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
              <Plus size={16} /> {saving ? "Saving..." : "Add Product"}
            </button>
          </form>
        </div>

        {/* Product List */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="font-bold text-lg mb-4">Active Products ({products.length})</h2>
          
          {products.length === 0 ? (
            <div className="text-center py-16 bg-[#141418] border border-white/5 rounded-xl">
              <Package size={32} className="mx-auto text-white/20 mb-3" />
              <p className="text-white/50 text-sm">No products added yet.</p>
            </div>
          ) : (
            products.map(p => (
              <div key={p.id} className="bg-[#141418] border border-white/5 rounded-xl p-3 flex gap-4 items-center">
                <div className="w-16 h-16 rounded-lg bg-black flex-shrink-0 overflow-hidden">
                  {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <Package size={20} className="m-auto text-white/20 mt-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{p.name}</p>
                  <p className="text-sm text-green-400">${(p.price_cents / 100).toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
