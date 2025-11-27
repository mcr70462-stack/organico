import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { User, Product, CartItem, UserRole, ViewState, Order } from './types';
import { storage } from './services/storage';
import { generateRecipe } from './services/geminiService';
import { Icons } from './components/Icons';

// --- Contexts ---
interface AppContextType {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  products: Product[];
  cart: CartItem[];
  addToCart: (p: Product) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  view: ViewState;
  setView: (v: ViewState) => void;
  isAdmin: boolean;
  refreshProducts: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (v: boolean) => void;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

// --- Components ---

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', ...props }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-leaf-600 text-white hover:bg-leaf-700 shadow-md hover:shadow-lg",
    secondary: "bg-leaf-100 text-leaf-800 hover:bg-leaf-200",
    outline: "border-2 border-leaf-600 text-leaf-600 hover:bg-leaf-50",
    danger: "bg-red-500 text-white hover:bg-red-600"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Navbar = () => {
  const { user, logout, cart, setView, isCartOpen, setIsCartOpen } = useContext(AppContext);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-earth-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('HOME')}>
            <Icons.Leaf className="w-8 h-8 text-leaf-600" />
            <span className="text-xl font-bold text-earth-800 hidden sm:block">Orgânico Vida</span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-earth-600 hidden md:block">Olá, {user.name}</span>
                {user.role === UserRole.ADMIN && (
                   <Button variant="secondary" onClick={() => setView('ADMIN_PRODUCTS')} className="text-xs">
                     Painel
                   </Button>
                )}
                <button onClick={logout} className="text-earth-500 hover:text-red-500 transition-colors">
                  <Icons.LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setView('LOGIN')} className="text-sm py-1">Entrar</Button>
                <Button onClick={() => setView('REGISTER')} className="text-sm py-1 hidden sm:flex">Cadastrar</Button>
              </div>
            )}

            <button 
              className="relative p-2 text-earth-600 hover:bg-earth-100 rounded-full transition-colors"
              onClick={() => setIsCartOpen(!isCartOpen)}
            >
              <Icons.ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart } = useContext(AppContext);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    setIsAdding(true);
    addToCart(product);
    setTimeout(() => setIsAdding(false), 500);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-earth-100 group">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
        />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-semibold text-leaf-700 shadow-sm">
          {product.category}
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-earth-800 line-clamp-1">{product.name}</h3>
          <span className="font-bold text-leaf-700">R$ {product.price.toFixed(2)}</span>
        </div>
        <p className="text-sm text-earth-500 mb-4 line-clamp-2 min-h-[40px]">{product.description}</p>
        <div className="flex items-center justify-between text-xs text-earth-400 mb-4">
          <span>Unidade: {product.unit}</span>
          <span>Estoque: {product.stock}</span>
        </div>
        <Button 
          onClick={handleAdd} 
          className={`w-full ${isAdding ? 'bg-leaf-800' : ''}`}
          disabled={product.stock <= 0}
        >
          {product.stock <= 0 ? 'Esgotado' : (isAdding ? <Icons.Check className="w-5 h-5"/> : 'Adicionar')}
        </Button>
      </div>
    </div>
  );
};

const CartDrawer = () => {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, clearCart, setView, addToCart } = useContext(AppContext);
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const [recipe, setRecipe] = useState<any>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  if (!isCartOpen) return null;

  const handleGenerateRecipe = async () => {
    setLoadingRecipe(true);
    setRecipe(null);
    try {
      const result = await generateRecipe(cart);
      setRecipe(result);
    } catch (e) {
      alert("Erro ao gerar receita. Verifique a API Key.");
    } finally {
      setLoadingRecipe(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
      <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
        <div className="h-full w-full bg-white shadow-xl flex flex-col animate-slide-in-right">
          <div className="flex items-center justify-between p-6 border-b border-earth-100">
            <h2 className="text-xl font-bold text-earth-800 flex items-center gap-2">
              <Icons.ShoppingCart /> Seu Carrinho
            </h2>
            <button onClick={() => setIsCartOpen(false)} className="text-earth-400 hover:text-earth-600">
              <Icons.X />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="text-center text-earth-400 py-10">
                <p>Seu carrinho está vazio.</p>
                <Button variant="outline" className="mt-4 mx-auto" onClick={() => setIsCartOpen(false)}>
                  Continuar Comprando
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 bg-earth-50 p-3 rounded-lg">
                      <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-earth-800">{item.name}</h4>
                        <p className="text-sm text-leaf-600 font-medium">R$ {item.price.toFixed(2)} x {item.quantity}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
                           <Icons.Trash className="w-4 h-4" />
                         </button>
                         <button onClick={() => addToCart(item)} className="text-leaf-600 hover:text-leaf-800">
                            <Icons.Plus className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gemini AI Feature */}
                <div className="mt-8 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2 text-indigo-800 font-semibold">
                    <Icons.Sparkles className="w-5 h-5 text-indigo-500" />
                    <span>Chef IA</span>
                  </div>
                  <p className="text-sm text-indigo-600 mb-3">
                    Não sabe o que cozinhar com estes ingredientes? Deixe a IA sugerir!
                  </p>
                  <Button 
                    onClick={handleGenerateRecipe} 
                    disabled={loadingRecipe}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {loadingRecipe ? 'Pensando...' : 'Gerar Receita Exclusiva'}
                  </Button>

                  {recipe && (
                    <div className="mt-4 bg-white p-4 rounded-lg shadow-sm text-sm border border-indigo-100 animate-fade-in">
                      <h4 className="font-bold text-indigo-900 mb-1">{recipe.title}</h4>
                      <div className="flex gap-2 text-xs text-earth-500 mb-2">
                        <span>⏱ {recipe.time}</span>
                        <span>📊 {recipe.difficulty}</span>
                      </div>
                      <p className="text-earth-600 mb-2 italic">"{recipe.healthBenefits}"</p>
                      <details className="cursor-pointer">
                        <summary className="font-medium text-indigo-600">Ver modo de preparo</summary>
                        <ul className="mt-2 list-disc list-inside text-earth-700 space-y-1">
                          {recipe.instructions?.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="p-6 border-t border-earth-100 bg-earth-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-earth-600">Total</span>
              <span className="text-2xl font-bold text-leaf-700">R$ {total.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={clearCart}>Limpar</Button>
              <Button onClick={() => { setIsCartOpen(false); setView('CHECKOUT'); }} disabled={cart.length === 0}>
                Finalizar Compra
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AuthScreen = () => {
  const { login, view, setView } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (view === 'LOGIN') {
      const user = storage.login(email, password);
      if (user) {
        login(user);
      } else {
        setError('Email ou senha inválidos. Tente admin@organico.com / admin');
      }
    } else {
      if (!name || !email || !password) {
        setError('Preencha todos os campos.');
        return;
      }
      const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        password,
        role: UserRole.CUSTOMER
      };
      storage.saveUser(newUser);
      login(newUser);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-earth-50">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
        <div className="text-center">
          <Icons.Leaf className="mx-auto h-12 w-12 text-leaf-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-earth-900">
            {view === 'LOGIN' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>
          <p className="mt-2 text-sm text-earth-600">
            {view === 'LOGIN' ? 'Faça login para continuar comprando' : 'Junte-se à comunidade orgânica'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {view === 'REGISTER' && (
              <div>
                <input
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-earth-300 placeholder-earth-500 text-earth-900 rounded-t-md focus:outline-none focus:ring-leaf-500 focus:border-leaf-500 sm:text-sm"
                  placeholder="Nome Completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <input
                type="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-earth-300 placeholder-earth-500 text-earth-900 ${view === 'LOGIN' ? 'rounded-t-md' : ''} focus:outline-none focus:ring-leaf-500 focus:border-leaf-500 sm:text-sm`}
                placeholder="Endereço de Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-earth-300 placeholder-earth-500 text-earth-900 rounded-b-md focus:outline-none focus:ring-leaf-500 focus:border-leaf-500 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <div>
            <Button type="submit" className="w-full">
              {view === 'LOGIN' ? 'Entrar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
        <div className="text-center">
          <button 
            type="button"
            className="text-sm text-leaf-600 hover:text-leaf-500 font-medium"
            onClick={() => setView(view === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
          >
            {view === 'LOGIN' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckoutModal = () => {
  const { cart, clearCart, setView, user } = useContext(AppContext);
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const [step, setStep] = useState(1);
  const [pixCode] = useState(`00020126580014BR.GOV.BCB.PIX0136${Math.random().toString(36).substring(7)}520400005303986540${total.toFixed(2).replace('.', '')}5802BR5913ORGANICOVIDA6008BRASILIA62070503***6304`);

  const handleFinish = () => {
    if (!user) {
      setView('LOGIN');
      return;
    }
    const order: Order = {
      id: Date.now().toString(),
      userId: user.id,
      items: cart,
      total,
      status: 'paid', // Simulating instant payment
      date: new Date().toISOString(),
      paymentMethod: 'PIX'
    };
    storage.saveOrder(order);
    clearCart();
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-earth-800 mb-2">Checkout</h2>
          
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-earth-600">Confirme os itens do seu pedido.</p>
              <ul className="divide-y divide-earth-100 max-h-60 overflow-y-auto">
                {cart.map(item => (
                  <li key={item.id} className="py-2 flex justify-between text-sm">
                    <span>{item.name} (x{item.quantity})</span>
                    <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-earth-200 pt-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-leaf-700">R$ {total.toFixed(2)}</span>
              </div>
              <Button className="w-full mt-4" onClick={() => setStep(2)}>Pagar com PIX</Button>
              <Button variant="outline" className="w-full mt-2" onClick={() => setView('HOME')}>Cancelar</Button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-6">
              <p className="text-earth-600">Escaneie o QR Code abaixo para pagar.</p>
              <div className="bg-white p-4 inline-block border-2 border-leaf-500 rounded-xl relative">
                {/* Simulated QR Code using an image for aesthetics */}
                 <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${pixCode}&color=166534`} alt="Pix QR Code" className="w-48 h-48 mx-auto" />
              </div>
              <div className="bg-earth-50 p-3 rounded text-xs break-all text-earth-500 select-all font-mono">
                {pixCode}
              </div>
              <Button className="w-full" onClick={handleFinish}>Confirmar Pagamento</Button>
              <button onClick={() => setStep(1)} className="text-sm text-earth-500 underline">Voltar</button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.Check className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-earth-800 mb-2">Pagamento Confirmado!</h3>
              <p className="text-earth-600 mb-6">Seus produtos orgânicos chegarão em breve.</p>
              <Button onClick={() => setView('HOME')}>Voltar para a Loja</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const { products, refreshProducts, setView } = useContext(AppContext);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza?')) {
      storage.deleteProduct(id);
      refreshProducts();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct = {
      ...formData,
      id: formData.id || Date.now().toString(),
      stock: Number(formData.stock),
      price: Number(formData.price)
    } as Product;
    
    storage.saveProduct(newProduct);
    refreshProducts();
    setIsEditing(false);
    setFormData({});
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-earth-800">Gerenciamento de Produtos</h2>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView('HOME')}>Voltar à Loja</Button>
            <Button onClick={() => { setFormData({}); setIsEditing(true); }}>Novo Produto</Button>
        </div>
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mx-auto">
          <h3 className="text-xl font-bold mb-4">{formData.id ? 'Editar' : 'Criar'} Produto</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input 
                className="border p-2 rounded w-full" 
                placeholder="Nome" 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
              <input 
                className="border p-2 rounded w-full" 
                placeholder="Categoria" 
                value={formData.category || ''} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                required 
              />
            </div>
            <textarea 
              className="border p-2 rounded w-full" 
              placeholder="Descrição" 
              value={formData.description || ''} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              required 
            />
            <div className="grid grid-cols-3 gap-4">
              <input 
                type="number" step="0.01" 
                className="border p-2 rounded w-full" 
                placeholder="Preço" 
                value={formData.price || ''} 
                onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} 
                required 
              />
              <input 
                className="border p-2 rounded w-full" 
                placeholder="Unidade (ex: kg, un)" 
                value={formData.unit || ''} 
                onChange={e => setFormData({...formData, unit: e.target.value})} 
                required 
              />
              <input 
                type="number" 
                className="border p-2 rounded w-full" 
                placeholder="Estoque" 
                value={formData.stock || ''} 
                onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} 
                required 
              />
            </div>
            
            <div className="border-2 border-dashed border-earth-300 rounded-lg p-6 text-center">
                {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="h-32 mx-auto mb-2 object-cover rounded" />
                ) : (
                    <p className="text-earth-500 mb-2">Sem imagem</p>
                )}
                <label className="cursor-pointer bg-leaf-100 text-leaf-700 px-4 py-2 rounded hover:bg-leaf-200 transition">
                    Upload Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button type="submit">Salvar Produto</Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-earth-50 text-earth-600">
              <tr>
                <th className="p-4">Produto</th>
                <th className="p-4">Preço</th>
                <th className="p-4">Estoque</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-earth-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-earth-50/50">
                  <td className="p-4 flex items-center gap-3">
                    <img src={p.imageUrl} className="w-10 h-10 rounded object-cover" alt="" />
                    <div>
                      <div className="font-medium text-earth-900">{p.name}</div>
                      <div className="text-xs text-earth-500">{p.category}</div>
                    </div>
                  </td>
                  <td className="p-4 text-earth-700">R$ {p.price.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => { setFormData(p); setIsEditing(true); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- Main App Container ---

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('HOME');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Initialization
  useEffect(() => {
    const storedUser = storage.getCurrentUser();
    if (storedUser) setUser(storedUser);
    setProducts(storage.getProducts());
  }, []);

  const login = (u: User) => {
    setUser(u);
    setView('HOME');
  };

  const logout = () => {
    storage.logout();
    setUser(null);
    setView('LOGIN');
    setCart([]);
  };

  const refreshProducts = () => {
    setProducts(storage.getProducts());
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const contextValue: AppContextType = {
    user,
    login,
    logout,
    products,
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    view,
    setView,
    isAdmin: user?.role === UserRole.ADMIN,
    refreshProducts,
    isCartOpen,
    setIsCartOpen
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-earth-50 flex flex-col font-sans text-earth-900">
        <Navbar />
        
        <main className="flex-grow relative">
          {view === 'HOME' && (
            <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
              {/* Hero Section */}
              <div className="bg-gradient-to-r from-leaf-600 to-leaf-800 rounded-2xl p-8 mb-10 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                  <h1 className="text-4xl font-bold mb-4">Direto da terra para sua mesa</h1>
                  <p className="text-leaf-100 text-lg mb-6">Produtos orgânicos certificados, frescos e saborosos. Apoie a agricultura local sustentável.</p>
                  <Button variant="secondary" onClick={() => {
                     document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    Ver Ofertas
                  </Button>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute right-0 top-0 h-full w-1/3 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/food.png')]"></div>
              </div>

              <div id="products">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-earth-800">Produtos em Destaque</h2>
                  <div className="flex gap-2">
                     <span className="px-3 py-1 bg-leaf-100 text-leaf-800 rounded-full text-sm font-medium">Todos</span>
                     <span className="px-3 py-1 hover:bg-earth-200 text-earth-600 rounded-full text-sm font-medium cursor-pointer">Legumes</span>
                     <span className="px-3 py-1 hover:bg-earth-200 text-earth-600 rounded-full text-sm font-medium cursor-pointer">Frutas</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {(view === 'LOGIN' || view === 'REGISTER') && <AuthScreen />}
          
          {view === 'ADMIN_PRODUCTS' && user?.role === UserRole.ADMIN && <AdminPanel />}
          
          {view === 'CHECKOUT' && <CheckoutModal />}

        </main>

        <CartDrawer />

        <footer className="bg-white border-t border-earth-200 mt-auto py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-earth-500 text-sm">
            <p>&copy; 2024 Orgânico Vida. Todos os direitos reservados.</p>
            <p className="mt-2">Feito com 💚 para uma vida mais saudável.</p>
          </div>
        </footer>
      </div>
    </AppContext.Provider>
  );
};

export default App;