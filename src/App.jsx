/* eslint-disable */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Coffee, Clock, Calendar, Utensils, CheckCircle2, User, ArrowLeft, ClipboardList, Minus, Plus, Download, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

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

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-slate-800">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <Utensils className="h-6 w-6 text-slate-700" />
          <h1 className="font-bold text-xl tracking-wider text-slate-800">NAPASAI <span className="font-light text-sm hidden sm:inline">SAMUI RESIDENCE</span></h1>
        </div>
        <div>{currentView !== 'home' && <button onClick={() => setCurrentView('home')} className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Home</button>}</div>
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
                <label className="flex items-center space-x-2.5 cursor-pointer flex-1 text-sm text-gray-600"><input type="checkbox" checked={(quantities[hotKey]||0)>0} onChange={()=>handleCheckboxChange(hotKey)} className="w-4.5 h-4.5 rounded" /><span>☕ Hot</span></label>
                <div className="flex items-center bg-gray-50 border rounded-full px-1 py-0.5"><button type="button" onClick={()=>handleQuantityChange(hotKey,-1)} className="w-6 h-6"><Minus className="w-3.5 h-3.5 mx-auto"/></button><span className="w-5 text-center text-xs">{quantities[hotKey]||0}</span><button type="button" onClick={()=>handleQuantityChange(hotKey,1)} className="w-6 h-6"><Plus className="w-3.5 h-3.5 mx-auto"/></button></div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2.5 cursor-pointer flex-1 text-sm text-gray-600"><input type="checkbox" checked={(quantities[iceKey]||0)>0} onChange={()=>handleCheckboxChange(iceKey)} className="w-4.5 h-4.5 rounded" /><span>🧊 Ice</span></label>
                <div className="flex items-center bg-gray-50 border rounded-full px-1 py-0.5"><button type="button" onClick={()=>handleQuantityChange(iceKey,-1)} className="w-6 h-6"><Minus className="w-3.5 h-3.5 mx-auto"/></button><span className="w-5 text-center text-xs">{quantities[iceKey]||0}</span><button type="button" onClick={()=>handleQuantityChange(iceKey,1)} className="w-6 h-6"><Plus className="w-3.5 h-3.5 mx-auto"/></button></div>
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
            {isObj && item.isBoiledEgg ? <span className="flex items-center flex-wrap">Boiled egg (for <input type="number" disabled={isOutOfStock} className="w-12 mx-2 p-1 text-center border-b bg-transparent" placeholder="min" value={boiledEggMin} onChange={(e)=>setBoiledEggMin(e.target.value)} onClick={(e)=>e.preventDefault()}/> minute)</span> : itemName}
            {isOutOfStock && <span className="text-red-500 text-xs ml-2">(Out of stock)</span>}
          </span>
        </label>
        {!isOutOfStock && (
          <div className="flex items-center ml-2 bg-gray-50 border rounded-full px-1 py-0.5 shadow-sm"><button type="button" onClick={()=>handleQuantityChange(itemKey,-1)} className="w-7 h-7"><Minus className="w-4 h-4 mx-auto"/></button><span className="w-6 text-center text-sm font-semibold">{quantities[itemKey]||0}</span><button type="button" onClick={()=>handleQuantityChange(itemKey,1)} className="w-7 h-7"><Plus className="w-4 h-4 mx-auto"/></button></div>
        )}
      </div>
    );
  };

  if (isSuccess) return <div className="max-w-2xl mx-auto mt-12 px-6 text-center bg-white p-12 rounded-2xl shadow-sm"><CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" /><h2 className="text-3xl font-serif mb-4">Order Received!</h2><button onClick={() => { setIsSuccess(false); setQuantities({}); setFormData(prev=>({...prev, roomNo:'', guestName:''})); }} className="px-6 py-3 bg-slate-900 text-white