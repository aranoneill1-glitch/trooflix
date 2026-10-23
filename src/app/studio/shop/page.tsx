"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Package, Camera, Pencil, X, Check, Trash2 } from "lucide-react";
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

  const [editingId, setEditingId] = useState<number | null>(null);
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
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "image/jpeg", folder: "merch" }),
      });
      if (!presign.ok) throw new Error("Upload prep failed");
      const { signedUrl, publicUrl } = await presign.json();
      const put = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
      if (!put.ok) throw new Error("Upload to R2 failed");
      setImageUrl(publicUrl);
    } catch (err: any) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setImageUrl("");
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description || "");
    setPrice((p.price_cents / 100).toFixed(2));
    setImageUrl(p.image_url || "");
  };


  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await fetch("/api/creator/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } catch {
      alert("Failed to delete product");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorId || !name || !price) return;
    setSaving(true);
    const priceCents = Math.round(Number(price) * 100);
    const isEditing = editingId !== null;
    const endpoint = "/api/creator/products";
    const method = isEditing ? "PATCH" : "POST";
    const body = isEditing 
      ? { id: editingId, name, description, price_cents: priceCents, image_url: imageUrl }
      : { creatorId, name, description, price_cents: priceCents, image_url: imageUrl };

    await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    resetForm();
    await load();
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-white/50 text-center">Loading…</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
      <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back to dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">Merch Store</h1>
        <p className="text-white/50">Add physical products to sell directly to your fans.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Add / Edit Product Form */}
        <div className="md:col-span-5">
          <form onSubmit={handleSave} className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 space-y-5 sticky top-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold">{editingId ? "Edit Product" : "New Product"}</h2>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold bg-red-500/10 px-3 py-1.5 rounded-lg transition">
                  <X size={14} /> Cancel
                </button>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Product Image</label>
              <label className="block border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-2xl overflow-hidden cursor-pointer transition bg-black/20 group">
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
                {imageUrl ? (
                  <div className="relative aspect-square">
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="bg-white text-black font-bold px-4 py-2 rounded-xl">Change Image</span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center">
                    <div className="text-center">
                      <Camera size={32} className="mx-auto mb-3 text-white/30" />
                      <p className="text-sm font-semibold text-white/60">{uploadingImage ? "Uploading..." : "Click to upload"}</p>
                      <p className="text-xs text-white/40 mt-1">Square images work best</p>
                    </div>
                  </div>
                )}
              </label>
            </div>
            
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Product Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition" placeholder="T-Shirt" />
            </div>

            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Price ($)</label>
              <input required type="number" step="0.01" min="1" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition" placeholder="25.00" />
            </div>

            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition resize-none" placeholder="Soft cotton, oversized fit..." />
            </div>

            <button disabled={saving || uploadingImage} type="submit" className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-sm transition hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
              {editingId ? <Check size={18} /> : <Plus size={18} />} 
              {saving ? "Saving..." : editingId ? "Update Product" : "Add Product"}
            </button>
          </form>
        </div>

        {/* Product List */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">Active Products ({products.length})</h2>
          </div>
          
          {products.length === 0 ? (
            <div className="text-center py-24 bg-[#1c1c1e]/40 border border-white/5 rounded-3xl">
              <Package size={48} className="mx-auto text-white/20 mb-4" />
              <p className="text-white/50 font-medium">No products added yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map(p => (
                <div key={p.id} className={`group bg-[#1c1c1e]/60 backdrop-blur-xl border ${editingId === p.id ? 'border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'border-white/10'} rounded-3xl p-3 flex flex-col transition hover:border-white/20`}>
                  <div className="aspect-square rounded-2xl bg-black overflow-hidden mb-4 relative">
                    {p.image_url ? (
                      <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    ) : (
                      <Package size={32} className="absolute inset-0 m-auto text-white/20" />
                    )}
                  </div>
                  <div className="px-1 flex-1 flex flex-col">
                    <p className="font-bold text-lg truncate leading-tight mb-1">{p.name}</p>
                    <p className="text-green-400 font-bold mb-3">${(p.price_cents / 100).toFixed(2)}</p>
                    
                    <div className="flex gap-2 mt-auto">
                      <button 
                        onClick={() => handleEdit(p)}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm border border-white/5"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl transition flex items-center justify-center border border-red-500/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
