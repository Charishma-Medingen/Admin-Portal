import React from 'react';
import { Link } from 'react-router-dom';

function CardBlock({ resultsData }) {
    return (
        <div className="card mb-3 bg-transparent p-2">
            {
                resultsData.map((d, i) => {
                    return <div key={'ffff' + i} className="card border-0 mb-1">
                        <div className="form-check form-switch position-absolute top-0 end-0 py-3 px-3 d-none d-md-block">
                            <input className="form-check-input" type="checkbox" id="Eaten-switch1" />
                            <label className="form-check-label" htmlFor="Eaten-switch1">Add to Cart</label>
                        </div>
                        <div className="card-body d-flex align-items-center flex-column flex-md-row">
                                <img className="w120 rounded img-fluid" src={ "https://d26lh6sqkii1nb.cloudfront.net/products/" + d.first_image_url} alt="" />
                            <div className="ms-md-4 m-0 mt-4 mt-md-0 text-md-start text-center w-100">
                                <h6 className="mb-3 fw-bold">{d.product_name}<span className="text-muted small fw-light d-block">{d.product_id}</span></h6>
                                <div className="d-flex flex-row flex-wrap align-items-center justify-content-center justify-content-md-start">
                                    <div className="pe-xl-5 pe-md-4 ps-md-0 px-3 mb-2">
                                        <div className="text-muted small">Salt name</div>
                                        <strong>{d.salt_name}</strong>
                                    </div>
                                    <div className="pe-xl-5 pe-md-4 ps-md-0 px-3 mb-2">
                                        <div className="text-muted small">Composition</div>
                                        <strong>{d.composition}</strong>
                                    </div>
                                    <div className="pe-xl-5 pe-md-4 ps-md-0 px-3 mb-2">
                                        <div className="text-muted small">Price</div>
                                        <strong>₹ {d.product_pricing_new}</strong>
                                    </div>
                                    <div className="pe-xl-5 pe-md-4 ps-md-0 px-3 mb-2">
                                        <div className="text-muted small">Selected Category</div>
                                        <strong>{d.selected_category ? d.selected_category : "N/A" }</strong>
                                    </div>
                                </div>
                                <div className="pe-xl-5 pe-md-4 ps-md-0 px-3 mb-2 d-inline-flex d-md-none">
                                    <button type="button" className="btn btn-primary">Add Cart</button>
                                </div>
                                <br/>
                                <div className="pe-xl-5 pe-md-4 ps-md-0 px-3 mb-2 d-inline-flex">
                                    <Link to={`/product-edit/${d.product_id}`} className="btn btn-primary me-2">
                                    <button type="button" className="btn btn-primary">View / Edit</button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                })
            }
        </div>
    )
}
export default CardBlock;