// Get the axios library (for making web requests)
const axios = require('axios');

// Your API credentials - replace with your own
const appId = '328481a6';
const appKey = 'ad04286762a9099eca68fc0f86ebd9bc';

// Search for recipes
async function searchRecipes(recipeName) {
  let url = 'https://api.edamam.com/api/recipes/v2';

  console.log('App ID: ' + appId);
  console.log('App Key: ' + appKey);
  console.log('Making request to: ' + url);

  let response = await axios.get(url, {
    params: {
      type: 'public',
      q: recipeName,
      app_id: appId,
      app_key: appKey,
    },
    headers: {
      'Edamam-Account-User': 'grocery-mate-user'
    },
  });

  return response.data.hits;
}

// Get the ingredients from one recipe
function getRecipeIngredients(recipe) {
  let ingredientsList = [];

  for (let i = 0; i < recipe.ingredients.length; i++) {
    let currentIngredient = recipe.ingredients[i];

    let ingredient = {
      name: currentIngredient.food,
      amount: currentIngredient.quantity,
      unit: currentIngredient.measure,
    };

    ingredientsList.push(ingredient);
  }

  return ingredientsList;
}

// Main program
async function run() {
  // Check if API credentials are set
  if (!appId || !appKey) {
    console.log('ERROR: You need to set EDAMAM_APP_ID and EDAMAM_APP_KEY');
    return;
  }

  try {
    // Search for a recipe
    console.log('Searching for pizza recipes...\n');
    let results = await searchRecipes('pizza');

    if (results.length === 0) {
      console.log('No recipes found');
      return;
    }

    // Get first recipe
    let recipe = results[0].recipe;

    console.log('Recipe: ' + recipe.label);
    console.log('Servings: ' + recipe.yield);
    console.log('\nIngredients:\n');

    // Get and display ingredients
    let ingredients = getRecipeIngredients(recipe);

    for (let i = 0; i < ingredients.length; i++) {
      let item = ingredients[i];
      console.log('- ' + item.amount + ' ' + item.unit + ' ' + item.name);
    }

  } catch (error) {
    console.log('Error: ' + error.message);
    if (error.response) {
      console.log('Status: ' + error.response.status);
      console.log('Response: ' + JSON.stringify(error.response.data));
    }
  }
}

// Run the program
run();

