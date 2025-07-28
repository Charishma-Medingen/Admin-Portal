import React, { useState, useEffect } from 'react';

function Tags({ tags, handleTagsChange }) {
    const [value, setValue] = useState('');

    useEffect(() => {
        setValue('');
    }, [tags]);

    const handleTagInput = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const newTags = [...tags, value.replace(/ /g, "_")];
            handleTagsChange(newTags);
            setValue('');
        }
    };

    const handleRemoveTag = (index) => {
        const newTags = tags.filter((_, i) => i !== index);
        handleTagsChange(newTags);
    };

    return (
        <>
            <div className="card-header py-3 d-flex justify-content-between align-items-center bg-transparent border-bottom-0">
                <h6 className="m-0 fw-bold">Tags</h6>
            </div>
            <div className="card-body">
                <div className="form-group demo-tagsinput-area">
                    <div className="tags">
                        <div className="taglable d-flex" style={{ flexWrap: 'wrap' }}>
                            {tags.map((tag, i) => (
                                <div className="settag" style={{
                                    borderRadius: '10px',
                                    padding: '2px',
                                    display: 'block',
                                    margin: '5px',
                                    backgroundColor: '#7258db',
                                    color: 'white'
                                }} key={i}>
                                    <span className="ItemLable  rounded-left " style={{ margin: '10px' }}>{tag}</span>
                                    <span
                                        className="CloseTag  rounded-right"
                                        onClick={() => handleRemoveTag(i)}
                                    >
                                        x
                                    </span>
                                </div>
                            ))}
                        </div>
                        <input
                            type="text"
                            className="form-control"
                            onKeyUp={handleTagInput}
                            onChange={(e) => setValue(e.target.value)}
                            value={value}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

export default Tags;
