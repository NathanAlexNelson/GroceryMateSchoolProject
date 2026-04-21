import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

// Global Constants
const DEFAULT_QUERIES = ['chicken', 'fish', 'pasta', 'salad', 'soup'];
const APP_ID = '328481a6';
const APP_KEY = 'ad04286762a9099eca68fc0f86ebd9bc';
const EDAMAN_USER = 'grocery-mate-user';

/*
    pad2: Adds a 0 in front of a single digit number to make it a double digit number
    makeDateKey: Takes 3 values and generate a date format: 'YYYY-MM-DD'
*/
const pad2 = n => String(n).padStart(2, '0');
const makeDateKey = (y, mZeroBased, d) => `${y}-${pad2(mZeroBased + 1)}-${pad2(d)}`;

// Calendar
export default function Calendar({ onBack }) {

    // States
    const [calendarDate, setCalendarDate] = useState(() => new Date());
    const [selectedDateKey, setSelectedDateKey] = useState(null);
    const [recipes, setRecipes] = useState([]);
    const [recipesLoading, setRecipesLoading] = useState(false);
    const [recipeSearch, setRecipeSearch] = useState('');
    const [assignedRecipes, setAssignedRecipes] = useState({});
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [draggedRecipe, setDraggedRecipe] = useState(null);
    const [multiSelectedDays, setMultiSelectedDays] = useState([]);
    const [showIngredientPopup, setShowIngredientPopup] = useState(false);
    const [popupIngredients, setPopupIngredients]       = useState({});
    const [customRecipes, setCustomRecipes] = useState([]);
    const [selectedCustomRecipe, setSelectedCustomRecipe] = useState(null);
    const [activeTag, setActiveTag] = useState('All');

    /*
        Puts a random ingredient string into fetchRecipe() to generate a different list
        when the app is open. Generates a random number, multiplies it, and rounds down
        and that is the index
    */
    useEffect(() => {
        const random = DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)];
        fetchRecipes(random);
    }, []);

    useEffect(() => {
        const fetchCustomRecipes = async () => {
            try {
                const res = await fetch('/api/custom-recipes');
                const data = await res.json();
                setCustomRecipes(data);
            } catch (e) {
                console.error('Failed to fetch custom recipes', e);
            }
        };
        fetchCustomRecipes();
    }, []);

    // Calendar variables
    const year        = calendarDate.getFullYear();
    const month       = calendarDate.getMonth();
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName   = calendarDate.toLocaleString('default', { month: 'long' });
    const today       = new Date();
    const todayKey    = makeDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    const allTags = ['All', ...new Set(customRecipes.flatMap(r => r.tags))];
    const filteredCustomRecipes = activeTag === 'All'
        ? customRecipes
        : customRecipes.filter(r => r.tags.includes(activeTag));
    console.log('activeTag:', activeTag, 'filtered:', filteredCustomRecipes);

    const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));

    // Api call to fetch recipes
    const fetchRecipes = async (query = 'chicken') => {
        setRecipesLoading(true);
        setRecipes([]);
        try {
            const res = await fetch(
                `https://api.edamam.com/api/recipes/v2?type=public&q=${query}&app_id=${APP_ID}&app_key=${APP_KEY}`,
                {
                    headers: {
                        'Edamam-Account-User': EDAMAN_USER
                    }
                }
            );
            const data = await res.json();
            setRecipes(data.hits || []);
        } catch (e) {
            console.error("Failed to fetch recipes", e);
        } finally {
            setRecipesLoading(false);
        }
    };

    // Handles
    const handleDayClick = (e, key) => {
        if (e.shiftKey) {
            setMultiSelectedDays(prev =>
                prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
            );
        } else {
            setMultiSelectedDays([key]);
        }
    };

    const handleDrop = (e, key) => {
        e.preventDefault();
        if (draggedRecipe) {
            setAssignedRecipes(prev => ({ ...prev, [key]: draggedRecipe }));
            setDraggedRecipe(null);
        }
    };

    const handleRemoveRecipe = (e, key) => {
        e.stopPropagation();
        setAssignedRecipes(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    const handleOpenPopup = () => {
        const grouped = {};

        multiSelectedDays.forEach(dayKey => {
            const recipe = assignedRecipes[dayKey];
            if (!recipe?.ingredients) return;

            recipe.ingredients.forEach(ingredient => {
                const food     = ingredient.food;
                const quantity = ingredient.quantity || 0;
                const measure  = ingredient.measure  || null;

                if (!grouped[food]) {
                    // First time seeing this ingredient — create an entry
                    grouped[food] = { quantity, measure, food };
                } else {
                    // Already seen this ingredient — add to its quantity
                    grouped[food].quantity += quantity;
                }
            });
        });

        setPopupIngredients(grouped);
        setShowIngredientPopup(true);
    };

    const handleSaveList = async () => {
        const items = Object.values(popupIngredients).map(info => {
            if (info.quantity === 0) {
                return {name: info.food }; //use the line as-is e.g. "2 bread"
            }
            const quantityStr = info.quantity % 1 === 0
                ? info.quantity
                : info.quantity.toFixed(2);
            const measureStr = info.measure ? ` ${info.measure}` : '';
            return { name: `${quantityStr}${measureStr} ${info.food}` };
        });

        console.log('Sending items:', items);

        try {
            const res = await fetch('/api/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `Meal Plan - ${multiSelectedDays.join(', ')}`,
                    items
                })
            });

            console.log('Response status:', res.status);

            if (res.ok) {
                alert('List saved successfully!');
                setShowIngredientPopup(false);
                setMultiSelectedDays([]);
            } else {
                const errorData = await res.json();
                console.error('Server error:', errorData);
                alert('Failed to save list. Server returned an error.');
            }
        } catch (e) {
            console.error('Failed to save list', e);
            alert('Failed to save list. Please try again.');
        }
    };

    const handleDeleteCustomRecipe = async (e, id) => {
        e.stopPropagation(); // prevents the card's onClick from firing
        try {
          await fetch(`/api/custom-recipes/${id}`, { method: 'DELETE' });
          setCustomRecipes(prev => prev.filter(r => r.id !== id));
        } catch (e) {
          console.error('Failed to delete custom recipe', e);
        }
    };

    // Calendar days
    const days = [];

    // Empty days before first day
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    // Day buttons
    for (let d = 1; d <= daysInMonth; d++) {
        const key      = makeDateKey(year, month, d);
        const isToday  = key === todayKey;
        const isSelected = key === selectedDateKey;
        const assigned = assignedRecipes[key];

        days.push(
            <button
                type="button"
                key={key}
                onClick={(e) => handleDayClick(e, key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, key)}
                className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${multiSelectedDays.includes(key) ? 'multi-selected' : ''}`}
                style={{
                    position: 'relative',
                    minHeight: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {/* Number on day */}
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

                {/* Recipe assigned to a day */}
                {assigned && (
                    <div
                        style={{
                            marginTop: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }}
                    >
                        {/* X button */}
                        <div
                            onClick={(e) => handleRemoveRecipe(e, key)}
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
                        {assigned.image ? (
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
                        ) : (
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--gray-100)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px'
                            }}>
                                📄
                            </div>
                        )}
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
        <>
            {/* Main Screen */}
            <div className="min-h-screen p-8">
                <div className="mx-auto space-y-6" style={{ maxWidth: '1600px' }}>

                    {/* Back to home button */}
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 font-medium text-lg"
                        style={{ color: 'var(--accent-color)' }}
                    >
                        <ChevronLeft size={20} /> Back to Home
                    </button>

                    {/* Month prev next buttons */}
                    <div className="flex items-center justify-between">
                        <button onClick={prevMonth} className="text-4xl hover:opacity-70 transition-opacity px-4">&lt;</button>
                        <h2 className="text-5xl font-serif font-bold">{monthName} {year}</h2>
                        <button onClick={nextMonth} className="text-4xl hover:opacity-70 transition-opacity px-4">&gt;</button>
                    </div>

                    {/* Calendar and Recipe List */}
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

                        {/* Calendar Grid */}
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

                        {/* Add to List Button */}
                        {multiSelectedDays.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    position: 'fixed',
                                    bottom: '32px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 100
                                }}
                            >
                                <button
                                    onClick={handleOpenPopup}
                                    style={{
                                        backgroundColor: 'var(--accent-color)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '999px',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        padding: '14px 32px',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    Add {multiSelectedDays.length} {multiSelectedDays.length === 1 ? 'Day' : 'Days'} to List
                                </button>
                            </motion.div>
                        )}

                        {/* Recipe List */}
                        <div
                            className="card p-6 space-y-4"
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'var(--accent-color) transparent',
                                flex: '0 0 28%',
                                maxHeight: '87vh',
                                minHeight: '80vh',
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                borderRadius: '24px',
                                clipPath: 'inset(0 round 24px)'
                            }}
                        >
                            <h3 className="font-serif font-bold text-xl" style={{ textAlign: 'center' }}>Recipes</h3>

                            {/* My Recipes Section */}
                            {customRecipes.length > 0 && (
                                <div className="space-y-3">
                                <p className="text-xs font-bold uppercase text-gray-400 tracking-wider px-1">
                                  My Recipes
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                  {allTags.map(tag => (
                                    <button
                                      key={tag}
                                      onClick={() => setActiveTag(tag)}
                                      style={{
                                        padding: '4px 10px', borderRadius: '999px',
                                        fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                                        border: 'none',
                                        backgroundColor: activeTag === tag ? 'var(--accent-color)' : 'var(--gray-200)',
                                        color: activeTag === tag ? 'white' : 'var(--text-color)'
                                      }}
                                    >{tag}</button>
                                  ))}
                                </div>
                                {filteredCustomRecipes.map((recipe, idx) => (
                                        <div
                                          key={idx}
                                          draggable
                                          onDragStart={() => setDraggedRecipe({
                                            label: recipe.label,
                                            image: null,
                                            ingredientLines: recipe.ingredientLines,
                                            ingredients: recipe.ingredientLines.map(line => ({
                                              food: line,
                                              quantity: 0,
                                              measure: null
                                            }))
                                          })}
                                          onClick={() => setSelectedCustomRecipe(selectedCustomRecipe === idx ? null : idx)}
                                          className="card p-3 cursor-pointer transition-all"
                                          style={{
                                            position: 'relative',
                                            borderRadius: '16px',
                                            border: selectedCustomRecipe === idx ? '2px solid var(--accent-color)' : '2px solid transparent',
                                            cursor: 'grab',
                                            backgroundColor: 'white',
                                            boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.25)'
                                          }}
                                        >
                                            <div
                                                onClick={(e) => handleDeleteCustomRecipe(e, recipe.id)}
                                                style={{
                                                  position: 'absolute',
                                                  top: '8px',
                                                  right: '8px',
                                                  width: '18px',
                                                  height: '18px',
                                                  borderRadius: '50%',
                                                  backgroundColor: 'var(--gray-300)',
                                                  color: 'white',
                                                  fontSize: '10px',
                                                  fontWeight: 'bold',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  cursor: 'pointer',
                                                  zIndex: 10
                                                }}
                                            >
    ✕
  </div>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px' }}>
                                            {/* Placeholder icon since there's no image */}
                                            <div
                                                style={{
                                                    width: '56px',
                                                    height: '56px',
                                                    borderRadius: '12px',
                                                    backgroundColor: 'var(--gray-100)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    fontSize: '24px'
                                                }}
                                            >
                                                📄
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p className="font-semibold text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {recipe.label}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {recipe.ingredientLines.length} ingredients
                                                </p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                                  {recipe.tags.map((tag, i) => (
                                                    <span key={i} style={{
                                                      padding: '2px 8px', borderRadius: '999px',
                                                      fontSize: '10px', fontWeight: '600',
                                                      backgroundColor: 'var(--gray-100)',
                                                      color: 'var(--accent-color)'
                                                    }}>{tag}</span>
                                                  ))}
                                                </div>
                                                {selectedCustomRecipe === idx && (
                                                    <motion.div
                                                      initial={{ opacity: 0, height: 0 }}
                                                      animate={{ opacity: 1, height: 'auto' }}
                                                      className="space-y-1"
                                                      style={{
                                                        marginTop: '12px',
                                                        paddingTop: '12px',
                                                        borderTop: '1px solid var(--gray-100)',
                                                        textAlign: 'center'
                                                      }}
                                                    >
                                                      <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                                                        Ingredients
                                                      </p>
                                                      {recipe.ingredientLines.map((line, i) => (
                                                        <p key={i} className="text-xs text-gray-600">• {line}</p>
                                                      ))}
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* Divider between My Recipes and Edamam */}
                                <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: '8px', paddingTop: '8px' }}>
                                    <p className="text-xs font-bold uppercase text-gray-400 tracking-wider px-1">
                                        Edamam Recipes
                                    </p>
                                </div>
                                </div>
                            )}

                            {/* Recipe search input */}
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

                            {/* Loading */}
                            {recipesLoading && (
                                <p className="text-sm text-gray-400 text-center py-8">Loading recipes...</p>
                            )}

                            {/* Recipe cards in recipe list */}
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
                                                    url: meal.url,
                                                    ingredients: meal.ingredients,
                                                    ingredientLines: meal.ingredientLines
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

                                                {/* Expanded recipe cards */}
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

                            {/* Empty state */}
                            {!recipesLoading && recipes.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-8">No recipes found.</p>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* Ingredient popup */}
            {showIngredientPopup && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'fixed',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 200,
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card p-8"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '480px',
                            maxHeight: '70vh',
                            borderRadius: '24px',
                            backgroundColor: 'white'
                        }}
                    >
                        {/* Header for popup */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                        }}>
                            <h3 className="font-serif font-bold text-xl">Ingredients List</h3>
                            <div
                                onClick={() => setShowIngredientPopup(false)}
                                style={{
                                    display: 'flex',
                                    width: '28px',
                                    height: '28px',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--gray-100)',
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                }}
                            >
                                X
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold" style={{ marginBottom: '12px' }}>
                            {multiSelectedDays.length} {multiSelectedDays.length === 1 ? 'day' : 'days'} selected
                        </p>

                        {/* List of Ingredients */}
                        <div style={{
                            overflowY: 'auto',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'var(--accent-color) transparent',
                            flex: 1,
                            paddingRight: '8px'
                        }}>
                            {Object.entries(popupIngredients).length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-8">
                                    No ingredients found. Check your selected days have recipes.
                                </p>
                            ) : (
                                Object.entries(popupIngredients).map(([food, info], idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            padding: '10px 0',
                                            borderBottom: '1px solid var(--gray-100)'
                                        }}
                                    >
                                        <p className="text-sm font-medium">• {info.food}</p>
                                        <p className="text-xs text-gray-400" style={{ marginLeft: '12px', whiteSpace: 'nowrap' }}>
                                            {info.quantity === 0 
                                                ? ''
                                                : `${info.quantity % 1 === 0 ? info.quantity : info.quantity.toFixed(2)}${info.measure ? ` ${info.measure}` : ''}`
                                            }
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Save Cancel Button */}
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginTop: '20px'
                        }}>
                            <button
                                onClick={() => {
                                    setShowIngredientPopup(false);
                                    setMultiSelectedDays([]);
                                }}
                                style={{
                                    flex: 1,
                                    cursor: 'pointer',
                                    padding: '12px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    border: '2px solid var(--gray-200)',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveList}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    backgroundColor: 'var(--accent-color)',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Save List
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </>
    );
}