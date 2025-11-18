// Global variables for storing movie data
let movies = [];

// Primary function to load data from local files
async function loadData() {
    try {
        // Load and parse movie data from u.item (MovieLens format)
        const moviesResponse = await fetch('u.item');
        if (!moviesResponse.ok) {
            throw new Error(`Failed to load movie data: ${moviesResponse.status}`);
        }
        const itemText = await moviesResponse.text();
        parseItemData(itemText);
    } catch (error) {
        console.error('Error loading data:', error);
        const resultElement = document.getElementById('result');
        if (resultElement) {
            resultElement.textContent = `Error: ${error.message}. Please make sure u.item file is in the correct location.`;
            resultElement.className = 'error';
        }
        throw error; // Re-throw to allow script.js to handle the error
    }
}

// Parse u.item data (MovieLens 100K format)
function parseItemData(text) {
    const lines = text.split('\n');
    
    // Define the 18 genre names in order
    const genreNames = [
        'Action', 'Adventure', 'Animation', "Children's", 'Comedy', 'Crime',
        'Documentary', 'Drama', 'Fantasy', 'Film-Noir', 'Horror', 'Musical',
        'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
    ];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        // Split the line by | delimiter
        const fields = line.split('|');
        if (fields.length < 5) continue; // Skip invalid lines
        
        const id = parseInt(fields[0]);
        const title = fields[1];
        const releaseDate = fields[2];
        const imdbUrl = fields[4];
        
        // Extract genres (last 19 fields: unknown + 18 genres)
        const genreFields = fields.slice(-19);
        const genres = [];
        
        for (let j = 1; j < genreFields.length; j++) { // Skip 'unknown' field
            if (genreFields[j] === '1') {
                genres.push(genreNames[j - 1]);
            }
        }
        
        movies.push({ 
            id, 
            title, 
            releaseDate,
            imdbUrl,
            genres,
            overview: '' // Empty for now, could be loaded from movies_metadata.csv
        });
    }
    
    console.log(`Loaded ${movies.length} movies`);
}
