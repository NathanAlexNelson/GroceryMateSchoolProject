/*
  Shared recipe search + ingredient extraction utility.

  Works in both Node (require) and browser (global `RecipeScraper`).
*/

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RecipeScraper = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const envAppId = typeof process !== 'undefined' && process.env ? process.env.EDAMAM_APP_ID : undefined;
  const envAppKey = typeof process !== 'undefined' && process.env ? process.env.EDAMAM_APP_KEY : undefined;

  const appId = envAppId || '328481a6';
  const appKey = envAppKey || 'ad04286762a9099eca68fc0f86ebd9bc';

  const inNode = typeof process !== 'undefined' && process.versions && process.versions.node;

  const cache = new Map();

  async function fetchJson(url) {
    if (inNode) {
      const axios = require('axios');
      const response = await axios.get(url, {
        headers: {
          'Edamam-Account-User': 'grocery-mate-user',
        },
      });
      return response.data;
    }

    const response = await fetch(url, {
      headers: {
        'Edamam-Account-User': 'grocery-mate-user',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Edamam API error ${response.status}: ${body}`);
    }

    return await response.json();
  }

  async function searchRecipes(recipeName) {
    if (!recipeName || !recipeName.trim()) {
      throw new Error('recipeName is required');
    }

    if (cache.has(recipeName)) {
      return cache.get(recipeName);
    }

    const url = 'https://api.edamam.com/api/recipes/v2';
    const params = new URLSearchParams({
      type: 'public',
      q: recipeName,
      app_id: appId,
      app_key: appKey,
    });

    const data = await fetchJson(`${url}?${params.toString()}`);
    const hits = data.hits || [];
    cache.set(recipeName, hits);
    return hits;
  }

  function getRecipeIngredients(recipeOrHit) {
    const recipe = recipeOrHit?.recipe ?? recipeOrHit;
    if (!recipe || !Array.isArray(recipe.ingredients)) return [];

    return recipe.ingredients.map((ing) => ({
      name: ing.food,
      amount: ing.quantity,
      unit: ing.measure,
    }));
  }

  async function getFirstRecipeForName(recipeName) {
    const hits = await searchRecipes(recipeName);
    return hits[0]?.recipe ?? null;
  }

  async function getGroceryListForRecipeName(recipeName) {
    const recipe = await getFirstRecipeForName(recipeName);
    if (!recipe) return { recipe: null, ingredients: [] };

    return {
      recipe,
      ingredients: getRecipeIngredients(recipe),
    };
  }

  // Allow running as a simple CLI tool when executed with node
  if (inNode && require.main === module) {
    (async () => {
      const query = process.argv.slice(2).join(' ');
      if (!query) {
        console.error('Usage: node recipeScraper.js <recipe name>');
        process.exit(1);
      }

      try {
        const list = await getGroceryListForRecipeName(query);
        console.log(JSON.stringify(list, null, 2));
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    })();
  }

  return {
    searchRecipes,
    getRecipeIngredients,
    getFirstRecipeForName,
    getGroceryListForRecipeName,
  };
});
