import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, ChefHat, Plus, Minus, Trash2, X, ArrowRight, 
  MapPin, Send, Copy, Lock, LayoutDashboard, Package, Menu, 
  Bike, Save, Edit, Image as ImageIcon, Upload, Loader, CheckCircle, Store, LogOut, UserPlus, Users, Clock, Check
} from 'lucide-react';

// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  getDoc 
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

// --- CONFIGURAÇÃO DO FIREBASE ---
const manualConfig = {
  apiKey: "AIzaSyC47npvRo_nBky0R6J-27eMc4h4KZLAjqw",
  authDomain: "assados-familia-davanzo.firebaseapp.com",
  projectId: "assados-familia-davanzo",
  storageBucket: "assados-familia-davanzo.firebasestorage.app",
  messagingSenderId: "741832503182",
  appId: "1:741832503182:web:eb89a26336423c58967edf",
  measurementId: "G-Q240S9258G"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : manualConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const APP_ID = 'assados-davanzo-prod'; 

// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const crc16ccitt = (str) => {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

const generatePix = (key, name, city, amount, txtId = '***') => {
  const formatField = (id, value) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };
  let payload = 
    formatField('00', '01') +
    formatField('26', formatField('00', 'br.gov.bcb.pix') + formatField('01', key)) +
    formatField('52', '0000') +
    formatField('53', '986') +
    formatField('54', amount.toFixed(2)) +
    formatField('58', 'BR') +
    formatField('59', name) +
    formatField('60', city) +
    formatField('62', formatField('05', txtId)) +
    '6304';
  payload += crc16ccitt(payload);
  return payload;
};

const Badge = ({ children, color }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-bold border ${color}`}>
    {children}
  </span>
);

const getStatusColor = (status) => {
  switch(status) {
    case 'pendente': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'preparando': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'pronto': return 'bg-green-50 text-green-700 border-green-200';
    case 'em_entrega': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'entregue': return 'bg-gray-100 text-gray-500 border-gray-200 line-through';
    default: return 'bg-gray-50 text-gray-700';
  }
};

// ==========================================
// 1. MÓDULO DO CONSUMIDOR (CUSTOMER APP)
// ==========================================

const CustomerLanding = ({ onStart }) => (
  <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-6 text-white text-center font-serif">
    <div className="mb-8 p-8 bg-orange-800 rounded-full shadow-2xl border-4 border-orange-200 animate-in zoom-in duration-500">
      <ChefHat size={80} className="text-white" />
    </div>
    <h1 className="text-4xl md:text-6xl font-bold mb-2 tracking-wide text-orange-100 animate-in slide-in-from-bottom-4 duration-500 delay-100">Assados</h1>
    <h2 className="text-3xl md:text-5xl font-light mb-6 text-orange-200 italic animate-in slide-in-from-bottom-4 duration-500 delay-200">Familia Davanzo</h2>
    <div className="h-1 w-24 bg-orange-500 mb-10 rounded-full animate-in zoom-in duration-500 delay-300"></div>
    
    <button 
      onClick={onStart}
      className="group relative flex flex-col items-center justify-center p-8 bg-white text-stone-900 rounded-sm shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 w-full max-w-sm border-b-4 border-orange-800 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300"
    >
      <ShoppingBag size={48} className="mb-4 text-orange-800 group-hover:scale-110 transition-transform" />
      <span className="text-2xl font-bold uppercase tracking-wider">Ver Cardápio & Pedir</span>
      <span className="text-sm text-stone-500 mt-2 italic">Toque para iniciar seu pedido</span>
    </button>
  </div>
);

// --- NOVO COMPONENTE: RASTREAMENTO DE PEDIDO ---
const OrderTracker = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, 'artifacts', APP_ID, 'public', 'data', 'orders', orderId), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [orderId]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin text-orange-800" /></div>;
  if (!order) return <div className="p-8 text-center">Pedido não encontrado. <button onClick={onBack} className="text-blue-600 underline">Voltar</button></div>;

  const steps = [
    { status: 'pendente', label: 'Recebido', desc: 'Aguardando confirmação', icon: Store },
    { status: 'preparando', label: 'Preparando', desc: 'Sendo preparado com carinho', icon: ChefHat },
    { status: 'pronto', label: 'Pronto', desc: 'Aguardando entregador/retirada', icon: Package },
    { status: 'em_entrega', label: 'Em Rota', desc: 'Saiu para entrega', icon: Bike },
    { status: 'entregue', label: 'Entregue', desc: 'Pedido finalizado', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(s => s.status === order.status);

  return (
    <div className="min-h-screen bg-stone-50 pb-20 font-sans">
      <header className="bg-stone-900 text-white p-4 sticky top-0 z-10 shadow-lg flex items-center gap-3">
        <button onClick={onBack}><ArrowRight className="rotate-180" /></button>
        <h1 className="font-bold text-lg">Acompanhar Pedido</h1>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 text-center">
          <h2 className="text-2xl font-bold text-stone-800 mb-1">#{order.id.slice(0, 4).toUpperCase()}</h2>
          <p className="text-stone-500 text-sm">Previsão: 40-60 min</p>
        </div>

        <div className="space-y-6 relative">
            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-stone-200" />
            {steps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;

                return (
                    <div key={step.status} className={`relative flex gap-4 ${index > currentStepIndex ? 'opacity-50' : 'opacity-100'} transition-all duration-500`}>
                        <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${isCompleted ? 'bg-green-600 border-green-100 text-white shadow-lg scale-110' : 'bg-white border-stone-200 text-stone-300'}`}>
                            {isCompleted ? <Icon size={20} /> : <span className="text-xs font-bold">{index + 1}</span>}
                        </div>
                        <div className="pt-1 flex-1">
                            <h3 className={`font-bold text-lg ${isCurrent ? 'text-green-700' : 'text-stone-800'}`}>{step.label}</h3>
                            <p className="text-xs text-stone-500">{step.desc}</p>
                        </div>
                        {isCurrent && <div className="absolute right-0 top-3 w-3 h-3 bg-green-500 rounded-full animate-ping" />}
                    </div>
                )
            })}
        </div>

        <div className="bg-white p-4 rounded-lg border border-stone-200 mt-8">
            <h3 className="font-bold text-stone-800 border-b pb-2 mb-2">Resumo</h3>
            {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.qty}x {item.name}</span>
                    <span className="font-mono">{formatCurrency(item.price * item.qty)}</span>
                </div>
            ))}
            <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
            </div>
        </div>
        
        <button onClick={onBack} className="w-full py-4 bg-stone-800 text-white font-bold rounded-lg shadow-lg">VOLTAR AO CARDÁPIO</button>
      </main>
    </div>
  );
};

const CustomerApp = () => {
  const [view, setView] = useState('landing');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', whatsapp: '', address: '', notes: '', paymentMethod: 'Pix' });
  
  // NOVO ESTADO: RASTREAMENTO
  const [trackOrderId, setTrackOrderId] = useState(null);

  // Auth Anônima
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) signInAnonymously(auth).catch((err) => console.error(err));
    });
    return () => unsubscribe();
  }, []);

  // Carregar Produtos
  useEffect(() => {
    const productsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    });
    return () => unsubscribe();
  }, []);

  const categories = ['Todos', ...new Set(products.map(p => p.category))];
  const filteredProducts = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const pixKey = "lucaslima1103@outloo.com";
  const pixPayload = useMemo(() => generatePix(pixKey, "FAMILIA DAVANZO", "SAO PAULO", cartTotal > 0 ? cartTotal : 0), [cartTotal]);

  const copyPix = () => {
    navigator.clipboard.writeText(pixPayload);
    alert("Código Pix copiado!");
  };

  const placeOrderWhatsApp = async () => {
    if (cart.length === 0) return;
    if (!checkoutForm.name || !checkoutForm.whatsapp || !checkoutForm.address) {
      alert("Preencha os campos obrigatórios.");
      return;
    }
    try {
      const orderData = {
        customer: checkoutForm.name,
        whatsapp: checkoutForm.whatsapp,
        address: checkoutForm.address,
        notes: checkoutForm.notes,
        paymentMethod: checkoutForm.paymentMethod,
        items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        total: cartTotal,
        status: 'pendente',
        createdAt: new Date().toISOString(),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      
      const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'orders'), orderData);
      
      let message = `*NOVO PEDIDO #${docRef.id.slice(0, 4).toUpperCase()} - FAMILIA DAVANZO*\n\n`;
      message += `*Cliente:* ${checkoutForm.name}\n`;
      message += `*Endereço:* ${checkoutForm.address}\n`;
      message += `*Pagamento:* ${checkoutForm.paymentMethod}\n`;
      if(checkoutForm.notes) message += `*Obs:* ${checkoutForm.notes}\n`;
      message += `--------------------------------\n`;
      cart.forEach(item => { message += `${item.qty}x ${item.name} - ${formatCurrency(item.price * item.qty)}\n`; });
      message += `--------------------------------\n`;
      message += `*TOTAL: ${formatCurrency(cartTotal)}*\n`;
      
      window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(message)}`, '_blank');
      
      // CONFIGURA O RASTREAMENTO E MUDA A TELA
      setCart([]);
      setIsCartOpen(false);
      setCheckoutForm({ name: '', whatsapp: '', address: '', notes: '', paymentMethod: 'Pix' });
      setTrackOrderId(docRef.id);
      setView('tracking');

    } catch (err) {
      console.error(err);
      alert("Erro ao processar. Tente novamente.");
    }
  };

  if (view === 'landing') return <CustomerLanding onStart={() => setView('menu')} />;
  
  // EXIBE O RASTREADOR SE A VIEW FOR 'tracking'
  if (view === 'tracking') return <OrderTracker orderId={trackOrderId} onBack={() => setView('menu')} />;

  return (
    <div className="min-h-screen bg-stone-50 pb-20 font-sans">
      <header className="bg-white sticky top-0 z-10 shadow-md border-b-4 border-orange-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <button onClick={() => setView('landing')} className="flex items-center text-sm font-bold uppercase tracking-wider text-stone-600 hover:text-orange-800"><ArrowRight className="rotate-180 mr-2" size={18}/> Início</button>
          <h1 className="text-lg font-bold text-gray-900 font-serif">Familia Davanzo</h1>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-stone-700 hover:text-orange-800">
            <ShoppingBag size={28} />
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-800 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">{cart.reduce((a, b) => a + b.qty, 0)}</span>}
          </button>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-4 overflow-x-auto bg-stone-100 pt-2 no-scrollbar">
          <div className="flex space-x-2 justify-center min-w-max mx-auto">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2 rounded-full text-sm font-bold uppercase transition-all ${activeCategory === cat ? 'bg-orange-800 text-white shadow-md' : 'bg-white text-stone-600 hover:bg-stone-200'}`}>{cat}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {products.length === 0 && <div className="flex flex-col items-center justify-center mt-20 text-stone-400"><ChefHat size={48} className="mb-4 opacity-20"/><p>Carregando as delícias...</p></div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden flex flex-col group hover:shadow-xl transition-shadow duration-300">
              <div className="h-48 w-full relative overflow-hidden bg-stone-100">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-bold text-stone-800 text-xl font-serif mb-2">{product.name}</h3>
                <p className="text-stone-500 text-sm mb-4 flex-1 leading-relaxed">{product.description}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-stone-100">
                  <span className="font-bold text-2xl text-orange-900">{formatCurrency(product.price)}</span>
                  <button onClick={() => addToCart(product)} className="px-4 py-2 bg-stone-900 text-white rounded-lg font-bold text-sm hover:bg-orange-800 transition-colors flex items-center gap-2 shadow-lg">
                    <Plus size={16} /> ADICIONAR
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l-4 border-orange-800 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50">
              <h2 className="text-xl font-bold font-serif text-stone-800 flex items-center gap-2"><ShoppingBag size={20}/> Seu Pedido</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
              {cart.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-stone-400 space-y-4"><ShoppingBag size={64} className="opacity-20"/><p>Seu carrinho está vazio.</p></div> : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    {cart.map(item => (
                        <div key={item.id} className="flex gap-4 p-4 bg-white border border-stone-200 rounded-lg shadow-sm">
                            <div className="flex-1">
                            <h4 className="font-bold text-stone-800 font-serif">{item.name}</h4>
                            <p className="text-orange-800 font-bold text-sm">{formatCurrency(item.price)}</p>
                            <div className="flex items-center gap-3 mt-2 bg-stone-100 w-max rounded-full px-2 py-1">
                                <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:text-orange-800 transition-colors"><Minus size={14}/></button>
                                <span className="text-sm font-bold min-w-[20px] text-center">{item.qty}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:text-orange-800 transition-colors"><Plus size={14}/></button>
                            </div>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="text-stone-300 hover:text-red-600 self-start p-2"><Trash2 size={18}/></button>
                        </div>
                    ))}
                  </div>
                  <div className="bg-white p-5 rounded-lg space-y-4 border border-stone-200 shadow-sm">
                    <h3 className="font-bold text-sm uppercase text-stone-500 tracking-wider flex items-center gap-2"><MapPin size={14}/> Dados de Entrega</h3>
                    <input type="text" placeholder="Seu Nome *" className="w-full p-3 border border-stone-200 rounded-md outline-none" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} />
                    <input type="tel" placeholder="WhatsApp (ex: 11999999999) *" className="w-full p-3 border border-stone-200 rounded-md outline-none" value={checkoutForm.whatsapp} onChange={e => setCheckoutForm({...checkoutForm, whatsapp: e.target.value})} />
                    <textarea placeholder="Endereço Completo *" className="w-full p-3 border border-stone-200 rounded-md h-24 resize-none outline-none" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} />
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-500 uppercase ml-1">Forma de Pagamento</label>
                      <select className="w-full p-3 border border-stone-200 rounded-md bg-white outline-none cursor-pointer" value={checkoutForm.paymentMethod} onChange={e => setCheckoutForm({...checkoutForm, paymentMethod: e.target.value})}>
                        <option value="Pix">Pix (QR Code)</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                      </select>
                    </div>
                    {checkoutForm.paymentMethod === 'Pix' && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col items-center animate-in fade-in slide-in-from-top-2">
                        <span className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">Pague via Pix</span>
                        <div className="bg-white p-2 rounded-lg mb-3 shadow-sm border border-blue-100">
                           <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} alt="QR Code Pix" className="w-32 h-32 mix-blend-multiply" />
                        </div>
                        <p className="text-xs text-center text-gray-500 mb-3 font-mono break-all px-3 bg-white rounded border border-gray-100 py-2 w-full truncate shadow-sm">{pixKey}</p>
                        <button onClick={copyPix} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors shadow-sm"><Copy size={14} /> COPIAR CÓDIGO</button>
                      </div>
                    )}
                    <textarea placeholder="Alguma observação?" className="w-full p-3 border border-stone-200 rounded-md h-20 resize-none outline-none" value={checkoutForm.notes} onChange={e => setCheckoutForm({...checkoutForm, notes: e.target.value})} />
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-white border-t border-stone-200 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <div className="flex justify-between items-end"><span className="text-stone-500 text-sm font-medium">Total do Pedido</span><span className="text-2xl font-bold text-stone-800">{formatCurrency(cartTotal)}</span></div>
              <button onClick={placeOrderWhatsApp} className="w-full py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg"><Send size={20} /> ENVIAR PEDIDO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. MÓDULO DE GESTÃO (ADMIN APP)
// ==========================================

const LoginScreen = ({ title = "Sistema de Gestão", onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      onLogin(); 
    } catch (err) {
      setError('Acesso negado. Verifique suas credenciais.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-orange-800">
        <div className="text-center mb-8">
          <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-orange-200"><Lock className="text-orange-800" size={32} /></div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-500 italic">Área restrita para equipe</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">E-mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md outline-none" placeholder="ex: equipe@davanzo.com"/></div>
          <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Senha</label><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md outline-none" placeholder="••••••"/></div>
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100 text-center">{error}</div>}
          <button type="submit" className="w-full py-3 bg-stone-800 text-white rounded-md font-bold hover:bg-stone-900 transition-colors uppercase tracking-wider text-sm shadow-lg">Entrar</button>
        </form>
      </div>
    </div>
  );
};

const AdminApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Estado para cadastro de Entregador
  const [newDriver, setNewDriver] = useState({ email: '', pass: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubProducts = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), (snap) => setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubOrders = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'orders'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(items);
    });
    return () => { unsubProducts(); unsubOrders(); };
  }, [isAuthenticated]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setEditingProduct(prev => ({ ...prev, image: url }));
    } catch (error) { alert("Erro upload imagem."); } finally { setIsUploading(false); }
  };

  const handleSaveProduct = async () => {
    const productData = {
      name: editingProduct.name,
      price: parseFloat(editingProduct.price),
      category: editingProduct.category,
      description: editingProduct.description,
      image: editingProduct.image || 'https://via.placeholder.com/400'
    };
    try {
      if (editingProduct.id) await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', editingProduct.id), productData);
      else await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), productData);
      setIsProductFormOpen(false);
    } catch (err) { alert("Erro ao salvar."); }
  };

  const handleDeleteProduct = async (id) => {
    if(confirm("Excluir item?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', id));
  };

  const updateOrderStatus = async (id, status) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'orders', id), { status });
  };

  // --- Função para Cadastrar Entregador (Sem deslogar o Admin) ---
  const handleRegisterDriver = async (e) => {
    e.preventDefault();
    if (!newDriver.email || !newDriver.pass) return alert("Preencha todos os campos.");
    
    // TRUQUE: Cria uma segunda instância do App Firebase para não deslogar o admin principal
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      await createUserWithEmailAndPassword(secondaryAuth, newDriver.email, newDriver.pass);
      alert(`Entregador ${newDriver.email} cadastrado com sucesso!`);
      setNewDriver({ email: '', pass: '' });
      await signOut(secondaryAuth); // Desloga da instância secundária
      deleteApp(secondaryApp); // Limpa a instância
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar: " + error.message);
    }
  };

  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;

  const stats = {
    sales: orders.reduce((acc, o) => acc + (o.total || 0), 0),
    count: orders.length,
    pending: orders.filter(o => ['pendente', 'preparando'].includes(o.status)).length,
    delivery: orders.filter(o => o.status === 'em_entrega').length
  };

  return (
    <div className="flex h-screen bg-stone-100 font-sans overflow-hidden">
      <aside className="w-64 bg-stone-900 text-stone-400 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-stone-800 flex items-center gap-3 text-white"><ChefHat className="text-orange-500" /><span className="font-bold font-serif text-lg">Admin Panel</span></div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-orange-900 text-white' : 'hover:bg-stone-800'}`}><LayoutDashboard size={20}/> Visão Geral</button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'orders' ? 'bg-orange-900 text-white' : 'hover:bg-stone-800'}`}><Package size={20}/> Pedidos (KDS) {stats.pending > 0 && <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{stats.pending}</span>}</button>
          <button onClick={() => setActiveTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'menu' ? 'bg-orange-900 text-white' : 'hover:bg-stone-800'}`}><Menu size={20}/> Cardápio</button>
          <button onClick={() => setActiveTab('driver')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'driver' ? 'bg-orange-900 text-white' : 'hover:bg-stone-800'}`}><Bike size={20}/> Entregas</button>
        </nav>
        <div className="p-4 border-t border-stone-800"><button onClick={() => signOut(auth)} className="flex items-center gap-2 hover:text-white transition-colors"><ArrowRight className="rotate-180"/> Sair</button></div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-900 text-stone-400 p-2 flex justify-around z-50 border-t border-stone-800">
         <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-md ${activeTab === 'dashboard' ? 'text-orange-500 bg-stone-800' : ''}`}><LayoutDashboard size={24}/></button>
         <button onClick={() => setActiveTab('orders')} className={`p-2 rounded-md relative ${activeTab === 'orders' ? 'text-orange-500 bg-stone-800' : ''}`}><Package size={24}/>{stats.pending > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-stone-900"></span>}</button>
         <button onClick={() => setActiveTab('menu')} className={`p-2 rounded-md ${activeTab === 'menu' ? 'text-orange-500 bg-stone-800' : ''}`}><Menu size={24}/></button>
         <button onClick={() => setActiveTab('driver')} className={`p-2 rounded-md ${activeTab === 'driver' ? 'text-orange-500 bg-stone-800' : ''}`}><Bike size={24}/></button>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <h1 className="text-2xl font-bold text-stone-800 font-serif">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200"><h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Vendas Hoje</h3><p className="text-3xl font-bold text-stone-800 mt-2">{formatCurrency(stats.sales)}</p></div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200"><h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Pedidos</h3><p className="text-3xl font-bold text-stone-800 mt-2">{stats.count}</p></div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200"><h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Pendentes</h3><p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p></div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200"><h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Em Rota</h3><p className="text-3xl font-bold text-purple-600 mt-2">{stats.delivery}</p></div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in">
            <h1 className="text-2xl font-bold text-stone-800 font-serif">Pedidos (KDS)</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.filter(o => o.status !== 'entregue').map(order => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-stone-200 flex flex-col overflow-hidden">
                  <div className={`p-4 border-b flex justify-between items-center ${order.status === 'pendente' ? 'bg-yellow-50' : 'bg-white'}`}><span className="font-mono font-bold text-stone-600">#{order.id.slice(0,4).toUpperCase()}</span><Badge color={getStatusColor(order.status)}>{order.status}</Badge></div>
                  <div className="p-4 flex-1">
                    <h3 className="font-bold text-lg">{order.customer}</h3>
                    {order.paymentMethod && <div className="text-xs text-stone-500 bg-stone-100 inline-block px-2 py-1 rounded mt-1 mb-2">Pgto: {order.paymentMethod}</div>}
                    <div className="space-y-2 mt-2">{order.items?.map((item, i) => (<div key={i} className="flex justify-between text-sm border-b border-stone-100 pb-1 last:border-0"><span><b className="mr-1">{item.qty}x</b> {item.name}</span></div>))}</div>
                    {order.notes && <div className="mt-3 text-xs bg-red-50 text-red-700 p-2 rounded border border-red-100 italic">" {order.notes} "</div>}
                  </div>
                  <div className="p-4 bg-stone-50 border-t border-stone-100 grid grid-cols-2 gap-2">
                    {order.status === 'pendente' && <button onClick={() => updateOrderStatus(order.id, 'preparando')} className="col-span-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-sm transition-colors">INICIAR PREPARO</button>}
                    {order.status === 'preparando' && <button onClick={() => updateOrderStatus(order.id, 'pronto')} className="col-span-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold shadow-sm transition-colors">MARCAR PRONTO</button>}
                    {order.status === 'pronto' && <div className="col-span-2 text-center text-xs font-bold text-green-700 py-2 uppercase tracking-wide">Aguardando Entregador</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-stone-800 font-serif">Gerenciar Cardápio</h1><button onClick={() => { setEditingProduct({name:'', price:'', category:'Assados', image: ''}); setIsProductFormOpen(true); }} className="px-4 py-2 bg-stone-900 text-white rounded-md font-bold text-sm shadow-md hover:bg-stone-800 transition-colors">ADICIONAR ITEM</button></div>
            <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-stone-500 font-bold text-xs uppercase tracking-wider"><tr><th className="p-4">Produto</th><th className="p-4">Categoria</th><th className="p-4">Preço</th><th className="p-4 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-4 flex items-center gap-3"><img src={p.image} className="w-10 h-10 rounded object-cover bg-stone-200"/> <span className="font-medium text-stone-800">{p.name}</span></td>
                      <td className="p-4 text-sm text-stone-500">{p.category}</td>
                      <td className="p-4 font-bold text-stone-800">{formatCurrency(p.price)}</td>
                      <td className="p-4 text-right"><button onClick={() => { setEditingProduct(p); setIsProductFormOpen(true); }} className="text-blue-600 hover:text-blue-800 font-bold text-xs mr-4">EDITAR</button><button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-700 font-bold text-xs">EXCLUIR</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'driver' && (
          <div className="space-y-6 animate-in fade-in">
            <h1 className="text-2xl font-bold text-stone-800 font-serif">Gestão de Entregas</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* COLUNA 1: PEDIDOS EM ROTA (Com Entregador) */}
              <div className="lg:col-span-2">
                <h3 className="font-bold text-stone-500 uppercase text-xs mb-4 flex items-center gap-2"><Bike size={16}/> Entregas em Curso</h3>
                <div className="space-y-4">
                  {orders.filter(o => o.status === 'em_entrega').map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-lg border-l-4 border-purple-600 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                           <span className="font-bold text-lg block">{order.customer}</span>
                           <span className="text-xs text-stone-400 font-mono">#{order.id.slice(0,4)}</span>
                        </div>
                        <Badge color="bg-purple-100 text-purple-700 border-purple-200">EM ROTA</Badge>
                      </div>
                      
                      <div className="bg-stone-50 p-3 rounded text-sm text-stone-600">
                        <div className="flex items-center gap-2 mb-1"><MapPin size={16} className="shrink-0 text-stone-400"/> {order.address}</div>
                        {order.driverEmail && (
                           <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-200 text-purple-700 font-bold">
                              <Users size={16}/> Entregador: {order.driverEmail}
                           </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                         <button className="py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded font-bold text-xs">VER MAPA</button>
                         <button onClick={() => updateOrderStatus(order.id, 'entregue')} className="py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs flex justify-center items-center gap-1"><CheckCircle size={14}/> FINALIZAR</button>
                      </div>
                    </div>
                  ))}
                  {orders.filter(o => o.status === 'em_entrega').length === 0 && <p className="text-stone-400 text-sm italic">Nenhuma entrega em andamento.</p>}
                </div>
              </div>

              {/* COLUNA 2: CADASTRAR ENTREGADOR */}
              <div>
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 sticky top-4">
                    <h3 className="font-bold text-stone-800 uppercase text-sm mb-4 flex items-center gap-2"><UserPlus size={18} className="text-orange-600"/> Novo Entregador</h3>
                    <form onSubmit={handleRegisterDriver} className="space-y-4">
                       <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1">E-mail de Acesso</label>
                          <input 
                            type="email" 
                            className="w-full p-2 border border-stone-300 rounded text-sm" 
                            placeholder="motoboy@davanzo.com"
                            value={newDriver.email}
                            onChange={e => setNewDriver({...newDriver, email: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Senha Provisória</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-stone-300 rounded text-sm" 
                            placeholder="Mínimo 6 caracteres"
                            value={newDriver.pass}
                            onChange={e => setNewDriver({...newDriver, pass: e.target.value})}
                          />
                       </div>
                       <button type="submit" className="w-full py-2 bg-stone-800 text-white font-bold rounded text-sm hover:bg-stone-900">CADASTRAR</button>
                    </form>
                    <p className="mt-4 text-xs text-stone-400 leading-relaxed border-t pt-3">
                       * O entregador usará este e-mail e senha para acessar o painel de entregas.
                    </p>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {isProductFormOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsProductFormOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto m-4">
              <h3 className="font-bold text-lg uppercase text-stone-800 border-b pb-2">{editingProduct.id ? 'Editar' : 'Novo'} Produto</h3>
              <div className="space-y-4">
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Nome</label><input className="w-full p-2 border border-stone-300 rounded" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} /></div>
                <div className="border-2 border-dashed border-stone-300 rounded-lg p-4 bg-stone-50 text-center">
                   {editingProduct.image ? (<div className="relative w-full h-40 mb-3 rounded overflow-hidden group"><img src={editingProduct.image} className="w-full h-full object-cover"/><button onClick={() => setEditingProduct({...editingProduct, image: ''})} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="rotate-45" size={16}/></button></div>) : (<ImageIcon className="mx-auto text-stone-300 mb-2" size={32}/>)}
                   <label className="cursor-pointer bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold py-2 px-4 rounded inline-flex items-center gap-2 transition-colors">{isUploading ? <Loader className="animate-spin" size={14}/> : <Upload size={14}/>}{isUploading ? 'Enviando...' : 'Escolher Foto da Galeria'}<input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading}/></label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Preço</label><input className="w-full p-2 border border-stone-300 rounded" type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Categoria</label><select className="w-full p-2 border border-stone-300 rounded bg-white" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}><option>Assados</option><option>Acompanhamentos</option><option>Sobremesas</option><option>Bebidas</option></select></div>
                </div>
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Descrição</label><textarea className="w-full p-2 border border-stone-300 rounded h-20" value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-4"><button onClick={() => setIsProductFormOpen(false)} className="px-4 py-2 text-stone-500 hover:text-stone-800 font-bold text-sm">CANCELAR</button><button onClick={handleSaveProduct} className="px-6 py-2 bg-stone-900 text-white font-bold rounded-md text-sm hover:bg-stone-800 flex items-center gap-2"><Save size={16}/> SALVAR</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. MÓDULO DO ENTREGADOR (DRIVER APP)
// ==========================================

const DriverApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Entregador também precisa ser usuário real (e-mail/senha)
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Orders
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubOrders = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'orders'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(items);
    });
    return () => unsubOrders();
  }, [isAuthenticated]);

  const updateOrderStatus = async (id, status, extraData = {}) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'orders', id), { status, ...extraData });
  };

  if (!isAuthenticated) return <LoginScreen title="Área do Entregador" onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-stone-100 font-sans pb-20">
      <header className="bg-stone-900 text-white p-4 sticky top-0 z-10 flex justify-between items-center shadow-lg">
        <h2 className="font-bold text-lg flex gap-2 items-center"><Bike className="text-green-500" /> Entregas</h2>
        <div className="flex items-center gap-3">
           <span className="text-xs text-stone-400 hidden sm:inline">{user?.email}</span>
           <button onClick={() => signOut(auth)} className="text-stone-400 hover:text-white"><LogOut size={20} /></button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        
        {/* DISPONÍVEIS PARA PEGAR */}
        <div>
          <h3 className="font-bold text-stone-500 uppercase text-xs mb-3 pl-1 border-l-4 border-green-500">Prontos na Cozinha</h3>
          <div className="space-y-3">
            {orders.filter(o => o.status === 'pronto').map(order => (
              <div key={order.id} className="bg-white p-4 rounded-md shadow-sm border border-stone-200 animate-in slide-in-from-left duration-300">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-xl">{order.customer}</span>
                  <span className="bg-stone-100 text-stone-500 text-xs px-2 py-1 rounded font-mono">#{order.id.slice(0,4)}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-600 text-sm mb-4 bg-stone-50 p-2 rounded">
                  <MapPin size={16} className="shrink-0"/> {order.address}
                </div>
                {/* Ao clicar, salva o email do entregador no pedido */}
                <button onClick={() => updateOrderStatus(order.id, 'em_entrega', { driverEmail: user.email })} className="w-full py-3 bg-stone-900 text-white font-bold rounded shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2">
                  <Bike size={20}/> INICIAR ROTA
                </button>
              </div>
            ))}
            {orders.filter(o => o.status === 'pronto').length === 0 && (
              <p className="text-center text-stone-400 text-sm py-4 italic">Nenhum pedido aguardando.</p>
            )}
          </div>
        </div>

        {/* EM ANDAMENTO */}
        <div>
          <h3 className="font-bold text-stone-500 uppercase text-xs mb-3 pl-1 border-l-4 border-purple-500">Minhas Entregas em Curso</h3>
          <div className="space-y-3">
            {/* Filtra apenas os pedidos que estão em entrega E que foram pegos por ESTE usuário */}
            {orders.filter(o => o.status === 'em_entrega' && o.driverEmail === user.email).map(order => (
              <div key={order.id} className="bg-white p-4 rounded-md shadow-md border-l-4 border-purple-600 animate-in zoom-in duration-300">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-xl">{order.customer}</span>
                  <Badge color="bg-purple-100 text-purple-700 border-purple-200">EM ROTA</Badge>
                </div>
                <div className="flex items-center gap-2 text-stone-600 text-sm mb-4">
                  <MapPin size={16} className="shrink-0"/> {order.address}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-3 bg-stone-100 text-stone-700 font-bold rounded text-xs hover:bg-stone-200">MAPA</button>
                  <button onClick={() => updateOrderStatus(order.id, 'entregue')} className="py-3 bg-green-600 text-white font-bold rounded text-xs flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform">
                    <CheckCircle size={16}/> ENTREGUE
                  </button>
                </div>
              </div>
            ))}
            {orders.filter(o => o.status === 'em_entrega' && o.driverEmail === user.email).length === 0 && (
              <p className="text-center text-stone-400 text-sm py-4 italic">Você não tem entregas ativas.</p>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

// ==========================================
// 4. COMPONENTE PRINCIPAL COM ROTEAMENTO
// ==========================================

export default function IntegratedApp() {
  const [currentRoute, setCurrentRoute] = useState(window.location.hash);

  useEffect(() => {
    // Inject Tailwind Script se necessário
    if (!window.tailwind) {
      const script = document.createElement('script');
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
    
    const handleHashChange = () => setCurrentRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Roteamento Simples (Hash Router)
  if (currentRoute === '#/admin') {
    return <AdminApp />;
  }
  
  if (currentRoute === '#/driver') {
    return <DriverApp />;
  }

  // Rota padrão (Cliente)
  return <CustomerApp />;
}
