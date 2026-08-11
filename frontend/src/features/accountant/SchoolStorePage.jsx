import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  ShoppingBag,
  Package,
  Plus,
  ShoppingCart,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Tag,
  AlertTriangle,
  RefreshCw,
  X,
  Receipt,
} from 'lucide-react';

const SchoolStorePage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'pos'
  const [notification, setNotification] = useState({ text: '', type: '' });

  // Modals state
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', category: 'uniform', unitPrice: '', quantityInStock: '', reorderLevel: '5' });

  // POS State
  const [posBuyerName, setPosBuyerName] = useState('');
  const [posCart, setPosCart] = useState([]); // [{ itemId, name, unitPrice, quantity }]
  const [posPaymentMethod, setPosPaymentMethod] = useState('cash');
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);

  // Query Store Items
  const { data: storeItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['storeItems'],
    queryFn: async () => {
      const res = await api.get('/store/items');
      return res.data?.data || [];
    },
  });

  // Query Sales History
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['storeSales'],
    queryFn: async () => {
      const res = await api.get('/store/sales');
      return res.data?.data || { sales: [], summary: {} };
    },
  });

  const salesList = salesData?.sales || [];
  const salesSummary = salesData?.summary || {};

  // Add / Edit Item Mutation
  const saveItemMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingItem) {
        return await api.patch(`/store/items/${editingItem._id}`, payload);
      }
      return await api.post('/store/items', payload);
    },
    onSuccess: () => {
      setNotification({ text: `Item ${editingItem ? 'updated' : 'added'} successfully!`, type: 'success' });
      setAddItemModalOpen(false);
      setEditingItem(null);
      setItemForm({ name: '', category: 'uniform', unitPrice: '', quantityInStock: '', reorderLevel: '5' });
      queryClient.invalidateQueries(['storeItems']);
      setTimeout(() => setNotification({ text: '', type: '' }), 3000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to save store item.', type: 'error' });
    },
  });

  // Record POS Sale Mutation
  const recordSaleMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/store/sales', payload);
    },
    onSuccess: (res) => {
      setNotification({ text: res.data?.message || 'Sale completed successfully!', type: 'success' });
      setPosBuyerName('');
      setPosCart([]);
      queryClient.invalidateQueries(['storeItems']);
      queryClient.invalidateQueries(['storeSales']);
      setTimeout(() => setNotification({ text: '', type: '' }), 4000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to complete POS sale.', type: 'error' });
    },
  });

  const handleOpenAddModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        category: item.category,
        unitPrice: item.unitPrice,
        quantityInStock: item.quantityInStock,
        reorderLevel: item.reorderLevel || 5,
      });
    } else {
      setEditingItem(null);
      setItemForm({ name: '', category: 'uniform', unitPrice: '', quantityInStock: '', reorderLevel: '5' });
    }
    setAddItemModalOpen(true);
  };

  const handleAddToCart = (item) => {
    const existing = posCart.find((c) => c.itemId === item._id);
    if (existing) {
      setPosCart((prev) =>
        prev.map((c) => (c.itemId === item._id ? { ...c, quantity: c.quantity + 1 } : c))
      );
    } else {
      setPosCart((prev) => [
        ...prev,
        { itemId: item._id, name: item.name, unitPrice: item.unitPrice, quantity: 1 },
      ]);
    }
  };

  const handleRemoveFromCart = (itemId) => {
    setPosCart((prev) => prev.filter((c) => c.itemId !== itemId));
  };

  const cartTotal = posCart.reduce((acc, c) => acc + c.unitPrice * c.quantity, 0);

  const handleCheckout = () => {
    if (!posBuyerName.trim()) {
      setNotification({ text: 'Please enter buyer / customer name.', type: 'error' });
      return;
    }
    if (posCart.length === 0) {
      setNotification({ text: 'Please add at least one item to cart.', type: 'error' });
      return;
    }

    recordSaleMutation.mutate({
      buyerName: posBuyerName.trim(),
      items: posCart.map((c) => ({ itemId: c.itemId, quantity: c.quantity })),
      paymentMethod: posPaymentMethod,
    });
  };

  const handleDownloadReceipt = async (saleId, receiptNum) => {
    setDownloadingReceiptId(saleId);
    try {
      const res = await api.get(`/store/sales/${saleId}/receipt/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${receiptNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setNotification({ text: 'Failed to download receipt PDF.', type: 'error' });
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-800" />
            School Store &amp; Uniform Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage school uniforms, textbooks, canteen tickets, track stock levels, and issue sales receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} /> Add Inventory Item
          </button>
        </div>
      </div>

      {/* ── Notification Feedback ── */}
      {notification.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          {notification.text}
        </div>
      )}

      {/* ── Tabs Bar ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'inventory' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Package size={15} /> Inventory Stock Catalog ({storeItems.length})
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'pos' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <ShoppingCart size={15} /> Point of Sale &amp; Sales History
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: INVENTORY STOCK CATALOG                                         */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">Inventory Stock Table</span>
              <span className="text-xs font-bold text-slate-400">{storeItems.length} Total Products</span>
            </div>

            {itemsLoading ? (
              <div className="p-16 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 className="animate-spin text-emerald-600 h-6 w-6" />
                <span className="text-xs font-semibold text-slate-400">Loading store inventory...</span>
              </div>
            ) : storeItems.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <Package size={36} className="mx-auto text-slate-300" />
                <p className="font-extrabold text-slate-700 text-sm">No Inventory Items Registered!</p>
                <p className="text-xs text-slate-400">Click &quot;Add Inventory Item&quot; above to create uniforms or textbooks.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Unit Price</th>
                      <th className="py-3 px-3">Stock Level</th>
                      <th className="py-3 px-3">Stock Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {storeItems.map((item) => {
                      const isLow = item.quantityInStock <= (item.reorderLevel || 5);
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                          <td className="py-3 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                              {item.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-extrabold text-slate-900 font-sans">
                            {item.unitPrice.toFixed(2)} GHS
                          </td>
                          <td className="py-3 px-3 font-extrabold text-slate-800">{item.quantityInStock} Units</td>
                          <td className="py-3 px-3">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle size={10} /> Low Stock (reorder &le; {item.reorderLevel || 5})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenAddModal(item)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                              >
                                Edit / Restock
                              </button>
                              <button
                                onClick={() => { setActiveTab('pos'); handleAddToCart(item); }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ShoppingCart size={11} /> POS Sell
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: POINT OF SALE (POS) & SALES HISTORY                            */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: POS Checkout Widget */}
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShoppingCart className="text-emerald-700" size={16} /> Store POS Checkout
            </h3>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                Buyer / Customer Name
              </label>
              <input
                type="text"
                value={posBuyerName}
                onChange={(e) => setPosBuyerName(e.target.value)}
                placeholder="e.g. Kwame Mensah (Parent)"
                className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                Add Product to Cart
              </label>
              <select
                onChange={(e) => {
                  const it = storeItems.find((i) => i._id === e.target.value);
                  if (it) handleAddToCart(it);
                }}
                defaultValue=""
                className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="" disabled>Select Item to Add...</option>
                {storeItems.map((it) => (
                  <option key={it._id} value={it._id}>
                    {it.name} ({it.unitPrice.toFixed(2)} GHS - Stock: {it.quantityInStock})
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50 max-h-48 overflow-y-auto">
              <span className="text-[10px] font-black text-slate-400 uppercase block">Cart Items</span>
              {posCart.length === 0 ? (
                <span className="text-xs text-slate-400 italic block py-4 text-center">Cart is empty. Select items above.</span>
              ) : (
                posCart.map((c) => (
                  <div key={c.itemId} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-900 block">{c.name}</span>
                      <span className="text-[10px] text-slate-400">{c.unitPrice.toFixed(2)} GHS each</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-800">x{c.quantity}</span>
                      <button onClick={() => handleRemoveFromCart(c.itemId)} className="text-rose-500 hover:text-rose-700 font-bold">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total Amount Box */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center text-emerald-900 font-black">
              <span className="text-xs uppercase tracking-wider">Total Payable</span>
              <span className="text-xl">{cartTotal.toFixed(2)} GHS</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={recordSaleMutation.isPending || posCart.length === 0}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {recordSaleMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
              Complete Sale &amp; Print Receipt
            </button>
          </div>

          {/* Right Column: POS Sales History Roster */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Receipt className="text-emerald-700" size={16} /> Sales &amp; Revenue History
              </h3>
              <span className="text-xs font-black text-emerald-800">
                Total Store Revenue: {(salesSummary.totalRevenue || 0).toFixed(2)} GHS
              </span>
            </div>

            {salesLoading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 className="animate-spin text-emerald-600 h-6 w-6" />
                <span className="text-xs font-semibold text-slate-400">Loading sales history...</span>
              </div>
            ) : salesList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Receipt size={32} className="mx-auto text-slate-300" />
                <p className="font-extrabold text-slate-700 text-sm">No Sales Recorded Yet!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Buyer Name</th>
                      <th className="py-2.5 px-3">Items Sold</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                      <th className="py-2.5 px-3 text-center">Receipt PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {salesList.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{s.receiptNumber}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.buyerName}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {s.items?.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                          {s.totalAmount.toFixed(2)} GHS
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleDownloadReceipt(s._id, s.receiptNumber)}
                            disabled={downloadingReceiptId === s._id}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 mx-auto cursor-pointer disabled:opacity-50"
                          >
                            {downloadingReceiptId === s._id ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                            Receipt PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ADD / EDIT ITEM MODAL                                                    */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {addItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 relative animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingItem ? 'Edit Inventory Item' : 'Add New Store Item'}
              </h3>
              <button onClick={() => setAddItemModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. School Uniform - Primary (Set)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="uniform">School Uniform</option>
                  <option value="textbook">Textbook &amp; Exercise Books</option>
                  <option value="stationery">Stationery &amp; Pens</option>
                  <option value="canteen_ticket">Canteen Ticket</option>
                  <option value="other">Other Accessories</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Price (GHS)</label>
                  <input
                    type="number"
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                    placeholder="e.g. 80.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={itemForm.quantityInStock}
                    onChange={(e) => setItemForm({ ...itemForm, quantityInStock: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button onClick={() => setAddItemModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => saveItemMutation.mutate({
                  name: itemForm.name,
                  category: itemForm.category,
                  unitPrice: Number(itemForm.unitPrice),
                  quantityInStock: Number(itemForm.quantityInStock),
                  reorderLevel: Number(itemForm.reorderLevel),
                })}
                disabled={saveItemMutation.isPending}
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saveItemMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolStorePage;
