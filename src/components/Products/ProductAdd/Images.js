import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { OnchangeAddimage } from '../../../Redux/Actions/Action';

function Images(props) {
    const { addimage } = props.Mainreducer;

    const [ImageTableData, setImageTableData] = useState(props.images);
    console.log(ImageTableData);

    const handleImageChange = (e) => {
        const files = e.target.files;
        props.OnchangeAddimage(files);
        const newImage = { img: files, inputvalue: "", qvalue: "" };
        const updatedImageTableData = [...ImageTableData, newImage];
        setImageTableData(updatedImageTableData);
        props.handleImagesChange(updatedImageTableData);
    };

    const handleInputChange = (index, value, field) => {
        const updatedImageTableData = ImageTableData.map((item, i) => i === index ? { ...item, [field]: value } : item);
        setImageTableData(updatedImageTableData);
        props.handleImagesChange(updatedImageTableData);
    };

    const handleRemoveImage = (index) => {
        const updatedImageTableData = ImageTableData.filter((_, i) => i !== index);
        setImageTableData(updatedImageTableData);
        props.handleImagesChange(updatedImageTableData);
    };

    // useEffect to watch for changes in the props.images and update ImageTableData
    useEffect(() => {
        setImageTableData(props.images);
    }, [props.images]);


    console.log(ImageTableData);

    // Function to get the image URL or object URL
    const getImageSrc = (img) => {
        if (typeof img === 'string') {
            return img;
        // Check if img is a list of File object
        } else if (img instanceof FileList) {
            return URL.createObjectURL(img[0]);
        }
        return ''; // Return an empty string if img is not valid
    };

    return (
        <>
            <div className="card-header py-3 d-flex justify-content-between bg-transparent border-bottom-0">
                <h6 className="mb-0 fw-bold ">Images</h6>
            </div>
            <div className="card-body">
                <form>
                    <div className="row g-3 align-items-center">
                        <div className="col-md-12">
                            <label className="form-label">Product Images Upload</label>
                            <small className="d-block text-muted mb-2">Only portrait or square images, 2M max and 2000px max-height.</small>

                            <div id='create-token' className='dropzone'>
                                {addimage ? (
                                    <img src={getImageSrc(addimage)} alt='' />
                                ) : (
                                    <div className='dz-message '>
                                        <i className="fa fa-picture-o" aria-hidden="true"></i>
                                    </div>
                                )}
                                <input
                                    id='filesize'
                                    onChange={handleImageChange}
                                    name="file"
                                    type="file"
                                    accept=".jpg, .png, .jpeg, .gif, .bmp, .tif, .tiff, .mp4, .webm, .mp3, awv, .ogg, .glb, .webp"
                                />
                            </div>
                        </div>

                        <div className="col-md-12">
                            <div className="product-cart">
                                <div className="checkout-table table-responsive">
                                    <div id="myCartTable_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
                                        <div className="row">
                                            <div className="col-sm-12">
                                                <div className='table-responsive'>
                                                    <table id="myCartTable" className="table display dataTable table-hover align-middle nowrap no-footer dtr-inline" style={{ width: '100%' }} role="grid" aria-describedby="myCartTable_info">
                                                        <thead>
                                                            <tr role="row">
                                                                <th className="product sorting_asc" style={{ width: '102px' }}>Product</th>
                                                                <th className="product sorting" style={{ width: '267px' }}>Product Tag Name</th>
                                                                <th className="quantity sorting" style={{ width: '100px' }}>Quantity</th>
                                                                <th className="quantity dt-body-right sorting" style={{ width: '0px' }}>Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {ImageTableData.map((d, i) => (
                                                                <tr key={'s' + i} role="row" className="odd">
                                                                    <td tabIndex="0" className="sorting_1">
                                                                        <div className="product-cart d-flex align-items-center">
                                                                            <div className="product-thumb">
                                                                                <img src={getImageSrc(d.img)} className="img-fluid avatar xl" alt="Product" />
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control"
                                                                            value={d.inputvalue}
                                                                            onChange={(e) => handleInputChange(i, e.target.value, 'inputvalue')}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <div className="product-quantity d-inline-flex">
                                                                            <input
                                                                                type="number"
                                                                                value={d.qvalue}
                                                                                onChange={(e) => handleInputChange(i, e.target.value, 'qvalue')}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td className="dt-body-right">
                                                                        <div className="btn-group" role="group" aria-label="Basic outlined example">
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-outline-secondary deleterow"
                                                                                onClick={() => handleRemoveImage(i)}
                                                                            >
                                                                                <i className="icofont-ui-delete text-danger"></i>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

const mapStateToProps = ({ Mainreducer }) => ({
    Mainreducer
});

export default connect(mapStateToProps, {
    OnchangeAddimage
})(Images);
