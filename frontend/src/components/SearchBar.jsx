/**
 * SearchBar.jsx — Search input with category filter dropdown.
 */

import { useState } from 'react';
import './SearchBar.css';

export default function SearchBar({ onSearch, categories = [] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ search, category });
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setCategory(val);
    onSearch({ search, category: val });
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit} id="search-bar">
      <div className="search-input-wrapper">
        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
          id="search-input"
        />
      </div>

      {categories.length > 0 && (
        <select
          value={category}
          onChange={handleCategoryChange}
          className="category-select"
          id="category-filter"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      )}

      <button type="submit" className="btn btn-primary btn-sm" id="search-button">
        Search
      </button>
    </form>
  );
}
