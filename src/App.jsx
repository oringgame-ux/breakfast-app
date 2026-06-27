import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Coffee, Clock, Calendar, Utensils, CheckCircle2, User, ArrowLeft, ClipboardList, Info, X, Minus, Plus, Download, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

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
// Safely resolve paths to prevent SDK segment parity errors and handle Canvas environment limits gracefully
const getOrdersCollection = () => {
  try {
    if (isCanvasEnv) {
      const appId = typeof __app_id !== 'undefined' ? encodeURIComponent(__app_id) : 'default-app-id';
      return collection(db, 'artifacts', appId, 'public', 'data', 'breakfast_orders');
    }
  } catch (e) {
    // Silently fallback if segment calculation fails in preview
  }
  return collection(db, 'breakfast_orders'); 
};

const getMenuConfigDoc = () => {
  try {
    if (isCanvasEnv) {
      const appId = typeof __app_id !== 'undefined' ? encodeURIComponent(__app_id) : 'default-app-id';
      return doc(db, 'artifacts', appId, 'public', 'data', 'menu_config', 'main_menu');
    }
  } catch (e) {
    // Silently fallback if segment calculation fails in preview
  }
  return doc(db, 'menu_config', 'main_menu'); 
};

// --- Html2Canvas Helper ---
const loadHtml2Canvas = () => {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) {
      resolve(window.html2canvas);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error('Failed to load html2canvas'));
    document.head.appendChild(script);
  });
};

// --- Standard Hotel Rooms ---
const FIXED_ROOMS = [
  "132", "133", "134", "135", "141", "142", "144", "145",
  "301", "302", "303", "304", "306", "307", "308", "309", "310", "311", "312", "313"
];

// --- Default Menu Structure ---
const DEFAULT_MENU_CATEGORIES = [
  {
    title: "Seasonal fresh fruit juice",
    items: [
      { name: "Orange", outOfStock: false },
      { name: "Mango", outOfStock: false },
      { name: "Passion fruit", outOfStock: false },
      { name: "Coconut", outOfStock: false }
    ]
  },
  {
    title: "Vegan Delights",
    items: [
      { name: "Breakfast salad", outOfStock: false },
      { name: "Scramble tofu", outOfStock: false },
      { name: "Noodle with vegetables", outOfStock: false },
      { name: "Mixed tropical fruits platter", outOfStock: false }
    ]
  },
  {
    title: "Seasonal sliced fruit",
    items: [
      { name: "Passion Fruit", outOfStock: false },
      { name: "Mango", outOfStock: false },
      { name: "Papaya", outOfStock: false },
      { name: "Watermelon", outOfStock: false },
      { name: "Pineapple", outOfStock: false }
    ]
  },
  {
    title: "Eggs & Allergen Introduction",
    items: [
      { name: "Poached Eggs", outOfStock: false },
      { name: "Scrambled Eggs", outOfStock: false },
      { name: "Boiled egg", outOfStock: false, isBoiledEgg: true },
      { name: "Fried Eggs - Sunny Side Up", outOfStock: false },
      { name: "Fried Eggs - Over Easy", outOfStock: false },
      { name: "Fried Eggs - Over Medium", outOfStock: false },
      { name: "Omelette", outOfStock: false },
      { name: "Add-on: Onion", outOfStock: false, indent: true },
      { name: "Add-on: Tomato", outOfStock: false, indent: true },
      { name: "Add-on: Bell Peppers", outOfStock: false, indent: true },
      { name: "Add-on: Cheese", outOfStock: false, indent: true }
    ]
  },
  {
    title: "Hot Beverages",
    items: [
      { name: "Coffee", outOfStock: false, isCoffee: true },
      { name: "English breakfast tea", outOfStock: false },
      { name: "Chocolate (Hot)", outOfStock: false },
      { name: "Chocolate (Ice)", outOfStock: false },
      { name: "Almond Milk", outOfStock: false },
      { name: "Oat Milk", outOfStock: false },
      { name: "Low Fat", outOfStock: false },
      { name: "Full Fat", outOfStock: false }
    ]
  },
  {
    title: "Fresh Pastries",
    items: [
      { name: "Croissant", outOfStock: false },
      { name: "Brioche", outOfStock: false },
      { name: "Danish", outOfStock: false },
      { name: "Muffin", outOfStock: false },
      { name: "White Bread", outOfStock: false },
      { name: "Brown Bread", outOfStock: false },
      { name: "Pancake with maple syrup", outOfStock: false },
      { name: "Waffle with maple syrup", outOfStock: false }
    ]
  },
  {
    title: "Asian Style",
    items: [
      { name: "Rice porridge (or Boiled rice soup)", outOfStock: false },
      { name: "Grilled pork skewers", outOfStock: false },
      { name: "Vegetable fried rice", outOfStock: false },
      { name: "Stir-fried mixed vegetables", outOfStock: false },
      { name: "Stir-fried noodles with soy sauce", outOfStock: false },
      { name: "Mix Dim Sum (Sweet Cream, Prawns Shumai, Pork BBQ)", outOfStock: false }
    ]
  },
  {
    title: "Homemade jam",
    items: [
      { name: "Flower honey", outOfStock: false },
      { name: "Strawberry jam", outOfStock: false },
      { name: "Apricot Jam", outOfStock: false },
      { name: "Orange jam", outOfStock: false }
    ]
  },
  {
    title: "Grains & Cereals",
    items: [
      { name: "Choco pop", outOfStock: false },
      { name: "Corn flakes", outOfStock: false },
      { name: "Muesli", outOfStock: false },
      { name: "Plain Yoghurt", outOfStock: false }
    ]
  },
  {
    title: "Sides",
    items: [
      { name: "Bacon", outOfStock: false },
      { name: "Sausage Chicken", outOfStock: false },
      { name: "Sausage Pork", outOfStock: false },
      { name: "Grilled tomato", outOfStock: false },
      { name: "Grilled Mushrooms", outOfStock: false },
      { name: "Baked beans", outOfStock: false },
      { name: "Hash brown", outOfStock: false }
    ]
  }
];

// --- 2. MAIN APPLICATION COMPONENT ---
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
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let unsubscribe = () => {};
    try {
      const menuDocRef = getMenuConfigDoc();
      
      unsubscribe = onSnapshot(menuDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setMenuCategories(docSnap.data().categories || []);
        } else {
          setDoc(menuDocRef, { categories: DEFAULT_MENU_CATEGORIES })
            .then(() => setMenuCategories(DEFAULT_MENU_CATEGORIES))
            .catch((err) => {
              if (err.code !== 'permission-denied') console.error("Error seeding menu:", err);
              setMenuCategories(DEFAULT_MENU_CATEGORIES);
            });
        }
      }, (error) => {
        // Suppress permission-denied errors in preview environment to prevent confusing logs
        if (error.code !== 'permission-denied') {
          console.error("Error reading menu:", error);
        }
        setMenuCategories(DEFAULT_MENU_CATEGORIES);
      });
    } catch (e) {
      setMenuCategories(DEFAULT_MENU_CATEGORIES);
    }

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
          <h1 className="font-bold text-xl tracking-wider text-slate-800">
            NAPASAI <span className="font-light text-sm hidden sm:inline">SAMUI RESIDENCE</span>
          </h1>
        </div>
        <div>
          {currentView !== 'home' && (
            <button 
              onClick={() => setCurrentView('home')} 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
            </button>
          )}
        </div>
      </nav>

      <main className="pb-12">
        {currentView === 'home' && (
          <div className="max-w-4xl mx-auto mt-12 px-6 flex flex-col items-center text-center space-y-8">
            <h2 className="text-3xl font-light text-slate-800 uppercase tracking-widest">In-Room Breakfast Booking</h2>
            <p className="text-slate-500 max-w-md">Welcome to the in-room breakfast booking system. Please select your portal below.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mt-8">
              <button 
                onClick={() => setCurrentView('guest')}
                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-slate-300 transition-all flex flex-col items-center space-y-4 group"
              >
                <div className="bg-slate-100 p-4 rounded-full group-hover:bg-amber-100 transition-colors">
                  <Coffee className="h-8 w-8 text-slate-700 group-hover:text-amber-700" />
                </div>
                <h3 className="text-xl font-semibold">Guest Portal</h3>
                <p className="text-sm text-gray-500">Scan and submit your breakfast order</p>
              </button>

              <button 
                onClick={() => setCurrentView('staff')}
                className="bg-slate-900 text-white p-8 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all flex flex-col items-center space-y-4 group"
              >
                <div className="bg-slate-800 p-4 rounded-full group-hover:bg-slate-700 transition-colors">
                  <ClipboardList className="h-8 w-8 text-white" />
                </div>
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
  const [formData, setFormData] = useState({
    roomNo: '',
    guestName: '',
    guestsCount: '',
    serveDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
    serveTime: '',
    remark: ''
  });
  
  const [quantities, setQuantities] = useState({});
  const [boiledEggMin, setBoiledEggMin] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuantityChange = (itemKey, delta) => {
    setQuantities(prev => {
      const current = prev[itemKey] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [itemKey]: next };
    });
  };

  const handleCheckboxChange = (itemKey) => {
    setQuantities(prev => {
      const isChecked = (prev[itemKey] || 0) > 0;
      return { ...prev, [itemKey]: isChecked ? 0 : 1 };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.roomNo || !formData.guestName || !formData.serveTime) {
      alert("Please fill in Room No., Guest Name, and Delivery Time.");
      return;
    }

    const hasItems = Object.values(quantities).some(qty => qty > 0);
    if (!hasItems) {
      alert("Please select at least one item from the menu.");
      return;
    }

    setIsSubmitting(true);

    let orderedItems = [];
    Object.entries(quantities).forEach(([key, qty]) => {
      if (qty > 0) {
        const [categoryTitle, itemName] = key.split('|||');
        
        if (itemName === 'Boiled egg') {
          const mins = boiledEggMin ? boiledEggMin : '___';
          orderedItems.push(`${qty}x Boiled egg (for ${mins} minute)`);
        } else {
          if (categoryTitle === "Seasonal fresh fruit juice") {
            orderedItems.push(`${qty}x ${itemName} (Juice)`);
          } else if (categoryTitle === "Seasonal sliced fruit") {
            orderedItems.push(`${qty}x ${itemName} (Sliced fruit)`);
          } else {
            orderedItems.push(`${qty}x ${itemName}`);
          }
        }
      }
    });

    const orderPayload = {
      ...formData,
      items: orderedItems,
      createdAt: serverTimestamp(),
      userId: user?.uid || 'anonymous'
    };

    try {
      const ordersRef = getOrdersCollection();
      await addDoc(ordersRef, orderPayload);
      setIsSuccess(true);
    } catch (error) {
      if (error.code === 'permission-denied') {
        alert("Preview Limitation: Orders cannot be submitted here. Please test this on your deployed Vercel site.");
      } else {
        console.error("Error submitting order:", error);
        alert("Failed to submit order. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMenuItem = (item, categoryTitle) => {
    const isObj = typeof item === 'object' && item !== null;
    const itemName = isObj ? item.name : item;
    const isOutOfStock = isObj ? item.outOfStock === true : false;
    const isIndented = isObj ? item.indent === true : false;
    const isBoiledEgg = isObj ? item.isBoiledEgg === true : false;
    const isCoffee = isObj ? item.isCoffee === true : false;

    if (isCoffee) {
      const hotKey = `${categoryTitle}|||${itemName} (Hot)`;
      const iceKey = `${categoryTitle}|||${itemName} (Ice)`;
      const hotQty = quantities[hotKey] || 0;
      const iceQty = quantities[iceKey] || 0;

      return (
        <div key={`${categoryTitle}|||${itemName}`} className="border-b border-gray-100 py-3 last:border-0">
          <div className="flex flex-col space-y-2">
            <span className={`font-semibold text-slate-800 ${isOutOfStock ? 'line-through text-gray-400' : ''}`}>
              {itemName} {isOutOfStock && <span className="text-red-500 text-xs ml-2">(Out of stock)</span>}
            </span>
            
            {!isOutOfStock && (
              <div className="pl-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2.5 cursor-pointer flex-1 text-sm text-gray-600">
                    <input 
                      type="checkbox" 
                      checked={hotQty > 0} 
                      onChange={() => handleCheckboxChange(hotKey)}
                      className="w-4.5 h-4.5 text-slate-900 border-gray-300 rounded focus:ring-slate-900" 
                    />
                    <span>☕ Hot</span>
                  </label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-1 py-0.5">
                    <button type="button" onClick={() => handleQuantityChange(hotKey, -1)} disabled={hotQty === 0} className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${hotQty > 0 ? 'text-red-500 hover:bg-red-50' : 'text-gray-300'}`}><Minus className="w-3.5 h-3.5" /></button>
                    <span className="w-5 text-center font-semibold text-slate-800 text-xs">{hotQty}</span>
                    <button type="button" onClick={() => handleQuantityChange(hotKey, 1)} className="w-6 h-6 flex items-center justify-center rounded-full text-green-600 hover:bg-green-50"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2.5 cursor-pointer flex-1 text-sm text-gray-600">
                    <input 
                      type="checkbox" 
                      checked={iceQty > 0} 
                      onChange={() => handleCheckboxChange(iceKey)}
                      className="w-4.5 h-4.5 text-slate-900 border-gray-300 rounded focus:ring-slate-900" 
                    />
                    <span>🧊 Ice</span>
                  </label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-1 py-0.5">
                    <button type="button" onClick={() => handleQuantityChange(iceKey, -1)} disabled={iceQty === 0} className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${iceQty > 0 ? 'text-red-500 hover:bg-red-50' : 'text-gray-300'}`}><Minus className="w-3.5 h-3.5" /></button>
                    <span className="w-5 text-center font-semibold text-slate-800 text-xs">{iceQty}</span>
                    <button type="button" onClick={() => handleQuantityChange(iceKey, 1)} className="w-6 h-6 flex items-center justify-center rounded-full text-green-600 hover:bg-green-50"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    const itemKey = `${categoryTitle}|||${itemName}`;
    const qty = quantities[itemKey] || 0;

    return (
      <div key={itemKey} className={`flex items-center justify-between group py-2 border-b border-gray-50 last:border-0 ${isIndented ? 'pl-8' : ''}`}>
        <label className={`flex items-center space-x-3 flex-1 ${isOutOfStock ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          <input 
            type="checkbox" 
            checked={qty > 0} 
            disabled={isOutOfStock}
            onChange={() => handleCheckboxChange(itemKey)}
            className="w-5 h-5 text-slate-900 border-gray-300 rounded focus:ring-slate-900 transition-colors flex-shrink-0 disabled:bg-gray-200" 
          />
          <span className={`text-gray-700 group-hover:text-slate-900 flex-1 flex items-center ${isIndented ? 'text-sm' : ''} ${isOutOfStock ? 'line-through text-gray-400' : ''}`}>
            {isBoiledEgg ? (
              <span className="flex items-center flex-wrap">
                Boiled egg (for 
                <input 
                  type="number" 
                  disabled={isOutOfStock}
                  className="w-12 mx-2 p-1 text-center border-b border-gray-400 focus:outline-none focus:border-slate-900 bg-transparent text-sm disabled:border-gray-200" 
                  placeholder="min"
                  value={boiledEggMin}
                  onChange={(e) => setBoiledEggMin(e.target.value)}
                  onClick={(e) => e.preventDefault()}
                /> 
                minute(s))
              </span>
            ) : (
              itemName
            )}
            {isOutOfStock && <span className="text-red-500 text-xs ml-2">(Out of stock)</span>}
          </span>
        </label>
        
        {!isOutOfStock && (
          <div className="flex items-center ml-2 bg-gray-50 border border-gray-200 rounded-full px-1 py-0.5 shadow-sm">
            <button 
              type="button" 
              onClick={() => handleQuantityChange(itemKey, -1)}
              disabled={qty === 0}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${qty > 0 ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-semibold text-slate-800 text-sm">{qty}</span>
            <button 
              type="button" 
              onClick={() => handleQuantityChange(itemKey, 1)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-green-600 hover:bg-green-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto mt-12 px-6 text-center bg-white p-12 rounded-2xl shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
        <h2 className="text-3xl font-serif text-slate-800 mb-4">Order Received!</h2>
        <p className="text-slate-600 mb-8">Thank you, {formData.guestName}. Your breakfast order for Room {formData.roomNo} has been successfully submitted.</p>
        <button 
          onClick={() => { setIsSuccess(false); setQuantities({}); setBoiledEggMin(''); setFormData({...formData, roomNo:'', guestName:''}); }}
          className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          Place Another Order
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        
        <div className="bg-slate-900 text-white p-8 text-center">
          <h2 className="text-3xl tracking-widest font-serif uppercase">IN-ROOM BREAKFAST MENU</h2>
          <p className="mt-2 text-slate-300 text-sm tracking-wide">Please kindly fill in the breakfast order form and return it BEFORE MIDNIGHT.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 pb-10 border-b border-gray-200">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ROOM NO. *</label>
              <select name="roomNo" value={formData.roomNo} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 border p-3 focus:ring-slate-500 focus:border-slate-500 bg-gray-50">
                <option value="">Select Room</option>
                {FIXED_ROOMS.map(room => <option key={room} value={room}>Room {room}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">GUEST NAME *</label>
              <input type="text" name="guestName" value={formData.guestName} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 border p-3 focus:ring-slate-500 focus:border-slate-500 bg-gray-50" placeholder="Full Name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">NUMBER OF GUESTS</label>
              <input type="text" name="guestsCount" value={formData.guestsCount} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 border p-3 focus:ring-slate-500 focus:border-slate-500 bg-gray-50" placeholder="e.g., 2" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">DELIVERY DATE *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input type="date" name="serveDate" value={formData.serveDate} onChange={handleInputChange} required className="pl-10 w-full rounded-lg border-gray-300 border p-3 focus:ring-slate-500 focus:border-slate-500 bg-gray-50" />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-10 flex items-start space-x-3 rounded-r-lg">
            <Clock className="h-6 w-6 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-amber-800 text-sm font-medium">WE ARE DELIGHTED TO SERVE YOU BREAKFAST BETWEEN 07.00 AND 10.30.</p>
              <p className="text-amber-700 text-xs mt-1">KINDLY ADVISE US OF YOUR PREFERRED DELIVERY TIME.</p>
            </div>
            <input 
              type="time" 
              name="serveTime" 
              value={formData.serveTime} 
              onChange={handleInputChange} 
              required
              min="07:00" max="10:30"
              className="ml-auto rounded border-amber-300 border p-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm" 
            />
          </div>

          <div className="columns-1 md:columns-2 gap-8 space-y-8">
            {menuCategories.map((category, idx) => (
              <div key={idx} className="break-inside-avoid mb-8">
                <h3 className="text-xl font-serif text-slate-800 border-b border-gray-200 pb-2 mb-3">{category.title}</h3>
                <div className="space-y-1">
                  {category.items.map((item) => renderMenuItem(item, category.title))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
             <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6 text-sm text-slate-600">
               <p className="font-medium text-slate-800 mb-2">We welcome inquiries from guests and patrons who wish to know whether any menu items contain particular ingredients.</p>
               <p>Please inform us of any allergy or special dietary requirements that we should be made aware of when placing your order.</p>
             </div>
             
             <label className="block text-sm font-semibold text-gray-700 mb-2">Remark:</label>
             <textarea 
               name="remark"
               value={formData.remark}
               onChange={handleInputChange}
               rows="3" 
               className="w-full rounded-lg border-gray-300 border p-3 focus:ring-slate-500 focus:border-slate-500 bg-gray-50" 
               placeholder="Write your remarks here..."
             ></textarea>
             
             <p className="text-xs text-red-500 mt-4 text-center">
               Some of our foods contain allergens. Certain dishes and beverages may contain one of more of 14 allergens designated by EU Regulations No. 1169/2011.
             </p>
          </div>

          <div className="mt-10 flex justify-center">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-slate-900 text-white px-12 py-4 rounded-full font-semibold text-lg hover:bg-slate-800 hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div> Submitting...</>
              ) : (
                'Submit Order'
              )}
            </button>
          </div>

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

  useEffect(() => {
    if (!user) return;
    
    let unsubscribe = () => {};
    try {
      const ordersRef = getOrdersCollection();
      
      unsubscribe = onSnapshot(ordersRef, (snapshot) => {
        const fetchedOrders = [];
        snapshot.forEach(doc => {
          fetchedOrders.push({ id: doc.id, ...doc.data() });
        });
        setOrders(fetchedOrders);
        setOrdersLoading(false);
      }, (error) => {
        if (error.code !== 'permission-denied') {
          console.error("Error loading orders:", error);
        }
        setOrdersLoading(false);
      });
    } catch (e) {
      setOrdersLoading(false);
    }

    return () => unsubscribe();
  }, [user]);

  const ordersByRoom = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      if (order.serveDate === selectedDate) {
        map[order.roomNo] = order;
      }
    });
    return map;
  }, [orders, selectedDate]);

  const displayDate = new Date(selectedDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const exportAsImage = async () => {
    setIsExporting(true);
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, 
        backgroundColor: '#ffffff',
        logging: false
      });
      const image = canvas.toDataURL('image/png', 1.0);
      
      const link = document.createElement('a');
      link.download = `Breakfast_Report_${selectedDate}.png`;
      link.href = image;
      link.click();
    } catch (error) {
      console.error("Error exporting image:", error);
      alert("Failed to save image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6">
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-lg p-1.5 shadow-sm space-x-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'orders' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <ClipboardList className="w-4.5 h-4.5" />
          <span>Daily Orders</span>
        </button>
        <button
          onClick={() => setActiveTab('manage-menu')}
          className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'manage-menu' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Edit2 className="w-4.5 h-4.5" />
          <span>🛠️ Manage Menu & Stock</span>
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="bg-slate-50 border-b border-gray-200 p-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-800">In-room Breakfast daily summary report</h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-slate-600">Select Date:</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-md border-gray-300 border p-2 text-sm focus:ring-slate-500 focus:border-slate-500 font-medium text-slate-800 shadow-sm bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto bg-gray-50/50 pb-4">
            <div ref={reportRef} className="bg-white min-w-[1100px] flex flex-col">
              
              <div className="p-4 relative flex justify-center items-center">
                <h3 className="text-2xl font-bold text-blue-900">Napasai Residence - Breakfast Report <span className="ml-2 text-blue-800">({displayDate})</span></h3>
                <button
                  data-html2canvas-ignore="true" 
                  onClick={exportAsImage}
                  disabled={isExporting}
                  className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-sm hover:bg-slate-800 hover:shadow transition-all disabled:opacity-70 text-sm font-medium"
                >
                  {isExporting ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Saving...</span></>
                  ) : (
                    <><Download className="h-4 w-4" /><span>Save as Photo</span></>
                  )}
                </button>
              </div>

              <div>
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr>
                      <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-center font-bold text-slate-700 w-24">ROOM NO.</th>
                      <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-center font-bold text-slate-700 w-24">No. of Guests</th>
                      <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-center font-bold text-slate-700 w-32">TIME</th>
                      <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-left font-bold text-slate-700 w-48">GUEST NAME</th>
                      <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-left font-bold text-slate-700 w-48">REMARK / ALLERGY</th>
                      <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-left font-bold text-slate-700">MENU ITEMS</th>
                      <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-center font-bold text-slate-700 w-32">CHECK OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersLoading ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-500">Loading orders...</td>
                      </tr>
                    ) : (
                      FIXED_ROOMS.map((room) => {
                        const order = ordersByRoom[room];
                        const hasOrder = !!order;
                        
                        const activeRoomClass = hasOrder ? "bg-amber-400 font-bold text-slate-900" : "";
                        const activePaxClass = hasOrder ? "bg-amber-400 font-bold text-slate-900" : "text-slate-700";
                        const activeRemarkClass = hasOrder && order.remark ? "bg-amber-400 font-bold text-slate-900" : "";

                        return (
                          <tr key={room} className="hover:bg-slate-50 transition-colors border-b border-gray-200">
                            <td className={`p-3 text-center border-r border-gray-200 align-top ${activeRoomClass}`}>{room}</td>
                            <td className={`p-3 text-center border-r border-gray-200 align-top ${activePaxClass}`}>{hasOrder ? (order.guestsCount || '-') : '-'}</td>
                            <td className="p-3 text-center font-bold text-blue-800 border-r border-gray-200 align-top">{hasOrder ? order.serveTime : '-'}</td>
                            <td className="p-3 text-slate-800 border-r border-gray-200 align-top break-words">{hasOrder ? order.guestName : '-'}</td>
                            <td className={`p-3 text-slate-800 border-r border-gray-200 align-top break-words ${activeRemarkClass}`}>{hasOrder ? (order.remark || '-') : '-'}</td>
                            <td className="p-3 text-left border-r border-gray-200 align-top pr-4">
                              {hasOrder && order.items && order.items.length > 0 ? (
                                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                  {order.items.map((item, idx) => (
                                    <li key={idx} className="break-words whitespace-normal font-medium">{item}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-gray-400 italic text-sm">-</span>
                              )}
                            </td>
                            <td className="p-3 border-r border-gray-200 align-top"></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ManageMenuPanel menuCategories={menuCategories} />
      )}
    </div>
  );
}

// --- 5. MANAGE MENU PANEL COMPONENT ---
function ManageMenuPanel({ menuCategories }) {
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [newItemNames, setNewItemNames] = useState({});

  const updateMenuConfig = async (updatedCategories) => {
    setIsSaving(true);
    setSuccessMsg("");
    try {
      const menuDocRef = getMenuConfigDoc();
      await updateDoc(menuDocRef, { categories: updatedCategories });
      setSuccessMsg("Menu changes saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      if (error.code === 'permission-denied') {
        alert("Preview Limitation: Menu changes cannot be saved here. Please test this on your deployed Vercel site.");
      } else {
        console.error("Error saving menu configuration:", error);
        alert("Failed to save menu changes. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStock = (catIndex, itemIndex) => {
    const updatedCategories = JSON.parse(JSON.stringify(menuCategories));
    const item = updatedCategories[catIndex].items[itemIndex];
    
    if (typeof item === 'object' && item !== null) {
      item.outOfStock = !item.outOfStock;
    } else {
      updatedCategories[catIndex].items[itemIndex] = {
        name: item,
        outOfStock: true
      };
    }
    updateMenuConfig(updatedCategories);
  };

  const handleDeleteItem = (catIndex, itemIndex) => {
    if (!window.confirm("Are you sure you want to permanently delete this menu item?")) return;
    const updatedCategories = JSON.parse(JSON.stringify(menuCategories));
    updatedCategories[catIndex].items.splice(itemIndex, 1);
    updateMenuConfig(updatedCategories);
  };

  const handleAddItem = (catIndex, catTitle) => {
    const itemName = newItemNames[catTitle]?.trim();
    if (!itemName) {
      alert("Please enter the name of the new menu item.");
      return;
    }

    const updatedCategories = JSON.parse(JSON.stringify(menuCategories));
    
    const newItem = {
      name: itemName,
      outOfStock: false
    };

    if (catTitle === "Eggs & Allergen Introduction" && (itemName.toLowerCase().includes("boiled") || itemName.includes("ไข่ต้ม"))) {
      newItem.isBoiledEgg = true;
    }

    if (catTitle === "Hot Beverages" && (itemName.toLowerCase().includes("coffee") || itemName.includes("กาแฟ"))) {
      newItem.isCoffee = true;
    }

    updatedCategories[catIndex].items.push(newItem);
    updateMenuConfig(updatedCategories);

    setNewItemNames(prev => ({ ...prev, [catTitle]: "" }));
  };

  const handleResetToDefault = async () => {
    if (!window.confirm("⚠️ Warning: Are you sure you want to clear all custom menus and revert to the default menu?")) return;
    setIsSaving(true);
    try {
      const menuDocRef = getMenuConfigDoc();
      await setDoc(menuDocRef, { categories: DEFAULT_MENU_CATEGORIES });
      setSuccessMsg("Successfully reset to default menu!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      if (error.code === 'permission-denied') {
        alert("Preview Limitation: Menu cannot be reset here. Please test this on your deployed Vercel site.");
      } else {
        console.error(error);
        alert("Failed to reset menu.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">🛠️ Menu Management Panel</h2>
          <p className="text-sm text-slate-500 mt-1">
            Add new items, remove unused items, or toggle out-of-stock status in real-time.
          </p>
        </div>
        <button 
          onClick={handleResetToDefault}
          className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm hover:bg-red-100 transition-all font-medium flex-shrink-0"
        >
          Reset to Default Menu
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3.5 mb-6 rounded-r-lg text-sm font-medium animate-pulse flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {isSaving && (
        <div className="flex justify-center items-center py-4 text-sm text-slate-500 space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-700"></div>
          <span>Saving changes to cloud...</span>
        </div>
      )}

      <div className="space-y-8 mt-4">
        {menuCategories.map((category, catIdx) => (
          <div key={catIdx} className="bg-slate-50 rounded-xl p-5 border border-gray-150">
            <h3 className="text-lg font-bold text-slate-800 border-b border-gray-200 pb-2 mb-4 uppercase tracking-wider">
              📂 CATEGORY: {category.title}
            </h3>

            <div className="space-y-3 mb-6">
              {category.items.length === 0 ? (
                <p className="text-gray-400 italic text-sm text-center py-2">No items in this category.</p>
              ) : (
                category.items.map((item, itemIdx) => {
                  const isObj = typeof item === 'object' && item !== null;
                  const itemName = isObj ? item.name : item;
                  const isOutOfStock = isObj ? item.outOfStock === true : false;
                  const isIndented = isObj ? item.indent === true : false;
                  const isCoffee = isObj ? item.isCoffee === true : false;
                  const isBoiledEgg = isObj ? item.isBoiledEgg === true : false;

                  return (
                    <div 
                      key={itemIdx} 
                      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3.5 rounded-lg border border-gray-100 transition-all shadow-xs gap-3 ${isOutOfStock ? 'border-red-100 bg-red-50/20' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`font-semibold text-slate-800 ${isOutOfStock ? 'line-through text-gray-400' : ''} ${isIndented ? 'pl-6 text-sm text-gray-600' : ''}`}>
                          {itemName}
                          {isCoffee && <span className="text-amber-600 text-xs font-semibold bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 ml-2">Hot/Ice options enabled</span>}
                          {isBoiledEgg && <span className="text-blue-600 text-xs font-semibold bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 ml-2">Boiled time input enabled</span>}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleToggleStock(catIdx, itemIdx)}
                          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs border ${isOutOfStock ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}
                        >
                          {isOutOfStock ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Out of Stock</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>In Stock</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteItem(catIdx, itemIdx)}
                          className="bg-white text-gray-500 border border-gray-200 p-1.5 rounded-lg hover:text-red-600 hover:border-red-300 transition-all hover:bg-red-50"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={newItemNames[category.title] || ""}
                onChange={(e) => setNewItemNames(prev => ({ ...prev, [category.title]: e.target.value }))}
                placeholder="Type new menu item name..."
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-slate-500 focus:border-slate-500"
              />
              <button
                onClick={() => handleAddItem(catIdx, category.title)}
                className="w-full sm:w-auto bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-all flex-shrink-0 flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}