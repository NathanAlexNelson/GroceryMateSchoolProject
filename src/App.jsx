import React, { useState, useEffect, useRef } from 'react';
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
  Calendar as CalendarIcon,
  Download,
  X,
  Pencil,
  Check
} from 'lucide-react';
import Calendar from './components/Calendar';
import {runOCR } from './components/ocr';

export default function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [lists, setLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrDraftText, setOcrDraftText] = useState('');
  const [ocrDraftLabel, setOcrDraftLabel] = useState('');
  const [ocrDraftTags, setOcrDraftTags] = useState([]);
  const [ocrTagInput, setOcrTagInput] = useState('');

  // Editable input list state
  const [parsedItems, setParsedItems] = useState([]);
  const [listTitle, setListTitle] = useState('New Grocery List');
  const [editingItemIdx, setEditingItemIdx] = useState(null);
  const [editingItemValue, setEditingItemValue] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) fetchLists();
  }, [user]);

  // Parse manual input into item list whenever it changes
  useEffect(() => {
    const items = manualInput
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    setParsedItems(items);
  }, [manualInput]);

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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrProgress(0);

    try {
      const text = await runOCR(file, (m) => {
        if (m.status === 'recognizing text') {
          setOcrProgress(Math.round(m.progress * 100));
        }
      });

      const lines = text.split('\n').filter(line => line.trim());
      const label = file.name.replace(/\.[^/.]+$/, '');

      setOcrDraftText(lines.join('\n'));
      setOcrDraftLabel(label);
      setShowOcrModal(true);

    } catch (e) {
      console.error('OCR failed', e);
      alert('Failed to process image. Please try again.');
    } finally {
      setOcrLoading(false);
      setOcrProgress(0);
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && ocrTagInput.trim()) {
      if (!ocrDraftTags.includes(ocrTagInput.trim())) {
        setOcrDraftTags(prev => [...prev, ocrTagInput.trim()]);
      }
      setOcrTagInput('');
    }
  };

  const handleSaveCustomRecipe = async () => {
    const ingredientLines = ocrDraftText.split('\n').filter(line => line.trim());

    try {
      await fetch('/api/custom-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: ocrDraftLabel,
          ingredientLines,
          tags: ocrDraftTags
        })
      });

      alert(`Recipe "${ocrDraftLabel}" saved! Find it in the Calendar sidebar.`);
      setShowOcrModal(false);
      setOcrDraftText('');
      setOcrDraftLabel('');
      setOcrDraftTags([]);
      setOcrTagInput('');

    } catch (e) {
      console.error('Failed to save custom recipe', e);
      alert('Failed to save recipe. Please try again.');
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
      await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
      setLists(prev => prev.filter(list => list.id !== listId));
      setCurrentList(null);
      setView('history');
    } catch (e) {
      console.error("Failed to delete list", e);
    }
  };

  // ── Export list as .txt ──────────────────────────────────────────────────────
  const handleExportTxt = () => {
    if (!currentList) return;
    const lines = [
      currentList.title,
      '─'.repeat(40),
      '',
      ...(currentList.items?.map(item => {
        const check = item.is_checked ? '[x]' : '[ ]';
        const qty = item.quantity ? ` (${item.quantity})` : '';
        return `${check} ${item.name}${qty}`;
      }) || []),
      '',
      `─`.repeat(40),
      `Exported: ${new Date().toLocaleDateString()}`
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentList.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Parsed item editing helpers ──────────────────────────────────────────────
  const startEditItem = (idx) => {
    setEditingItemIdx(idx);
    setEditingItemValue(parsedItems[idx]);
  };

  const commitEditItem = (idx) => {
    const updated = [...parsedItems];
    if (editingItemValue.trim()) {
      updated[idx] = editingItemValue.trim();
    } else {
      updated.splice(idx, 1);
    }
    setParsedItems(updated);
    setManualInput(updated.join('\n'));
    setEditingItemIdx(null);
    setEditingItemValue('');
  };

  const removeItem = (idx) => {
    const updated = parsedItems.filter((_, i) => i !== idx);
    setParsedItems(updated);
    setManualInput(updated.join('\n'));
  };

  const addBlankItem = () => {
    const updated = [...parsedItems, ''];
    setParsedItems(updated);
    setManualInput(updated.join('\n'));
    // Auto-open edit for the new blank item
    setEditingItemIdx(updated.length - 1);
    setEditingItemValue('');
  };

  // ─────────────────────────────────────────────────────────────────────────────

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
              type="text" required className="input-field text-lg"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-4">Password</label>
            <input 
              type="password" required className="input-field text-lg"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          </div>
          <button type="submit" className="btn-primary text-lg">Login</button>
        </form>

        <div className="text-center">
          <button onClick={() => setView('signup')} className="text-sm text-gray-400 transition-colors">
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
            <input type="text" required className="input-field text-lg"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-4">Email</label>
            <input type="email" required className="input-field text-lg" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-4">Password</label>
            <input type="password" required className="input-field text-lg"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          </div>
          <button type="submit" className="btn-primary text-lg">Sign Up</button>
        </form>

        <div className="text-center">
          <button onClick={() => setView('login')} className="text-sm text-gray-400 transition-colors">
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
          <h1 className="text-5xl font-serif font-bold tracking-tight home-title">KitchIndex</h1>
          {user && (
            <h2 className="text-2xl font-sans font-medium text-gray-600 home-welcome">
              Welcome back, {user.name}
            </h2>
          )}
          <p className="italic text-gray-600">Smart shopping, simplified.</p>
        </div>

        <div className="grid gap-4">
          <button onClick={() => setView('input')} className="home-btn">
            <div className="flex items-center gap-4">
              <div className="icon-box" style={{ backgroundColor: 'var(--accent-color)', color: 'var(--white)' }}>
                <Plus size={24} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">Upload Groceries</p>
                <p className="text-sm text-gray-500">Photo, Text</p>
              </div>
            </div>
          </button>

          <button onClick={() => setView('calendar')} className="home-btn">
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

          <button onClick={() => { setUser(null); setView('login'); }} className="home-btn">
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
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-2 font-medium text-lg"
          style={{ color: 'var(--accent-color)' }}
        >
          <ChevronLeft size={20} /> Back to Home
        </button>

        <h2 className="text-3xl font-serif font-bold">Create New List</h2>

        {/* ── List title ──────────────────────────────────────────────── */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">List Name</label>
          <input
            type="text"
            className="input-field text-lg"
            value={listTitle}
            onChange={e => setListTitle(e.target.value)}
            placeholder="e.g. Weekly Haul"
          />
        </div>

        <div className="space-y-4">
          {/* ── Input method selector ────────────────────────────────── */}
          <div className="card p-6 space-y-4">
            <p className="font-semibold text-gray-700 uppercase text-xs tracking-wider">Choose Input Method</p>
            <div className="flex justify-center gap-4">
              <label className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-gray-50 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                />
                <div className="icon-box text-blue-600" style={{ backgroundColor: '#eff6ff' }}>
                  {ocrLoading ? <span className="text-xs font-bold">{ocrProgress}%</span> : <Camera size={24} />}
                </div>
                <span className="text-xs font-medium">{ocrLoading ? 'Reading...' : 'Photo'}</span>
              </label>

              <button className="flex flex-col items-center gap-2 p-4 rounded-2xl" style={{ backgroundColor: 'var(--gray-50)' }}>
                <div className="icon-box text-gray-700" style={{ backgroundColor: 'var(--gray-200)' }}><Type size={24} /></div>
                <span className="text-xs font-medium">Manual</span>
              </button>
            </div>
          </div>

          {/* ── Raw textarea ─────────────────────────────────────────── */}
          <div className="card p-6 space-y-3">
            <p className="font-semibold text-gray-700 uppercase text-xs tracking-wider">Type Items</p>
            <textarea
              placeholder="Enter items (one per line, e.g.&#10;2 Apples&#10;Milk&#10;Bread)..."
              className="w-full h-32 p-4 rounded-2xl border-none resize-none text-sm"
              style={{ backgroundColor: 'var(--gray-50)' }}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
            />
          </div>

          {/* ── Editable parsed item list ─────────────────────────────── */}
          {parsedItems.length > 0 && (
            <div className="card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-700 uppercase text-xs tracking-wider">
                  Review & Adjust ({parsedItems.length} item{parsedItems.length !== 1 ? 's' : ''})
                </p>
                <button
                  onClick={addBlankItem}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>

              <AnimatePresence>
                {parsedItems.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 p-3 rounded-2xl"
                    style={{ backgroundColor: 'var(--gray-50)' }}
                  >
                    {editingItemIdx === idx ? (
                      <>
                        <input
                          autoFocus
                          className="flex-1 bg-white rounded-xl px-3 py-1 text-sm border-none outline-none"
                          style={{ border: '2px solid var(--accent-color)' }}
                          value={editingItemValue}
                          onChange={e => setEditingItemValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEditItem(idx);
                            if (e.key === 'Escape') { setEditingItemIdx(null); setEditingItemValue(''); }
                          }}
                        />
                        <button
                          onClick={() => commitEditItem(idx)}
                          className="p-1 rounded-full"
                          style={{ color: 'var(--accent-color)' }}
                        >
                          <Check size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium truncate">{item || <span className="text-gray-400 italic">empty</span>}</span>
                        <button onClick={() => startEditItem(idx)} className="p-1 text-gray-400 hover:text-gray-700">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600">
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* ── Generate button ───────────────────────────────────────── */}
          <button
            disabled={parsedItems.length === 0 || loading}
            onClick={() => {
              const items = parsedItems.filter(Boolean).map(name => ({ name }));
              handleCreateList(listTitle || 'New Grocery List', items);
            }}
            className="btn-primary"
          >
            {loading ? 'Processing...' : `Generate List (${parsedItems.filter(Boolean).length} items)`}
          </button>
        </div>
      </div>

      {/* ── OCR Modal ─────────────────────────────────────────────────────────── */}
      {showOcrModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div className="card p-8" style={{
            width: '480px', maxHeight: '80vh', borderRadius: '24px',
            backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <h3 className="font-serif font-bold text-xl">Review Recipe</h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Recipe Name</label>
              <input type="text" className="input-field"
                value={ocrDraftLabel} onChange={e => setOcrDraftLabel(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Ingredients (one per line)</label>
              <textarea
                className="w-full p-4 rounded-2xl resize-none text-sm"
                style={{ backgroundColor: 'var(--gray-50)', height: '240px', border: 'none' }}
                value={ocrDraftText}
                onChange={e => setOcrDraftText(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Tags</label>
              <input type="text" placeholder="Type a tag and press Enter..."
                className="input-field text-sm"
                value={ocrTagInput}
                onChange={e => setOcrTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {ocrDraftTags.map((tag, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: '999px',
                    backgroundColor: 'var(--accent-color)', color: 'white',
                    fontSize: '12px', fontWeight: '600'
                  }}>
                    {tag}
                    <span onClick={() => setOcrDraftTags(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ cursor: 'pointer', fontWeight: 'bold' }}>✕</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => {
                setShowOcrModal(false); setOcrDraftText('');
                setOcrDraftLabel(''); setOcrDraftTags([]); setOcrTagInput('');
              }} style={{
                flex: 1, padding: '12px', borderRadius: '12px',
                border: '2px solid var(--gray-200)', fontWeight: '600', fontSize: '14px',
                backgroundColor: 'white', cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={handleSaveCustomRecipe} style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                fontWeight: '600', fontSize: '14px',
                backgroundColor: 'var(--accent-color)', color: 'white', cursor: 'pointer'
              }}>Save Recipe Card</button>
            </div>
          </div>
        </div>
      )}
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
              <div className="flex items-center gap-1">
                {/* ── Export .txt button ── */}
                <button
                  onClick={handleExportTxt}
                  title="Export as .txt"
                  className="p-2 icon-box text-gray-500 hover-bg-gray-100"
                  style={{ borderRadius: '9999px' }}
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={() => handleDeleteList(currentList.id)}
                  className="p-2 icon-box text-red-500 hover-bg-gray-100"
                  style={{ borderRadius: '9999px' }}
                >
                  <Trash2 size={20} />
                </button>
              </div>
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

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {view === 'login' && <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderLogin()}</motion.div>}
        {view === 'signup' && <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderSignup()}</motion.div>}
        {view === 'home' && <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderHome()}</motion.div>}
        {view === 'input' && <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderInput()}</motion.div>}
        {view === 'list' && <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderListView()}</motion.div>}
        {view === 'calendar' && <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Calendar onBack={() => setView('home')} /></motion.div>}
      </AnimatePresence>
    </div>
  );
}
