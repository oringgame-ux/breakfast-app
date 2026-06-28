/* eslint-disable */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Coffee, Clock, Calendar, Utensils, CheckCircle2, ArrowLeft, ClipboardList, Minus, Plus, Download, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

// --- 1. FIREBASE CONFIGURATION ---
const isCanvasEnv = typeof __firebase_config !== 'undefined' && !!__firebase_config;

const firebaseConfig = isCanvasEnv 
  ? JSON.parse(__firebase_config) 
    : {
      apiKey: "AIzaSyAzXcwMejGNc7ZH6viupSem_sblk5_8RUg",
      authDomain: "napasai-breakfast.firebaseapp.com",
      projectId: "napasai-breakfast",
      storageBucket: "napasai-breakfast.firebasestorage.app",
      messagingSenderId: "143872485266",
      appId: "1:143872485266:web:006dbeb51726d459d1034b",
      measurementId: "G-XMN15TF4P2"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Path Resolvers ---
const getOrdersCollection = () => {
  if (isCanvasEnv) {
    const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default';
    const segments = ['artifacts', ...rawAppId.split('/'), 'public', 'data', 'breakfast_orders'];
    if (segments.length % 2 === 0) segments.push('items');
    return collection(db, ...segments);
  }
  return collection(db, 'breakfast_orders'); 
};

const getMenuConfigDoc = () => {
  if (isCanvasEnv) {
    const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default';
    const segments = ['artifacts', ...rawAppId.split('/'), 'public', 'data', 'menu_config', 'main_menu'];
    if (segments.length % 2 !== 0) segments.push('doc');
    return doc(db, ...segments);
  }
  return doc(db, 'menu_config', 'main_menu'); 
};

const loadHtml2Canvas = () => {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error('Failed to load html2canvas'));
    document.head.appendChild(script);
  });
};

const FIXED_ROOMS = [
  "132", "133", "134", "135", "141", "142", "144", "145",
  "301", "302", "303", "304", "306", "307", "308", "309", "310", "311", "312", "313"
];

const DEFAULT_MENU_CATEGORIES = [
  { title: "Seasonal fresh fruit juice", items: [{ name: "Orange", outOfStock: false }, { name: "Mango", outOfStock: false }, { name: "Passion fruit", outOfStock: false }, { name: "Coconut", outOfStock: false }] },
  { title: "Vegan Delights", items: [{ name: "Breakfast salad", outOfStock: false }, { name: "Scramble tofu", outOfStock: false }, { name: "Noodle with vegetables", outOfStock: false }, { name: "Mixed tropical fruits platter", outOfStock: false }] },
  { title: "Seasonal sliced fruit", items: [{ name: "Pasion Fruit", outOfStock: false }, { name: "Mango", outOfStock: false }, { name: "Papaya", outOfStock: false }, { name: "Watermelon", outOfStock: false }, { name: "Pineapple", outOfStock: false }] },
  { title: "Eggs & Allergen Introduction", items: [{ name: "Poached Eggs", outOfStock: false }, { name: "Scrambled Eggs", outOfStock: false }, { name: "Boiled egg", outOfStock: false, isBoiledEgg: true }, { name: "Fried Eggs (Sunny Side Up / Over Easy / Over Medium)", outOfStock: false }, { name: "Omelette", outOfStock: false }, { name: "Add-on: Onion", outOfStock: false, indent: true }, { name: "Add-on: Tomato", outOfStock: false, indent: true }, { name: "Add-on: Bell Peppers", outOfStock: false, indent: true }, { name: "Add-on: Cheese", outOfStock: false, indent: true }] },
  { title: "Hot Beverages", items: [{ name: "Coffee", outOfStock: false, isCoffee: true }, { name: "English breakfast tea", outOfStock: false }, { name: "Chocolate (Hot)", outOfStock: false }, { name: "Chocolate (Ice)", outOfStock: false }, { name: "Almond Milk", outOfStock: false }, { name: "Oat Milk", outOfStock: false }, { name: "Low Fat", outOfStock: false }, { name: "Full Fat", outOfStock: false }] },
  { title: "Fresh Pastries", items: [{ name: "Croissant", outOfStock: false }, { name: "Brioche", outOfStock: false }, { name: "Danish", outOfStock: false }, { name: "Muffin", outOfStock: false }, { name: "White Bread", outOfStock: false }, { name: "Brown Bread", outOfStock: false }, { name: "Pancake with maple syrup", outOfStock: false }, { name: "Waffle with maple syrup", outOfStock: false }] },
  { title: "Asian Style", items: [{ name: "Rice porridge (or Boiled rice soup)", outOfStock: false }, { name: "Grilled pork skewers", outOfStock: false }, { name: "Vegetable fried rice", outOfStock: false }, { name: "Stir-fried mixed vegetables", outOfStock: false }, { name: "Stir-fried noodles with soy sauce", outOfStock: false }, { name: "Mix Dim Sum ((Sweet Cream, Prawns Shumai, Pork BBQ)", outOfStock: false }] },
  { title: "Homemade jam", items: [{ name: "Flower honey", outOfStock: false }, { name: "Strawberry jam", outOfStock: false }, { name: "Apricot Jam", outOfStock: false }, { name: "Orange jam", outOfStock: false }] },
  { title: "Grains & Cereals", items: [{ name: "Choco pop", outOfStock: false }, { name: "Corn flakes", outOfStock: false }, { name: "Muesli", outOfStock: false }, { name: "Plain Yoghurt", outOfStock: false }] },
  { title: "Sides", items: [{ name: "Bacon", outOfStock: false }, { name: "Sausage Chicken", outOfStock: false }, { name: "Sausage Pork", outOfStock: false }, { name: "Grilled tomato", outOfStock: false }, { name: "Grilled Mushrooms", outOfStock: false }, { name: "Baked beans", outOfStock: false }, { name: "Hash brown", outOfStock: false }] }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('home');
  const [menuCategories, setMenuCategories] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("Auth Error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setAuthLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const menuDocRef = getMenuConfigDoc();
    const unsubscribe = onSnapshot(menuDocRef, (docSnap) => {
      if (docSnap.exists()) { setMenuCategories(docSnap.data().categories || []); } 
      else { setDoc(menuDocRef, { categories: DEFAULT_MENU_CATEGORIES }).then(() => setMenuCategories(DEFAULT_MENU_CATEGORIES)); }
    });
    return () => unsubscribe();
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-slate-800">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <Utensils className="h-6 w-6 text-slate-700" />
          <h1 className="font-bold text-xl tracking-wider text-slate-800">NAPASAI <span className="font-light text-sm hidden sm:inline">SAMUI RESIDENCE</span></h1>
        </div>
        <div>
          {currentView !== 'home' && (
            <button onClick={() => setCurrentView('home')} className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
            </button>
          )}
        </div>
      </nav>
      <main className="pb-12">
        {currentView === 'home' && (
          <div className="max-w-4xl mx-auto mt-12 px-6 flex flex-col items-center text-center space-y-8">
            <h2 className="text-3xl font-light text-slate-800 uppercase tracking-widest">In-Room Breakfast Booking</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mt-8">
              <button onClick={() => setCurrentView('guest')} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-slate-300 transition-all flex flex-col items-center space-y-4 group">
                <div className="bg-slate-100 p-4 rounded-full group-hover:bg-amber-100"><Coffee className="h-8 w-8 text-slate-700 group-hover:text-amber-700" /></div>
                <h3 className="text-xl font-semibold">Guest Portal</h3>
                <p className="text-sm text-gray-500">Scan and submit your breakfast order</p>
              </button>
              <button onClick={() => setCurrentView('staff')} className="bg-slate-900 text-white p-8 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all flex flex-col items-center space-y-4 group">
                <div className="bg-slate-800 p-4 rounded-full group-hover:bg-slate-700"><ClipboardList className="h-8 w-8 text-white" /></div>
                <h3 className="text-xl font-semibold">Staff Dashboard</h3>
                <p className="text-sm text-slate-300">Daily reports and menu management</p>
              </button>
            </div>
          </div>
        )}
        {currentView === 'guest' && <GuestPortal user={user} menuCategories={menuCategories} />}
        {currentView === 'staff' && <StaffDashboard user={user} menuCategories={menuCategories} />}
      </main>
    </div>
  );
}

// --- 3. GUEST PORTAL COMPONENT ---
function GuestPortal({ user, menuCategories }) {
  const [formData, setFormData] = useState({ roomNo: '', guestName: '', guestsCount: '', serveDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0], serveTime: '', remark: '' });
  const [quantities, setQuantities] = useState({});
  const [boiledEggMin, setBoiledEggMin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleQuantityChange = (key, delta) => setQuantities(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  const handleCheckboxChange = (key) => setQuantities(prev => ({ ...prev, [key]: (prev[key] || 0) > 0 ? 0 : 1 }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.roomNo || !formData.guestName || !formData.serveTime) return alert("Please fill in Room No., Guest Name, and Delivery Time.");
    if (!Object.values(quantities).some(qty => qty > 0)) return alert("Please select at least one item from the menu.");
    setIsSubmitting(true);
    let orderedItems = [];
    Object.entries(quantities).forEach(([key, qty]) => {
      if (qty > 0) {
        const [, itemName] = key.split('|||');
        orderedItems.push(itemName === 'Boiled egg' ? `${qty}x Boiled egg (for ${boiledEggMin || '___'} minute)` : `${qty}x ${itemName}`);
      }
    });
    try {
      await addDoc(getOrdersCollection(), { ...formData, items: orderedItems, createdAt: serverTimestamp(), userId: user?.uid || 'anonymous' });
      setIsSuccess(true);
    } catch (error) { alert("Failed to submit order."); } 
    finally { setIsSubmitting(false); }
  };

  const renderMenuItem = (item, catTitle) => {
    const isObj = typeof item === 'object' && item !== null;
    const itemName = isObj ? item.name : item;
    const isOutOfStock = isObj ? item.outOfStock : false;
    
    if (isObj && item.isCoffee) {
      const hotKey = `${catTitle}|||${itemName} (Hot)`, iceKey = `${catTitle}|||${itemName} (Ice)`;
      return (
        <div key={`${catTitle}|||${itemName}`} className="border-b border-gray-100 py-3 last:border-0">
          <span className={`font-semibold text-slate-800 ${isOutOfStock ? 'line-through text-gray-400' : ''}`}>{itemName} {isOutOfStock && <span className="text-red-500 text-xs ml-2">(Out of stock)</span>}</span>
          {!isOutOfStock && (
            <div className="pl-4 space-y-2.5 mt-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2.5 cursor-pointer flex-1 text-sm text-gray-600">
                  <input type="checkbox" checked={(quantities[hotKey]||0)>0} onChange={()=>handleCheckboxChange(hotKey)} className="w-4.5 h-4.5 rounded" />
                  <span>☕ Hot</span>
                </label>
                <div className="flex items-center bg-gray-50 border rounded-full px-1 py-0.5">
                  <button type="button" onClick={()=>handleQuantityChange(hotKey,-1)} className="w-6 h-6 flex justify-center items-center"><Minus className="w-3.5 h-3.5"/></button>
                  <span className="w-5 text-center text-xs">{quantities[hotKey]||0}</span>
                  <button type="button" onClick={()=>handleQuantityChange(hotKey,1)} className="w-6 h-6 flex justify-center items-center"><Plus className="w-3.5 h-3.5"/></button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2.5 cursor-pointer flex-1 text-sm text-gray-600">
                  <input type="checkbox" checked={(quantities[iceKey]||0)>0} onChange={()=>handleCheckboxChange(iceKey)} className="w-4.5 h-4.5 rounded" />
                  <span>🧊 Ice</span>
                </label>
                <div className="flex items-center bg-gray-50 border rounded-full px-1 py-0.5">
                  <button type="button" onClick={()=>handleQuantityChange(iceKey,-1)} className="w-6 h-6 flex justify-center items-center"><Minus className="w-3.5 h-3.5"/></button>
                  <span className="w-5 text-center text-xs">{quantities[iceKey]||0}</span>
                  <button type="button" onClick={()=>handleQuantityChange(iceKey,1)} className="w-6 h-6 flex justify-center items-center"><Plus className="w-3.5 h-3.5"/></button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    const itemKey = `${catTitle}|||${itemName}`;
    return (
      <div key={itemKey} className={`flex items-center justify-between py-2 border-b border-gray-50 last:border-0 ${isObj && item.indent ? 'pl-8' : ''}`}>
        <label className={`flex items-center space-x-3 flex-1 ${isOutOfStock ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          <input type="checkbox" checked={(quantities[itemKey]||0)>0} disabled={isOutOfStock} onChange={()=>handleCheckboxChange(itemKey)} className="w-5 h-5 rounded" />
          <span className={`flex-1 text-gray-700 ${isOutOfStock ? 'line-through text-gray-400' : ''}`}>
            {isObj && item.isBoiledEgg ? (
              <span className="flex items-center flex-wrap">Boiled egg (for <input type="number" disabled={isOutOfStock} className="w-12 mx-2 p-1 text-center border-b bg-transparent" placeholder="min" value={boiledEggMin} onChange={(e)=>setBoiledEggMin(e.target.value)} onClick={(e)=>e.preventDefault()}/> minute)</span>
            ) : (
              itemName
            )}
            {isOutOfStock && <span className="text-red-500 text-xs ml-2">(Out of stock)</span>}
          </span>
        </label>
        {!isOutOfStock && (
          <div className="flex items-center ml-2 bg-gray-50 border rounded-full px-1 py-0.5 shadow-sm">
            <button type="button" onClick={()=>handleQuantityChange(itemKey,-1)} className="w-7 h-7 flex justify-center items-center"><Minus className="w-4 h-4"/></button>
            <span className="w-6 text-center text-sm font-semibold">{quantities[itemKey]||0}</span>
            <button type="button" onClick={()=>handleQuantityChange(itemKey,1)} className="w-7 h-7 flex justify-center items-center"><Plus className="w-4 h-4"/></button>
          </div>
        )}
      </div>
    );
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto mt-12 px-6 text-center bg-white p-12 rounded-2xl shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
        <h2 className="text-3xl font-serif mb-4">Order Received!</h2>
        <button onClick={() => { setIsSuccess(false); setQuantities({}); setFormData(prev=>({...prev, roomNo:'', guestName:''})); }} className="px-6 py-3 bg-slate-900 text-white rounded-lg">Place Another Order</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="bg-slate-900 text-white p-8 text-center"><h2 className="text-3xl tracking-widest font-serif uppercase">IN-ROOM BREAKFAST MENU</h2><p className="mt-2 text-slate-300 text-sm">Please return it BEFORE MIDNIGHT.</p></div>
        <form onSubmit={handleSubmit} className="p-6 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 pb-10 border-b border-gray-200">
            <div><label className="block text-sm font-semibold mb-2">ROOM NO. *</label><select name="roomNo" value={formData.roomNo} onChange={handleInputChange} required className="w-full rounded-lg border p-3 bg-gray-50"><option value="">Select Room</option>{FIXED_ROOMS.map(r => <option key={r} value={r}>Room {r}</option>)}</select></div>
            <div><label className="block text-sm font-semibold mb-2">GUEST NAME *</label><input type="text" name="guestName" value={formData.guestName} onChange={handleInputChange} required className="w-full rounded-lg border p-3 bg-gray-50" /></div>
            <div><label className="block text-sm font-semibold mb-2">NUMBER OF GUESTS</label><input type="text" name="guestsCount" value={formData.guestsCount} onChange={handleInputChange} className="w-full rounded-lg border p-3 bg-gray-50" /></div>
            <div><label className="block text-sm font-semibold mb-2">DELIVERY DATE *</label><input type="date" name="serveDate" value={formData.serveDate} onChange={handleInputChange} required className="w-full rounded-lg border p-3 bg-gray-50" /></div>
          </div>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-10 flex items-start space-x-3 rounded-r-lg"><Clock className="h-6 w-6 text-amber-500" /><div><p className="text-amber-800 text-sm font-medium">WE SERVE BETWEEN 07.00 AND 10.30.</p></div><input type="time" name="serveTime" value={formData.serveTime} onChange={handleInputChange} required min="07:00" max="10:30" className="ml-auto rounded border-amber-300 p-2" /></div>
          <div className="columns-1 md:columns-2 gap-8 space-y-8">{menuCategories.map((c, i) => <div key={i} className="break-inside-avoid mb-8"><h3 className="text-xl font-serif border-b pb-2 mb-3">{c.title}</h3><div className="space-y-1">{c.items.map(item => renderMenuItem(item, c.title))}</div></div>)}</div>
          <div className="mt-12 pt-8 border-t"><label className="block text-sm font-semibold mb-2">Remark:</label><textarea name="remark" value={formData.remark} onChange={handleInputChange} rows="3" className="w-full rounded-lg border p-3 bg-gray-50"></textarea></div>
          <div className="mt-10 flex justify-center"><button type="submit" disabled={isSubmitting} className="bg-slate-900 text-white px-12 py-4 rounded-full font-semibold">{isSubmitting ? 'Submitting...' : 'Submit Order'}</button></div>
        </form>
      </div>
    </div>
  );
}

// --- 4. STAFF DASHBOARD COMPONENT ---
function StaffDashboard({ user, menuCategories }) {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef(null);

  // States สำหรับแก้ไขเวลา
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [tempTime, setTempTime] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(getOrdersCollection(), (snapshot) => {
      const fetched = [];
      snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() }));
      setOrders(fetched);
      setOrdersLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const ordersByRoom = useMemo(() => {
    const map = {};
    orders.forEach(o => { if (o.serveDate === selectedDate) map[o.roomNo] = o; });
    return map;
  }, [orders, selectedDate]);

  const displayDate = new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const exportAsImage = async () => {
    setIsExporting(true);
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const link = document.createElement('a'); link.download = `Breakfast_Report_${selectedDate}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click();
    } catch (error) { alert("Failed to save image."); } finally { setIsExporting(false); }
  };

  // ฟังก์ชัน: ลบออเดอร์
  const handleDeleteOrder = async (orderId, roomNo) => {
    if (!window.confirm(`Are you sure you want to permanently delete the order for Room ${roomNo}?`)) return;
    try {
      if (isCanvasEnv) {
        const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default';
        const segments = ['artifacts', ...rawAppId.split('/'), 'public', 'data', 'breakfast_orders', orderId];
        await deleteDoc(doc(db, ...segments));
      } else {
        await deleteDoc(doc(db, 'breakfast_orders', orderId));
      }
    } catch (error) { alert("Failed to delete order."); }
  };

  // ฟังก์ชัน: อัปเดตเวลา
  const handleSaveTime = async (orderId) => {
    if (!tempTime) { setEditingOrderId(null); return; }
    try {
      if (isCanvasEnv) {
        const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default';
        const segments = ['artifacts', ...rawAppId.split('/'), 'public', 'data', 'breakfast_orders', orderId];
        await updateDoc(doc(db, ...segments), { serveTime: tempTime });
      } else {
        await updateDoc(doc(db, 'breakfast_orders', orderId), { serveTime: tempTime });
      }
      setEditingOrderId(null);
    } catch (error) { alert("Failed to update time."); }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6">
      <div className="flex border-b mb-6 bg-white rounded-lg p-1.5 shadow-sm space-x-1">
        <button onClick={() => setActiveTab('orders')} className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium ${activeTab === 'orders' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><ClipboardList className="w-4.5 h-4.5" /><span>Daily Orders</span></button>
        <button onClick={() => setActiveTab('manage-menu')} className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium ${activeTab === 'manage-menu' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Edit2 className="w-4.5 h-4.5" /><span>🛠️ Manage Menu & Stock</span></button>
      </div>

      {activeTab === 'orders' ? (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border">
          <div className="bg-slate-50 border-b p-4 flex justify-between items-center"><div className="flex items-center space-x-3"><Calendar className="h-6 w-6 text-slate-600" /><h2 className="text-lg font-bold">In-room Breakfast daily summary</h2></div><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded border p-2 text-sm font-medium" /></div>
          <div className="overflow-x-auto pb-4">
            <div ref={reportRef} className="bg-white min-w-[1150px]">
              <div className="p-4 relative flex justify-center items-center">
                <h3 className="text-2xl font-bold text-blue-900">Napasai Residence - Breakfast Report ({displayDate})</h3>
                <button data-html2canvas-ignore="true" onClick={exportAsImage} className="absolute right-4 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow hover:bg-slate-800 text-sm font-medium flex items-center"><Download className="h-4 w-4 mr-2" /> Save as Photo</button>
              </div>
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr>
                    <th className="border-y-2 bg-slate-100 p-3 text-center w-20">ROOM</th>
                    <th className="border-y-2 bg-slate-100 p-3 text-center w-24">PAX</th>
                    <th className="border-y-2 bg-slate-100 p-3 text-center w-36">TIME</th>
                    <th className="border-y-2 bg-slate-100 p-3 text-left w-48">GUEST NAME</th>
                    <th className="border-y-2 bg-slate-100 p-3 text-left w-48">REMARK</th>
                    <th className="border-y-2 bg-slate-100 p-3 text-left">MENU ITEMS</th>
                    <th className="border-y-2 bg-slate-100 p-3 text-center w-32 text-red-600">CLEAR ORDER</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersLoading ? <tr><td colSpan="7" className="p-8 text-center text-slate-500">Loading...</td></tr> : FIXED_ROOMS.map((room) => {
                    const order = ordersByRoom[room];
                    const hasOrder = !!order;
                    return (
                      <tr key={room} className="hover:bg-slate-50 border-b">
                        <td className={`p-3 text-center border-r align-top ${hasOrder ? "bg-amber-400 font-bold" : ""}`}>{room}</td>
                        <td className={`p-3 text-center border-r align-top ${hasOrder ? "bg-amber-400 font-bold" : ""}`}>{hasOrder ? order.guestsCount || '-' : '-'}</td>
                        
                        {/* --- แก้ไขเวลา ⏱️ --- */}
                        <td className="p-3 text-center border-r align-top font-bold text-blue-800">
                          {hasOrder ? (
                            editingOrderId === order.id ? (
                              <div className="flex items-center justify-center space-x-1" data-html2canvas-ignore="true">
                                <input type="time" value={tempTime} onChange={(e) => setTempTime(e.target.value)} className="border rounded p-1 text-xs" />
                                <button onClick={() => handleSaveTime(order.id)} className="bg-green-100 text-green-700 rounded p-1">💾</button>
                                <button onClick={() => setEditingOrderId(null)} className="bg-red-100 text-red-700 rounded p-1">❌</button>
                              </div>
                            ) : (
                              <div 
                                className="cursor-pointer group flex items-center justify-center space-x-1 hover:bg-blue-50 p-1 rounded transition-colors"
                                onClick={() => { setEditingOrderId(order.id); setTempTime(order.serveTime); }}
                                title="Click to edit delivery time"
                              >
                                <span>{order.serveTime}</span>
                                <Edit2 className="w-3 h-3 text-blue-300 group-hover:text-blue-600" data-html2canvas-ignore="true"/>
                              </div>
                            )
                          ) : '-'}
                        </td>

                        <td className="p-3 border-r align-top">{hasOrder ? order.guestName : '-'}</td>
                        <td className={`p-3 border-r align-top ${hasOrder && order.remark ? "bg-amber-400 font-bold" : ""}`}>{hasOrder ? order.remark || '-' : '-'}</td>
                        <td className="p-3 border-r align-top">{hasOrder && order.items?.length > 0 ? <ul className="list-disc list-inside text-sm space-y-1">{order.items.map((item, i) => <li key={i}>{item}</li>)}</ul> : '-'}</td>
                        
                        {/* --- ปุ่มลบออเดอร์ 🗑️ --- */}
                        <td className="p-3 align-top text-center" data-html2canvas-ignore="true">
                          {hasOrder ? (
                            <button onClick={() => handleDeleteOrder(order.id, room)} className="bg-red-50 text-red-600 border border-red-200 p-2 rounded-lg hover:bg-red-100 mx-auto flex items-center" title="Delete Order">
                              <Trash2 className="w-4 h-4 mr-1" /><span className="text-xs font-semibold">Delete</span>
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : <ManageMenuPanel menuCategories={menuCategories} />}
    </div>
  );
}

function ManageMenuPanel({ menuCategories }) {
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [newItemNames, setNewItemNames] = useState({});
  const updateMenuConfig = async (cats) => { setIsSaving(true); try { await updateDoc(getMenuConfigDoc(), { categories: cats }); setSuccessMsg("Saved!"); setTimeout(()=>setSuccessMsg(""), 3000); } catch(e){} finally {setIsSaving(false)} };
  const handleToggleStock = (catIdx, itemIdx) => { const cats = JSON.parse(JSON.stringify(menuCategories)); const item = cats[catIdx].items[itemIndex]; if(typeof item==='object') item.outOfStock = !item.outOfStock; else cats[catIdx].items[itemIndex] = {name: item, outOfStock: true}; updateMenuConfig(cats); };
  const handleDeleteItem = (catIdx, itemIdx) => { if(window.confirm("Delete this menu item?")) { const cats = JSON.parse(JSON.stringify(menuCategories)); cats[catIdx].items.splice(itemIdx, 1); updateMenuConfig(cats); }};
  const handleAddItem = (catIdx, title) => { const name = newItemNames[title]?.trim(); if(!name) return; const cats = JSON.parse(JSON.stringify(menuCategories)); const newItem = {name, outOfStock: false}; if(title.includes("Egg")) newItem.isBoiledEgg = true; if(title.includes("Beverage")) newItem.isCoffee = true; cats[catIdx].items.push(newItem); updateMenuConfig(cats); setNewItemNames(p=>({...p, [title]:""})); };
  return (
    <div className="bg-white shadow-lg rounded-xl border p-6">
      <div className="flex justify-between items-center border-b pb-4 mb-6"><h2 className="text-xl font-bold">🛠️ Manage Menu</h2><button onClick={async ()=>{if(window.confirm("Reset?")) await setDoc(getMenuConfigDoc(), {categories: DEFAULT_MENU_CATEGORIES})}} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg">Reset Default</button></div>
      {successMsg && <div className="bg-emerald-50 text-emerald-800 p-3 mb-6 rounded flex"><CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2"/>{successMsg}</div>}
      <div className="space-y-8">{menuCategories.map((c, i) => (
        <div key={i} className="bg-slate-50 rounded-xl p-5 border"><h3 className="text-lg font-bold border-b pb-2 mb-4">{c.title}</h3>
          <div className="space-y-3 mb-6">{c.items.map((item, j) => {
            const isObj = typeof item === 'object'; const name = isObj ? item.name : item; const out = isObj ? item.outOfStock : false;
            return <div key={j} className={`flex justify-between items-center bg-white p-3 rounded-lg border ${out ? 'bg-red-50/20' : ''}`}><span className={out ? 'line-through text-gray-400' : ''}>{name}</span><div className="space-x-2"><button onClick={()=>handleToggleStock(i,j)} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded">{out?'Out of Stock':'In Stock'}</button><button onClick={()=>handleDeleteItem(i,j)} className="p-1 bg-white border rounded text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></div></div>
          })}</div>
          <div className="flex gap-3"><input type="text" value={newItemNames[c.title]||""} onChange={(e)=>setNewItemNames(p=>({...p, [c.title]: e.target.value}))} className="w-full border rounded p-2" placeholder="New item..."/><button onClick={()=>handleAddItem(i, c.title)} className="bg-slate-900 text-white px-5 rounded">Add</button></div>
        </div>
      ))}</div>
    </div>
  );
}