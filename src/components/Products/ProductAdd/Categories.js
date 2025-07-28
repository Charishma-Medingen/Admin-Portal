import React, { useState, useEffect } from 'react';
import { getCategories } from '../../api'; // Assume this is the function to get categories

function Categories({ selectedCategory, handleCategoryChange }) {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        getCategories().then((data) => {
            setCategories(data);
        });
    }, []);

    return (
        <>
            <div className="card-header py-3 d-flex justify-content-between align-items-center bg-transparent border-bottom-0">
                <h6 className="m-0 fw-bold">Categories</h6>
            </div>
            <div className="card-body">
                <label className="form-label">Categories Select</label>
                <select className="form-select" value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)}>
                    <option value="">Select Category</option>
                    {categories.map((category, index) => (
                        <option key={index} value={category}>{category}</option>
                    ))}
                </select>
            </div>
        </>
    );
}

export default Categories;
