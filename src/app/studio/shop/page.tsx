"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Package, Camera, Pencil, X, Check, Trash2, Search, DollarSign, TrendingUp, ShoppingCart } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import { motion, AnimatePresence } from "framer-motion";

type Product = {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  inventory_count: number;
  active: boolean;
};

export default function StudioShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorId, setCreatorId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [inventory, setInventory] = useState("");
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

  const openModal = (p?: Product) => {
    if (p) {
      setEditingId(p.id);
      setName(p.name);
      setDescription(p.description || "");
      setPrice((p.price_cents / 100).toFixed(2));
      setInventory(p.inventory_count?.toString() || "0");
      setImageUrl(p.image_url || "");
    } else {
      setEditingId(null);
      setName("");
      setDescription("");
      setPrice("");
      setInventory("");
      setImageUrl("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorId || !name || !price) return;
    setSaving(true);

    const priceCents = Math.round(Number(price) * 100);
    const isEditing = editingId !== null;
    const body = isEditing 
      ? { id: editingId, name, description, price_cents: priceCents, inventory_count: Number(inventory) || 0, image_url: imageUrl }
      : { creatorId, name, description, price_cents: priceCents, inventory_count: Number(inventory) || 0, image_url: imageUrl };

    await fetch("/api/creator/products", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    closeModal();
    await load();
    setSaving(false);
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

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="p-8 text-white/50 text-center">Loading…</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
      <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back to dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">Merch Store</h1>
          <p className="text-white/50">Manage your inventory and track your sales.</p>
        </div>
        <button onClick={() => openModal()} className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition flex items-center justify-center gap-2 shadow-lg">
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-white/50 mb-1"><DollarSign size={16} /> Total Revenue</div>
          <p className="text-2xl font-black">$0.00</p>
        </div>
        <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-white/50 mb-1"><ShoppingCart size={16} /> Total Orders</div>
          <p className="text-2xl font-black">0</p>
        </div>
        <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-white/50 mb-1"><Package size={16} /> Total Products</div>
          <p className="text-2xl font-black">{products.length}</p>
        </div>
        <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-white/50 mb-1"><TrendingUp size={16} /> Active Products</div>
          <p className="text-2xl font-black">{products.filter(p => p.active).length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your products..."
            className="w-full bg-[#1c1c1e]/60 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-red-500 transition placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-[#1c1c1e]/40 border border-white/5 rounded-3xl">
          <Package size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/50 font-medium">No products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(p => (
            <div key={p.id} className="group bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-3 flex flex-col transition hover:border-white/20">
              
              <div className="aspect-square rounded-2xl bg-black overflow-hidden mb-4 relative">
                {p.image_url ? (
                  <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <Package size={32} className="absolute inset-0 m-auto text-white/20" />
                )}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg">
                  <span className={`text-[10px] font-bold ${p.inventory_count > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.inventory_count > 0 ? `${p.inventory_count} IN STOCK` : 'OUT OF STOCK'}
                  </span>
                </div>
              </div>
              
              <div className="px-1 flex-1 flex flex-col">
                <p className="font-bold text-lg truncate leading-tight mb-1">{p.name}</p>
                <p className="text-green-400 font-bold mb-3">${(p.price_cents / 100).toFixed(2)}</p>
                
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => openModal(p)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm border border-white/5">
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl transition flex items-center justify-center border border-red-500/20">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={closeModal} 
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              onClick={(e) => e.stopPropagation()}
              className="relative z-[101] bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                <h2 className="text-xl font-bold">{editingId ? "Edit Product" : "New Product"}</h2>
                <button onClick={closeModal} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={18} /></button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto scrollbar-hide">
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
                        </div>
                      </div>
                    )}
                  </label>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Product Name</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition" placeholder="T-Shirt" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Price ($)</label>
                    <input required type="number" step="0.01" min="1" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition" placeholder="25.00" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Inventory (Stock)</label>
                    <input required type="number" min="0" value={inventory} onChange={e => setInventory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition" placeholder="50" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition resize-none" placeholder="Soft cotton, oversized fit..." />
                </div>

                <button disabled={saving || uploadingImage} type="submit" className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-sm transition hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg mt-2">
                  {editingId ? <Check size={18} /> : <Plus size={18} />} 
                  {saving ? "Saving..." : editingId ? "Update Product" : "Publish Product"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
