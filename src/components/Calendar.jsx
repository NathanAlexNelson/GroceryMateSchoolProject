import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

export default function Calendar({ onBack }) {

  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [assignedRecipes, setAssignedRecipes] = useState({});
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [draggedRecipe, setDraggedRecipe] = useState(null);

  useEffect(() => {
    const defaultQueries = ['chicken', 'fish', 'pasta', 'salad', 'soup'];
    const random = defaultQueries[Math.floor(Math.random() * defaultQueries.length)];
    fetchRecipes(random);
  }, []);

  const pad2 = n => String(n).padStart(2, '0');
  const makeDateKey = (y, mZeroBased, d) => `${y}-${pad2(mZeroBased + 1)}-${pad2(d)}`;

  const fetchRecipes = async (query = 'chicken') => {
    setRecipesLoading(true);
    setRecipes([]);
    try {
      const res = await fetch(
        `https://api.edamam.com/api/recipes/v2?type=public&q=${query}&app_id=328481a6&app_key=ad04286762a9099eca68fc0f86ebd9bc`,
        {
          headers: {
            'Edamam-Account-User': 'grocery-mate-user'
          }
        }
      );
      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("API response:", data);
      setRecipes(data.hits || []);
    } catch (e) {
      console.error("Failed to fetch recipes", e);
    } finally {
      setRecipesLoading(false);
    }
  };

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = calendarDate.toLocaleString('default', { month: 'long' });

  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));

  const today = new Date();
  const todayKey = makeDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = makeDateKey(year, month, d);
    const isToday = key === todayKey;
    const isSelected = key === selectedDateKey;
    const assigned = assignedRecipes[key];

    days.push(
      <button
        type="button"
        key={key}
        onClick={() => setSelectedDateKey(key)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedRecipe) {
            setAssignedRecipes(prev => ({ ...prev, [key]: draggedRecipe }));
            setDraggedRecipe(null);
          }
        }}
        className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          minHeight: '60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span
          className="text-sm font-medium"
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            color: isSelected ? 'var(--accent-color)' : 'var(--gray-400)'
          }}
        >
          {d}
        </span>
        {assigned && (
          <div style={{
            marginTop: '6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>

            {/* X button */}
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setAssignedRecipes(prev => {
                        const updated = { ...prev };
                        delete updated[key];
                        return updated;
                    });
                }}
                style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'grey',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center', 
                    lineHeight: 1
                }}
            >
                X
            </div>

            <img
              src={assigned.image}
              alt={assigned.label}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '8px',
                objectFit: 'cover',
                margin: '0 auto',
                display: 'block'
              }}
            />
            <p style={{
              fontSize: '9px',
              color: 'var(--accent-color)',
              fontWeight: '600',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              textAlign: 'center',
              marginTop: '4px'
            }}>
              {assigned.label}
            </p>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto space-y-6" style={{ maxWidth: '1600px' }}>

        <button
          onClick={onBack}
          className="flex items-center gap-2 font-medium text-lg"
          style={{ color: 'var(--accent-color)' }}
        >
          <ChevronLeft size={20} /> Back to Home
        </button>

        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="text-4xl hover:opacity-70 transition-opacity px-4">&lt;</button>
          <h2 className="text-5xl font-serif font-bold">{monthName} {year}</h2>
          <button onClick={nextMonth} className="text-4xl hover:opacity-70 transition-opacity px-4">&gt;</button>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

          <div className="card p-8" style={{ flex: '0 0 70%' }}>
            <div className="grid grid-cols-7 gap-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-bold text-gray-400 uppercase text-xs tracking-widest pb-3">
                  {day}
                </div>
              ))}
              {days}
            </div>
          </div>

          <div
            className="card p-6 space-y-4 overflow-y-auto"
            style={{
              flex: '0 0 28%',
              maxHeight: '87vh',
              minHeight: '80vh',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >
            <h3 className="font-serif font-bold text-xl" style={{ textAlign: 'center' }}>Recipes</h3>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search recipes..."
                className="input-field text-sm flex-1"
                style={{ flex: '0 0 70%' }}
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchRecipes(recipeSearch);
                }}
              />
              <button
                onClick={() => fetchRecipes(recipeSearch)}
                style={{
                  flex: '0 0 20%',
                  backgroundColor: 'var(--accent-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px 0',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                Search
              </button>
            </div>

            <p className="text-xs text-gray-400" style={{ paddingLeft: '20px' }}>
              Drag a recipe card onto a calendar day to plan your meal.
            </p>

            {recipesLoading && (
              <p className="text-sm text-gray-400 text-center py-8">Loading recipes...</p>
            )}

            {!recipesLoading && recipes.length > 0 && (
              <div
                className="space-y-3"
                style={{
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  paddingRight: '4px',
                  paddingTop: '8px',
                  paddingLeft: '6px',
                  paddingBottom: '16px'
                }}
              >
                {recipes.map((hit, idx) => {
                  const meal = hit.recipe;
                  const isExpanded = selectedRecipe === idx;
                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => setDraggedRecipe({
                        label: meal.label,
                        image: meal.image,
                        url: meal.url
                      })}
                      onClick={() => setSelectedRecipe(isExpanded ? null : idx)}
                      className="card p-3 cursor-pointer transition-all"
                      style={{
                        borderRadius: '16px',
                        border: isExpanded ? '2px solid var(--accent-color)' : '2px solid transparent',
                        cursor: 'grab',
                        backgroundColor: 'white',
                        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.25)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px' }}>
                        <img
                          src={meal.image}
                          alt={meal.label}
                          style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="font-semibold text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {meal.label}
                          </p>
                          <p className="text-xs text-gray-400">{meal.cuisineType?.[0]}</p>
                          <p className="text-xs font-bold" style={{ color: 'var(--accent-color)' }}>
                            {Math.round(meal.calories / meal.yield)} cal/serving
                          </p>
                        </div>
                      </div>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-1"
                          style={{
                            marginTop: '12px',
                            paddingTop: '12px',
                            paddingBottom: '12px',
                            borderTop: '1px solid var(--gray-100)',
                            textAlign: 'center'
                          }}
                        >
                          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Ingredients</p>
                          {meal.ingredientLines.map((line, i) => (
                            <p key={i} className="text-xs text-gray-600">• {line}</p>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!recipesLoading && recipes.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No recipes found.</p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}