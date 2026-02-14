# Basic Recipe Ingredient List

This program searches for a recipe and displays its ingredients in a simple list.

## Setup

1. Go to https://developer.edamam.com and sign up
2. Create an app for the **Recipe Search API**
3. Copy your Application ID and API Key

## Install

```powershell
npm install
```

## Run

```powershell
$env:EDAMAM_APP_ID = "your-app-id"
$env:EDAMAM_APP_KEY = "your-api-key"
node recipeScraper.js
```

## What It Does

- Searches for "pizza" recipes
- Shows the first recipe found
- Displays all ingredients in a simple list

## Change the Recipe

Edit the search in the `searchRecipes()` call:

```javascript
let results = await searchRecipes('chicken');  // Change to any recipe
```

