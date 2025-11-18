# Content-Based Movie Recommender (MovieLens 100K)

This repository hosts the web app from [Abdullahdaro/week2](https://github.com/Abdullahdaro/week2), adapted for the RecSys Task 1 bonus assignment. It is a vanilla HTML/CSS/JS single-page application that:

1. Parses the Kaggle [MovieLens 100K dataset](https://www.kaggle.com/datasets/prajitdatta/movielens-100k-dataset) locally via `data.js` (no backend).
2. Lets users pick a seed movie and analyze it with a lightweight LLM (phi-3-mini) to extract sub-genres/themes through the 3-stage prompting workflow (extract → consolidate → finalize & encode).
3. Computes recommendations using genre overlap (Jaccard similarity) with a homework extension to cosine similarity over LLM-enhanced vectors.

## File overview
- `index.html` / `style.css` – UI shell with API-key input, dropdown, and results panel.
- `data.js` – loads `u.item` and `u.data`, parsing movie metadata and ratings locally.
- `script.js` – handles LLM prompts, consolidates master feature lists, and surfaces recommendations.
- `movies_metadata.csv`, `u.item`, `u.data` – MovieLens metadata bundled for offline experimentation.

## Local setup
1. Clone this repository.
2. Serve the folder locally (e.g., `npx serve .`, Python `http.server`, or VS Code Live Server) so `fetch()` can read the dataset files.
3. Supply your own Cerebras (or compatible) API key in the UI, then select a movie to start collecting features and recommendations.

## Next steps
- Replace Jaccard with cosine similarity using the finalized multi-hot vectors.
- Add offline Precision/Recall/NDCG evaluation using `u.data` interactions.
- Deploy statically (GitHub Pages / Vercel) or wrap with TF.js for re-ranking demos.
