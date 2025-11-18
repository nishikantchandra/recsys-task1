// Global variables for storing movie data
let movies = [];

// Primary function to load data from CSV file
async function loadData() {
    try {
        // Load and parse movie data from CSV
        const moviesResponse = await fetch('movies_metadata.csv');
        if (!moviesResponse.ok) {
            throw new Error(`Failed to load movie data: ${moviesResponse.status}`);
        }
        const csvText = await moviesResponse.text();
        parseCSVData(csvText);
    } catch (error) {
        console.error('Error loading data:', error);
        const resultElement = document.getElementById('result');
        if (resultElement) {
            resultElement.textContent = `Error: ${error.message}. Please make sure movies_metadata.csv file is in the correct location.`;
            resultElement.className = 'error';
        }
        throw error; // Re-throw to allow script.js to handle the error
    }
}

// Parse CSV data from movies_metadata.csv
function parseCSVData(csvText) {
    const lines = csvText.split('\n');
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        // Parse CSV line (handling quoted fields with commas)
        const fields = parseCSVLine(line);
        if (fields.length < 5) continue; // Skip invalid lines
        
        const genresStr = fields[0];
        const originalTitle = fields[1];
        const overview = fields[2] || '';
        const tagline = fields[3] || '';
        const title = fields[4] || originalTitle;
        
        // Parse genres from string format: "[{'id': 16, 'name': 'Animation'}, ...]"
        const genres = parseGenres(genresStr);
        
        // Use index as ID (or we could generate a unique ID)
        const id = i;
        
        movies.push({ 
            id, 
            title: title.trim(), 
            originalTitle: originalTitle.trim(),
            overview: overview.trim(),
            tagline: tagline.trim(),
            genres 
        });
    }
    
    console.log(`Loaded ${movies.length} movies`);
}

// Parse a CSV line handling quoted fields
function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    // Add last field
    fields.push(currentField);
    return fields;
}

// Parse genres from string format like "[{'id': 16, 'name': 'Animation'}, ...]"
function parseGenres(genresStr) {
    try {
        // Replace single quotes with double quotes for JSON parsing
        const jsonStr = genresStr.replace(/'/g, '"');
        const genresArray = JSON.parse(jsonStr);
        return genresArray.map(g => g.name);
    } catch (error) {
        console.warn('Error parsing genres:', error, genresStr);
        return [];
    }
}
