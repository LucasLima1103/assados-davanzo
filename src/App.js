import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, ChefHat, UtensilsCrossed, Plus, Minus, Trash2, CheckCircle, 
  Clock, DollarSign, LayoutDashboard, Package, Menu, X, ArrowRight, 
  TrendingUp, Bike, MapPin, Navigation, CheckSquare, Lock, Phone, Send, 
  Save, Edit, Image as ImageIcon, Copy, Upload, Loader 
} from 'lucide-react';

// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot 
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
const storage = getStorage(app); // Inicializa o Storage

const APP_ID = 'assados-davanzo-prod'; 

// --- FUNÇÕES AUXILIARES PIX ---
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
    formatField('00', '01') + // Payload Format Indicator
    formatField('26', // Merchant Account Information
      formatField('00', 'br.gov.bcb.pix') +
      formatField('01', key)
    ) +
    formatField('52', '0000') + // Merchant Category Code
    formatField('53', '986') + // Transaction Currency (BRL)
    formatField('54', amount.toFixed(2)) + // Transaction Amount
    formatField('58', 'BR') + // Country Code
    formatField('59', name) + // Merchant Name
    formatField('60', city) + // Merchant City
    formatField('62', formatField('05', txtId)) + // Additional Data Field Template
    '6304'; // CRC16 ID + Length

  payload += crc16ccitt(payload);
  return payload;
};

// --- FUNÇÕES AUXILIARES GERAIS ---
const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Badge = ({ children, color }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>
    {children}
  </span>
);

const getStatusColor = (status) => {
  switch(status) {
    case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'preparando': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pronto': return 'bg-green-100 text-green-800 border-green-200';
    case 'em_entrega': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'entregue': return 'bg-gray-200 text-gray-600 line-through border-gray-300';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// --- COMPONENTES ---

const LoginScreen = ({ role, onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    signOut(auth).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      onLogin(); 
    } catch (err) {
      console.error(err);
      setError('Erro ao entrar. Verifique e-mail e senha.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4 font-serif">
      <div className="bg-white p-8 rounded-sm shadow-2xl w-full max-w-md border-t-4 border-orange-800">
        <div className="text-center mb-6">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-orange-200">
            <Lock className="text-orange-800" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
          <p className="text-gray-500 italic">Área de {role === 'admin' ? 'Administração' : 'Entregadores'}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-orange-800 outline-none"
              placeholder={role === 'admin' ? "admin@davanzo.com" : "driver@davanzo.com"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input 
              type="password" 
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-orange-800 outline-none"
              placeholder="******"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" className="w-full py-3 bg-orange-900 text-white rounded-sm font-bold hover:bg-orange-800 transition-colors uppercase tracking-wider text-sm">
            Entrar
          </button>
        </form>
        <button onClick={onBack} className="w-full mt-4 text-gray-500 hover:text-gray-800 text-sm font-medium font-sans">
          Voltar ao Início
        </button>
      </div>
    </div>
  );
};

const LandingPage = ({ setView, setIsAdminMode, setIsDriverMode }) => (
  <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-6 text-white text-center font-serif">
    <div className="mb-8 p-8 bg-orange-800 rounded-full shadow-2xl border-4 border-orange-200">
      <ChefHat size={80} className="text-white" />
    </div>
    <h1 className="text-4xl md:text-6xl font-bold mb-2 tracking-wide text-orange-100">Assados</h1>
    <h2 className="text-3xl md:text-5xl font-light mb-6 text-orange-200 italic">Familia Davanzo</h2>
    <div className="h-1 w-24 bg-orange-500 mb-8 rounded-full"></div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl font-sans">
      <button onClick={() => setView('customer')} className="group relative flex flex-col items-center p-8 bg-white text-gray-800 rounded-sm shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border-b-4 border-orange-800">
        <ShoppingBag size={40} className="mb-4 text-orange-800 group-hover:scale-110 transition-transform" />
        <span className="text-xl font-bold uppercase tracking-wider">Cardápio</span>
      </button>
      <button onClick={() => { setIsAdminMode(false); setView('admin'); }} className="group relative flex flex-col items-center p-8 bg-stone-800 text-white rounded-sm shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-stone-700">
        <LayoutDashboard size={40} className="mb-4 text-stone-400 group-hover:scale-110 transition-transform" />
        <span className="text-xl font-bold uppercase tracking-wider">Gestão</span>
      </button>
      <button onClick={() => { setIsDriverMode(false); setView('driver'); }} className="group relative flex flex-col items-center p-8 bg-stone-800 text-white rounded-sm shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-stone-700">
        <Bike size={40} className="mb-4 text-stone-400 group-hover:scale-110 transition-transform" />
        <span className="text-xl font-bold uppercase tracking-wider">Entregas</span>
      </button>
    </div>
  </div>
);

const CustomerArea = ({ 
  products, cart, addToCart, updateQty, removeFromCart, cartTotal, 
  checkoutForm, setCheckoutForm, placeOrderWhatsApp, 
  isCartOpen, setIsCartOpen, activeCategory, setActiveCategory, setView 
}) => {
  const categories = ['Todos', ...new Set(products.map(p => p.category))];
  const filteredProducts = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory);
  
  // GERAÇÃO DO PAYLOAD PIX (Atualiza quando o total do carrinho muda)
  const pixKey = "lucaslima1103@outloo.com";
  const pixPayload = useMemo(() => {
    return generatePix(pixKey, "FAMILIA DAVANZO", "SAO PAULO", cartTotal > 0 ? cartTotal : 0);
  }, [cartTotal]);

  const copyPix = () => {
    navigator.clipboard.writeText(pixPayload);
    alert("Código Pix copiado!");
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20 font-sans">
      <header className="bg-white sticky top-0 z-10 shadow-md border-b-4 border-orange-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <button onClick={() => setView('landing')} className="flex items-center text-stone-600 hover:text-orange-800">
            <ArrowRight className="rotate-180 mr-2" size={20} /> Início
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-bold text-gray-900 font-serif">Familia Davanzo</h1>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2">
            <ShoppingBag className="text-stone-700" size={28} />
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-800 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{cart.reduce((a, b) => a + b.qty, 0)}</span>}
          </button>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-4 overflow-x-auto bg-stone-100 pt-2">
          <div className="flex space-x-2 justify-center min-w-max mx-auto">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2 rounded-sm text-sm font-bold uppercase ${activeCategory === cat ? 'bg-orange-800 text-white' : 'bg-white text-stone-600'}`}>{cat}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {products.length === 0 ? <p className="text-center text-stone-400 mt-10">Carregando cardápio...</p> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-sm shadow-sm border border-stone-200 overflow-hidden flex flex-col group">
              <div className="h-48 w-full relative overflow-hidden bg-stone-100">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-bold text-stone-800 text-lg font-serif">{product.name}</h3>
                <p className="text-stone-500 text-sm mb-4 flex-1 italic">{product.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-xl text-orange-900">{formatCurrency(product.price)}</span>
                  <button onClick={() => addToCart(product)} className="px-4 py-2 bg-stone-800 text-white rounded-sm font-bold text-sm hover:bg-orange-800 flex items-center gap-2">
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
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l-4 border-orange-800">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50">
              <h2 className="text-xl font-bold font-serif text-stone-800">Seu Pedido</h2>
              <button onClick={() => setIsCartOpen(false)}><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
              {cart.length === 0 ? <p className="text-center py-10 text-stone-400">Carrinho vazio.</p> : (
                <div className="space-y-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-4 p-4 bg-white border border-stone-200 rounded-sm">
                        <div className="flex-1">
                          <h4 className="font-bold text-stone-800 font-serif">{item.name}</h4>
                          <p className="text-orange-800 font-bold text-sm">{formatCurrency(item.price)}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-stone-100"><Minus size={14}/></button>
                            <span className="text-sm font-bold">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-stone-100"><Plus size={14}/></button>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-stone-300 hover:text-red-600 self-start"><Trash2 size={18}/></button>
                    </div>
                  ))}
                  <div className="bg-white p-4 rounded-sm space-y-3 border border-stone-200">
                    <h3 className="font-bold text-sm uppercase">Dados de Entrega</h3>
                    <input type="text" placeholder="Seu Nome *" className="w-full p-2 border border-stone-200 rounded-sm" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} />
                    <input type="tel" placeholder="WhatsApp *" className="w-full p-2 border border-stone-200 rounded-sm" value={checkoutForm.whatsapp} onChange={e => setCheckoutForm({...checkoutForm, whatsapp: e.target.value})} />
                    <textarea placeholder="Endereço *" className="w-full p-2 border border-stone-200 rounded-sm h-20 resize-none" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} />
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-500 uppercase">Forma de Pagamento</label>
                      <select 
                        className="w-full p-2 border border-stone-200 rounded-sm bg-white"
                        value={checkoutForm.paymentMethod}
                        onChange={e => setCheckoutForm({...checkoutForm, paymentMethod: e.target.value})}
                      >
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                      </select>
                    </div>

                    {/* --- ÁREA DO PIX --- */}
                    {checkoutForm.paymentMethod === 'Pix' && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-sm flex flex-col items-center animate-in fade-in slide-in-from-top-2">
                        <span className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">Pague via Pix</span>
                        <div className="bg-white p-2 rounded-sm mb-3 shadow-sm">
                           {/* Usa API publica para gerar QR da string Pix gerada */}
                           <img 
                             src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} 
                             alt="QR Code Pix" 
                             className="w-40 h-40 mix-blend-multiply"
                           />
                        </div>
                        <p className="text-xs text-center text-gray-500 mb-2 font-mono break-all px-2 bg-white rounded border border-gray-100 py-1 w-full truncate">
                          {pixKey}
                        </p>
                        <button onClick={copyPix} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors">
                          <Copy size={14} /> COPIAR CÓDIGO PIX
                        </button>
                      </div>
                    )}
                    {/* ------------------- */}

                    <textarea placeholder="Obs" className="w-full p-2 border border-stone-200 rounded-sm h-16 resize-none" value={checkoutForm.notes} onChange={e => setCheckoutForm({...checkoutForm, notes: e.target.value})} />
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-white border-t border-stone-200 space-y-4">
              <div className="flex justify-between text-xl font-bold"><span>Total</span><span>{formatCurrency(cartTotal)}</span></div>
              <button onClick={placeOrderWhatsApp} className="w-full py-4 bg-green-700 text-white rounded-sm font-bold hover:bg-green-800 flex items-center justify-center gap-2">
                <Send size={20} /> ENVIAR PEDIDO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminArea = ({ 
  user, auth, isAdminMode, setIsAdminMode, setView, 
  adminTab, setAdminTab, orders, products, 
  updateOrderStatus, handleSaveProduct, handleDeleteProduct,
  isProductFormOpen, setIsProductFormOpen, editingProduct, setEditingProduct
}) => {
  // Estado para controle de upload
  const [isUploading, setIsUploading] = useState(false);

  // Função para upload de imagem
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Cria uma referência única para o arquivo
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      // Faz o upload
      await uploadBytes(storageRef, file);
      // Obtém a URL de download
      const url = await getDownloadURL(storageRef);
      // Atualiza o estado do produto com a nova URL
      setEditingProduct(prev => ({ ...prev, image: url }));
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao fazer upload da imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAdminMode) {
      return (
          <LoginScreen 
              role="admin" 
              onLogin={() => setIsAdminMode(true)} 
              onBack={() => { setView('landing'); setIsAdminMode(false); }} 
          />
      );
  }
  
  const stats = {
    totalSales: orders.reduce((acc, o) => acc + (o.total || 0), 0),
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pendente' || o.status === 'preparando').length,
    activeDeliveries: orders.filter(o => o.status === 'em_entrega').length
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row font-sans">
      <aside className="bg-stone-900 text-white w-full md:w-64 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-stone-800 flex items-center gap-3">
          <ChefHat className="text-orange-500" size={32} />
          <div><h2 className="font-bold text-lg font-serif">Admin</h2></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setAdminTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm ${adminTab === 'dashboard' ? 'bg-orange-900' : 'hover:bg-stone-800'}`}><LayoutDashboard size={20}/> Dashboard</button>
          <button onClick={() => setAdminTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm ${adminTab === 'orders' ? 'bg-orange-900' : 'hover:bg-stone-800'}`}><Package size={20}/> Pedidos (KDS)</button>
          <button onClick={() => setAdminTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm ${adminTab === 'menu' ? 'bg-orange-900' : 'hover:bg-stone-800'}`}><Menu size={20}/> Cardápio</button>
        </nav>
        <div className="p-4 border-t border-stone-800">
            <button onClick={() => { signOut(auth); setView('landing'); setIsAdminMode(false); }} className="text-stone-500 hover:text-white flex gap-2"><ArrowRight className="rotate-180"/> Sair</button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {adminTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-800 font-serif">Visão Geral</h2>
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white p-6 shadow-sm border border-stone-200 border-l-4 border-l-green-600">
                <h3 className="text-stone-500 text-sm font-bold uppercase">Faturamento</h3>
                <p className="text-3xl font-bold text-stone-900">{formatCurrency(stats.totalSales)}</p>
              </div>
              <div className="bg-white p-6 shadow-sm border border-stone-200 border-l-4 border-l-orange-600">
                <h3 className="text-stone-500 text-sm font-bold uppercase">Pedidos</h3>
                <p className="text-3xl font-bold text-stone-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
        )}

        {adminTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-800 font-serif">KDS - Cozinha</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {orders.filter(o => o.status !== 'entregue').map(order => (
                <div key={order.id} className="bg-white rounded-sm shadow-sm border border-stone-200 flex flex-col">
                  <div className="p-4 border-b bg-stone-50 flex justify-between">
                    <span className="font-mono font-bold">#{order.id.slice(0, 4)}</span>
                    <Badge color={getStatusColor(order.status)}>{order.status.toUpperCase()}</Badge>
                  </div>
                  <div className="p-4 flex-1">
                    <h4 className="font-bold text-lg font-serif">{order.customer}</h4>
                    <p className="text-xs text-stone-500 mb-2">{order.address}</p>
                    {order.paymentMethod && (
                      <div className="text-xs font-bold text-stone-700 mb-2 bg-gray-100 p-1 inline-block rounded">
                        Pagamento: {order.paymentMethod}
                      </div>
                    )}
                    <ul className="bg-yellow-50 p-3 rounded-sm text-sm space-y-1">
                      {order.items?.map((i, idx) => <li key={idx}><b>{i.qty}x</b> {i.name}</li>)}
                    </ul>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2 bg-stone-50">
                    {order.status === 'pendente' && <button onClick={() => updateOrderStatus(order.id, 'preparando')} className="col-span-2 py-2 bg-blue-700 text-white font-bold rounded-sm">INICIAR</button>}
                    {order.status === 'preparando' && <button onClick={() => updateOrderStatus(order.id, 'pronto')} className="col-span-2 py-2 bg-green-700 text-white font-bold rounded-sm">PRONTO</button>}
                    {order.status === 'pronto' && <div className="col-span-2 text-center text-green-800 font-bold py-2 bg-green-100 rounded-sm">AGUARDANDO</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'menu' && (
           <div className="space-y-6">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-bold text-stone-800 font-serif">Cardápio</h2>
               <button onClick={() => { setEditingProduct({name:'', price:'', category:'Assados', image: ''}); setIsProductFormOpen(true); }} className="px-4 py-2 bg-stone-900 text-white rounded-sm font-bold text-sm">NOVO ITEM</button>
             </div>
             <div className="bg-white rounded-sm shadow-sm border border-stone-200">
               <table className="w-full text-left">
                 <thead className="bg-stone-100 text-stone-500 font-bold text-xs uppercase">
                   <tr><th className="p-4">Item</th><th className="p-4">Preço</th><th className="p-4 text-right">Ações</th></tr>
                 </thead>
                 <tbody className="divide-y divide-stone-100">
                   {products.map(p => (
                     <tr key={p.id}>
                       <td className="p-4 flex items-center gap-3"><img src={p.image} className="w-10 h-10 rounded-sm bg-stone-200"/> <span>{p.name}</span></td>
                       <td className="p-4 font-bold">{formatCurrency(p.price)}</td>
                       <td className="p-4 text-right">
                         <button onClick={() => { setEditingProduct(p); setIsProductFormOpen(true); }} className="text-blue-700 font-bold text-sm mr-3">EDITAR</button>
                         <button onClick={() => handleDeleteProduct(p.id)} className="text-red-600 font-bold text-sm">EXCLUIR</button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        )}

        {isProductFormOpen && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60" onClick={() => setIsProductFormOpen(false)} />
            <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-lg p-6 space-y-4">
               <h3 className="font-bold text-lg uppercase">{editingProduct.id ? 'Editar' : 'Novo'} Produto</h3>
               <input className="w-full p-2 border border-stone-300" placeholder="Nome" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} autoFocus />
               
               {/* --- ÁREA DE UPLOAD DE IMAGEM --- */}
               <div className="border border-stone-300 p-4 rounded-sm bg-stone-50">
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Imagem do Produto</label>
                  
                  {/* PREVIEW DA IMAGEM ADICIONADO AQUI */}
                  {editingProduct.image && (
                    <div className="mb-3 rounded-sm overflow-hidden border border-stone-200 bg-white h-48 w-full flex items-center justify-center">
                       <img src={editingProduct.image} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}

                  <div className="flex gap-2 mb-2">
                    <input className="w-full p-2 border border-stone-300 bg-white text-xs text-stone-500" placeholder="URL da imagem (ou envie foto abaixo)" value={editingProduct.image || ''} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} />
                  </div>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="hidden" 
                      id="imageUpload"
                      disabled={isUploading}
                    />
                    <label 
                      htmlFor="imageUpload" 
                      className={`flex items-center justify-center gap-2 w-full p-2 border-2 border-dashed border-stone-300 rounded-sm cursor-pointer hover:bg-stone-100 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                       {isUploading ? <Loader className="animate-spin" size={20}/> : <Upload size={20} />}
                       <span className="text-sm font-bold text-stone-600">{isUploading ? 'Enviando...' : 'Carregar Foto da Galeria'}</span>
                    </label>
                  </div>
               </div>
               {/* --------------------------------- */}

               <div className="grid grid-cols-2 gap-4">
                  <input className="w-full p-2 border border-stone-300" type="number" placeholder="Preço" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} />
                  <select className="w-full p-2 border border-stone-300" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}>
                    <option>Assados</option><option>Acompanhamentos</option><option>Sobremesas</option>
                  </select>
               </div>
               <textarea className="w-full p-2 border border-stone-300" placeholder="Descrição" value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
               <div className="flex justify-end gap-2 pt-4">
                 <button onClick={() => setIsProductFormOpen(false)} className="px-4 py-2 text-stone-600 font-bold">CANCELAR</button>
                 <button onClick={handleSaveProduct} className="px-6 py-2 bg-green-700 text-white font-bold rounded-sm">SALVAR</button>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const DriverArea = ({ 
  user, auth, isDriverMode, setIsDriverMode, setView, 
  orders, driverTab, setDriverTab, updateOrderStatus
}) => {
  if (!isDriverMode) {
      return (
          <LoginScreen 
              role="driver" 
              onLogin={() => setIsDriverMode(true)} 
              onBack={() => { setView('landing'); setIsDriverMode(false); }} 
          />
      );
  }
  
  const availableOrders = orders.filter(o => o.status === 'pronto');
  const myDeliveries = orders.filter(o => o.status === 'em_entrega');

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      <header className="bg-stone-900 text-white shadow-lg sticky top-0 z-10 p-4 flex justify-between">
          <h2 className="font-bold text-lg flex gap-2"><Bike className="text-green-500" /> Área do Entregador</h2>
          <button onClick={() => { signOut(auth); setView('landing'); setIsDriverMode(false); }}>SAIR</button>
      </header>
      <div className="bg-stone-800 grid grid-cols-2">
          <button onClick={() => setDriverTab('available')} className={`py-3 text-xs font-bold uppercase ${driverTab === 'available' ? 'bg-stone-700 text-white border-b-4 border-white' : 'text-stone-400'}`}>Disponíveis ({availableOrders.length})</button>
          <button onClick={() => setDriverTab('active')} className={`py-3 text-xs font-bold uppercase ${driverTab === 'active' ? 'bg-stone-700 text-white border-b-4 border-purple-500' : 'text-stone-400'}`}>Em Rota ({myDeliveries.length})</button>
      </div>
      <main className="p-4 space-y-4">
          {driverTab === 'available' && availableOrders.map(o => (
            <div key={o.id} className="bg-white p-5 rounded-sm border border-stone-200">
              <h3 className="font-bold text-lg">{o.customer}</h3>
              <p className="text-stone-500 text-sm mb-3">{o.address}</p>
              <button onClick={() => updateOrderStatus(o.id, 'em_entrega')} className="w-full py-3 bg-green-700 text-white font-bold rounded-sm">ACEITAR</button>
            </div>
          ))}
          {driverTab === 'active' && myDeliveries.map(o => (
            <div key={o.id} className="bg-white p-5 rounded-sm border-l-4 border-purple-600 shadow-md">
              <h3 className="font-bold text-lg">{o.customer}</h3>
              <p className="text-stone-800 text-sm mb-3 font-bold">{o.address}</p>
              <div className="grid grid-cols-2 gap-2">
                <button className="py-2 bg-stone-100 font-bold text-xs">MAPS</button>
                <button onClick={() => updateOrderStatus(o.id, 'entregue')} className="py-2 bg-stone-800 text-white font-bold text-xs">ENTREGUE</button>
              </div>
            </div>
          ))}
      </main>
    </div>
  );
};

export default function FoodBusinessApp() {
  const [view, setView] = useState('landing');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Estado de Login e Modos
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDriverMode, setIsDriverMode] = useState(false);

  // Estados Admin
  const [adminTab, setAdminTab] = useState('dashboard');
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Estados Driver
  const [driverTab, setDriverTab] = useState('available');

  // Estado Checkout - AGORA COM PAYMENTMETHOD
  const [checkoutForm, setCheckoutForm] = useState({ 
    name: '', 
    whatsapp: '', 
    address: '', 
    notes: '',
    paymentMethod: 'Pix' // Default
  });

  // 1. EFEITO DE INICIALIZAÇÃO E AUTH
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        if (view === 'customer' || view === 'landing') {
             signInAnonymously(auth).catch(() => {});
        }
      }
    });
    return () => unsubscribeAuth();
  }, [view]);

  // 2. EFEITO PARA CARREGAR DADOS DO FIRESTORE
  useEffect(() => {
    const productsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'products');
    const unsubProducts = onSnapshot(productsRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    }, (error) => console.error("Erro ao carregar produtos:", error));

    const ordersRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'orders');
    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(items);
    }, (error) => console.error("Erro ao carregar pedidos:", error));

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, []);

  // --- AÇÕES DO CARRINHO ---
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

  // --- AÇÕES DE PEDIDO ---
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
        paymentMethod: checkoutForm.paymentMethod, // SALVA O MÉTODO DE PAGAMENTO
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
      message += `*Pagamento:* ${checkoutForm.paymentMethod}\n`; // MOSTRA NO WHATS
      if(checkoutForm.notes) message += `*Obs:* ${checkoutForm.notes}\n`;
      message += `--------------------------------\n`;
      cart.forEach(item => {
        message += `${item.qty}x ${item.name} - ${formatCurrency(item.price * item.qty)}\n`;
      });
      message += `--------------------------------\n`;
      message += `*TOTAL: ${formatCurrency(cartTotal)}*\n`;
      
      const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      setCart([]);
      setIsCartOpen(false);
      setCheckoutForm({ name: '', whatsapp: '', address: '', notes: '', paymentMethod: 'Pix' });

    } catch (err) {
      console.error("Erro ao criar pedido:", err);
      alert("Houve um erro ao processar o pedido. Tente novamente.");
    }
  };

  // --- AÇÕES DE ADMIN (CRUD PRODUTOS) ---
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const productData = {
      name: editingProduct.name,
      price: parseFloat(editingProduct.price),
      category: editingProduct.category,
      description: editingProduct.description,
      image: editingProduct.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    };

    try {
      if (editingProduct.id) {
        const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', editingProduct.id);
        await updateDoc(ref, productData);
      } else {
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), productData);
      }
      setIsProductFormOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      alert("Erro ao salvar produto.");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Excluir produto permanentemente?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', id));
      } catch (err) {
        console.error("Erro ao excluir:", err);
      }
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'orders', orderId);
      await updateDoc(ref, { status: newStatus });
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  return (
    <div className="font-sans text-gray-900">
      {view === 'landing' && <LandingPage setView={setView} setIsAdminMode={setIsAdminMode} setIsDriverMode={setIsDriverMode} />}
      {view === 'customer' && <CustomerArea 
          products={products} cart={cart} addToCart={addToCart} updateQty={updateQty} 
          removeFromCart={removeFromCart} cartTotal={cartTotal} 
          checkoutForm={checkoutForm} setCheckoutForm={setCheckoutForm} 
          placeOrderWhatsApp={placeOrderWhatsApp} isCartOpen={isCartOpen} 
          setIsCartOpen={setIsCartOpen} activeCategory={activeCategory} 
          setActiveCategory={setActiveCategory} setView={setView} 
      />}
      {view === 'admin' && <AdminArea 
          user={user} auth={auth} isAdminMode={isAdminMode} setIsAdminMode={setIsAdminMode} 
          setView={setView} adminTab={adminTab} setAdminTab={setAdminTab} 
          orders={orders} products={products} updateOrderStatus={updateOrderStatus} 
          handleSaveProduct={handleSaveProduct} handleDeleteProduct={handleDeleteProduct}
          isProductFormOpen={isProductFormOpen} setIsProductFormOpen={setIsProductFormOpen}
          editingProduct={editingProduct} setEditingProduct={setEditingProduct}
      />}
      {view === 'driver' && <DriverArea 
          user={user} auth={auth} isDriverMode={isDriverMode} setIsDriverMode={setIsDriverMode}
          setView={setView} orders={orders} driverTab={driverTab} setDriverTab={setDriverTab}
          updateOrderStatus={updateOrderStatus}
      />}
    </div>
  );
}
