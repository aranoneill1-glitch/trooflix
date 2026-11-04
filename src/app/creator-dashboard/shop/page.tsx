"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Plus, Trash2, Edit, ShoppingBag, Package, X, Image as ImageIcon, GripVertical, Save, ArrowUp, ArrowDown } from "lucide-react";
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
  image_url: string;
  active: boolean;
  sort_order?: number;
};

function ManageShopContent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [inventory, setInventory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCachedUser().then(async (user) => {
      if (!user) return;
      
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
      setImageUrl(product.image_url || "");
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
        name,
        description,
        price_cents: priceCents,
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
      const res = await fetch(`/api/creator/products?id=${id}`, { method: "DELETE" });
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

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-6">
        
        <Link href="/creator-dashboard" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-8 transition">
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-2">
              Manage Shop <ShoppingBag className="text-[#E53945]" size={24} />
            </h1>
            <p className="text-sm text-white/50">Create and manage your merchandise inventory.</p>
          </div>
          <div className="flex gap-2">
            {isReordering ? (
              <>
                <button onClick={() => { setIsReordering(false); fetchProducts(creatorId!); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition">Cancel</button>
                <button onClick={saveOrder} className="flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-6 py-2 rounded-xl transition shadow-lg shadow-[#E53945]/20">
                  <Save size={18} /> Save Order
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsReordering(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-3 rounded-xl transition">
                  <GripVertical size={18} /> Reorder
                </button>
                <button onClick={() => openModal()} className="flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-[#E53945]/20">
                  <Plus size={18} /> Add Product
                </button>
              </>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 bg-[#1c1c1e] border border-white/5 rounded-3xl">
            <Package size={48} className="mx-auto text-white/10 mb-4" />
            <h2 className="text-xl font-bold mb-2">No products yet</h2>
            <p className="text-sm text-white/50 mb-6">Add your first product to start selling merch.</p>
            <button onClick={() => openModal()} className="inline-flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-xl transition">
              <Plus size={18} /> Create Product
            </button>
          </div>
        ) : isReordering ? (
          
          /* REORDER MODE (Vertical List for reliable mobile drag) */
          <Reorder.Group axis="y" values={products} onReorder={setProducts} className="flex flex-col gap-3">
            {products.map((product, index) => (
              <Reorder.Item 
                key={product.id} 
                value={product} 
                className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-3 flex items-center gap-4 cursor-grab active:cursor-grabbing relative"
                style={{ touchAction: "none" }} 
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-black pointer-events-none">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" draggable={false} />
                </div>
                <div className="flex-1 min-w-0 pointer-events-none">
                  <h3 className="font-bold text-sm truncate">{product.name}</h3>
                  <p className="text-emerald-400 text-xs font-bold mt-1">${(product.price_cents / 100).toFixed(2)}</p>
                </div>
                
                {/* Fail-safe Up/Down Arrows */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => moveItem(index, -1)} disabled={index === 0} className="p-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 text-white">
                    <ArrowUp size={16} />
                  </button>
                  <button onClick={() => moveItem(index, 1)} disabled={index === products.length - 1} className="p-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 text-white">
                    <ArrowDown size={16} />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

        ) : (
          
          /* NORMAL ROW VIEW */
          <div className="flex flex-col gap-3">
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 rounded-2xl p-3 hover:border-white/20 transition-colors group">
                
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 relative bg-black border border-white/5">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10"><ImageIcon size={24} /></div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="text-base font-bold text-white truncate mb-0.5">{product.name}</h3>
                  <p className="text-xs text-white/50 truncate mb-2">{product.description || "No description"}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold text-sm">${(product.price_cents / 100).toFixed(2)}</span>
                    <span className="text-[11px] font-semibold text-white/40 bg-white/5 px-2 py-0.5 rounded-md">{product.inventory_count} in stock</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openModal(product)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white transition" title="Edit">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => deleteProduct(product.id)} className="p-2.5 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-500 rounded-xl transition" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-xl font-bold">{editingId ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveProduct} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Product Image</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-48 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden border-2 border-dashed ${imageUrl ? 'border-transparent' : 'border-white/10 hover:border-[#E53945] bg-black/40'}`}
                >
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity backdrop-blur-sm">
                        <ImageIcon size={24} className="text-white mb-2" />
                        <span className="text-sm font-bold text-white">Change Image</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={32} className="text-white/20 mb-2" />
                      <span className="text-sm font-bold text-white/50">Click to upload image</span>
                      <span className="text-[10px] text-white/30 mt-1">JPG, PNG or WEBP</span>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Product Name</label>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vintage Logo Tee" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945] transition" />
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product..." rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945] transition resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Price ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                    <input required type="number" step="0.01" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25.00" className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white outline-none focus:border-[#E53945] transition" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Inventory</label>
                  <input required type="number" min="0" value={inventory} onChange={(e) => setInventory(e.target.value)} placeholder="100" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945] transition" />
                </div>
              </div>

              <button type="submit" disabled={saving} className="w-full mt-4 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20">
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
