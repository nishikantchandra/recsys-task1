// Default API key (set by user) - Cerebras
const DEFAULT_API_KEY = 'csk-k2x62hd3mw2npny63ww3e4pwvewfy6jkmdfyxhevhjffknwe';

// Storage for collected keywords and master lists
let collectedSubGenres = new Set();
let collectedThemes = new Set();
let masterSubGenres = [];
let masterThemes = [];
let analyzedMovies = new Map(); // Store analyzed movies: movieId -> {subGenre, themes}

// Get API key from input field or use stored value
function getApiKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    if (apiKeyInput && apiKeyInput.value.trim()) {
        // Store in localStorage for convenience
        localStorage.setItem('cerebras_api_key', apiKeyInput.value.trim());
        return apiKeyInput.value.trim();
    }
    // Try to get from localStorage
    const storedKey = localStorage.getItem('cerebras_api_key');
    if (storedKey) {
        return storedKey;
    }
    // Use default API key
    return DEFAULT_API_KEY;
}

// Initialize the application when the window loads
window.onload = async function() {
    try {
        // Load API key from localStorage or use default
        const apiKeyInput = document.getElementById('api-key-input');
        if (apiKeyInput) {
            const storedKey = localStorage.getItem('cerebras_api_key');
            if (storedKey) {
                apiKeyInput.value = storedKey;
            } else {
                // Pre-populate with default API key
                apiKeyInput.value = DEFAULT_API_KEY;
                localStorage.setItem('cerebras_api_key', DEFAULT_API_KEY);
            }
        }
        
        // Display loading message
        const resultElement = document.getElementById('result');
        resultElement.textContent = "Loading movie data...";
        resultElement.className = 'loading';
        
        // Load data
        await loadData();
        
        // Populate dropdown and update status
        populateMoviesDropdown();
        
        // Load master lists from localStorage if available
        const storedSubGenres = localStorage.getItem('masterSubGenres');
        const storedThemes = localStorage.getItem('masterThemes');
        if (storedSubGenres) masterSubGenres = JSON.parse(storedSubGenres);
        if (storedThemes) masterThemes = JSON.parse(storedThemes);
        
        let statusMsg = "Data loaded. Select a movie to analyze.";
        if (masterSubGenres.length > 0 || masterThemes.length > 0) {
            statusMsg += `<br><small style='color: #666;'>Master lists loaded: ${masterSubGenres.length} sub-genres, ${masterThemes.length} themes</small>`;
        }
        resultElement.innerHTML = statusMsg;
        resultElement.className = 'success';
    } catch (error) {
        console.error('Initialization error:', error);
        // Error message already set in data.js
    }
};

// Populate the movies dropdown with sorted movie titles
function populateMoviesDropdown() {
    const selectElement = document.getElementById('movie-select');
    
    // Clear existing options except the first placeholder
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    
    // Sort movies alphabetically by title
    const sortedMovies = [...movies].sort((a, b) => a.title.localeCompare(b.title));
    
    // Add movies to dropdown
    sortedMovies.forEach(movie => {
        const option = document.createElement('option');
        option.value = movie.id;
        option.textContent = movie.title;
        selectElement.appendChild(option);
    });
}

// Call Cerebras API to extract sub-genre and themes from movie overview
async function getMovieFeaturesFromChatGPT(movieTitle, overview) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Cerebras API key is not set. Please enter your API key in the input field above.');
    }
    
    const prompt = `Analyze the following movie and extract specific features from its overview:

Movie Title: ${movieTitle}
Overview: ${overview}

Please provide:
1. Sub-genre: (e.g., Space Opera, Heist, Romantic Comedy, Psychological Thriller, etc.)
2. Themes: (e.g., Good vs Evil, Coming of Age, Redemption, etc.) - provide 2-3 main themes

Format your response as JSON with the following structure:
{
  "subGenre": "sub-genre name",
  "themes": ["theme1", "theme2", "theme3"]
}

Only return the JSON object, no additional text.`;

    try {
        // Try different possible Cerebras API endpoints
        const endpoints = [
            'https://api.cerebras.ai/v1/chat/completions',
            'https://api.cerebras.cloud/v1/chat/completions'
        ];
        
        // Try different models
        const models = ['llama-3.3-70b', 'llama-3.1-8b', 'llama3.1-8b'];
        
        let lastError = null;
        
        for (const endpoint of endpoints) {
            for (const model of models) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [{
                                role: 'user',
                                content: prompt
                            }],
                            max_completion_tokens: 1024,
                            temperature: 0.2,
                            top_p: 1,
                            stream: false
                        })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error(`Error with endpoint ${endpoint} and model ${model}:`, errorData);
                        lastError = { response, errorData, endpoint, model };
                        
                        // If it's a 401/403 error about API key, don't try other combinations
                        if ((response.status === 401 || response.status === 403) && 
                            (errorData.error?.message?.includes('API key') || errorData.error?.message?.includes('authentication'))) {
                            throw new Error(`API key validation failed. Please check:\n1. The API key is correct\n2. The API key has proper permissions\n3. Your account is active\n\nError: ${errorData.error?.message || 'Authentication failed'}`);
                        }
                        
                        // Try next combination
                        continue;
                    }
                    
                    // Success - process response
                    const data = await response.json();
                    
                    // Extract text from Cerebras response (similar to OpenAI format)
                    const content = data.choices[0].message.content.trim();
                    
                    // Extract JSON from response (in case there's extra text)
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    } else {
                        throw new Error('Invalid response format from Cerebras');
                    }
                } catch (error) {
                    // If it's the API key error, throw it immediately
                    if (error.message.includes('API key validation failed')) {
                        throw error;
                    }
                    lastError = error;
                    // Continue to next combination
                }
            }
        }
        
        // If we get here, all combinations failed
        if (lastError && lastError.response) {
            const errorData = lastError.errorData || {};
            const errorMessage = errorData.error?.message || 'Unknown error';
            throw new Error(`Cerebras API error: ${errorMessage}`);
        }
        throw lastError || new Error('Failed to get response from Cerebras API');

    } catch (error) {
        console.error('Error calling Cerebras API:', error);
        throw error;
    }
}

// Main recommendation function
async function getRecommendations() {
    const resultElement = document.getElementById('result');
    
    try {
        // Step 1: Get user input
        const selectElement = document.getElementById('movie-select');
        const selectedMovieId = parseInt(selectElement.value);
        
        if (isNaN(selectedMovieId)) {
            resultElement.textContent = "Please select a movie first.";
            resultElement.className = 'error';
            return;
        }
        
        // Step 2: Find the liked movie
        const likedMovie = movies.find(movie => movie.id === selectedMovieId);
        if (!likedMovie) {
            resultElement.textContent = "Error: Selected movie not found in database.";
            resultElement.className = 'error';
            return;
        }
        
        // Show loading message while processing
        resultElement.innerHTML = "Analyzing movie with Cerebras AI...<br><small>Extracting sub-genre and themes...</small>";
        resultElement.className = 'loading';
        
        try {
            // Call Cerebras to extract features
            let features = null;
            if (likedMovie.overview && likedMovie.overview.trim() !== '') {
                try {
                    features = await getMovieFeaturesFromChatGPT(likedMovie.title, likedMovie.overview);
                } catch (error) {
                    console.error('Cerebras API error:', error);
                    resultElement.innerHTML = `Error calling Cerebras: ${error.message}<br><small>Please check your API key and try again.</small>`;
                    resultElement.className = 'error';
                    return;
                }
            } else {
                resultElement.innerHTML = `No overview available for "${likedMovie.title}".`;
                resultElement.className = 'error';
                return;
            }
            
            // Store collected keywords
            if (features) {
                if (features.subGenre) {
                    collectedSubGenres.add(features.subGenre);
                }
                if (features.themes && Array.isArray(features.themes)) {
                    features.themes.forEach(theme => collectedThemes.add(theme));
                }
                // Store analyzed movie data
                analyzedMovies.set(selectedMovieId, {
                    subGenre: features.subGenre,
                    themes: features.themes || []
                });
            }
            
            // Display the extracted features
            let resultHTML = `<strong>Movie: ${likedMovie.title}</strong><br><br>`;
            
            if (features) {
                resultHTML += `<strong>Sub-genre:</strong> ${features.subGenre || 'N/A'}<br>`;
                resultHTML += `<strong>Themes:</strong> ${features.themes ? features.themes.join(', ') : 'N/A'}<br><br>`;
                resultHTML += `<small style='color: #666;'>Collected: ${collectedSubGenres.size} sub-genres, ${collectedThemes.size} themes</small><br>`;
            }
            
            resultHTML += `<small style='color: #666;'>Based on overview: ${likedMovie.overview.substring(0, 150)}${likedMovie.overview.length > 150 ? '...' : ''}</small>`;
            
            resultElement.innerHTML = resultHTML;
            resultElement.className = 'success';
            
        } catch (error) {
            console.error('Error in recommendation calculation:', error);
            resultElement.innerHTML = `An error occurred: ${error.message}`;
            resultElement.className = 'error';
        }
    } catch (error) {
        console.error('Error in getRecommendations:', error);
        resultElement.textContent = "An unexpected error occurred.";
        resultElement.className = 'error';
    }
}

// Task 3: Consolidate Keywords - Cluster similar terms into canonical master lists
async function consolidateKeywords() {
    const resultElement = document.getElementById('result');
    const apiKey = getApiKey();
    
    if (!apiKey) {
        resultElement.innerHTML = "Please enter your Cerebras API key first.";
        resultElement.className = 'error';
        return;
    }
    
    if (collectedSubGenres.size === 0 && collectedThemes.size === 0) {
        resultElement.innerHTML = "No keywords collected yet. Please analyze some movies first.";
        resultElement.className = 'error';
        return;
    }
    
    resultElement.innerHTML = "Consolidating keywords with Cerebras AI...<br><small>Clustering similar terms...</small>";
    resultElement.className = 'loading';
    
    try {
        // Prepare lists for clustering
        const subGenresList = Array.from(collectedSubGenres);
        const themesList = Array.from(collectedThemes);
        
        const prompt = `You are a keyword consolidation expert. Your task is to cluster similar terms and create canonical master lists.

Given the following lists of terms, identify similar terms (e.g., "Sci-Fi" and "Science Fiction" should be merged into "Science Fiction", "Good vs Evil" and "Good Versus Evil" should be merged into "Good vs Evil").

Sub-genres to consolidate:
${subGenresList.map((sg, i) => `${i + 1}. ${sg}`).join('\n')}

Themes to consolidate:
${themesList.map((t, i) => `${i + 1}. ${t}`).join('\n')}

For each cluster of similar terms, choose the most canonical/preferred term (usually the most common or standard spelling).

Return a JSON object with two arrays:
{
  "masterSubGenres": ["canonical term 1", "canonical term 2", ...],
  "masterThemes": ["canonical term 1", "canonical term 2", ...]
}

Only return the JSON object, no additional text.`;

        // Call Cerebras API
        const endpoints = [
            'https://api.cerebras.ai/v1/chat/completions',
            'https://api.cerebras.cloud/v1/chat/completions'
        ];
        const models = ['llama-3.3-70b', 'llama-3.1-8b', 'llama3.1-8b'];
        
        let consolidated = null;
        let lastError = null;
        
        for (const endpoint of endpoints) {
            for (const model of models) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [{ role: 'user', content: prompt }],
                            max_completion_tokens: 2048,
                            temperature: 0.2,
                            top_p: 1,
                            stream: false
                        })
                    });
                    
                    if (!response.ok) continue;
                    
                    const data = await response.json();
                    const content = data.choices[0].message.content.trim();
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    
                    if (jsonMatch) {
                        consolidated = JSON.parse(jsonMatch[0]);
                        masterSubGenres = consolidated.masterSubGenres || [];
                        masterThemes = consolidated.masterThemes || [];
                        
                        // Store in localStorage
                        localStorage.setItem('masterSubGenres', JSON.stringify(masterSubGenres));
                        localStorage.setItem('masterThemes', JSON.stringify(masterThemes));
                        
                        let resultHTML = `<strong>Keywords Consolidated!</strong><br><br>`;
                        resultHTML += `<strong>Master Sub-genres (${masterSubGenres.length}):</strong><br>`;
                        resultHTML += masterSubGenres.map(sg => `• ${sg}`).join('<br>');
                        resultHTML += `<br><br><strong>Master Themes (${masterThemes.length}):</strong><br>`;
                        resultHTML += masterThemes.map(t => `• ${t}`).join('<br>');
                        resultHTML += `<br><br><small style='color: #666;'>You can now use "Finalize & Encode" to classify movies using these master lists.</small>`;
                        
                        resultElement.innerHTML = resultHTML;
                        resultElement.className = 'success';
                        return;
                    }
                } catch (error) {
                    lastError = error;
                    continue;
                }
            }
        }
        
        throw lastError || new Error('Failed to consolidate keywords');
        
    } catch (error) {
        console.error('Error consolidating keywords:', error);
        resultElement.innerHTML = `Error consolidating keywords: ${error.message}`;
        resultElement.className = 'error';
    }
}

// Task 4: Finalize & Encode - Classify movies using master lists
async function finalizeAndEncode() {
    const resultElement = document.getElementById('result');
    const apiKey = getApiKey();
    
    if (!apiKey) {
        resultElement.innerHTML = "Please enter your Cerebras API key first.";
        resultElement.className = 'error';
        return;
    }
    
    // Load master lists from localStorage if available
    const storedSubGenres = localStorage.getItem('masterSubGenres');
    const storedThemes = localStorage.getItem('masterThemes');
    
    if (storedSubGenres) masterSubGenres = JSON.parse(storedSubGenres);
    if (storedThemes) masterThemes = JSON.parse(storedThemes);
    
    if (masterSubGenres.length === 0 && masterThemes.length === 0) {
        resultElement.innerHTML = "No master lists found. Please run 'Consolidate Keywords' first.";
        resultElement.className = 'error';
        return;
    }
    
    const selectElement = document.getElementById('movie-select');
    const selectedMovieId = parseInt(selectElement.value);
    
    if (isNaN(selectedMovieId)) {
        resultElement.innerHTML = "Please select a movie first.";
        resultElement.className = 'error';
        return;
    }
    
    const likedMovie = movies.find(movie => movie.id === selectedMovieId);
    if (!likedMovie || !likedMovie.overview) {
        resultElement.innerHTML = "Selected movie not found or has no overview.";
        resultElement.className = 'error';
        return;
    }
    
    resultElement.innerHTML = "Finalizing classification with Cerebras AI...<br><small>Using master lists to classify...</small>";
    resultElement.className = 'loading';
    
    try {
        const prompt = `Given the master lists below, classify the movie description. Return a JSON object with two lists: 'sub_genre' and 'themes', containing only the keywords from the provided master lists.

Master Sub-genres: [${masterSubGenres.join(', ')}]

Master Themes: [${masterThemes.join(', ')}]

Description: ${likedMovie.overview}

Movie Title: ${likedMovie.title}

Return a JSON object in this exact format:
{
  "sub_genre": ["sub-genre from master list"],
  "themes": ["theme1 from master list", "theme2 from master list", "theme3 from master list"]
}

Only use terms from the master lists. If no exact match exists, choose the closest match from the master lists. Only return the JSON object, no additional text.`;

        // Call Cerebras API
        const endpoints = [
            'https://api.cerebras.ai/v1/chat/completions',
            'https://api.cerebras.cloud/v1/chat/completions'
        ];
        const models = ['llama-3.3-70b', 'llama-3.1-8b', 'llama3.1-8b'];
        
        let classified = null;
        let lastError = null;
        
        for (const endpoint of endpoints) {
            for (const model of models) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [{ role: 'user', content: prompt }],
                            max_completion_tokens: 1024,
                            temperature: 0.2,
                            top_p: 1,
                            stream: false
                        })
                    });
                    
                    if (!response.ok) continue;
                    
                    const data = await response.json();
                    const content = data.choices[0].message.content.trim();
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    
                    if (jsonMatch) {
                        classified = JSON.parse(jsonMatch[0]);
                        
                        let resultHTML = `<strong>Movie: ${likedMovie.title}</strong><br><br>`;
                        resultHTML += `<strong>Finalized Classification:</strong><br>`;
                        resultHTML += `<strong>Sub-genre:</strong> ${classified.sub_genre ? (Array.isArray(classified.sub_genre) ? classified.sub_genre.join(', ') : classified.sub_genre) : 'N/A'}<br>`;
                        resultHTML += `<strong>Themes:</strong> ${classified.themes ? (Array.isArray(classified.themes) ? classified.themes.join(', ') : classified.themes) : 'N/A'}<br><br>`;
                        resultHTML += `<small style='color: #666;'>Classification based on master lists with ${masterSubGenres.length} sub-genres and ${masterThemes.length} themes.</small>`;
                        
                        resultElement.innerHTML = resultHTML;
                        resultElement.className = 'success';
                        return;
                    }
                } catch (error) {
                    lastError = error;
                    continue;
                }
            }
        }
        
        throw lastError || new Error('Failed to finalize classification');
        
    } catch (error) {
        console.error('Error finalizing classification:', error);
        resultElement.innerHTML = `Error finalizing classification: ${error.message}`;
        resultElement.className = 'error';
    }
}
