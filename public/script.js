// Bulgarian ingredients organized by category
let selectedIngredients = [];
let currentRecipes = [];

const ingredientCategories = {
    'Месо и риба': [
        'пилешко месо', 'свинско месо', 'телешко месо', 'агнешко месо',
        'кайма смесена', 'наденички', 'бекон', 'шунка',
        'риба', 'сьомга', 'скумрия', 'пъстърва'
    ],
    'Зеленчуци': [
        'лук', 'чесън', 'домати', 'краставици', 'чушки',
        'картофи', 'морков', 'зеле', 'спанак', 'праз лук',
        'тиквички', 'патладжан', 'броколи', 'карфиол',
        'цвекло', 'репички', 'магданоз', 'копър'
    ],
    'Млечни продукти': [
        'яйца', 'мляко', 'сирене', 'кашкавал', 'извара',
        'кисело мляко', 'сметана', 'масло', 'крема сирене'
    ],
    'Зърнени храни': [
        'ориз', 'макарони', 'спагети', 'брашно', 'булгур',
        'овесени ядки', 'леща', 'фасул', 'нахут'
    ],
    'Основни продукти': [
        'олио', 'оцет', 'захар', 'сол'
    ]
};

function initApp() {
    const container = document.getElementById('ingredientsContainer');
    Object.entries(ingredientCategories).forEach(([category, ingredients]) => {
        const section = document.createElement('div');
        section.className = 'ingredients-section';
        const title = document.createElement('div');
        title.className = 'category-title';
        title.textContent = category;
        section.appendChild(title);
        const grid = document.createElement('div');
        grid.className = 'ingredients-grid';
        ingredients.forEach(ingredient => {
            const item = document.createElement('div');
            item.className = 'ingredient-item';
            item.innerHTML = `
                <input type="checkbox" id="ing_${ingredient.replace(/\s+/g, '_')}" value="${ingredient}">
                <label for="ing_${ingredient.replace(/\s+/g, '_')}">${ingredient}</label>
            `;
            item.onclick = () => toggleIngredient(ingredient, item);
            grid.appendChild(item);
        });
        section.appendChild(grid);
        container.appendChild(section);
    });
}

function toggleIngredient(ingredient, element) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    checkbox.checked = !checkbox.checked;
    if (checkbox.checked) {
        element.classList.add('selected');
        if (!selectedIngredients.includes(ingredient)) {
            selectedIngredients.push(ingredient);
        }
    } else {
        element.classList.remove('selected');
        selectedIngredients = selectedIngredients.filter(ing => ing !== ingredient);
    }
}

async function generateRecipes() {
    const customIngredients = document.getElementById('customIngredients').value;
    let allIngredients = [...selectedIngredients];
    if (customIngredients.trim()) {
        const customList = customIngredients.split(',').map(ing => ing.trim()).filter(ing => ing);
        allIngredients = [...allIngredients, ...customList];
    }
    if (allIngredients.length === 0) {
        alert('Моля изберете поне един продукт!');
        return;
    }
    const btn = document.getElementById('generateBtn');
    btn.innerHTML = '⏳ Търся рецепти...';
    btn.disabled = true;
    try {
        const recipes = await callOpenAI(allIngredients);
        currentRecipes = recipes;
        showRecipeSuggestions();
    } catch (error) {
        console.error('Грешка при генериране на рецепти:', error);
        alert('Възникна грешка. Моля опитайте отново.');
    } finally {
        btn.innerHTML = '🔍 Намери рецепти';
        btn.disabled = false;
    }
}

async function callOpenAI(ingredients) {
    const prompt = createPrompt(ingredients);
    const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.6
        })
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const recipesText = data.choices[0].message.content;
    return parseGPTResponse(recipesText);
}

function createPrompt(ingredients) {
    const ingredientsList = ingredients.join(', ');
    return `Ти си експерт готвач, специализиран в българската кухня. Трябва да предложиш 4 вкусни рецепти за вечеря, използвайки следните налични продукти: ${ingredientsList}
ВАЖНИ ИЗИСКВАНИЯ:
- Рецептите трябва да са САМО от българската кухня (традиционни и модерни български ястия)
- НЕ използвай никакви подправки в списъците със съставки или инструкциите
- Всеки рецепт трябва да използва поне 3-4 от наличните продукти
- Рецептите да са подходящи за вечеря за семейство
- Включи популярни български ястия като мусака, сарми, кебапчета, качамак, шкембе чорба, таратор, пълнени чушки, кюфтета, шницели и др.
За всеки рецепт предостави ТОЧНО в този формат:
РЕЦЕПТА 1:
Заглавие: [име на ястието]
Описание: [кратко описание в 1 изречение]
Време: [време в минути]
Трудност: [Лесно/Средно/Трудно]
Порции: [брой порции]
Продукти:
- [продукт 1 с количество]
- [продукт 2 с количество]
- [и т.н.]
Приготвяне:
1. [стъпка 1]
2. [стъпка 2]
3. [и т.н.]
[повтори същия формат за РЕЦЕПТА 2, РЕЦЕПТА 3, РЕЦЕПТА 4]
Уверете се, че отговорът е на български език и следва точно този формат.`;
}

function parseGPTResponse(responseText) {
    const recipes = [];
    const recipeBlocks = responseText.split(/РЕЦЕПТА \d+:/);
    recipeBlocks.shift();
    recipeBlocks.forEach(block => {
        try {
            const lines = block.trim().split('\n').filter(line => line.trim());
            const recipe = {
                title: '',
                preview: '',
                time: '',
                difficulty: '',
                servings: 0,
                ingredients: [],
                instructions: []
            };
            let currentSection = '';
            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('Заглавие:')) {
                    recipe.title = trimmedLine.replace('Заглавие:', '').trim();
                } else if (trimmedLine.startsWith('Описание:')) {
                    recipe.preview = trimmedLine.replace('Описание:', '').trim();
                } else if (trimmedLine.startsWith('Време:')) {
                    recipe.time = trimmedLine.replace('Време:', '').trim();
                } else if (trimmedLine.startsWith('Трудност:')) {
                    recipe.difficulty = trimmedLine.replace('Трудност:', '').trim();
                } else if (trimmedLine.startsWith('Порции:')) {
                    recipe.servings = parseInt(trimmedLine.replace('Порции:', '').trim());
                } else if (trimmedLine === 'Продукти:') {
                    currentSection = 'ingredients';
                } else if (trimmedLine === 'Приготвяне:') {
                    currentSection = 'instructions';
                } else if (trimmedLine.startsWith('-') && currentSection === 'ingredients') {
                    recipe.ingredients.push(trimmedLine.replace('-', '').trim());
                } else if (/^\d+\./.test(trimmedLine) && currentSection === 'instructions') {
                    recipe.instructions.push(trimmedLine.replace(/^\d+\./, '').trim());
                }
            });
            if (recipe.title) {
                recipes.push(recipe);
            }
        } catch (error) {
            console.error('Грешка при парсиране на рецепта:', error);
        }
    });
    return recipes;
}

function showRecipeSuggestions() {
    const suggestionsDiv = document.getElementById('recipeSuggestions');
    const recipeList = document.getElementById('recipeList');
    recipeList.innerHTML = '';
    currentRecipes.forEach((recipe, index) => {
        const recipeCard = document.createElement('div');
        recipeCard.className = 'recipe-card';
        recipeCard.innerHTML = `
            <div class="recipe-title">${recipe.title}</div>
            <div class="recipe-preview">${recipe.preview}</div>
            <div style="margin-top: 10px; font-size: 0.9rem; color: #999;">
                ⏱️ ${recipe.time} • 👥 ${recipe.servings} порции • 📊 ${recipe.difficulty}
            </div>
        `;
        recipeCard.onclick = () => showRecipeDetails(index);
        recipeList.appendChild(recipeCard);
    });
    suggestionsDiv.style.display = 'block';
    document.getElementById('recipeDetails').style.display = 'none';
}

function showRecipeDetails(recipeIndex) {
    const recipe = currentRecipes[recipeIndex];
    const detailsDiv = document.getElementById('recipeDetails');
    detailsDiv.innerHTML = `
        <button class="back-btn" onclick="hideRecipeDetails()">⬅ Назад</button>
        <h2 class="recipe-title">${recipe.title}</h2>
        <div class="recipe-meta">
            <div class="meta-item"><div class="meta-value">${recipe.time}</div><div class="meta-label">Време</div></div>
            <div class="meta-item"><div class="meta-value">${recipe.difficulty}</div><div class="meta-label">Трудност</div></div>
            <div class="meta-item"><div class="meta-value">${recipe.servings}</div><div class="meta-label">Порции</div></div>
        </div>
        <div class="ingredients-list"><h3>Продукти:</h3><ul>${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}</ul></div>
        <div class="instructions-list"><h3>Приготвяне:</h3><ol>${recipe.instructions.map(step => `<li>${step}</li>`).join('')}</ol></div>
    `;
    detailsDiv.style.display = 'block';
    document.getElementById('recipeSuggestions').style.display = 'none';
}

function hideRecipeDetails() {
    document.getElementById('recipeDetails').style.display = 'none';
    document.getElementById('recipeSuggestions').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initApp); 