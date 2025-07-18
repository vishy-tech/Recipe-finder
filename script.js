// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const sections = {
    search: document.getElementById('search-section'),
    favorites: document.getElementById('favorites-section'),
    shoppingList: document.getElementById('shopping-list-section'),
    mealPlan: document.getElementById('meal-plan-section')
};

const navItems = document.querySelectorAll('.main-nav li');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const userProfile = document.getElementById('user-profile');
const usernameDisplay = document.getElementById('username-display');

// Current user state
let currentUser = null;

// Initialize the app
function init() {
    setupEventListeners();
    checkAuthState();
    loadRecentSearches();
    showSection('search');
}

// Authentication functions
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            // User is signed in
            document.getElementById('login-btn').classList.add('hidden');
            document.getElementById('signup-btn').classList.add('hidden');
            userProfile.classList.remove('hidden');
            usernameDisplay.textContent = user.email;
            
            // Load user data
            loadFavorites();
            loadShoppingList();
            loadMealPlan();
        } else {
            // User is signed out
            document.getElementById('login-btn').classList.remove('hidden');
            document.getElementById('signup-btn').classList.remove('hidden');
            userProfile.classList.add('hidden');
        }
    });
}

function showAuthModal(mode) {
    const authModal = document.getElementById('auth-modal');
    const authContent = document.getElementById('auth-modal-content');
    
    authContent.innerHTML = `
        <h2>${mode === 'login' ? 'Login' : 'Sign Up'}</h2>
        <form id="auth-form">
            <div class="form-group">
                <label for="auth-email">Email</label>
                <input type="email" id="auth-email" required>
            </div>
            <div class="form-group">
                <label for="auth-password">Password</label>
                <input type="password" id="auth-password" required minlength="6">
            </div>
            <button type="submit">${mode === 'login' ? 'Login' : 'Sign Up'}</button>
        </form>
    `;
    
    const form = document.getElementById('auth-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        
        if (mode === 'login') {
            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    authModal.classList.add('hidden');
                })
                .catch(error => {
                    alert(error.message);
                });
        } else {
            auth.createUserWithEmailAndPassword(email, password)
                .then(() => {
                    authModal.classList.add('hidden');
                })
                .catch(error => {
                    alert(error.message);
                });
        }
    });
    
    authModal.classList.remove('hidden');
}

// Navigation functions
function showSection(sectionId) {
    // Hide all sections
    Object.values(sections).forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    sections[sectionId].classList.remove('hidden');
    
    // Update active nav item
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });
}

// Recipe functions
async function searchRecipes() {
    const query = document.getElementById('search-input').value;
    if (!query) return;
    
    // Save to recent searches
    saveRecentSearch(query);
    
    // Show loading state
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '<div class="loading">Searching for recipes...</div>';
    
    try {
        // Use either Edamam or Spoonacular API
        const recipes = await fetchFromSpoonacular(query);
        displayRecipes(recipes);
    } catch (error) {
        console.error('Error searching recipes:', error);
        resultsContainer.innerHTML = '<div class="error">Error loading recipes. Please try again.</div>';
    }
}

async function fetchFromSpoonacular(query) {
    const API_KEY = 'YOUR_SPOONACULAR_API_KEY';
    let url = `https://api.spoonacular.com/recipes/complexSearch?query=${query}&apiKey=${API_KEY}&number=12&addRecipeInformation=true`;
    
    // Add filters if they exist
    const cuisine = document.getElementById('cuisine-filter').value;
    const diet = document.getElementById('diet-filter').value;
    const time = document.getElementById('time-filter').value;
    
    if (cuisine) url += `&cuisine=${cuisine}`;
    if (diet) url += `&diet=${diet}`;
    if (time) url += `&maxReadyTime=${time}`;
    
    const response = await fetch(url);
    const data = await response.json();
    return data.results;
}

function displayRecipes(recipes) {
    const resultsContainer = document.getElementById('results-container');
    
    if (!recipes || recipes.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No recipes found. Try a different search.</div>';
        return;
    }
    
    resultsContainer.innerHTML = '';
    
    recipes.forEach(recipe => {
        const isFavorite = currentUser && checkIfFavorite(recipe.id);
        
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.title}">
            <div class="recipe-info">
                <h3>${recipe.title}</h3>
                <p>Ready in ${recipe.readyInMinutes} minutes</p>
                <div class="recipe-actions">
                    <button class="view-recipe" data-id="${recipe.id}">
                        <i class="fas fa-book-open"></i> View
                    </button>
                    <button class="favorite-btn" data-id="${recipe.id}">
                        <i class="fas ${isFavorite ? 'fa-heart' : 'fa-heart-o'}"></i>
                    </button>
                </div>
            </div>
        `;
        
        resultsContainer.appendChild(card);
    });
    
    // Add event listeners
    document.querySelectorAll('.view-recipe').forEach(btn => {
        btn.addEventListener('click', () => viewRecipeDetails(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleFavorite(btn.getAttribute('data-id')));
    });
}

async function viewRecipeDetails(recipeId) {
    const modal = document.getElementById('recipe-modal');
    const modalContent = document.getElementById('modal-recipe-content');
    
    modalContent.innerHTML = '<div class="loading">Loading recipe details...</div>';
    modal.classList.remove('hidden');
    
    try {
        const API_KEY = 'YOUR_SPOONACULAR_API_KEY';
        const response = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${API_KEY}`);
        const recipe = await response.json();
        
        modalContent.innerHTML = `
            <h2>${recipe.title}</h2>
            <img src="${recipe.image}" alt="${recipe.title}" class="modal-recipe-image">
            
            <div class="recipe-meta">
                <span><i class="fas fa-clock"></i> ${recipe.readyInMinutes} mins</span>
                <span><i class="fas fa-utensils"></i> ${recipe.servings} servings</span>
            </div>
            
            <h3>Ingredients</h3>
            <ul class="ingredients-list">
                ${recipe.extendedIngredients.map(ing => 
                    `<li>${ing.original}</li>`
                ).join('')}
            </ul>
            
            <h3>Instructions</h3>
            <div class="instructions">
                ${recipe.instructions || 'No instructions provided.'}
            </div>
            
            <div class="modal-actions">
                <button class="add-to-shopping-list" data-id="${recipe.id}">
                    <i class="fas fa-cart-plus"></i> Add Ingredients to Shopping List
                </button>
                <button class="add-to-meal-plan" data-id="${recipe.id}">
                    <i class="fas fa-calendar-plus"></i> Add to Meal Plan
                </button>
            </div>
        `;
        
        // Add event listeners for modal buttons
        document.querySelector('.add-to-shopping-list').addEventListener('click', () => {
            addRecipeIngredientsToShoppingList(recipe.extendedIngredients);
        });
        
        document.querySelector('.add-to-meal-plan').addEventListener('click', () => {
            addToMealPlan(recipe);
        });
        
    } catch (error) {
        console.error('Error loading recipe details:', error);
        modalContent.innerHTML = '<div class="error">Error loading recipe details. Please try again.</div>';
    }
}

// Favorites functions
function checkIfFavorite(recipeId) {
    // This would check local storage or Firebase
    // For now, just a placeholder
    return false;
}

function toggleFavorite(recipeId) {
    if (!currentUser) {
        alert('Please login to save favorites');
        return;
    }
    
    // Implement favorite toggling with Firebase
    const favoritesRef = db.collection('users').doc(currentUser.uid).collection('favorites');
    
    if (checkIfFavorite(recipeId)) {
        // Remove from favorites
        favoritesRef.doc(recipeId).delete()
            .then(() => {
                updateFavoriteButton(recipeId, false);
                if (sections.favorites.classList.contains('hidden')) {
                    loadFavorites();
                }
            });
    } else {
        // Add to favorites
        // First we need to get the recipe details
        const API_KEY = 'YOUR_SPOONACULAR_API_KEY';
        fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${API_KEY}`)
            .then(response => response.json())
            .then(recipe => {
                favoritesRef.doc(recipeId).set({
                    id: recipeId,
                    title: recipe.title,
                    image: recipe.image,
                    readyInMinutes: recipe.readyInMinutes,
                    savedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    updateFavoriteButton(recipeId, true);
                });
            });
    }
}

function updateFavoriteButton(recipeId, isFavorite) {
    const buttons = document.querySelectorAll(`.favorite-btn[data-id="${recipeId}"]`);
    buttons.forEach(btn => {
        const icon = btn.querySelector('i');
        icon.classList.toggle('fa-heart-o', !isFavorite);
        icon.classList.toggle('fa-heart', isFavorite);
    });
}

async function loadFavorites() {
    if (!currentUser) return;
    
    const favoritesContainer = document.getElementById('favorites-container');
    favoritesContainer.innerHTML = '<div class="loading">Loading your favorites...</div>';
    
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('favorites')
            .orderBy('savedAt', 'desc')
            .get();
            
        if (snapshot.empty) {
            favoritesContainer.innerHTML = '<div class="no-favorites">You have no saved favorites yet.</div>';
            return;
        }
        
        favoritesContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const recipe = doc.data();
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <img src="${recipe.image}" alt="${recipe.title}">
                <div class="recipe-info">
                    <h3>${recipe.title}</h3>
                    <p>Ready in ${recipe.readyInMinutes} minutes</p>
                    <div class="recipe-actions">
                        <button class="view-recipe" data-id="${recipe.id}">
                            <i class="fas fa-book-open"></i> View
                        </button>
                        <button class="favorite-btn" data-id="${recipe.id}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            `;
            
            favoritesContainer.appendChild(card);
        });
        
        // Add event listeners
        document.querySelectorAll('.view-recipe').forEach(btn => {
            btn.addEventListener('click', () => viewRecipeDetails(btn.getAttribute('data-id')));
        });
        
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', () => toggleFavorite(btn.getAttribute('data-id')));
        });
        
    } catch (error) {
        console.error('Error loading favorites:', error);
        favoritesContainer.innerHTML = '<div class="error">Error loading favorites. Please try again.</div>';
    }
}

// Shopping List functions
function addRecipeIngredientsToShoppingList(ingredients) {
    if (!currentUser) {
        alert('Please login to use the shopping list');
        return;
    }
    
    const shoppingListRef = db.collection('users').doc(currentUser.uid).collection('shoppingList');
    
    ingredients.forEach(ingredient => {
        shoppingListRef.add({
            name: ingredient.name,
            original: ingredient.original,
            aisle: ingredient.aisle,
            checked: false,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    
    alert(`${ingredients.length} items added to your shopping list!`);
    if (!sections.shoppingList.classList.contains('hidden')) {
        loadShoppingList();
    }
}

async function loadShoppingList() {
    if (!currentUser) return;
    
    const shoppingList = document.getElementById('shopping-list');
    shoppingList.innerHTML = '<li class="loading">Loading your shopping list...</li>';
    
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('shoppingList')
            .orderBy('aisle')
            .orderBy('addedAt')
            .get();
            
        if (snapshot.empty) {
            shoppingList.innerHTML = '<li class="empty">Your shopping list is empty</li>';
            return;
        }
        
        shoppingList.innerHTML = '';
        
        let currentAisle = '';
        snapshot.forEach(doc => {
            const item = doc.data();
            
            // Add aisle header if it's different from the previous item
            if (item.aisle !== currentAisle) {
                currentAisle = item.aisle;
                const aisleHeader = document.createElement('li');
                aisleHeader.className = 'aisle-header';
                aisleHeader.textContent = item.aisle || 'Other';
                shoppingList.appendChild(aisleHeader);
            }
            
            const listItem = document.createElement('li');
            listItem.className = item.checked ? 'checked' : '';
            listItem.innerHTML = `
                <span>${item.original}</span>
                <span class="remove-item" data-id="${doc.id}"><i class="fas fa-times"></i></span>
            `;
            
            listItem.addEventListener('click', (e) => {
                if (e.target.tagName !== 'I' && !e.target.classList.contains('remove-item')) {
                    toggleShoppingItemChecked(doc.id, !item.checked);
                }
            });
            
            shoppingList.appendChild(listItem);
        });
        
        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeShoppingItem(btn.getAttribute('data-id'));
            });
        });
        
    } catch (error) {
        console.error('Error loading shopping list:', error);
        shoppingList.innerHTML = '<li class="error">Error loading shopping list</li>';
    }
}

function toggleShoppingItemChecked(itemId, checked) {
    db.collection('users').doc(currentUser.uid)
        .collection('shoppingList').doc(itemId)
        .update({ checked: checked })
        .then(() => loadShoppingList());
}

function removeShoppingItem(itemId) {
    db.collection('users').doc(currentUser.uid)
        .collection('shoppingList').doc(itemId)
        .delete()
        .then(() => loadShoppingList());
}

// Meal Plan functions
async function loadMealPlan() {
    if (!currentUser) return;
    
    const mealPlanCalendar = document.getElementById('meal-plan-calendar');
    mealPlanCalendar.innerHTML = '<div class="loading">Loading your meal plan...</div>';
    
    try {
        // Get the current week's dates
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        mealPlanCalendar.innerHTML = '';
        
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            
            const dayKey = dayDate.toISOString().split('T')[0];
            
            const dayElement = document.createElement('div');
            dayElement.className = 'meal-day';
            dayElement.innerHTML = `<h3>${days[i]}</h3>`;
            
            // Check if we have meals for this day
            const snapshot = await db.collection('users').doc(currentUser.uid)
                .collection('mealPlan')
                .where('date', '==', dayKey)
                .get();
                
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const meal = doc.data();
                    const mealElement = document.createElement('div');
                    mealElement.className = 'meal-item';
                    mealElement.innerHTML = `
                        <h4>${meal.mealType}</h4>
                        <p>${meal.recipeTitle}</p>
                        <button class="view-recipe" data-id="${meal.recipeId}">View</button>
                        <button class="remove-meal" data-id="${doc.id}">Remove</button>
                    `;
                    dayElement.appendChild(mealElement);
                });
            } else {
                dayElement.innerHTML += '<p>No meals planned</p>';
            }
            
            // Add "Add Meal" button
            const addButton = document.createElement('button');
            addButton.className = 'add-meal';
            addButton.textContent = 'Add Meal';
            addButton.setAttribute('data-date', dayKey);
            addButton.addEventListener('click', () => showAddMealDialog(dayKey));
            
            dayElement.appendChild(addButton);
            mealPlanCalendar.appendChild(dayElement);
        }
        
        // Add event listeners for view recipe buttons
        document.querySelectorAll('.view-recipe').forEach(btn => {
            btn.addEventListener('click', () => viewRecipeDetails(btn.getAttribute('data-id')));
        });
        
        // Add event listeners for remove meal buttons
        document.querySelectorAll('.remove-meal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeMealFromPlan(btn.getAttribute('data-id'));
            });
        });
        
    } catch (error) {
        console.error('Error loading meal plan:', error);
        mealPlanCalendar.innerHTML = '<div class="error">Error loading meal plan</div>';
    }
}

function showAddMealDialog(date) {
    // This would show a dialog to select a recipe and meal type
    // For simplicity, we'll just add a random favorite
    if (!currentUser) return;
    
    // Get a random favorite recipe
    db.collection('users').doc(currentUser.uid)
        .collection('favorites')
        .limit(1)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                const recipe = snapshot.docs[0].data();
                addToMealPlan(recipe, date);
            } else {
                alert('Add some favorite recipes first!');
            }
        });
}

function addToMealPlan(recipe, date = null) {
    if (!currentUser) {
        alert('Please login to use the meal planner');
        return;
    }
    
    if (!date) {
        // Default to today if no date specified
        date = new Date().toISOString().split('T')[0];
    }
    
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    const randomMealType = mealTypes[Math.floor(Math.random() * mealTypes.length)];
    
    db.collection('users').doc(currentUser.uid)
        .collection('mealPlan')
        .add({
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            recipeImage: recipe.image,
            mealType: randomMealType,
            date: date,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            loadMealPlan();
        });
}

function removeMealFromPlan(mealId) {
    db.collection('users').doc(currentUser.uid)
        .collection('mealPlan').doc(mealId)
        .delete()
        .then(() => loadMealPlan());
}

// Recent searches
function saveRecentSearch(query) {
    if (!currentUser) {
        // Save to localStorage if not logged in
        let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        recentSearches = [query, ...recentSearches].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    } else {
        // Save to Firebase if logged in
        db.collection('users').doc(currentUser.uid)
            .collection('recentSearches')
            .add({
                query: query,
                searchedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    }
}

function loadRecentSearches() {
    if (!currentUser) {
        const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || []);
        // Display these in your UI as needed
    } else {
        // Load from Firebase
        db.collection('users').doc(currentUser.uid)
            .collection('recentSearches')
            .orderBy('searchedAt', 'desc')
            .limit(5)
            .get()
            .then(snapshot => {
                const searches = [];
                snapshot.forEach(doc => {
                    searches.push(doc.data().query);
                });
                // Display these in your UI
            });
    }
}

// Event listeners
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            showSection(item.getAttribute('data-section'));
        });
    });
    
    // Auth buttons
    loginBtn.addEventListener('click', () => showAuthModal('login'));
    signupBtn.addEventListener('click', () => showAuthModal('signup'));
    logoutBtn.addEventListener('click', () => auth.signOut());
    
    // Search
    document.getElementById('search-btn').addEventListener('click', searchRecipes);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchRecipes();
    });
    
    // Shopping list actions
    document.getElementById('generate-shopping-list').addEventListener('click', generateShoppingListFromFavorites);
    document.getElementById('clear-shopping-list').addEventListener('click', clearShoppingList);
    
    // Meal plan actions
    document.getElementById('generate-meal-plan').addEventListener('click', generateRandomMealPlan);
    document.getElementById('clear-meal-plan').addEventListener('click', clearMealPlan);
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });
}

// Helper functions
function generateShoppingListFromFavorites() {
    if (!currentUser) {
        alert('Please login to use this feature');
        return;
    }
    
    // Get all favorites and add their ingredients to shopping list
    db.collection('users').doc(currentUser.uid)
        .collection('favorites')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                alert('You have no favorites to generate from');
                return;
            }
            
            const recipeIds = snapshot.docs.map(doc => doc.id);
            const API_KEY = 'YOUR_SPOONACULAR_API_KEY';
            
            // Note: This would require multiple API calls or a batch endpoint
            alert('This would fetch all favorite recipes and combine their ingredients');
        });
}

function clearShoppingList() {
    if (!currentUser || !confirm('Are you sure you want to clear your entire shopping list?')) {
        return;
    }
    
    // Batch delete all shopping list items
    db.collection('users').doc(currentUser.uid)
        .collection('shoppingList')
        .get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        })
        .then(() => loadShoppingList());
}

function generateRandomMealPlan() {
    if (!currentUser) {
        alert('Please login to use this feature');
        return;
    }
    
    // Clear existing plan first
    clearMealPlan().then(() => {
        // Get some random favorites (or random recipes) and add to plan
        db.collection('users').doc(currentUser.uid)
            .collection('favorites')
            .limit(7)
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    alert('Add some favorite recipes first!');
                    return;
                }
                
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                
                const batch = db.batch();
                const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
                
                snapshot.docs.forEach((doc, i) => {
                    const recipe = doc.data();
                    const mealDate = new Date(startOfWeek);
                    mealDate.setDate(startOfWeek.getDate() + i);
                    const dateKey = mealDate.toISOString().split('T')[0];
                    
                    const mealType = mealTypes[Math.floor(Math.random() * mealTypes.length)];
                    
                    const mealPlanRef = db.collection('users').doc(currentUser.uid)
                        .collection('mealPlan').doc();
                    
                    batch.set(mealPlanRef, {
                        recipeId: recipe.id,
                        recipeTitle: recipe.title,
                        recipeImage: recipe.image,
                        mealType: mealType,
                        date: dateKey,
                        addedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                
                return batch.commit();
            })
            .then(() => loadMealPlan());
    });
}

function clearMealPlan() {
    if (!currentUser || !confirm('Are you sure you want to clear your entire meal plan?')) {
        return Promise.resolve();
    }
    
    return db.collection('users').doc(currentUser.uid)
        .collection('mealPlan')
        .get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        });
}

// Initialize the app
init();