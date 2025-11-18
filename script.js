// Initialize the application when the window loads
window.onload = async function() {
    try {
        // Display loading message
        const resultElement = document.getElementById('result');
        resultElement.textContent = "Loading movie data...";
        resultElement.className = 'loading';
        
        // Load data
        await loadData();
        
        // Populate dropdown and update status
        populateMoviesDropdown();
        
        resultElement.textContent = "Data loaded. Please select a movie to get recommendations.";
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

// Main recommendation function using Jaccard similarity
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
        resultElement.innerHTML = "Finding similar movies based on genres...<br><small>Calculating similarity scores...</small>";
        resultElement.className = 'loading';
        
        try {
            // Calculate Jaccard similarity based on genres
            const likedGenres = new Set(likedMovie.genres || []);
            const candidateMovies = movies.filter(m => m.id !== likedMovie.id);
            
            // Calculate similarity scores
            const scoredMovies = candidateMovies.map(candidate => {
                const candidateGenres = new Set(candidate.genres || []);
                const intersection = new Set([...likedGenres].filter(x => candidateGenres.has(x)));
                const union = new Set([...likedGenres, ...candidateGenres]);
                const jaccardScore = union.size > 0 ? intersection.size / union.size : 0;
                
                return {
                    ...candidate,
                    score: jaccardScore
                };
            });
            
            // Sort by score and take top recommendations
            scoredMovies.sort((a, b) => b.score - a.score);
            const recommendations = scoredMovies.slice(0, 3);
            
            // Display results
            let resultHTML = `<strong>Because you liked "${likedMovie.title}"</strong><br><br>`;
            resultHTML += `<strong>We recommend:</strong><br>`;
            
            if (recommendations.length > 0) {
                recommendations.forEach((movie, index) => {
                    resultHTML += `${index + 1}. <strong>${movie.title}</strong> (${movie.genres.join(', ')})<br>`;
                    resultHTML += `   <small style="color: #666;">Similarity: ${(movie.score * 100).toFixed(1)}%</small><br>`;
                });
            } else {
                resultHTML += "No similar movies found.";
            }
            
            resultHTML += `<br><small style="color: #666;">Based on genre overlap: ${Array.from(likedGenres).join(', ')}</small>`;
            
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
