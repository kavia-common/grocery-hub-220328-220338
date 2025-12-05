Image Search Page

- Route: /image-search
- Upload common image types (png, jpg, jpeg, webp, gif, bmp)
- Optional tag input for better matching
- Mock-first heuristic:
  - Extract keywords from filename and optional tag (altText)
  - Score products by matching keywords in name/description
- Backend fallback:
  - If REACT_APP_BACKEND_URL or REACT_APP_API_BASE is set and POST /api/search/image exists, it will be used.
  - Expected response: array of { product, score } or { product_id, score }
- Results:
  - List of candidates with an approximate similarity percentage badge
  - CTAs: View Details, Add to Cart, Quick Buy
- Persistence:
  - Stores last uploaded image (dataURL) and latest results in localStorage for quick revisit
- Styling:
  - Ocean Professional theme (blue primary, amber accents, rounded corners)
