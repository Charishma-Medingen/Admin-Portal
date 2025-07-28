import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // useNavigate for redirection
import PageHeader1 from '../../components/common/PageHeader1';
import Categories from '../../components/Products/ProductAdd/Categories';
import InventoryInfo from '../../components/Products/ProductAdd/InventoryInfo';
import PricingInfo from '../../components/Products/ProductAdd/PricingInfo';
import Tags from '../../components/Products/ProductAdd/Tags';
import BasicInformation from '../../components/Products/ProductAdd/BasicInformation';
import Images from '../../components/Products/ProductAdd/Images';
import { updateProducts, uploadFile, getProductDetails,deleteProduct } from '../../components/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import VisibilityStatus from '../../components/Products/ProductAdd/VisibilityStatus';
const MySwal = withReactContent(Swal);

function ProductEdit() {
    const { product_id } = useParams(); // Get product_id from URL params
    const navigate = useNavigate(); // useNavigate hook for navigation

    const [inventoryData, setInventoryData] = useState({
        product_id: '',
        rackId: '',
        totalStockQuantity: '',
        departmentId: '',
        selectedCategory: '',
        productPriceOld: '',
        productPriceNew: '',
        productCoupon: '',
        productName: '',
        saltName: '',
        composition: '',
        manufacturer: '',
        consumeType: '',
        packaging: '',
        composition_code: '',
        schedule_category: '',
        marketed_by: '',
        used_for: '',
        prescription_required: 'Yes',
        manufactureDate: '',
        expiryDate: '',
        productDescription: '',
        visibilityStatus: 'Published',
        publishDate: '',
        publishTime: '',
        tags: [],
        images: [],
        rc: 1,
        meta_title: '',
        meta_description: '',
        meta_keywords: '',
        product_name_url: '',
        formulation: ''
    });

    useEffect(() => {
        // Check if product_id is present
        if (!product_id) {
            MySwal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Product ID is missing. Unable to load product details.',
                confirmButtonText: 'Go back'
            }).then(() => {
                // Redirect to another page, e.g., product list
                navigate('/products');
            });
            return; // Exit the useEffect early
        }

        // Display loading SweetAlert
        MySwal.fire({
            title: 'Loading Product Details',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => {
                MySwal.showLoading();
            }
        });

        // Fetch product data from the backend when the component mounts
        const fetchProductData = async () => {
            try {
                // Simulate a delay
                await new Promise(r => setTimeout(r, 2000));

                const response = await getProductDetails(product_id);
                const productData = response;

                // Fetch product description from S3
                const descriptionUrl = `https://d26lh6sqkii1nb.cloudfront.net/product_description/${productData.productDescription}`;
                const descriptionResponse = await fetch(descriptionUrl);
                const descriptionText = await descriptionResponse.text();

                // Set the state with fetched data
                setInventoryData(prevState => ({
                    ...prevState,
                    ...productData,
                    productDescription: descriptionText,
                    images: productData.images.map(img => ({
                        ...img,
                        img: `https://d26lh6sqkii1nb.cloudfront.net/products/${img.img}`
                    }))
                }));

                // Close loading SweetAlert
                MySwal.close();
            } catch (error) {
                console.error('Failed to fetch product data', error);
                // Close loading SweetAlert and show error alert
                MySwal.fire({
                    icon: 'error',
                    title: 'Failed to load product data',
                    text: 'Please try again later.'
                });
            }
        };

        fetchProductData();
    }, [product_id, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInventoryData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleCategoryChange = (category) => {
        setInventoryData(prevState => ({
            ...prevState,
            selectedCategory: category
        }));
    };

    const handleDescriptionChange = (data) => {
        setInventoryData(prevState => ({
            ...prevState,
            productDescription: data
        }));
    };

    const handleVisibilityChange = (e) => {
        setInventoryData(prevState => ({
            ...prevState,
            visibilityStatus: e.target.value
        }));
    };

    const handleTagsChange = (tags) => {
        setInventoryData(prevState => ({
            ...prevState,
            tags: tags
        }));
    };

    const handleImagesChange = (images) => {
        setInventoryData(prevState => ({
            ...prevState,
            images: images
        }));
    };

    const handleDelete = async () => {
        // Confirmation dialog
        const result = await MySwal.fire({
            title: 'Are you sure?',
            text: 'This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, keep it'
        });

        if (result.isConfirmed) {
            try {
                await deleteProduct(product_id);
                MySwal.fire({
                    icon: 'success',
                    title: 'Product Deleted Successfully',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    navigate('/products'); // Redirect to product list
                });
            } catch (error) {
                console.log(error);
                MySwal.fire({
                    icon: 'error',
                    title: 'Failed to Delete Product',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        }
    };


    const handleUpdate = async () => {
        let inventory = { ...inventoryData };

        // Iterate over images and upload them
        for (let i = 0; i < inventory.images.length; i++) {
            // Remove the img s3 prefix from the object if it is a string
            if (typeof inventory.images[i].img === 'string') {
                inventory.images[i].img = inventory.images[i].img.split('/').pop();
            } else if (inventory.images[i].img instanceof FileList) {
                // Loader for image upload with image number and total images
                Swal.fire({
                    title: 'Uploading Images',
                    html: `Uploading image ${i + 1} of ${inventory.images.length}`,
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    willOpen: () => {
                        Swal.showLoading();
                    }
                });
                const result = await uploadFile(inventory.images[i].img[0], "products");
                inventory.images[i].img = result;
            }
        }

        Swal.fire({
            title: 'Updating description',
            html: `Uploading description...`,
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

            // Convert long description into HTML file and upload it
        const blob = new Blob([inventory.productDescription], { type: 'text/html' });
        const descriptionResult = await uploadFile(blob, "product_description");
        inventory.productDescription = descriptionResult;

        Swal.fire({
            title: 'Updating product details',
            html: `Uploading products...`,
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });


        // Upload data to server
        try {
            const response = await updateProducts(inventory);
            console.log(response);
            MySwal.fire({
                icon: 'success',
                title: 'Product Updated Successfully',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.reload();
            });
        } catch (error) {
            console.log(error);
            MySwal.fire({
                icon: 'error',
                title: 'Product Update Failed',
                showConfirmButton: false,
                timer: 1500
            });
        }
    };

    console.log(inventoryData);

    return (
        <div className="container-xxl">
            <PageHeader1 pagetitle='Products Update' button={false} />
            <div className="row g-3">
                <div className="col-xl-4 col-lg-4">
                    <div className="sticky-lg-top">
                        <div className="card mb-3">
                            <PricingInfo data={inventoryData} handleChange={handleChange} />
                        </div>
                        <div className="card mb-3">
                            <VisibilityStatus visibilityStatus={inventoryData.visibilityStatus} handleVisibilityChange={handleVisibilityChange}/>
                        </div>
                        <div className="card mb-3">
                            <Tags tags={inventoryData.tags} handleTagsChange={handleTagsChange} />
                        </div>
                        <div className="card mb-3">
                            <Categories selectedCategory={inventoryData.selectedCategory} handleCategoryChange={handleCategoryChange} />
                        </div>
                        <div className="card">
                            <InventoryInfo data={inventoryData} handleChange={handleChange} />
                        </div>
                    </div>
                </div>
                <div className="col-xl-8 col-lg-8">
                    <div className="card offset-md-9 col-md-3">
                        <input className="btn btn-primary me-1" type="button" value="Update Product" onClick={handleUpdate} />
                        <br/>
                        <input className="btn btn-primary me-1" type="button" value="Delete Product" onClick={handleDelete} />
                    </div><br />
                    <div className="card mb-3">
                        <BasicInformation data={inventoryData} handleChange={handleChange} handleDescriptionChange={handleDescriptionChange} />
                    </div>
                    <div className="card mb-3">
                        <Images images={inventoryData.images} handleImagesChange={handleImagesChange} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductEdit;
