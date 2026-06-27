import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Coffee, Clock, Calendar, Utensils, CheckCircle2, User, ArrowLeft, ClipboardList, Info, X, Minus, Plus, Download } from 'lucide-react';

// ==========================================
// ⚠️ สำคัญมาก: นำโค้ด firebaseConfig ของคุณที่ก็อปปี้มาจากช่วงที่ 2 มาใส่แทนที่ตรงนี้แทน!
// ==========================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// รายชื่อห้องพักทั้งหมดของโรงแรมตามตารางใบงานของคุณ
const FIXED_ROOMS = [
  "132", "133", "134", "135", "141", "142", "144", "145",
  "301", "302", "303", "304", "306", "307", "308", "309", "310", "311", "312", "313"
];

// รายการเมนูอาหารตามไฟล์ PDF ล่าสุด
const MENU_CATEGORIES = [
  {
    title: "Seasonal fresh fruit juice",
    items: ["Orange", "Mango", "Passion fruit", "Coconut"]
  },
  {
    title: "Vegan Delights",
    items: ["Breakfast salad", "Scramble tofu", "Noodle with vegetables", "Mixed tropical fruits platter"]
  },
  {
    title: "Seasonal sliced fruit",
    items: ["Passion Fruit", "Mango", "Papaya", "Watermelon", "Pineapple"]
  },
  {
    title: "Eggs & Allergen Introduction",
    items: [
      "Poached Eggs",
      "Scrambled Eggs",
      { name: "Boiled egg", isBoiledEgg: true },
      "Fried Eggs - Sunny Side Up",
      "Fried Eggs - Over Easy",
      "Fried Eggs - Over Medium",
      "Omelette",
      { name: "Add-on: Onion", indent: true },
      { name: "Add-on: Tomato", indent: true },
      { name: "Add-on: Bell Peppers", indent: true },
      { name: "Add-on: Cheese", indent: true }
    ]
  },
  {
    title: "Hot Beverages",
    items: [
      "Coffee", "English breakfast tea", "Chocolate (Hot)", "Chocolate (Ice)",
      "Almond Milk", "Oat Milk", "Low Fat", "Full Fat"
    ]
  },
  {
    title: "Fresh Pastries",
    items: [
      "Croissant", "Brioche", "Danish", "Muffin",
      "White Bread", "Brown Bread", "Pancake with maple syrup", "Waffle with maple syrup"
    ]
  },
  {
    title: "Asian Style",
    items: [
      "Rice porridge (or Boiled rice soup)", "Grilled pork skewers", "Vegetable fried rice",
      "Stir-fried mixed vegetables", "Stir-fried noodles with soy sauce",
      "Mix Dim Sum (Sweet Cream, Prawns Shumai, Pork BBQ)"
    ]
  },
  {
    title: "Homemade jam",
    items: ["Flower honey", "Strawberry jam", "Apricot Jam", "Orange jam"]
  },
  {
    title: "Grains & Cereals",
    items: ["Choco pop", "Corn flakes", "Muesli", "Plain Yoghurt"]
  },
  {
    title: "Sides",
    items: ["Bacon", "Sausage Chicken", "Sausage Pork", "Grilled tomato", "Grilled Mushrooms", "Baked beans", "Hash brown"]
  }
];

// โหลด Library สำหรับเซฟรูปภาพ
const loadHtml2Canvas = () => {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) {
      resolve(window.html2canvas);
      return;
    }
    const script = document.createElement('script');
    script.src = '[https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js](https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js)';
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error('Failed to load html2canvas'));
    document.head.appendChild(script);
  });
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('home');

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
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

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>;
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
                <div className="bg-slate-100 p-4 rounded-full group-hover:bg-slate-200 transition-colors">
                  <Coffee className="h-8 w-8 text-slate-700" />
                </div>
                <h3 className="text-xl font-semibold">Guest Portal</h3>
                <p className="text-sm text-gray-500">สำหรับแขกสแกนสั่งอาหาร</p>
              </button>

              <button onClick={() => setCurrentView('staff')} className="bg-slate-900 text-white p-8 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all flex flex-col items-center space-y-4 group">
                <div className="bg-slate-800 p-4 rounded-full group-hover:bg-slate-700 transition-colors">
                  <ClipboardList className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Staff Dashboard</h3>
                <p className="text-sm text-slate-300">สำหรับพนักงานดูรายงานประจำวัน</p>
              </button>
            </div>
          </div>
        )}

        {currentView === 'guest' && <GuestPortal user={user} />}
        {currentView === 'staff' && <StaffDashboard user={user} />}
      </main>
    </div>
  );
}

function GuestPortal({ user }) {
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

  const handleQuantityChange = (itemName, delta) => {
    setQuantities(prev => {
      const current = prev[itemName] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [itemName]: next };
    });
  };

  const handleCheckboxChange = (itemName) => {
    setQuantities(prev => {
      const isChecked = (prev[itemName] || 0) > 0;
      return { ...prev, [itemName]: isChecked ? 0 : 1 };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.roomNo || !formData.guestName || !formData.serveTime) {
      alert("Please fill in Room No, Guest Name, and Preferred Delivery Time.");
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
            orderedItems.push(`${qty}x ${itemName} (Sliced)`);
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
      const ordersRef = collection(db, 'breakfast_orders');
      await addDoc(ordersRef, orderPayload);
      setIsSuccess(true);
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMenuItem = (item, categoryTitle) => {
    const isObj = typeof item === 'object';
    const itemName = isObj ? item.name : item;
    const itemKey = `${categoryTitle}|||${itemName}`; 
    const isIndented = isObj ? item.indent : false;
    const isBoiledEgg = isObj ? item.isBoiledEgg : false;
    
    const qty = quantities[itemKey] || 0;
    
    return (
      <div key={itemKey} className={`flex items-center justify-between py-1.5 ${isIndented ? 'pl-8' : ''}`}>
        <label className="flex items-center space-x-3 cursor-pointer flex-1">
          <input type="checkbox" checked={qty > 0} onChange={() => handleCheckboxChange(itemKey)} className="w-5 h-5 text-slate-900 border-gray-300 rounded focus:ring-slate-900 transition-colors flex-shrink-0" />
          <span className={`text-gray-700 flex-1 flex items-center ${isIndented ? 'text-sm' : ''}`}>
            {isBoiledEgg ? (
              <span className="flex items-center flex-wrap">
                Boiled egg (for 
                <input type="number" className="w-12 mx-2 p-1 text-center border-b border-gray-400 focus:outline-none focus:border-slate-900 bg-transparent text-sm" placeholder="min" value={boiledEggMin} onChange={(e) => setBoiledEggMin(e.target.value)} onClick={(e) => e.preventDefault()} /> 
                minute)
              </span>
            ) : itemName}
          </span>
        </label>
        
        <div className="flex items-center ml-2 bg-gray-50 border border-gray-200 rounded-full px-1 py-0.5 shadow-sm">
          <button type="button" onClick={() => handleQuantityChange(itemKey, -1)} disabled={qty === 0} className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${qty > 0 ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}><Minus className="w-4 h-4" /></button>
          <span className="w-6 text-center font-semibold text-slate-800 text-sm">{qty}</span>
          <button type="button" onClick={() => handleQuantityChange(itemKey, 1)} className="w-7 h-7 flex items-center justify-center rounded-full text-green-600 hover:bg-green-50 transition-colors"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto mt-12 px-6 text-center bg-white p-12 rounded-2xl shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
        <h2 className="text-3xl font-serif text-slate-800 mb-4">Order Received!</h2>
        <p className="text-slate-600 mb-8">Thank you, {formData.guestName}. Your breakfast for Room {formData.roomNo} has been successfully ordered.</p>
        <button onClick={() => { setIsSuccess(false); setQuantities({}); setBoiledEggMin(''); setFormData({...formData, roomNo:'', guestName:''}); }} className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">Place Another Order</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4 sm:px-6">
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="bg-slate-900 text-white p-8 text-center">
          <h2 className="text-3xl tracking-widest font-serif uppercase">In-Room Breakfast Menu</h2>
          <p className="mt-2 text-slate-300 text-sm tracking-wide">Please kindly fill in the breakfast order form BEFORE MIDNIGHT.</p>
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
              <input type="text" name="guestName" value={formData.guestName} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 border p-3 focus:ring-slate-500 focus:border-slate-500 bg-gray-50" placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">NUMBER OF GUESTS (Pax)</label>
              <input type="text" name="guestsCount" value={formData.guestsCount} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 border p-3 focus:ring-slate-500 focus:border-slate-500 bg-gray-50" placeholder="e.g. 2 or 2+1" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">DELIVERY DATE *</label>
              <input type="date" name="serveDate" value={formData.serveDate} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 border p-3 focus:ring-slate-500 focus:border-slate-500 bg-gray-50" />
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-10 flex items-start space-x-3 rounded-r-lg">
            <Clock className="h-6 w-6 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-amber-800 text-sm font-medium">WE ARE DELIGHTED TO SERVE YOU BREAKFAST BETWEEN 07.00 AND 10.30.</p>
              <p className="text-amber-700 text-xs mt-1">KINDLY ADVISE US OF YOUR PREFERRED DELIVERY TIME.</p>
            </div>
            <input type="time" name="serveTime" value={formData.serveTime} onChange={handleInputChange} required min="07:00" max="10:30" className="ml-auto rounded border-amber-300 border p-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm" />
          </div>

          <div className="columns-1 md:columns-2 gap-8 space-y-8">
            {MENU_CATEGORIES.map((category, idx) => (
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
               <p className="font-medium text-slate-800 mb-2">We welcome inquiries from guests...</p>
               <p>Please inform us of any allergy or special dietary requirements that we should be made aware of when placing your order.</p>
             </div>
             <label className="block text-sm font-semibold text-gray-700 mb-2">Remark / Allergy Info:</label>
             <textarea name="remark" value={formData.remark} onChange={handleInputChange} rows="3" className="w-full rounded-lg border-gray-300 border p-3 focus:ring-slate-500 focus:border-slate-500 bg-gray-50" placeholder="Write any special requests here..."></textarea>
          </div>

          <div className="mt-10 flex justify-center">
            <button type="submit" disabled={isSubmitting} className="bg-slate-900 text-white px-12 py-4 rounded-full font-semibold text-lg hover:bg-slate-800 hover:shadow-lg transition-all disabled:opacity-70 flex items-center">
              {isSubmitting ? 'Submitting...' : 'Submit Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StaffDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const ordersRef = collection(db, 'breakfast_orders');
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const fetchedOrders = [];
      snapshot.forEach(doc => {
        fetchedOrders.push({ id: doc.id, ...doc.data() });
      });
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error:", error);
      setLoading(false);
    });
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
      console.error(error);
      alert("Failed to save image.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6">
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="bg-slate-50 border-b border-gray-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-slate-600" />
            <h2 className="text-xl font-bold text-slate-800">In-room Breakfast Report</h2>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-600">Select Date:</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-md border-gray-300 border p-2 text-sm focus:ring-slate-500 focus:border-slate-500 font-medium text-slate-800 shadow-sm" />
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div ref={reportRef} className="bg-white min-w-[1100px] flex flex-col">
            <div className="p-4 relative flex justify-center items-center">
              <h3 className="text-2xl font-bold text-blue-900">In-room Breakfast Report <span className="ml-2 text-blue-800">{displayDate}</span></h3>
              <button data-html2canvas-ignore="true" onClick={exportAsImage} disabled={isExporting} className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-sm hover:bg-slate-800 transition-all disabled:opacity-70 text-sm font-medium">
                {isExporting ? 'Saving...' : 'Save as Photo'}
              </button>
            </div>

            <div>
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr>
                    <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-center font-bold text-slate-700 w-24">ROOM NO</th>
                    <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-center font-bold text-slate-700 w-24">No. of Pax</th>
                    <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-center font-bold text-slate-700 w-32">TIME</th>
                    <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-left font-bold text-slate-700 w-48">GUEST NAME</th>
                    <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-left font-bold text-slate-700 w-48">REMARK</th>
                    <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-left font-bold text-slate-700">MENU ITEMS</th>
                    <th className="border-y-2 border-slate-300 bg-slate-100 p-3 text-center font-bold text-slate-700 w-32">CHECK OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-500">Loading orders...</td></tr>
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
                          <td className={`p-3 text-center border-r border-gray-200 align-top ${activePaxClass}`}>{hasOrder ? order.guestsCount : '-'}</td>
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
                            ) : <span className="text-gray-400 italic text-sm">-</span>}