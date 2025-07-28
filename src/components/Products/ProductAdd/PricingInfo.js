import React from 'react';

function PricingInfo({ data, handleChange }) {
    return (
        <>
            <div className="card-header py-3 d-flex justify-content-between align-items-center bg-transparent border-bottom-0">
                <h6 className="m-0 fw-bold">Pricing Info</h6>
            </div>
            <div className="card-body">
                <div className="row g-3 align-items-center">
                    <div className="col-md-12">
                        <label className="form-label">MRP</label>
                        <input type="text" className="form-control" name="productPriceOld" value={data.productPriceOld} onChange={handleChange} />
                    </div>
                    <div className="col-md-12">
                        <label className="form-label">Product Price</label>
                        <input type="text" className="form-control" name="productPriceNew" value={data.productPriceNew} onChange={handleChange} />
                    </div>
                    <div className="col-md-12">
                        <label className="form-label">Product Coupon</label>
                        <input type="text" className="form-control" name="productCoupon" value={data.productCoupon} onChange={handleChange} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default PricingInfo;
