import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  History, 
  LogOut, 
  Camera, 
  Link as LinkIcon, 
  Type, 
  ChevronLeft, 
  CheckCircle2, 
  Circle,
  Trash2,
  Calendar as CalendarIcon
} from 'lucide-react';
import Calendar from './components/Calendar';

export default function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [lists, setLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  useEffect(() => {
    if (user) fetchLists();
  }, [user]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.username && loginForm.password) {
      setUser({ name: loginForm.username });
      setView('home');
    }
  };

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/lists');
      const data = await res.json();
      setLists(data);
    } catch (e) {
      console.error("Failed to fetch lists", e);
    }
  };

  const handleCreateList = async (title, items) => {
    setLoading(true);
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, items })
      });
      const data = await res.json();
      await fetchLists();
      const fullListRes = await fetch(`/api/lists/${data.id}`);
      const fullListData = await fullListRes.json();
      setCurrentList(fullListData);
      setView('list');
    } catch (e) {
      console.error("Failed to create list", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemId, currentStatus) => {
    try {
      await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_checked: !currentStatus })
      });
      if (currentList) {
        setCurrentList({
          ...currentList,
          items: currentList.items?.map(item => 
            item.id === itemId ? { ...item, is_checked: !currentStatus } : item
          )
        });
      }
    } catch (e) {
      console.error("Failed to toggle item", e);
    }
  };

  const handleDeleteList = async (listId) => {
    try {
      await fetch(`/api/lists/${listId}`, {
        method: 'DELETE'
      });

      // Remove the deleted list from the lists state
      setLists(prev => prev.filter(list => list.id !== listId));

      // Clear the current list and go back to history
      setCurrentList(null);
      setView('history');
    } catch (e) {
      console.error("Failed to delete list", e);
    }
  };

  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm card p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif font-bold">KitchIndex</h1>
          <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Login to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-4">Username</label>
            <input 
              type="text"
              required
              className="input-field text-lg"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-4">Password</label>
            <input 
              type="password"
              required
              className="input-field text-lg"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            className="btn-primary text-lg"
          >
            Login
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setView('signup')}
            className="text-sm text-gray-400 transition-colors"
          >
            Don't have an account? Sign up
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderSignup = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm card p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif font-bold">KitchIndex</h1>
          <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Create your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-4">Username</label>
            <input 
              type="text"
              required
              className="input-field text-lg"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-4">Email</label>
            <input 
              type="email"
              required
              className="input-field text-lg"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-4">Password</label>
            <input 
              type="password"
              required
              className="input-field text-lg"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            className="btn-primary text-lg"
          >
            Sign Up
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setView('login')}
            className="text-sm text-gray-400 transition-colors"
          >
            Already have an account? Login
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-1">
          {/* main title */}
          <h1 className="text-5xl font-serif font-bold tracking-tight home-title">KitchIndex</h1>
          {/* welcome message */}
          {user && (
            <h2 className="text-2xl font-sans font-medium text-gray-600 home-welcome">
              Welcome back, {user.name}
            </h2>
          )}
          <p className="italic text-gray-600">Smart shopping, simplified.</p>
        </div>

        <div className="grid gap-4">
          <button 
            onClick={() => setView('input')}
            className="home-btn"
          >
            <div className="flex items-center gap-4">
              <div className="icon-box" style={{ backgroundColor: 'var(--accent-color)', color: 'var(--white)' }}>
                <Plus size={24} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">Input New List</p>
                <p className="text-sm text-gray-500">Camera, Link, or Manual</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => setView('calendar')}
            className="home-btn"
          >
            <div className="flex items-center gap-4">
              <div className="icon-box text-amber-600" style={{ backgroundColor: '#fffbeb' }}>
                <CalendarIcon size={24} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">Meal Calendar</p>
                <p className="text-sm text-gray-500">Plan your week</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => {
              fetchLists();
              setView('history');
              }}
            className="home-btn"
          >
            <div className="flex items-center gap-4">
              <div className="icon-box text-gray-600" style={{ backgroundColor: 'var(--gray-100)' }}>
                <History size={24} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">View History</p>
                <p className="text-sm text-gray-500">Access saved lists</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => {
              setUser(null);
              setView('login');
            }}
            className="home-btn"
          >
            <div className="flex items-center gap-4">
              <div className="icon-box text-gray-600" style={{ backgroundColor: 'var(--gray-100)' }}>
                <LogOut size={24} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">Log Out</p>
                <p className="text-sm text-gray-500">Switch account</p>
              </div>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderInput = () => (
    <div className="min-h-screen p-6">
      <div className="max-w-md mx-auto space-y-6">
        <button onClick={() => setView('home')} 
        className="flex items-center gap-2 font-medium text-lg"
        style={{ color: 'var(--accent-color)' }}>
        <ChevronLeft size={20} /> Back to Home
        </button>
        
        <h2 className="text-3xl font-serif font-bold">Create New List</h2>
        
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <p className="font-semibold text-gray-700 uppercase text-xs tracking-wider">Choose Input Method</p>
            <div className="grid grid-cols-3 gap-4">
              <button className="flex flex-col items-center gap-2 p-4 rounded-2xl hover-bg-gray-50">
                <div className="icon-box text-blue-600" style={{ backgroundColor: '#eff6ff' }}><Camera size={24} /></div>
                <span className="text-xs font-medium">Photo</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 rounded-2xl hover-bg-gray-50">
                <div className="icon-box text-green-600" style={{ backgroundColor: '#f0fdf4' }}><LinkIcon size={24} /></div>
                <span className="text-xs font-medium">Link</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 rounded-2xl" style={{ backgroundColor: 'var(--gray-50)' }}>
                <div className="icon-box text-gray-700" style={{ backgroundColor: 'var(--gray-200)' }}><Type size={24} /></div>
                <span className="text-xs font-medium">Manual</span>
              </button>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <textarea 
              placeholder="Enter items (e.g. 2 Apples, Milk, Bread)..."
              className="w-full h-40 p-4 rounded-2xl border-none focus-ring-2 resize-none text-lg"
              style={{ backgroundColor: 'var(--gray-50)' }}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
            />
            <button 
              disabled={!manualInput.trim() || loading}
              onClick={() => {
                const items = manualInput.split('\n').filter(i => i.trim()).map(name => ({ name }));
                handleCreateList("New Grocery List", items);
              }}
              className="btn-primary"
            >
              {loading ? 'Processing...' : 'Generate List'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderListView = () => {
    if (!currentList) return null;
    const totalItems = currentList.items?.length || 0;
    const checkedItems = currentList.items?.filter(i => i.is_checked).length || 0;

    return (
      <div className="min-h-screen pb-24">
        <div className="sticky-header">
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('home')} className="p-2 icon-box hover-bg-gray-100 text-lg" style={{ borderRadius: '9999px' }}>
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold">{currentList.title}</h2>
              <button 
                onClick={() => handleDeleteList(currentList.id)}
                className="p-2 icon-box text-red-500 hover-bg-gray-100" 
                style={{ borderRadius: '9999px' }}
              >
                <Trash2 size={20} />
              </button>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: 'var(--gray-50)' }}>
              <div className="flex-1">
                <div className="progress-bar">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: totalItems > 0 ? `${(checkedItems / totalItems) * 100}%` : '0%' }}
                    className="progress-fill"
                  />
                </div>
                <p className="text-xs mt-2 text-gray-500 font-medium uppercase tracking-wider">
                  {checkedItems} of {totalItems} items collected
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-bold">Est. Total</p>
                <p className="text-lg font-bold" style={{ color: 'var(--accent-color)' }}>$24.50</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto p-6 space-y-3">
          <AnimatePresence>
            {currentList.items?.map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => toggleItem(item.id, item.is_checked)}
                className={`list-item cursor-pointer ${item.is_checked ? 'checked' : ''}`}
              >
                <div className="flex items-center gap-4">
                  {item.is_checked ? (
                    <CheckCircle2 style={{ color: 'var(--accent-color)' }} size={24} />
                  ) : (
                    <Circle className="text-gray-300" size={24} />
                  )}
                  <div>
                    <p className={`font-semibold ${item.is_checked ? 'line-through text-gray-500' : ''}`}>
                      {item.name}
                    </p>
                    {item.quantity && <p className="text-xs text-gray-400">{item.quantity}</p>}
                  </div>
                </div>
                {!item.is_checked && <p className="font-mono text-sm text-gray-400">$2.99</p>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>


      </div>
    );
  };

  const renderHistory = () => (
    <div className="min-h-screen p-6">
      <div className="max-w-md mx-auto space-y-6">
        <button onClick={() => setView('home')} className="flex items-center gap-2 font-medium text-lg" style={{ color: 'var(--accent-color)' }}>
          <ChevronLeft size={20} /> Back to Home
        </button>
        <h2 className="text-3xl font-serif font-bold">History</h2>
        
        <div className="space-y-4">
          {lists.map(list => (
            <button 
              key={list.id}
              onClick={async () => {
                const res = await fetch(`/api/lists/${list.id}`);
                const data = await res.json();
                setCurrentList(data);
                setView('list');
              }}
              className="w-full flex items-center justify-between p-6 card text-left"
              style={{ borderRadius: '1.5rem' }}
            >
              <div>
                <p className="font-bold text-lg">{list.title}</p>
                <p className="text-sm text-gray-400">{new Date(list.created_at).toLocaleDateString()}</p>
              </div>
              <ChevronLeft size={20} style={{ transform: 'rotate(180deg)', color: 'var(--gray-300)' }} />
            </button>
          ))}
          {lists.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <History size={48} className="mx-auto mb-4" style={{ opacity: 0.2 }} />
              <p>No saved lists yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );



  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {view === 'login' && <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderLogin()}</motion.div>}
        {view === 'signup' && <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderSignup()}</motion.div>}
        {view === 'home' && <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderHome()}</motion.div>}
        {view === 'input' && <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderInput()}</motion.div>}
        {view === 'list' && <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderListView()}</motion.div>}
        {view === 'history' && <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderHistory()}</motion.div>}
        {view === 'calendar' && <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Calendar onBack={() => setView('home')} /></motion.div>}
      </AnimatePresence>
    </div>
  );
}