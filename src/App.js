import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ChefHat, UtensilsCrossed, Plus, Minus, Trash2, CheckCircle, 
  Clock, DollarSign, LayoutDashboard, Package, Menu, X, ArrowRight, 
  TrendingUp, Bike, MapPin, Navigation, CheckSquare, Lock, Phone, Send, 
  Save, Edit, Image as ImageIcon, LogOut, Loader
} from 'lucide-react';

// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken,
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
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';

// --- CONFIGURAÇÃO DO FIREBASE (AMBIENTE) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- UTILITÁRIOS ---
const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getStatusColor = (status) => {
  switch(status) {
    case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'preparando': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pronto': return 'bg-green-100 text-green-800 border-green-200';
    case 'em_entrega': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'entregue': return 'bg-stone-200 text-stone-600 line-through border-stone-300';
    default: return 'bg-stone-100 text-stone-800';
  }
};

const Badge = ({ children, color }) => (
  <span className={`px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wider border ${color}`}>
    {children}
  </span>
);

// --- COMPONENTES AUXILIARES ---

// Tela de Login Simulado (para não conflitar com Auth do ambiente)
const LoginScreen = ({ role, onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Login Simulado para Demonstração
    if (role === 'admin') {
      if (email === 'admin@davanzo.com' && pass === 'admin') {
        onLogin();
      } else {
        setError('Credenciais inválidas. Tente admin@davanzo.com / admin');
      }
    } else if (role === 'driver') {
      if (email === 'driver@davanzo.com' && pass === 'driver') {
        onLogin();
      } else {
        setError('Credenciais inválidas. Tente driver@davanzo.com / driver');
      }
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
              placeholder="Use 'admin' ou 'driver'"
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
  <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-6 text-white text-center font-serif relative overflow-hidden">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fb923c 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
    
    <div className="mb-8 p-8 bg-orange-800 rounded-full shadow-2xl border-4 border-orange-200 z-10">
      <ChefHat size={80} className="text-white" />
    </div>
    <h1 className="text-4xl md:text-6xl font-bold mb-2 tracking-wide text-orange-100 z-10">Assados</h1>
    <h2 className="text-3xl md:text-5xl font-light mb-6 text-orange-200 italic z-10">Familia Davanzo</h2>
    <div className="h-1 w-24 bg-orange-500 mb-12 rounded-full z-10"></div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl font-sans z-10">
      <button onClick={() => setView('customer')} className="group relative flex flex-col items-center p-8 bg-white text-gray-800 rounded-sm shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border-b-4 border-orange-800">
        <div className="bg-orange-100 p-4 rounded-full mb-4 group-hover:bg-orange-200 transition-colors">
          <ShoppingBag size={32} className="text-orange-800" />
        </div>
        <span className="text-xl font-bold uppercase tracking-wider">Cardápio</span>
        <span className="text-xs text-stone-500 mt-2">Faça seu pedido</span>
      </button>

      <button onClick={() => { setIsAdminMode(false); setView('admin'); }} className="group relative flex flex-col items-center p-8 bg-stone-800 text-white rounded-sm shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-stone-700">
        <div className="bg-stone-700 p-4 rounded-full mb-4 group-hover:bg-stone-600 transition-colors">
          <LayoutDashboard size={32} className="text-stone-300" />
        </div>
        <span className="text-xl font-bold uppercase tracking-wider">Gestão</span>
        <span className="text-xs text-stone-500 mt-2">Área Restrita</span>
      </button>

      <button onClick={() => { setIsDriverMode(false); setView('driver'); }} className="group relative flex flex-col items-center p-8 bg-stone-800 text-white rounded-sm shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-stone-700">
        <div className="bg-stone-700 p-4 rounded-full mb-4 group-hover:bg-stone-600 transition-colors">
          <Bike size={32} className="text-stone-300" />
        </div>
        <span className="text-xl font-bold uppercase tracking-wider">Entregas</span>
        <span className="text-xs text-stone-500 mt-2">Área Restrita</span>
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

  return (
    <div className="min-h-screen bg-stone-50 pb-20 font-sans">
      <header className="bg-white sticky top-0 z-20 shadow-md border-b-4 border-orange-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <button onClick={() => setView('landing')} className="flex items-center text-stone-600 hover:text-orange-800 transition-colors">
            <ArrowRight className="rotate-180 mr-2" size={20} /> <span className="hidden sm:inline">Início</span>
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold text-gray-900 font-serif tracking-tight">Familia Davanzo</h1>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 hover:bg-stone-100 rounded-full transition-colors">
            <ShoppingBag className="text-stone-800" size={26} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-800 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                {cart.reduce((a, b) => a + b.qty, 0)}
              </span>
            )}
          </button>
        </div>
        
        {/* Categorias com scroll horizontal */}
        <div className="max-w-6xl mx-auto px-4 pb-0 overflow-x-auto bg-white scrollbar-hide">
          <div className="flex space-x-2 py-3 min-w-max">
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)} 
                className={`
                  px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wide transition-all
                  ${activeCategory === cat 
                    ? 'bg-orange-800 text-white shadow-md transform scale-105' 
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <Loader className="animate-spin mx-auto text-orange-800 mb-4" size={40} />
            <p className="text-stone-400 font-serif text-lg">Preparando o cardápio...</p>
          </div>
        ) : null}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-sm shadow-sm border border-stone-200 overflow-hidden flex flex-col group hover:shadow-xl transition-shadow duration-300">
              <div className="h-56 w-full relative overflow-hidden bg-stone-200">
                {product.image ? (
                   <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-stone-400">
                     <ImageIcon size={48} />
                   </div>
                )}
                {/* Etiqueta de Preço Flutuante */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-sm shadow-sm font-bold text-orange-900 border border-orange-100">
                    {formatCurrency(product.price)}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-bold text-stone-800 text-xl font-serif mb-2">{product.name}</h3>
                <p className="text-stone-500 text-sm mb-6 flex-1 leading-relaxed">{product.description}</p>
                <button 
                  onClick={() => addToCart(product)} 
                  className="w-full py-3 bg-stone-800 text-white rounded-sm font-bold text-sm hover:bg-orange-800 active:bg-orange-900 transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Plus size={18} /> Adicionar ao Pedido
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l-4 border-orange-800 animate-slide-in-right">
            <div className="p-5 border-b flex justify-between items-center bg-stone-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-orange-800" size={24} />
                <h2 className="text-xl font-bold font-serif text-stone-800">Seu Pedido</h2>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="hover:bg-stone-200 p-1 rounded transition"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-stone-50">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-stone-400 space-y-4">
                  <ShoppingBag size={64} className="opacity-20" />
                  <p>Seu carrinho está vazio.</p>
                  <button onClick={() => setIsCartOpen(false)} className="text-orange-800 font-bold hover:underline">Ver Cardápio</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex gap-4 p-4 bg-white border border-stone-200 rounded-sm shadow-sm relative">
                         <div className="flex-1">
                            <h4 className="font-bold text-stone-800 font-serif text-lg">{item.name}</h4>
                            <p className="text-orange-800 font-bold text-sm">{formatCurrency(item.price)}</p>
                            <div className="flex items-center gap-3 mt-3 bg-stone-100 w-max rounded-sm p-1">
                              <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-white rounded shadow-sm transition"><Minus size={14}/></button>
                              <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-white rounded shadow-sm transition"><Plus size={14}/></button>
                            </div>
                         </div>
                         <button onClick={() => removeFromCart(item.id)} className="absolute top-4 right-4 text-stone-300 hover:text-red-500 transition"><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white p-5 rounded-sm space-y-4 border border-stone-200 shadow-sm">
                    <h3 className="font-bold text-sm uppercase text-stone-500 border-b pb-2">Informações de Entrega</h3>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="Seu Nome *" 
                        className="w-full p-3 border border-stone-200 rounded-sm bg-stone-50 focus:ring-1 focus:ring-orange-800 focus:border-orange-800 outline-none transition" 
                        value={checkoutForm.name} 
                        onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} 
                      />
                      <input 
                        type="tel" 
                        placeholder="WhatsApp (com DDD) *" 
                        className="w-full p-3 border border-stone-200 rounded-sm bg-stone-50 focus:ring-1 focus:ring-orange-800 focus:border-orange-800 outline-none transition" 
                        value={checkoutForm.whatsapp} 
                        onChange={e => setCheckoutForm({...checkoutForm, whatsapp: e.target.value})} 
                      />
                      <textarea 
                        placeholder="Endereço Completo *" 
                        className="w-full p-3 border border-stone-200 rounded-sm bg-stone-50 h-24 resize-none focus:ring-1 focus:ring-orange-800 focus:border-orange-800 outline-none transition" 
                        value={checkoutForm.address} 
                        onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} 
                      />
                      <textarea 
                        placeholder="Observações (ex: Troco para 50, sem cebola...)" 
                        className="w-full p-3 border border-stone-200 rounded-sm bg-stone-50 h-20 resize-none focus:ring-1 focus:ring-orange-800 focus:border-orange-800 outline-none transition" 
                        value={checkoutForm.notes} 
                        onChange={e => setCheckoutForm({...checkoutForm, notes: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-white border-t border-stone-200 space-y-4 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-end">
                <span className="text-stone-500 font-medium">Total do Pedido</span>
                <span className="text-2xl font-bold text-stone-900">{formatCurrency(cartTotal)}</span>
              </div>
              <button 
                onClick={placeOrderWhatsApp} 
                disabled={cart.length === 0}
                className="w-full py-4 bg-green-600 text-white rounded-sm font-bold hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:bg-stone-300 disabled:cursor-not-allowed"
              >
                <Send size={20} /> ENVIAR PEDIDO NO WHATSAPP
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
  const [productForm, setProductForm] = useState({ name: '', price: '', category: 'Assados', description: '', image: '' });

  useEffect(() => {
    if (editingProduct) {
      setProductForm(editingProduct);
    } else {
      setProductForm({ name: '', price: '', category: 'Assados', description: '', image: '' });
    }
  }, [editingProduct]);

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
    totalSales: orders.filter(o => o.status !== 'cancelado').reduce((acc, o) => acc + (o.total || 0), 0),
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pendente' || o.status === 'preparando').length,
    activeDeliveries: orders.filter(o => o.status === 'em_entrega').length
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    handleSaveProduct(productForm);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row font-sans">
      <aside className="bg-stone-900 text-white w-full md:w-64 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-stone-800 flex items-center gap-3">
          <ChefHat className="text-orange-500" size={32} />
          <div><h2 className="font-bold text-lg font-serif">Admin</h2></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setAdminTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${adminTab === 'dashboard' ? 'bg-orange-900 text-white shadow-md' : 'text-stone-400 hover:bg-stone-800 hover:text-white'}`}><LayoutDashboard size={20}/> Dashboard</button>
          <button onClick={() => setAdminTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${adminTab === 'orders' ? 'bg-orange-900 text-white shadow-md' : 'text-stone-400 hover:bg-stone-800 hover:text-white'}`}><Package size={20}/> Pedidos (KDS)</button>
          <button onClick={() => setAdminTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${adminTab === 'menu' ? 'bg-orange-900 text-white shadow-md' : 'text-stone-400 hover:bg-stone-800 hover:text-white'}`}><Menu size={20}/> Cardápio</button>
        </nav>
        <div className="p-4 border-t border-stone-800">
           <button onClick={() => { setView('landing'); setIsAdminMode(false); }} className="w-full flex items-center gap-2 text-stone-500 hover:text-white transition-colors px-4 py-2"><LogOut size={18}/> Sair</button>
        </div>
      </aside>
      
      <main className="flex-1 p-6 overflow-y-auto h-screen">
        {adminTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-stone-800 font-serif border-l-4 border-orange-800 pl-4">Visão Geral</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 shadow-sm border border-stone-200 border-l-4 border-l-green-600 rounded-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-stone-500 text-xs font-bold uppercase tracking-wider">Faturamento</h3>
                    <DollarSign className="text-green-600" size={20} />
                </div>
                <p className="text-3xl font-bold text-stone-900">{formatCurrency(stats.totalSales)}</p>
              </div>
              <div className="bg-white p-6 shadow-sm border border-stone-200 border-l-4 border-l-blue-600 rounded-sm">
                 <div className="flex justify-between items-start mb-4">
                    <h3 className="text-stone-500 text-xs font-bold uppercase tracking-wider">Pedidos Totais</h3>
                    <Package className="text-blue-600" size={20} />
                </div>
                <p className="text-3xl font-bold text-stone-900">{stats.totalOrders}</p>
              </div>
              <div className="bg-white p-6 shadow-sm border border-stone-200 border-l-4 border-l-orange-600 rounded-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-stone-500 text-xs font-bold uppercase tracking-wider">Na Cozinha</h3>
                    <ChefHat className="text-orange-600" size={20} />
                </div>
                <p className="text-3xl font-bold text-stone-900">{stats.pendingOrders}</p>
              </div>
              <div className="bg-white p-6 shadow-sm border border-stone-200 border-l-4 border-l-purple-600 rounded-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-stone-500 text-xs font-bold uppercase tracking-wider">Em Entrega</h3>
                    <Bike className="text-purple-600" size={20} />
                </div>
                <p className="text-3xl font-bold text-stone-900">{stats.activeDeliveries}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 shadow-sm border border-stone-200 rounded-sm">
                <h3 className="font-bold text-stone-800 mb-4 font-serif">Últimos Pedidos</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-stone-100 text-stone-600 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Cliente</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {orders.slice(0, 5).map(o => (
                                <tr key={o.id}>
                                    <td className="px-4 py-3 font-mono">#{o.id.slice(0,4)}</td>
                                    <td className="px-4 py-3 font-medium">{o.customer}</td>
                                    <td className="px-4 py-3"><Badge color={getStatusColor(o.status)}>{o.status}</Badge></td>
                                    <td className="px-4 py-3">{formatCurrency(o.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

        {adminTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-stone-800 font-serif border-l-4 border-orange-800 pl-4">KDS - Cozinha</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {orders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado').length === 0 && (
                  <p className="col-span-full text-center text-stone-400 py-10">Nenhum pedido pendente.</p>
              )}
              {orders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado').map(order => (
                <div key={order.id} className="bg-white rounded-sm shadow-md border border-stone-200 flex flex-col overflow-hidden">
                  <div className={`p-4 border-b flex justify-between items-center ${order.status === 'pendente' ? 'bg-yellow-50' : 'bg-white'}`}>
                    <span className="font-mono font-bold text-stone-600">#{order.id.slice(0, 4)}</span>
                    <Badge color={getStatusColor(order.status)}>{order.status}</Badge>
                  </div>
                  <div className="p-5 flex-1 space-y-4">
                    <div>
                        <h4 className="font-bold text-lg font-serif text-stone-800">{order.customer}</h4>
                        {order.notes && <p className="text-xs text-red-600 bg-red-50 p-2 mt-1 rounded border border-red-100 font-bold">Obs: {order.notes}</p>}
                    </div>
                    <ul className="bg-stone-50 p-3 rounded-sm text-sm space-y-2 border border-stone-100">
                      {order.items?.map((i, idx) => (
                          <li key={idx} className="flex justify-between border-b border-stone-200 pb-1 last:border-0 last:pb-0">
                              <span>{i.name}</span>
                              <span className="font-bold">x{i.qty}</span>
                          </li>
                      ))}
                    </ul>
                    <div className="text-xs text-stone-500 flex items-center gap-1">
                        <Clock size={12}/> {new Date(order.createdAt?.seconds * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2 bg-stone-50 border-t border-stone-100">
                    {order.status === 'pendente' && (
                        <button onClick={() => updateOrderStatus(order.id, 'preparando')} className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm transition-colors flex justify-center items-center gap-2">
                            <UtensilsCrossed size={16}/> INICIAR PREPARO
                        </button>
                    )}
                    {order.status === 'preparando' && (
                        <button onClick={() => updateOrderStatus(order.id, 'pronto')} className="col-span-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-sm transition-colors flex justify-center items-center gap-2">
                            <CheckCircle size={16}/> MARCAR PRONTO
                        </button>
                    )}
                    {order.status === 'pronto' && (
                        <div className="col-span-2 text-center text-green-800 font-bold py-3 bg-green-100 rounded-sm border border-green-200 flex justify-center items-center gap-2">
                             AGUARDANDO ENTREGADOR
                        </div>
                    )}
                     {order.status === 'em_entrega' && (
                        <div className="col-span-2 text-center text-purple-800 font-bold py-3 bg-purple-100 rounded-sm border border-purple-200 flex justify-center items-center gap-2">
                             <Bike size={16} /> EM ENTREGA
                        </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'menu' && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center border-b pb-4 border-stone-200">
                <h2 className="text-2xl font-bold text-stone-800 font-serif border-l-4 border-orange-800 pl-4">Gerenciar Cardápio</h2>
                <button onClick={() => { setEditingProduct(null); setIsProductFormOpen(true); }} className="px-4 py-2 bg-stone-800 text-white rounded-sm font-bold hover:bg-stone-900 flex items-center gap-2">
                    <Plus size={18}/> Novo Produto
                </button>
             </div>

             {/* Formulário de Produto */}
             {isProductFormOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
                     <div className="bg-white rounded-sm shadow-xl max-w-lg w-full p-6 border-t-4 border-orange-800">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-serif">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                            <button onClick={() => setIsProductFormOpen(false)}><X size={24}/></button>
                         </div>
                         <form onSubmit={handleProductSubmit} className="space-y-4">
                             <div>
                                 <label className="block text-sm font-bold text-stone-600 mb-1">Nome</label>
                                 <input required type="text" className="w-full p-2 border border-stone-300 rounded-sm" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-stone-600 mb-1">Preço (R$)</label>
                                    <input required type="number" step="0.01" className="w-full p-2 border border-stone-300 rounded-sm" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-stone-600 mb-1">Categoria</label>
                                    <select className="w-full p-2 border border-stone-300 rounded-sm" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>
                                        <option>Assados</option>
                                        <option>Acompanhamentos</option>
                                        <option>Bebidas</option>
                                        <option>Combos</option>
                                    </select>
                                </div>
                             </div>
                             <div>
                                 <label className="block text-sm font-bold text-stone-600 mb-1">Descrição</label>
                                 <textarea className="w-full p-2 border border-stone-300 rounded-sm h-20" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
                             </div>
                             <div>
                                 <label className="block text-sm font-bold text-stone-600 mb-1">URL da Imagem</label>
                                 <input type="url" className="w-full p-2 border border-stone-300 rounded-sm" placeholder="https://..." value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} />
                             </div>
                             <button type="submit" className="w-full py-3 bg-orange-800 text-white font-bold rounded-sm hover:bg-orange-900 mt-4">
                                 {editingProduct ? 'ATUALIZAR' : 'CADASTRAR'}
                             </button>
                         </form>
                     </div>
                 </div>
             )}

             <div className="grid gap-4">
                {products.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-sm shadow-sm border border-stone-200 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-stone-100 rounded-sm overflow-hidden">
                                {p.image ? <img src={p.image} className="w-full h-full object-cover"/> : <ImageIcon className="m-auto mt-4 text-stone-400"/>}
                            </div>
                            <div>
                                <h4 className="font-bold text-stone-800">{p.name}</h4>
                                <span className="text-xs font-bold text-stone-500 uppercase">{p.category}</span>
                                <span className="ml-3 text-orange-800 font-bold">{formatCurrency(p.price)}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingProduct(p); setIsProductFormOpen(true); }} className="p-2 text-stone-500 hover:bg-stone-100 rounded"><Edit size={18}/></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

const DriverArea = ({ orders, updateOrderStatus, setIsDriverMode, setView, isDriverMode }) => {
    if (!isDriverMode) {
        return (
            <LoginScreen 
                role="driver" 
                onLogin={() => setIsDriverMode(true)} 
                onBack={() => { setView('landing'); setIsDriverMode(false); }} 
            />
        );
    }

    const availableDeliveries = orders.filter(o => o.status === 'pronto');
    const myDeliveries = orders.filter(o => o.status === 'em_entrega');

    return (
        <div className="min-h-screen bg-stone-100 font-sans pb-20">
             <header className="bg-stone-900 text-white p-4 shadow-md sticky top-0 z-10">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Bike className="text-orange-500" size={24} />
                        <h1 className="font-bold text-lg font-serif">Área do Entregador</h1>
                    </div>
                    <button onClick={() => { setView('landing'); setIsDriverMode(false); }} className="text-xs bg-stone-800 px-3 py-1 rounded border border-stone-700">Sair</button>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-6">
                
                {/* Minhas Entregas Atuais */}
                <section>
                    <h2 className="text-stone-800 font-bold mb-3 flex items-center gap-2">
                        <Navigation size={18} className="text-blue-600"/> Em Rota
                    </h2>
                    {myDeliveries.length === 0 ? (
                         <div className="bg-white p-6 rounded-sm border border-stone-200 text-center text-stone-400 text-sm">
                             Você não tem entregas ativas.
                         </div>
                    ) : (
                        <div className="space-y-4">
                            {myDeliveries.map(order => (
                                <div key={order.id} className="bg-white rounded-sm shadow-md border-l-4 border-l-blue-600 overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-mono font-bold">#{order.id.slice(0,4)}</span>
                                            <span className="text-blue-600 font-bold text-xs uppercase">Em andamento</span>
                                        </div>
                                        <h3 className="font-bold text-lg mb-1">{order.customer}</h3>
                                        <div className="flex items-start gap-2 text-stone-600 text-sm bg-stone-50 p-2 rounded">
                                            <MapPin size={16} className="mt-1 flex-shrink-0 text-red-500" />
                                            <p>{order.address}</p>
                                        </div>
                                        {order.whatsapp && (
                                            <a href={`https://wa.me/55${order.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 text-green-600 font-bold text-sm hover:underline">
                                                <Phone size={16} /> Chamar no WhatsApp
                                            </a>
                                        )}
                                        <div className="mt-3 pt-3 border-t border-stone-100 flex justify-between items-center">
                                            <span className="text-sm text-stone-500">Total a cobrar: <b className="text-stone-800">{formatCurrency(order.total)}</b></span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => updateOrderStatus(order.id, 'entregue')}
                                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold flex justify-center items-center gap-2"
                                    >
                                        <CheckSquare size={18} /> CONFIRMAR ENTREGA
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Disponíveis para Retirada */}
                <section>
                    <h2 className="text-stone-800 font-bold mb-3 flex items-center gap-2">
                        <Package size={18} className="text-orange-600"/> Aguardando Retirada
                    </h2>
                     {availableDeliveries.length === 0 ? (
                         <div className="bg-stone-50 p-6 rounded-sm border border-dashed border-stone-300 text-center text-stone-400 text-sm">
                             Nenhum pedido pronto na cozinha.
                         </div>
                    ) : (
                        <div className="space-y-4">
                            {availableDeliveries.map(order => (
                                <div key={order.id} className="bg-white rounded-sm shadow-sm border border-stone-200 opacity-90 hover:opacity-100 transition-opacity">
                                    <div className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-mono font-bold text-stone-500">#{order.id.slice(0,4)}</span>
                                            <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded">PRONTO</span>
                                        </div>
                                        <h3 className="font-bold text-stone-800">{order.customer}</h3>
                                        <p className="text-xs text-stone-500 truncate">{order.address}</p>
                                    </div>
                                    <button 
                                        onClick={() => updateOrderStatus(order.id, 'em_entrega')}
                                        className="w-full py-3 bg-stone-800 hover:bg-stone-900 text-white font-bold text-sm flex justify-center items-center gap-2"
                                    >
                                        <Bike size={16} /> PEGAR ENTREGA
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

// --- APP PRINCIPAL ---
const App = () => {
  // Estado Global
  const [view, setView] = useState('landing'); // landing, customer, admin, driver
  const [user, setUser] = useState(null);
  
  // Estado de Dados
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  
  // Estado de UI
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [checkoutForm, setCheckoutForm] = useState({ name: '', whatsapp: '', address: '', notes: '' });
  
  // Estado de Acesso
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDriverMode, setIsDriverMode] = useState(false);
  const [adminTab, setAdminTab] = useState('dashboard');
  
  // Estado Admin
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Inicialização Auth e Listeners
  useEffect(() => {
    const initApp = async () => {
      // Auth Anônimo para garantir leitura do banco
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initApp();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
       setUser(currentUser);
       if (currentUser) {
           // Listeners de Firestore (Regra 1: artifacts/{appId}/public/data/...)
           const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
           const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
           // Ordenação precisa ser em memória ou via query simples se index existir. Vamos usar sort JS para segurança (Regra 2)
           
           const unsubProd = onSnapshot(productsRef, (snap) => {
               const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
               // Sort básico por nome
               setProducts(items.sort((a,b) => a.name.localeCompare(b.name)));
           }, (err) => console.error("Erro products", err));

           const unsubOrders = onSnapshot(ordersRef, (snap) => {
               const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
               // Sort por data (mais recente primeiro)
               setOrders(items.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
           }, (err) => console.error("Erro orders", err));

           return () => { unsubProd(); unsubOrders(); };
       }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- Ações do Carrinho ---
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, qty: Math.max(1, item.qty + delta) };
      return item;
    }));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  // --- Ações de Checkout ---
  const placeOrderWhatsApp = async () => {
    if (!checkoutForm.name || !checkoutForm.whatsapp || !checkoutForm.address) {
      alert("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }

    const orderData = {
      customer: checkoutForm.name,
      whatsapp: checkoutForm.whatsapp,
      address: checkoutForm.address,
      notes: checkoutForm.notes,
      items: cart,
      total: cartTotal,
      status: 'pendente',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // Salvar no Firestore
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderData);
      
      // Gerar Link WhatsApp
      const msg = `*Novo Pedido - Assados Davanzo*\n\n` +
                  `Cliente: ${checkoutForm.name}\n` +
                  `Endereço: ${checkoutForm.address}\n\n` +
                  `*Itens:*\n` +
                  cart.map(i => `${i.qty}x ${i.name} - ${formatCurrency(i.price)}`).join('\n') +
                  `\n\n*Total: ${formatCurrency(cartTotal)}*\n` +
                  (checkoutForm.notes ? `Obs: ${checkoutForm.notes}` : '');
      
      const whatsappUrl = `https://wa.me/55${checkoutForm.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`;
      
      setCart([]);
      setCheckoutForm({ name: '', whatsapp: '', address: '', notes: '' });
      setIsCartOpen(false);
      
      // Abrir WhatsApp (simulado com window.open)
      window.open(whatsappUrl, '_blank');
      
      alert("Pedido realizado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar pedido", error);
      alert("Erro ao enviar pedido.");
    }
  };

  // --- Ações Admin / Driver ---
  const updateOrderStatus = async (orderId, newStatus) => {
      try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), {
              status: newStatus,
              updatedAt: new Date()
          });
      } catch (e) {
          console.error("Erro ao atualizar status", e);
      }
  };

  const handleSaveProduct = async (productData) => {
      try {
          if (editingProduct) {
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingProduct.id), productData);
          } else {
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), productData);
          }
          setIsProductFormOpen(false);
          setEditingProduct(null);
      } catch (e) {
          console.error("Erro ao salvar produto", e);
      }
  };

  const handleDeleteProduct = async (id) => {
      if (window.confirm("Tem certeza que deseja excluir este produto?")) {
          try {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
          } catch (e) { console.error(e); }
      }
  };

  return (
    <div>
      {view === 'landing' && <LandingPage setView={setView} setIsAdminMode={setIsAdminMode} setIsDriverMode={setIsDriverMode} />}
      
      {view === 'customer' && (
        <CustomerArea 
          products={products} cart={cart} addToCart={addToCart} updateQty={updateQty} 
          removeFromCart={removeFromCart} cartTotal={cartTotal} 
          checkoutForm={checkoutForm} setCheckoutForm={setCheckoutForm} 
          placeOrderWhatsApp={placeOrderWhatsApp} isCartOpen={isCartOpen} 
          setIsCartOpen={setIsCartOpen} activeCategory={activeCategory} 
          setActiveCategory={setActiveCategory} setView={setView} 
        />
      )}
      
      {view === 'admin' && (
        <AdminArea 
          user={user} auth={auth} isAdminMode={isAdminMode} setIsAdminMode={setIsAdminMode} 
          setView={setView} adminTab={adminTab} setAdminTab={setAdminTab} 
          orders={orders} products={products} updateOrderStatus={updateOrderStatus} 
          handleSaveProduct={handleSaveProduct} handleDeleteProduct={handleDeleteProduct}
          isProductFormOpen={isProductFormOpen} setIsProductFormOpen={setIsProductFormOpen}
          editingProduct={editingProduct} setEditingProduct={setEditingProduct}
        />
      )}
      
      {view === 'driver' && (
        <DriverArea 
            orders={orders} updateOrderStatus={updateOrderStatus} 
            setIsDriverMode={setIsDriverMode} setView={setView} isDriverMode={isDriverMode}
        />
      )}
    </div>
  );
};

export default App;
